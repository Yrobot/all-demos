import { expect, test, describe } from "vitest";

import diff from "./diff";

type Data = Parameters<typeof diff>[0];

const expectArr = <I, E>(input: I[], expected: E[]) => {
  expect(input).toHaveLength(expected.length);
  expect(input).toEqual(expect.arrayContaining(expected));
};

const testArr = <I, E>(description: string, input: I[], expected: E[]) =>
  test(description, () => expectArr(input, expected));

describe("Test Diff", () => {
  describe("basic", () => {
    const data1: Data = {
      nodes: [
        {
          id: "1",
        },
        {
          id: "3",
        },
      ],
      links: [{ source: "1", target: "3" }],
    };
    const data2: Data = {
      nodes: [
        {
          id: "1",
          children: {
            nodes: [{ id: "2" }, { id: "3" }],
            links: [{ source: "2", target: "3" }],
          },
        },
        {
          id: "4",
        },
      ],
      links: [{ source: "1", target: "4" }],
    };
    const result = diff(data1, data2);
    testArr(
      "result.node.add",
      result.node.add.map((item) => [item.node.id, item.parent?.id]),
      [
        ["3", "1"],
        ["2", "1"],
        ["4", undefined],
      ]
    );
    testArr(
      "result.node.remove",
      result.node.remove.map((item) => [item.node.id, item.parent?.id]),
      [["3", undefined]]
    );
    testArr(
      "result.link.add",
      result.link.add.map((item) => [
        item.link.source,
        item.link.target,
        item.parent?.id,
      ]),
      [
        ["2", "3", "1"],
        ["1", "4", undefined],
      ]
    );
    testArr(
      "result.link.remove",
      result.link.remove.map((item) => [
        item.link.source,
        item.link.target,
        item.parent?.id,
      ]),
      [["1", "3", undefined]]
    );
  });
  describe("deep nested structures", () => {
    const data1: Data = {
      nodes: [
        {
          id: "1",
          children: {
            nodes: [
              {
                id: "2",
                children: {
                  nodes: [{ id: "3" }],
                  links: [{ source: "2", target: "3" }],
                },
              },
            ],
            links: [{ source: "1", target: "2" }],
          },
        },
      ],
      links: [],
    };

    const data2: Data = {
      nodes: [
        {
          id: "2",
        },
      ],
      links: [],
    };

    const result = diff(data1, data2);
    testArr(
      "result.node.add",
      result.node.add.map((item) => [item.node.id, item.parent?.id]),
      [["2", undefined]]
    );
    testArr(
      "result.node.remove",
      result.node.remove.map((item) => [item.node.id, item.parent?.id]),
      [
        ["1", undefined],
        ["3", "2"],
        ["2", "1"],
      ]
    );
    testArr(
      "result.link.add",
      result.link.add.map((item) => [
        item.link.source,
        item.link.target,
        item.parent?.id,
      ]),
      []
    );
    testArr(
      "result.link.remove",
      result.link.remove.map((item) => [
        item.link.source,
        item.link.target,
        item.parent?.id,
      ]),
      [
        ["1", "2", "1"],
        ["2", "3", "2"],
      ]
    );
  });
  describe("empty to non-empty", () => {
    const data1: Data = {
      nodes: [],
      links: [],
    };

    const data2: Data = {
      nodes: [
        {
          id: "1",
          children: {
            nodes: [{ id: "2" }],
            links: [{ source: "1", target: "2" }],
          },
        },
      ],
      links: [],
    };
    const result = diff(data1, data2);
    testArr(
      "result.node.add",
      result.node.add.map((item) => [item.node.id, item.parent?.id]),
      [
        ["2", "1"],
        ["1", undefined],
      ]
    );
    testArr(
      "result.node.remove",
      result.node.remove.map((item) => [item.node.id, item.parent?.id]),
      []
    );
    testArr(
      "result.link.add",
      result.link.add.map((item) => [
        item.link.source,
        item.link.target,
        item.parent?.id,
      ]),
      [["1", "2", "1"]]
    );
    testArr(
      "result.link.remove",
      result.link.remove.map((item) => [
        item.link.source,
        item.link.target,
        item.parent?.id,
      ]),
      []
    );
  });
  describe("node movement across levels", () => {
    const data1: Data = {
      nodes: [
        {
          id: "1",
          children: {
            nodes: [{ id: "3" }],
            links: [{ source: "1", target: "3" }],
          },
        },
        { id: "2" },
      ],
      links: [{ source: "1", target: "2" }],
    };

    const data2: Data = {
      nodes: [
        { id: "1" },
        {
          id: "2",
          children: {
            nodes: [{ id: "3" }],
            links: [{ source: "2", target: "3" }],
          },
        },
      ],
      links: [{ source: "1", target: "2" }],
    };
    const result = diff(data1, data2);
    testArr(
      "result.node.add",
      result.node.add.map((item) => [item.node.id, item.parent?.id]),
      [["3", "2"]]
    );
    testArr(
      "result.node.remove",
      result.node.remove.map((item) => [item.node.id, item.parent?.id]),
      [["3", "1"]]
    );
    testArr(
      "result.link.add",
      result.link.add.map((item) => [
        item.link.source,
        item.link.target,
        item.parent?.id,
      ]),
      [["2", "3", "2"]]
    );
    testArr(
      "result.link.remove",
      result.link.remove.map((item) => [
        item.link.source,
        item.link.target,
        item.parent?.id,
      ]),
      [["1", "3", "1"]]
    );
  });
  describe("non-empty to empty", () => {
    const data1: Data = {
      nodes: [{ id: "1" }, { id: "2" }],
      links: [
        { source: "1", target: "2" },
        { source: "2", target: "1" },
      ],
    };

    const data2: Data = {
      nodes: [],
      links: [],
    };
    const result = diff(data1, data2);
    testArr(
      "result.node.add",
      result.node.add.map((item) => [item.node.id, item.parent?.id]),
      []
    );
    testArr(
      "result.node.remove",
      result.node.remove.map((item) => [item.node.id, item.parent?.id]),
      [
        ["2", undefined],
        ["1", undefined],
      ]
    );
    testArr(
      "result.link.add",
      result.link.add.map((item) => [
        item.link.source,
        item.link.target,
        item.parent?.id,
      ]),
      []
    );
    testArr(
      "result.link.remove",
      result.link.remove.map((item) => [
        item.link.source,
        item.link.target,
        item.parent?.id,
      ]),
      [
        ["2", "1", undefined],
        ["1", "2", undefined],
      ]
    );
  });
  describe("remove parent node", () => {
    const data1: Data = {
      nodes: [
        {
          id: "1",
          children: {
            nodes: [{ id: "2" }, { id: "3" }],
            links: [{ source: "2", target: "3" }],
          },
        },
      ],
      links: [],
    };

    const data2: Data = {
      nodes: [{ id: "9" }],
      links: [],
    };
    const result = diff(data1, data2);
    testArr(
      "result.node.add",
      result.node.add.map((item) => [item.node.id, item.parent?.id]),
      [["9", undefined]]
    );
    testArr(
      "result.node.remove",
      result.node.remove.map((item) => [item.node.id, item.parent?.id]),
      [
        ["1", undefined],
        ["2", "1"],
        ["3", "1"],
      ]
    );
    testArr(
      "result.link.add",
      result.link.add.map((item) => [
        item.link.source,
        item.link.target,
        item.parent?.id,
      ]),
      []
    );
    testArr(
      "result.link.remove",
      result.link.remove.map((item) => [
        item.link.source,
        item.link.target,
        item.parent?.id,
      ]),
      [["2", "3", "1"]]
    );
  });
  describe("links movement across levels", () => {
    const data1: Data = {
      nodes: [
        {
          id: "1",
          children: {
            nodes: [],
            links: [{ source: "2", target: "3" }],
          },
        },
      ],
      links: [],
    };

    const data2: Data = {
      nodes: [{ id: "1" }],
      links: [{ source: "2", target: "3" }],
    };
    const result = diff(data1, data2);
    testArr(
      "result.node.add",
      result.node.add.map((item) => [item.node.id, item.parent?.id]),
      []
    );
    testArr(
      "result.node.remove",
      result.node.remove.map((item) => [item.node.id, item.parent?.id]),
      []
    );
    testArr(
      "result.link.add",
      result.link.add.map((item) => [
        item.link.source,
        item.link.target,
        item.parent?.id,
      ]),
      [["2", "3", undefined]]
    );
    testArr(
      "result.link.remove",
      result.link.remove.map((item) => [
        item.link.source,
        item.link.target,
        item.parent?.id,
      ]),
      [["2", "3", "1"]]
    );
  });
  describe("Links opposite direction", () => {
    const data1: Data = {
      nodes: [{ id: "2" }, { id: "3" }],
      links: [{ source: "3", target: "2" }],
    };

    const data2: Data = {
      nodes: [{ id: "2" }, { id: "3" }],
      links: [{ source: "2", target: "3" }],
    };
    const result = diff(data1, data2);
    testArr(
      "result.node.add",
      result.node.add.map((item) => [item.node.id, item.parent?.id]),
      []
    );
    testArr(
      "result.node.remove",
      result.node.remove.map((item) => [item.node.id, item.parent?.id]),
      []
    );
    testArr(
      "result.link.add",
      result.link.add.map((item) => [
        item.link.source,
        item.link.target,
        item.parent?.id,
      ]),
      [["2", "3", undefined]]
    );
    testArr(
      "result.link.remove",
      result.link.remove.map((item) => [
        item.link.source,
        item.link.target,
        item.parent?.id,
      ]),
      [["3", "2", undefined]]
    );
  });
  describe("Nodes same level order changed", () => {
    const data1: Data = {
      nodes: [{ id: "2" }, { id: "3" }],
      links: [],
    };

    const data2: Data = {
      nodes: [{ id: "3" }, { id: "2" }],
      links: [],
    };
    const result = diff(data1, data2);
    testArr(
      "result.node.add",
      result.node.add.map((item) => [item.node.id, item.parent?.id]),
      []
    );
    testArr(
      "result.node.remove",
      result.node.remove.map((item) => [item.node.id, item.parent?.id]),
      []
    );
    testArr(
      "result.link.add",
      result.link.add.map((item) => [
        item.link.source,
        item.link.target,
        item.parent?.id,
      ]),
      []
    );
    testArr(
      "result.link.remove",
      result.link.remove.map((item) => [
        item.link.source,
        item.link.target,
        item.parent?.id,
      ]),
      []
    );
  });
  describe("Deep Level Change", () => {
    const data1: Data = {
      nodes: [
        {
          id: "2",
          children: {
            nodes: [
              {
                id: "3",
                children: {
                  nodes: [
                    {
                      id: "4",
                      children: {
                        nodes: [{ id: "5" }],
                        links: [],
                      },
                    },
                  ],
                  links: [],
                },
              },
            ],
            links: [],
          },
        },
      ],
      links: [],
    };

    const data2: Data = {
      nodes: [
        {
          id: "2",
          children: {
            nodes: [
              {
                id: "3",
                children: {
                  nodes: [
                    {
                      id: "4",
                      children: {
                        nodes: [{ id: "5" }, { id: "6" }],
                        links: [{ source: "5", target: "6" }],
                      },
                    },
                  ],
                  links: [],
                },
              },
            ],
            links: [],
          },
        },
      ],
      links: [],
    };
    const result = diff(data1, data2);
    testArr(
      "result.node.add",
      result.node.add.map((item) => [item.node.id, item.parent?.id]),
      [["6", "4"]]
    );
    testArr(
      "result.node.remove",
      result.node.remove.map((item) => [item.node.id, item.parent?.id]),
      []
    );
    testArr(
      "result.link.add",
      result.link.add.map((item) => [
        item.link.source,
        item.link.target,
        item.parent?.id,
      ]),
      [["5", "6", "4"]]
    );
    testArr(
      "result.link.remove",
      result.link.remove.map((item) => [
        item.link.source,
        item.link.target,
        item.parent?.id,
      ]),
      []
    );
  });
});

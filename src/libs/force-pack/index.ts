import Kapsule from "kapsule";

import { Data, Node, Link, NodeProps, LinkProps } from "./types";

import { SVGCanvas } from "./draw";
import ForceEngine from "./forceEngine";

import diff from "./diff";

import deepClone from "./deepClone";
import { dataLoop } from "./loop";

type Canvas = SVGCanvas;
const Canvas = SVGCanvas;

type Engine = ForceEngine;
const Engine = ForceEngine;

const DEFAULT_RADIUS = 8;

const colors = `ff595e-ffca3a-8ac926-1982c4-6a4c93`
  .split("-")
  .map((hex) => `#${hex}`);

const node2Pos = (node: Node) => [node.x || 0, node.y || 0] as number[];
const link2Pos = (link: any) =>
  [node2Pos(link.source as Node), node2Pos(link.target as Node)] as number[][];

const toNodeProps = (prepare: Prepare, id: string) => {
  const { nodeMap, linkMap, levelRadius } = prepare;
  const { node, parent, level } = nodeMap[id] || {};
  if (!node) throw new Error("getNodeProps: node is not found");
  const radius = levelRadius[level];
  const color = (node.color as string) ?? colors[level];
  const opacity = [0.2, 0.6, 1][level];
  const position = node2Pos(node);
  return {
    radius,
    color,
    opacity,
    position,
  };
};

const toLinkProps = (prepare: Prepare, id: string) => {
  const { link, parent, level } = prepare.linkMap[id] || {};
  if (!link) throw new Error("getNodeProps: node is not found");
  const color = (link.color as string) ?? colors[level];
  const opacity = [0.2, 0.6, 1][level];
  const position = link2Pos(link);
  return {
    color,
    opacity,
    width: 2,
    position,
  };
};

const engineSetup = ({
  engine,
  newData,
  oldData,
  prepare,
}: {
  engine: Engine;
  prepare: Prepare;
  newData: ReturnType<typeof deepClone>;
  oldData: ReturnType<typeof deepClone>;
}) => {
  const { nodeMap, linkMap, levelRadius } = prepare;

  const newParentIds = getParentIds(newData);
  const oldParentIds = getParentIds(oldData);

  const { add: addIds, remove: removeIds } = compareIds({
    oldIds: oldParentIds,
    newIds: newParentIds,
  });

  // root engine
  engine.add(
    [""],
    [
      {
        nodes: newData.nodes,
        links: newData.links,
        nodeRadius: levelRadius[0] + 20,
      },
    ]
  );

  // child engine
  engine.add(
    addIds,
    addIds.map((id) => {
      const { node, level } = nodeMap[id];
      return {
        nodes: node?.children?.nodes || [],
        links: node?.children?.links || [],
        nodeRadius: levelRadius[level + 1],
        containerRadius: levelRadius[level],
      };
    })
  );

  engine.remove(removeIds);
};

const canvasSetup = ({
  prepare,
  newData,
  oldData,
  canvas,
}: {
  prepare: Prepare;
  newData: ReturnType<typeof deepClone>;
  oldData: ReturnType<typeof deepClone>;
  canvas: Canvas;
}) => {
  const { node, link } = diff(oldData, newData);

  node.add.forEach(({ node, parent }) => {
    canvas.prepareNode({
      props: toNodeProps(prepare, node.id),
      id: node.id,
      parent: parent || undefined,
    });
  });
  node.remove.forEach(({ node, parent }) => {
    canvas.removeNode({
      id: node.id,
    });
  });

  link.add.forEach(({ link, parent }) => {
    const id = getLinkId(link);
    canvas.prepareLink({
      props: toLinkProps(prepare, id),
      id,
      parent: parent || undefined,
    });
  });
  link.remove.forEach(({ link, parent }) => {
    canvas.removeLink({
      id: getLinkId(link),
    });
  });
};

function calculateContainerRadius({
  childRadius = DEFAULT_RADIUS,
  childLen = 1,
  padding = 8,
}) {
  if (childLen <= 1) {
    return childRadius + padding;
  }

  // 计算最小立方体边长，该立方体可以容纳所有子球体
  const minCubeSize = Math.ceil(Math.cbrt(childLen));

  // 计算立方体的半边长（考虑球体间距）
  const halfCubeSize = (minCubeSize - 1) * childRadius;

  // 计算从立方体中心到角落的距离
  const cornerDistance = Math.sqrt(3) * halfCubeSize;

  const contentRadius = (cornerDistance + childRadius) * 1.6;

  return contentRadius + padding;
}

const getLinkId = (link: {
  source: string | { id: string };
  target: string | { id: string };
}) => {
  const sourceId =
    typeof link.source === "object" ? link.source.id : link.source;
  const targetId =
    typeof link.target === "object" ? link.target.id : link.target;
  return `${sourceId}-${targetId}`;
};

const getParentIds = (data: Data): string[] => {
  const parentIds: string[] = [];
  dataLoop(data, {
    level: 0,
    parentNode: null,
    hook: ({ data, parentNode, level }) => {
      parentIds.push(parentNode?.id || "");
    },
  });
  return parentIds;
};

const prepareData = (data: Data) => {
  const nodeMap: Record<
      string,
      { node: Node; parent: string | null; level: number }
    > = {},
    linkMap: Record<
      string,
      { link: Link; parent: string | null; level: number }
    > = {};

  let levelMaxChildLen: number[] = [];

  dataLoop(data, {
    level: 0,
    parentNode: null,
    hook: ({ data, parentNode, level }) => {
      const nodes = data?.nodes || [];
      const links = data?.links || [];
      levelMaxChildLen[level] = Math.max(
        levelMaxChildLen[level] || 0,
        nodes.length || 0
      );
      nodes.forEach((node) => {
        const id = node.id;
        nodeMap[id] = { node, parent: parentNode?.id || null, level };
      });
      links.forEach((link) => {
        const id = getLinkId(link);
        linkMap[id] = { link, parent: parentNode?.id || null, level };
      });
    },
  });

  levelMaxChildLen = levelMaxChildLen.filter((len) => !!len);

  const levelRadius: number[] = [DEFAULT_RADIUS];

  for (let index = levelMaxChildLen.length - 1; index > 0; index--) {
    const levelChildLen = levelMaxChildLen[index];
    const radius = calculateContainerRadius({
      childLen: levelChildLen,
      childRadius: levelRadius[0],
    });
    levelRadius.unshift(radius);
  }

  return {
    nodeMap,
    linkMap,
    levelMaxChildLen,
    levelRadius,
  };
};

type Prepare = ReturnType<typeof prepareData>;

type IDs = string[];
const compareIds = ({ oldIds, newIds }: { oldIds: IDs; newIds: IDs }) => {
  const map1: { [key: string]: true } = {},
    map2: { [key: string]: true } = {};
  const len = Math.max(oldIds.length, newIds.length);
  for (let i = 0; i < len; i++) {
    const id1 = oldIds[i];
    const id2 = newIds[i];
    if (id1 !== undefined)
      if (map2[id1]) {
        delete map2[id1];
      } else {
        map1[id1] = true;
      }
    if (id2 !== undefined)
      if (map1[id2]) {
        delete map1[id2];
      } else {
        map2[id2] = true;
      }
  }

  const add: string[] = Object.keys(map2);
  const remove: string[] = Object.keys(map1);
  return {
    add,
    remove,
  };
};

const safeData = (data: any) => {
  if ([null, undefined].includes(data))
    return {
      nodes: [],
      links: [],
    };
  if (!(data instanceof Object)) throw new Error("graphData must be an object");
  if (!data.nodes) data.nodes = [];
  if (!data.links) data.links = [];
  if (!(data["nodes"] instanceof Array))
    throw new Error("graphData.nodes must be an array");
  if (!(data["links"] instanceof Array))
    throw new Error("graphData.links must be an array");
  return data;
};

export default Kapsule({
  props: {
    graphData: {
      default: null,
      onChange(data: Data, state) {
        const canvas = state.canvas as Canvas;
        const engine = state.engine as Engine;
        if (!canvas || !engine) return; // not ready

        // const newData = deepClone(safeData(data));
        const newData = data;

        const prepare = prepareData(newData);

        (this as any).prepare = prepare;

        const oldData = safeData((this as any)?._oldData);

        engineSetup({
          prepare,
          engine,
          newData,
          oldData,
        });

        canvasSetup({
          prepare,
          canvas,
          newData,
          oldData,
        });

        (this as any)._oldData = data;
      },
    },
    canvas: {
      default: null,
      triggerUpdate: false,
    },
  },
  methods: {
    tick(state) {
      const canvas = state.canvas as Canvas;
      const prepare = (this as any).prepare as Prepare;
      if (!canvas || !prepare) return;
      dataLoop(state.graphData, {
        level: 0,
        parentNode: null,
        hook: ({ data, parentNode, level }) => {
          data.nodes.forEach((node) => {
            canvas.updateNode({
              id: node.id,
              props: toNodeProps(prepare, node.id),
            });
          });
          data.links.forEach((link) => {
            const id = getLinkId(link);
            canvas.updateLink({
              id,
              props: toLinkProps(prepare, id),
            });
          });
        },
      });
    },
  },
  init(domNode, state: any, options) {
    const canvas = new Canvas({
      container: domNode,
    });
    canvas.init();
    state.canvas = canvas;
    state.engine = new Engine();
  },
  stateInit: (potions) => {
    return {};
  },
  update: () => {},
});

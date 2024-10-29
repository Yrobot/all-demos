import Kapsule from "kapsule";

import { Data, Node } from "./types";

import { SVGCanvas } from "./draw";

import diff from "./diff";

const dataLoop = (
  data: Data,
  {
    level = 0,
    parentNode = null,
    hook = () => {},
  }: {
    level: number;
    parentNode: null | Node;
    hook: ({
      data,
      parentNode,
      level,
    }: {
      data: Data;
      parentNode: null | Node;
      level: number;
    }) => void;
  }
) => {
  hook({
    data,
    parentNode,
    level,
  });

  data?.nodes?.forEach((node) => {
    if (node.children) {
      dataLoop(node.children as Data, {
        level: level + 1,
        parentNode: node,
        hook,
      });
    }
  });
};

const deepCopy = (data: Data) => {};

type IDs = string[];
const compareIds = (arr1: IDs, arr2: IDs) => {
  if (arr1.length !== arr2.length) return false;
  const map1: { [key: string]: true } = {},
    map2: { [key: string]: true } = {};
  for (let i = 0; i < arr1.length; i++) {
    const id1 = arr1[i];
    const id2 = arr2[i];
    if (map2[id1]) {
      delete map2[id1];
    } else {
      map1[id1] = true;
    }
    if (map1[id2]) {
      delete map1[id2];
    } else {
      map2[id2] = true;
    }
  }
  if (Object.keys(map1).length > 0 || Object.keys(map2).length > 0)
    return false;
  return true;
};

export default Kapsule({
  props: {
    graphData: {
      default: null,
      onChange(data: Data, state) {
        if (data?.nodes) {
        }
      },
    },
    containerId: {
      default: null,
      triggerUpdate: false,
    },
    canvas: {
      default: null,
      triggerUpdate: false,
    },
  },
  methods: {
    prepareElements(state) {
      const {
        graphData,
        canvas,
      }: {
        graphData: Data;
        canvas: SVGCanvas;
      } = state as any;
      dataLoop(graphData, {
        level: 0,
        parentNode: null,
        hook: ({ data, parentNode, level }) => {},
      });
    },
  },
  init(domNode, state, options) {
    const { prepareElements } = this as any; // get Method

    if (!state?.containerId) throw new Error("containerId is required");
    const canvas = new SVGCanvas({
      containerId: state.containerId,
    });
    canvas.init();
    state.canvas = canvas;
    if (!!state?.graphData) prepareElements();
  },
  stateInit: () => ({}),
  update: () => {},
});

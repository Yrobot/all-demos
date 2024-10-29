import type { Data } from "./types";

import type { Data as MainData } from "./diff";

const deepClone = (data: Data): MainData => {
  return {
    nodes: [...data.nodes].map((node) => ({
      id: node.id as string,
      children: node.children ? deepClone(node.children as Data) : undefined,
    })),
    links: [...data.links].map((item) => ({
      source: item.source as string,
      target: item.target as string,
    })),
  };
};

export default deepClone;

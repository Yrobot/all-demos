import { Data, Node } from "./types";

export const dataLoop = (
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

export default { dataLoop };

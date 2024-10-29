type ID = string;
type MyNode<D> = {
  id: ID;
  children?: D;
};

type MyLink = {
  source: ID;
  target: ID;
};

export type Data = {
  nodes: MyNode<Data>[];
  links: MyLink[];
};

type DiffResult = {
  node: {
    add: { node: MyNode<Data>; parent: MyNode<Data> | null }[]; // parent is null for root
    remove: { node: MyNode<Data>; parent: MyNode<Data> | null }[];
  };
  link: {
    add: { link: MyLink; parent: MyNode<Data> | null }[];
    remove: { link: MyLink; parent: MyNode<Data> | null }[];
  };
};

// 用于存储节点的完整路径信息
type NodeInfo = {
  node: MyNode<Data>;
  parent: MyNode<Data> | null;
  path: string[]; // 存储从根到该节点的完整路径
};

type NodeMap = Map<ID, NodeInfo>;

function getAllNodes(
  data: Data,
  parent: MyNode<Data> | null = null,
  path: string[] = [],
  result: NodeMap = new Map()
): NodeMap {
  for (const node of data.nodes) {
    const currentPath = [...path, node.id];
    result.set(node.id, {
      node,
      parent,
      path: currentPath,
    });

    if (node.children) {
      getAllNodes(node.children, node, currentPath, result);
    }
  }
  return result;
}

type LinkInfoArr = DiffResult["link"]["add"];

type LinkMap = Record<string, LinkInfoArr>;

function getAllLinks(
  data: Data,
  parent: MyNode<Data> | null = null,
  subPath: string[] = [],
  result: LinkMap = {}
): LinkMap {
  const subPathKey = subPath.join("-");
  for (const link of data.links) {
    if (!result[subPathKey]) result[subPathKey] = [];
    result[subPathKey].push({ link, parent });
  }
  for (const node of data.nodes) {
    if (node.children) {
      getAllLinks(node.children, node, [...subPath, node.id], result);
    }
  }

  return result;
}

// // 比较两个链接是否相等
// function areLinksEqual(link1: MyLink, link2: MyLink): boolean {
//   return link1.source === link2.source && link1.target === link2.target;
// }

// 对比 links 数组，基于 source 和 target 对比，获取差异（remove 和 add 数组）
function compareLinkArr(
  arr1: LinkInfoArr,
  arr2: LinkInfoArr
): {
  remove: LinkInfoArr;
  add: LinkInfoArr;
} {
  const remove: LinkInfoArr = [];
  const add: LinkInfoArr = [];

  const tempMap: Record<string, LinkInfoArr[0]> = {};

  const getLinkKey = (link: LinkInfoArr[0]) =>
    link.link.source + "-" + link.link.target;

  for (const link of arr1) {
    const linkKey = getLinkKey(link);
    if (!tempMap[linkKey]) {
      tempMap[linkKey] = link;
    }
  }

  for (const link of arr2) {
    const linkKey = getLinkKey(link);
    if (!tempMap[linkKey]) {
      add.push(link);
    } else {
      delete tempMap[linkKey];
    }
  }

  remove.push(...Object.values(tempMap));

  return { remove, add };
}

// 比较两个节点路径是否相等
function arePathsEqual(path1: string[], path2: string[]): boolean {
  if (path1.length !== path2.length) return false;
  return path1.every((id, index) => id === path2[index]);
}

function diff(data1: Data, data2: Data): DiffResult {
  const result: DiffResult = {
    node: { add: [], remove: [] },
    link: { add: [], remove: [] },
  };

  // 获取所有节点及其路径信息
  const nodes1 = getAllNodes(data1);
  const nodes2 = getAllNodes(data2);

  // 比较节点
  // 1.  查找新增的节点 // 先放入新增的节点 确保 其子节点添加 在父节点之后
  for (const [id, info2] of nodes2) {
    const info1 = nodes1.get(id);
    if (!info1) {
      // 全新的节点
      result.node.add.push({ node: info2.node, parent: info2.parent });
    }
  }
  // 2. 查找删除的节点或位置发生变化的节点
  for (const [id, info1] of nodes1) {
    const info2 = nodes2.get(id);
    if (!info2) {
      // 节点被删除
      result.node.remove.push({ node: info1.node, parent: info1.parent });
    } else if (!arePathsEqual(info1.path, info2.path)) {
      // 节点位置发生变化，视为删除后添加
      result.node.remove.push({ node: info1.node, parent: info1.parent });
      result.node.add.push({ node: info2.node, parent: info2.parent });
    }
  }

  // 获取所有链接
  const links1 = getAllLinks(data1);
  const links2 = getAllLinks(data2);

  // 比较链接
  // 1. 基于旧links对比新links
  Object.entries(links1).forEach(([subPathKey, info1]) => {
    const info2 = links2[subPathKey];
    // links被删除
    if (!info2) {
      result.link.remove.push(...info1);
    } else {
      const { remove, add } = compareLinkArr(info1, info2);
      result.link.remove.push(...remove);
      result.link.add.push(...add);
    }
  });

  // 2. 基于新links对比旧links
  Object.entries(links2).forEach(([subPathKey, info2]) => {
    const info1 = links1[subPathKey];
    // links新增
    if (!info1) {
      result.link.add.push(...info2);
    }
  });

  return result;
}

export default diff;

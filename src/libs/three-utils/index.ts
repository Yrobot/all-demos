import * as THREE from "three";
import * as d3 from "d3";

export type NodePos = { x: number; y: number; z: number };
export type Position = [number, number, number];

export type NodeGen<T extends Object> = {
  id: string;
} & {
  index?: number;
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
  fx?: number | null;
  fy?: number | null;
  fz?: number | null;
} & T;

export type LinkGen<T extends Object> = d3.SimulationLinkDatum<NodeGen<T>>;

export const nodeRadiusScale = d3.scaleSqrt().domain([1, 6]).range([8, 40]);
// console.log([0, 1, 2, 3].map(nodeRadiusScale));

export const getThreeColor = (i: number) =>
  hexToThreeColor(d3.schemeCategory10[i]);
export const getHexColor = (i: number) => d3.schemeCategory10[i];

export const getAllChildLength = (node: {
  children?: { nodes: NodeGen<any>[] };
}): number => {
  if (node?.children?.nodes?.length) {
    return (
      node.children.nodes.length +
      node.children.nodes.reduce((pre, cur) => pre + getAllChildLength(cur), 0)
    );
  } else {
    return 0;
  }
};

export const getNodePosition = (node?: NodePos): Position => [
  node?.x || 0,
  node?.y || 0,
  node?.z || 0,
];

export const setGroupCenter = (group: THREE.Group, center: Position) => {
  group.position.x = center[0];
  group.position.y = center[1];
  group.position.z = center[2];
};

export function getSphereIntersectionPoints({
  c1,
  c2,
  r1,
  r2,
}: {
  c1: Position;
  c2: Position;
  r1: number;
  r2: number;
}): [Position, Position] {
  // 计算从 c1 到 c2 的向量
  const dx = c2[0] - c1[0];
  const dy = c2[1] - c1[1];
  const dz = c2[2] - c1[2];

  // 计算向量长度（两个圆心之间的距离）
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

  // 计算单位向量
  const ux = dx / distance;
  const uy = dy / distance;
  const uz = dz / distance;

  // 计算第一个球体表面的交点
  const p1: Position = [c1[0] + ux * r1, c1[1] + uy * r1, c1[2] + uz * r1];

  // 计算第二个球体表面的交点
  const p2: Position = [c2[0] - ux * r2, c2[1] - uy * r2, c2[2] - uz * r2];

  return [p1, p2];
}

export const hexToThreeColor = (hex: string) => {
  const r = parseInt(hex.substring(1, 3), 16);
  const g = parseInt(hex.substring(3, 5), 16);
  const b = parseInt(hex.substring(5, 7), 16);
  return new THREE.Color(r, g, b);
};

// Update three Link position
export const updateLinkObjPosition = (
  linkObj: THREE.Line,
  startPos: Position,
  endPos: Position
) => {
  if (!(linkObj.geometry instanceof THREE.BufferGeometry)) {
    console.error("Line geometry is not an instance of BufferGeometry");
    return;
  }
  const start = new THREE.Vector3(...startPos);
  const end = new THREE.Vector3(...endPos);

  // 创建一个新的 Float32Array 来存储位置数据
  const positions = new Float32Array([
    start.x,
    start.y,
    start.z,
    end.x,
    end.y,
    end.z,
  ]);

  linkObj.geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3)
  );

  // 确保 Three.js 知道需要更新这个对象
  linkObj.geometry.computeBoundingSphere();
  // linkObj.geometry.attributes.position.needsUpdate = true;
};

// Function to create a link object
export const createLinkObject = ({
  color,
  opacity = 1,
}: {
  color: THREE.Color;
  opacity?: number;
}) => {
  const geometry = new THREE.BufferGeometry();
  const material = new THREE.LineBasicMaterial({
    color,
    opacity,
    transparent: opacity < 1,
    depthWrite: opacity >= 1,
  });
  return new THREE.Line(geometry, material);
};

// Function to create a node object
export const createNodeObject = ({
  color,
  // node,
  radius = 5,
  nodeResolution = 16,
  opacity = 1,
}: {
  color: THREE.Color;
  // node?: Node;
  radius: number;
  nodeResolution?: number;
  opacity?: number;
}) => {
  const geometry = new THREE.SphereGeometry(
    radius,
    nodeResolution,
    nodeResolution
  );
  const material = new THREE.MeshLambertMaterial({
    color,
    opacity,
    transparent: opacity < 1,
    depthWrite: opacity >= 1,
  });
  const sphere = new THREE.Mesh(geometry, material);
  return sphere;
};

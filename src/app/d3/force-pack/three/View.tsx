"use client";
import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as d3 from "d3";

type NodePos = { x: number; y: number; z: number };

const getColor = (i: number) => hexToThreeColor(d3.schemeCategory10[i]);

const hexToThreeColor = (hex: string) => {
  const r = parseInt(hex.substring(1, 3), 16);
  const g = parseInt(hex.substring(3, 5), 16);
  const b = parseInt(hex.substring(5, 7), 16);
  return new THREE.Color(r, g, b);
};

// Function to create a link object
const createLinkObject = ({
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
const createNodeObject = ({
  color,
  node,
  radius = 5,
  nodeResolution = 16,
  opacity = 1,
}: {
  color: THREE.Color;
  node: Node;
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

const graphData = {
  nodes: [
    {
      id: "0",
      children: {
        nodes: [{ id: "00" }, { id: "01" }, { id: "02" }],
        links: [
          { target: "01", source: "00" },
          { target: "02", source: "00" },
        ],
      },
    },
    {
      id: "1",
      children: {
        nodes: [{ id: "10" }, { id: "11" }, { id: "12" }, { id: "13" }],
        links: [
          { target: "11", source: "10" },
          { target: "12", source: "10" },
          { target: "13", source: "11" },
        ],
      },
    },
    {
      id: "2",
      children: {
        nodes: [
          { id: "20" },
          { id: "21" },
          { id: "22" },
          { id: "23" },
          { id: "24" },
        ],
        links: [
          { target: "21", source: "20" },
          { target: "22", source: "21" },
          { target: "23", source: "20" },
          { target: "24", source: "21" },
        ],
      },
    },
    {
      id: "3",
      children: {
        nodes: [{ id: "30" }, { id: "31" }, { id: "32" }],
        links: [
          { target: "31", source: "30" },
          { target: "32", source: "30" },
        ],
      },
    },
  ],
  links: [
    { target: "1", source: "0" },
    { target: "2", source: "0" },
    { target: "3", source: "0" },
  ],
};

type Node = {
  id: string;
  children?: Main;
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
};

type Link = d3.SimulationLinkDatum<Node>;

type Main = { nodes: Node[]; links: Link[] };

const getAllChildLength = (node: Node): number => {
  if (node?.children?.nodes?.length) {
    return (
      node.children.nodes.length +
      node.children.nodes.reduce((pre, cur) => pre + getAllChildLength(cur), 0)
    );
  } else {
    return 0;
  }
};

const nodeRadiusScale = d3.scaleSqrt().domain([1, 2]).range([20, 80]);

type Position = [number, number, number];

const getNodePosition = (node: NodePos): Position => [
  node.x || 0,
  node.y || 0,
  node.z || 0,
];

const updateLinkObjPosition = (
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

const drawLevelForce = (
  data: Main,
  container: THREE.Group,
  {
    level = 0,
    center = [0, 0, 0],
    containerRadius,
  }: {
    level: number;
    center?: [number, number, number];
    containerRadius: number;
  }
) => {
  const { nodes, links } = data;

  const levelMaxLen = Math.max(...nodes.map(getAllChildLength)) || 1;
  const size = nodeRadiusScale(levelMaxLen);
  const radius = size / 2;
  const simulation = d3
    .forceSimulation(nodes)
    .force(
      "link",
      d3
        .forceLink(links)
        .id((d: any) => d.id)
        .distance(size * 2)
    )
    .force("charge", d3.forceManyBody().strength(-50))
    .force("center", d3.forceCenter(center[0], center[1]))
    .force("circularConstraint", (alpha) => {
      if (level === 0) return;
      const padding = 10;
      nodes.forEach((node, i) => {
        const dx = node.x! - center[0];
        const dy = node.y! - center[1];
        // const dz = node.z! - center[2];
        // const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const distance = Math.sqrt(dx * dx + dy * dy);
        const max = containerRadius - padding - radius;
        if (distance > max) {
          const scale = max / distance;
          node.x = center[0] + dx * scale;
          node.y = center[1] + dy * scale;
          node.z = 0;
        }
      });
    });

  const color = getColor(level);

  const linkObjArr = data.links.map((link) => {
    const linkObj = createLinkObject({ color, opacity: 0.2 });
    container.add(linkObj);
    return linkObj;
  });

  const nodeObjArr = data.nodes.map((node) => {
    const nodeObj = createNodeObject({
      color,
      node,
      radius,
      opacity: !!level ? 1 : 0.6,
    });
    container.add(nodeObj);
    return nodeObj;
  });

  const dataKey = "__child_group";

  data.nodes.forEach(function (node, i) {
    if (node.children) {
      const nodeObj = nodeObjArr[i];
      const group = new THREE.Group();
      container.add(group);
      (nodeObj as any)["dataKey"] = group;
      drawLevelForce(node.children, group, {
        level: level + 1,
        containerRadius: radius,
        center: getNodePosition(node as NodePos),
      });
    }
  });

  simulation.on("tick", () => {
    linkObjArr.forEach((linkObj, i) => {
      const link = data.links[i];
      const startNode = link.source as NodePos;
      const endNode = link.target as NodePos;

      updateLinkObjPosition(
        linkObj,
        getNodePosition(startNode),
        getNodePosition(endNode)
      );
    });
    nodeObjArr.forEach((nodeObj, i) => {
      const node = data.nodes[i];
      const x = node.x || 0;
      const y = node.y || 0;
      const z = 0;
      nodeObj.position.x = x;
      nodeObj.position.y = y;
      nodeObj.position.z = z;
      const childGroup: THREE.Group = (nodeObj as any)["dataKey"];
      if (!!childGroup) {
        childGroup.position.x = x;
        childGroup.position.y = y;
        childGroup.position.z = z;
      }
    });
  });
};

const main = (data: Main) => {
  const width = window.innerWidth,
    height = window.innerHeight;
  // Set up scene
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 10000);
  const len = data.nodes.length;
  camera.position.z = Math.cbrt(len) * 180;

  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(width, height);

  // const ambientLight = new THREE.AmbientLight(0x404040);
  // scene.add(ambientLight);
  // const pointLight = new THREE.PointLight(0xffffff, 1, 0);
  // pointLight.position.set(10, 10, 10);
  // scene.add(pointLight);

  [
    new THREE.AmbientLight(0x404040),
    new THREE.PointLight(0xffffff, 1, 0),
  ].forEach((light) => scene.add(light));

  // Add controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.25;
  controls.enableZoom = true;

  const group = new THREE.Group();
  scene.add(group);
  drawLevelForce(data, group, {
    level: 0,
    containerRadius: Math.min(width, height) / 2,
    center: [0, 0, 0],
  });

  const animate = () => {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  };
  animate();

  return renderer.domElement;
};

function View() {
  const mountRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const elem = main(graphData);
    mountRef.current?.appendChild(elem);
    return () => {
      mountRef.current?.removeChild(elem);
    };
  }, []);
  return <div className="" ref={mountRef}></div>;
}

export default View;

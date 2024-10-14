"use client";
import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { DragControls } from "three/addons/controls/DragControls.js";
import * as d3 from "d3";
import {
  NodePos,
  NodeGen,
  LinkGen,
  getNodePosition,
  hexToThreeColor,
  updateLinkObjPosition,
  createLinkObject,
  createNodeObject,
  getAllChildLength,
  nodeRadiusScale,
  getThreeColor,
} from "@/libs/three-utils";

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

type Node = NodeGen<NodeExt>;
type Link = LinkGen<NodeExt>;

type Main = { nodes: Node[]; links: Link[] };

type NodeExt = {
  children?: Main;
};

const drawLevelForce = (
  data: Main,
  container: THREE.Group,
  {
    level = 0,
    center = [0, 0, 0],
    containerRadius,
    listenDrag,
  }: {
    level: number;
    center?: [number, number, number];
    containerRadius: number;
    listenDrag: (objects: THREE.Object3D[]) => void;
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
    .force("collide", d3.forceCollide(radius))
    .force("circularConstraint", (alpha) => {
      if (level === 0) return;
      const padding = 10;
      nodes.forEach((node, i) => {
        const dx = node.x! - center[0];
        const dy = node.y! - center[1];
        const dz = 0;
        // const dz = node.z! - center[2];
        // const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const max = containerRadius - padding - radius;
        if (distance > max) {
          const scale = max / distance;
          node.x = center[0] + dx * scale;
          node.y = center[1] + dy * scale;
          node.z = 0;
        }
      });
    });

  const color = getThreeColor(level);

  const linkObjArr = data.links.map((link) => {
    const linkObj = createLinkObject({ color, opacity: 0.2 });
    container.add(linkObj);
    return linkObj;
  });

  const nodeObjArr = data.nodes.map((node) => {
    const nodeObj = createNodeObject({
      color,
      // node,
      radius,
      opacity: !!level ? 1 : 0.6,
    });
    container.add(nodeObj);
    return nodeObj;
  });

  listenDrag(nodeObjArr);

  const childGroupKey = "__child_group";

  data.nodes.forEach(function (node, i) {
    if (node.children) {
      const nodeObj = nodeObjArr[i];
      const group = new THREE.Group();
      container.add(group);
      (nodeObj as any)[childGroupKey] = group;
      drawLevelForce(node.children, group, {
        level: level + 1,
        containerRadius: radius,
        center: getNodePosition(node as NodePos),
        listenDrag,
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
      const childGroup: THREE.Group = (nodeObj as any)[childGroupKey];
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
  const orbitControl = new OrbitControls(camera, renderer.domElement);
  orbitControl.enableDamping = true;
  orbitControl.dampingFactor = 0.25;
  orbitControl.enableZoom = true;

  const dragObjects: THREE.Object3D[] = [];
  const dragControl = new DragControls(
    dragObjects,
    camera,
    renderer.domElement
  );
  dragControl.addEventListener("dragstart", function (event) {
    orbitControl.enabled = false; // Disable controls while dragging
    // event.object.material.color.set("crimson");
  });
  dragControl.addEventListener("dragend", function (event) {
    orbitControl.enabled = true; // Re-enable controls
    // event.object.material.color.set("tan");
  });

  // Drag control listener
  const listenDrag = (objects: THREE.Object3D[]) => {
    dragObjects.push(...objects);
  };

  const group = new THREE.Group();
  scene.add(group);
  drawLevelForce(data, group, {
    level: 0,
    containerRadius: Math.min(width, height) / 2,
    center: [0, 0, 0],
    listenDrag,
  });

  const animate = () => {
    requestAnimationFrame(animate);
    orbitControl.update();
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

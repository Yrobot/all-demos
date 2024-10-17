"use client";
import React, { useRef, useCallback, useState } from "react";
import ForceGraph3D from "@/libs/force-graph";

const data = {
  nodes: [
    {
      id: "0",
      children: {
        nodes: [
          { id: "00", children: null },
          { id: "01", children: null },
          { id: "02", children: null },
        ],
        links: [
          { target: "01", source: "00" },
          { target: "02", source: "00" },
        ],
      },
    },
    {
      id: "1",
      children: {
        nodes: [
          { id: "10", children: null },
          { id: "11", children: null },
          { id: "12", children: null },
          { id: "13", children: null },
        ],
        links: [
          { target: "11", source: "10" },
          { target: "12", source: "10" },
          { target: "13", source: "12" },
        ],
      },
    },
    {
      id: "2",
      children: {
        nodes: [
          { id: "20", children: null },
          { id: "21", children: null },
          { id: "22", children: null },
          { id: "23", children: null },
          { id: "24", children: null },
        ],
        links: [
          { target: "21", source: "20" },
          { target: "22", source: "20" },
          { target: "23", source: "20" },
          { target: "24", source: "22" },
        ],
      },
    },
    {
      id: "3",
      children: {
        nodes: [
          { id: "30", children: null },
          { id: "31", children: null },
          { id: "32", children: null },
        ],
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
    { target: "3", source: "2" },
  ],
};

const getNodeColor = (
  node: any,
  {
    isHover,
    isSelected,
  }: {
    isHover: boolean;
    isSelected: boolean;
  }
) => {
  const id = node.id;
  const marked = isHover || isSelected;

  let colorType = "default";
  const isError = ["1", "12", "2", "22", "23"].includes(id);
  const isWarning = ["13", "3", "31"].includes(id);
  if (isWarning) colorType = "warning";
  if (isError) colorType = "error";

  return (
    (
      {
        default: ["#3DD598", "#05B4A2"],
        warning: ["#FF991F", "#B46C15"],
        error: ["#FB5A5A", "#F9372A"],
      }[colorType] as string[]
    )[marked ? 1 : 0] ?? "#ffffff"
  );
};

function View() {
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [hoverNode, setHoverNode] = useState<any>(null);
  const [timeMark, setTimeMark] = useState<any>(null);
  console.log({ timeMark });

  const fgRef = useRef<any>(null);

  const dataRef = useRef<any>({});
  dataRef.current.hoverNode = hoverNode;
  dataRef.current.selectedNode = selectedNode;

  const lookAt = (position: any) => {
    const graph = fgRef.current;
    const distance = 120;
    const distRatio =
      1 + distance / Math.hypot(position.x, position.y, position.z);
    graph.cameraPosition(
      {
        x: position.x * distRatio,
        y: position.y * distRatio,
        z: position.z * distRatio,
      }, // new position
      position, // lookAt ({ x, y, z })
      3000 // ms transition duration
    );
  };

  // hover or selected
  const isRelatedLink = (link: any) => {
    const { selectedNode, hoverNode } = dataRef.current;
    if (!!hoverNode || !!selectedNode) {
      return (
        [link.source.id, link.target.id].includes(hoverNode?.id) ||
        [link.source.id, link.target.id].includes(selectedNode?.id)
      );
    }
    return false;
  };

  const hooksRef = useRef<any>({
    linkWidth: (link: any) => (isRelatedLink(link) ? 1 : 0.5),
    linkDirectionalArrowLength: (link: any) => (isRelatedLink(link) ? 4 : 2),
    linkDirectionalParticles: (link: any) => (isRelatedLink(link) ? 8 : 0),
    nodeColor: (node: any, level: number) =>
      getNodeColor(node, {
        isHover: dataRef.current.hoverNode?.id === node.id,
        isSelected: dataRef.current.selectedNode?.id === node.id,
      }),
    onNodeHover: (node: any) => {
      // console.log(`onNodeHover [${node?.id}]`, node);
      // setHoverNode(node);
      // setTimeMark(Date.now());
    },
    onNodeClick: (node: any) => {
      // console.log(`onNodeClick [${node?.id}]`, node);
      // setSelectedNode(node);
      const level = node?.__threeObj?.__renderLevel;
      if (level === 0) {
        // const group = node?.__threeObj?.__group;
        // const center = [group.position, node].reduce(
        //   (pre, cur) => {
        //     pre.x += cur.x;
        //     pre.y += cur.y;
        //     pre.z += cur.z;
        //     return pre;
        //   },
        //   {
        //     x: 0,
        //     y: 0,
        //     z: 0,
        //   }
        // );
        // lookAt(center);
        lookAt(node);
      } else {
        alert(`onNodeClick [${node?.id}]`);
      }
    },
  });
  return (
    <ForceGraph3D
      ref={fgRef}
      graphData={data}
      showNavInfo={false}
      backgroundColor="#12151D"
      nodeLabel={(node) => node.id}
      nodeResolution={24}
      nodeRelSize={6}
      nodeThreeObjectExtend
      // link style
      linkWidth={hooksRef.current.linkWidth}
      linkColor="#05B4A2"
      linkOpacity={0.5}
      linkCurvature={0.1}
      linkDirectionalArrowLength={hooksRef.current.linkDirectionalArrowLength}
      linkDirectionalParticleWidth={1}
      linkDirectionalParticleColor="#05B4A2"
      linkDirectionalParticles={hooksRef.current.linkDirectionalParticles}
      linkDirectionalArrowColor="#05B4A2"
      linkDirectionalArrowRelPos={1}
      nodeColor={hooksRef.current.nodeColor}
      onNodeHover={hooksRef.current.onNodeHover}
      onNodeClick={hooksRef.current.onNodeClick}
    />
  );
}

export default View;

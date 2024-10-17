"use client";
import React, { useRef, useCallback } from "react";
import ForceGraph3D from "react-force-graph-3d";

const data = {
  nodes: [
    {
      id: "0",
    },
    {
      id: "1",
    },
    {
      id: "2",
    },
    {
      id: "3",
    },
  ],
  links: [
    { target: "1", source: "0" },
    { target: "2", source: "0" },
    { target: "3", source: "2" },
  ],
};

const getNodeColor = (node: any) => {
  const id = node.id;
  let color: string | null = null;

  Object.entries({
    "#FB5A5A": ["1", "2"],
    "#FF991F": ["3"],
  }).forEach(([colorCode, ids]) => {
    if (!!color) return;
    if (ids.includes(id)) color = colorCode;
  });
  return color ?? "#05B4A2";
};

function View() {
  const fgRef = useRef<any>(null);

  const lookAt = useCallback(
    (position: any) => {
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
    },
    [fgRef.current]
  );
  return (
    <ForceGraph3D
      ref={fgRef}
      graphData={data}
      showNavInfo={false}
      backgroundColor="#12151D"
      nodeLabel={(node) => node.id}
      nodeResolution={24}
      nodeRelSize={6}
      linkColor="#05B4A2"
      linkWidth={1}
      linkOpacity={0.5}
      linkCurvature={0.1}
      linkDirectionalParticleColor="#05B4A2"
      linkDirectionalArrowColor="#05B4A2"
      linkDirectionalArrowLength={(link) => 4}
      linkDirectionalParticleWidth={() => 1}
      linkDirectionalParticles={(link) => 8}
      linkDirectionalArrowRelPos={() => 1}
      nodeColor={getNodeColor}
      onNodeHover={(node) => {
        console.log(`onNodeHover [${node?.id}]`, node);
      }}
      onNodeClick={(node) => {
        console.log(`onNodeClick [${node?.id}]`, node);
        lookAt(node);
      }}
    />
  );
}

export default View;

"use client";
import React from "react";
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

function View() {
  return (
    <ForceGraph3D
      graphData={data}
      showNavInfo={false}
      backgroundColor="#12151D"
      nodeLabel={(node) => node.id}
      nodeResolution={24}
      nodeRelSize={6}
      nodeOpacity={0.6}
      nodeThreeObjectExtend
      linkColor="#05B4A2"
      linkOpacity={0.5}
      linkCurvature={0.1}
      linkDirectionalParticleColor="#05B4A2"
      linkDirectionalArrowColor="#05B4A2"
      linkDirectionalArrowLength={(link) => 4}
      linkDirectionalParticleWidth={() => 1}
      linkDirectionalParticles={(link) => 8}
      linkDirectionalArrowRelPos={() => 1}
      nodeColor={(node, level) => {
        return ["#219ebc", "#ffb703"][level];
      }}
      onNodeHover={(node) => {
        console.log(`onNodeHover [${node?.id}]`);
      }}
      onNodeClick={(node) => {
        console.log(`onNodeClick [${node?.id}]`);
        alert(`onNodeClick [${node?.id}]`);
      }}
    />
  );
}

export default View;

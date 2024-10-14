"use client";
import React, { useEffect } from "react";
import * as d3 from "d3";

const graphData = {
  nodes: [
    {
      id: "0",
      children: {
        nodes: [
          { id: "00", parent: "0" },
          { id: "01", parent: "0" },
          { id: "02", parent: "0" },
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
          { id: "10", parent: "1" },
          { id: "11", parent: "1" },
          { id: "12", parent: "1" },
          { id: "13", parent: "1" },
        ],
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
          { id: "20", parent: "2" },
          { id: "21", parent: "2" },
          { id: "22", parent: "2" },
          { id: "23", parent: "2" },
          { id: "24", parent: "2" },
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
        nodes: [
          { id: "30", parent: "3" },
          { id: "31", parent: "3" },
          { id: "32", parent: "3" },
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
    { target: "3", source: "0" },
  ],
};

const listenDragEvent = (simulation: d3.Simulation<Node, Link>) => {
  // 拖拽开始
  function dragStart(event: d3.D3DragEvent<any, Node, Node>, d: Node) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  // 拖拽中
  function dragged(event: d3.D3DragEvent<any, Node, Node>, d: Node) {
    d.fx = event.x;
    d.fy = event.y;
  }

  // 拖拽结束
  function dragEnd(event: d3.D3DragEvent<any, Node, Node>, d: Node) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
  return d3
    .drag<any, any>()
    .on("start", dragStart)
    .on("drag", dragged)
    .on("end", dragEnd);
};

type Node = {
  id: string;
  children?: Main;
} & d3.SimulationNodeDatum;

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

const drawLevelForce = (
  data: Main,
  container: d3.Selection<any, any, any, any>,
  {
    level = 0,
    center = [0, 0],
    containerRadius,
  }: { level: number; center?: [number, number]; containerRadius: number }
) => {
  const { nodes, links } = data;

  // const size = levelSizeScale(level);
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
    .force("charge", d3.forceManyBody().strength(-500))
    .force("center", d3.forceCenter(center[0], center[1]))
    .force("collide", d3.forceCollide(radius))
    .force("circularConstraint", (alpha) => {
      if (level === 0) return;
      const padding = 10;
      nodes.forEach((node, i) => {
        const dx = node.x! - center[0];
        const dy = node.y! - center[1];
        const distance = Math.sqrt(dx * dx + dy * dy);
        const max = containerRadius - padding - radius;
        if (distance > max) {
          const scale = max / distance;
          node.x = center[0] + dx * scale;
          node.y = center[1] + dy * scale;
        }
      });
    });

  const color = d3.schemeCategory10[level];

  const linkArr = container
    .append("g")
    .selectAll("line")
    .data(links)
    .enter()
    .append("line")
    .attr("stroke", color)
    .attr("stroke-opacity", 0.6)
    .attr("stroke-width", 2);

  const nodeArr = container
    .append("g")
    .selectAll("g")
    .data(nodes)
    .enter()
    .append("g")
    .call(listenDragEvent(simulation));

  nodeArr
    .append("circle")
    .attr("r", (d) => radius)
    .attr("fill", color)
    .attr("max", levelMaxLen);
  // .attr('cursor', 'pointer');

  simulation.on("tick", () => {
    linkArr
      .attr("x1", (d) => (d.source as Node).x!)
      .attr("y1", (d) => (d.source as Node).y!)
      .attr("x2", (d) => (d.target as Node).x!)
      .attr("y2", (d) => (d.target as Node).y!);

    nodeArr.attr("transform", (d) => `translate(${d.x},${d.y})`);
  });

  nodeArr.each(function (d) {
    const node = d3.select(this);
    if (d.children) {
      drawLevelForce(d.children, node.append("g"), {
        level: level + 1,
        containerRadius: radius,
      });
    }
  });
};

//////////////////////// DATA
const nodes = graphData.nodes;

const links = graphData.links;

const ID = "force-park";

const main = () => {
  const width = window.innerWidth,
    height = window.innerHeight;

  const svg = d3
    .select(`#${ID}`)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  drawLevelForce({ nodes, links }, svg, {
    level: 0,
    center: [width / 2, height / 2],
    containerRadius: Math.min(width, height) / 2,
  });
};

function View() {
  useEffect(() => main(), []);
  return <div id={ID}></div>;
}

export default View;

"use client";
import React, { useEffect } from "react";
import * as d3 from "d3";

const graphData = {
  nodes: [
    { id: "0", parent: null },
    { id: "1", parent: null },
    { id: "2", parent: null },
    { id: "3", parent: null },
    { id: "00", parent: "0" },
    { id: "01", parent: "0" },
    { id: "02", parent: "0" },
    { id: "10", parent: "1" },
    { id: "11", parent: "1" },
    { id: "12", parent: "1" },
    { id: "13", parent: "1" },
    { id: "20", parent: "2" },
    { id: "21", parent: "2" },
    { id: "22", parent: "2" },
    { id: "23", parent: "2" },
    { id: "24", parent: "2" },
    { id: "30", parent: "3" },
    { id: "31", parent: "3" },
    { id: "32", parent: "3" },
  ],
  links: [
    { target: "1", source: "0" },
    { target: "2", source: "0" },
    { target: "3", source: "0" },
    { target: "01", source: "00" },
    { target: "02", source: "00" },
    { target: "11", source: "10" },
    { target: "12", source: "10" },
    { target: "13", source: "11" },
    { target: "21", source: "20" },
    { target: "22", source: "21" },
    { target: "23", source: "20" },
    { target: "24", source: "21" },
    { target: "31", source: "30" },
    { target: "32", source: "30" },
  ],
};

const ID = "force-park";

const main = () => {
  const width = 400,
    height = 400;

  const svg = d3
    .select(`#${ID}`)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  var padding = { left: 30, right: 30, top: 20, bottom: 20 };

  var dataset = [250, 210, 170, 130, 240]; //数据（表示矩形的宽度）

  const xScale = d3
    .scaleLinear()
    .domain([0, Math.max(...dataset) + 20])
    .range([0, width - padding.left - padding.right]);

  const yScale = d3
    .scaleLinear()
    .domain([0, dataset.length - 1])
    .range([height - padding.top - padding.bottom, 0])
    .rangeRound([height - padding.top - padding.bottom - 20, 20]);

  d3.axisLeft(yScale).ticks(dataset.length).tickSizeOuter(2)(
    svg
      .append("g")
      .attr("transform", `translate(${padding.left}, ${padding.top})`)
  );

  d3.axisBottom(xScale).ticks(7)(
    svg
      .append("g")
      .attr(
        "transform",
        `translate(${padding.left}, ${height - padding.bottom})`
      )
  );

  var rectHeight = 25; //每个矩形所占的像素高度(包括空白)

  svg
    .selectAll("rect")
    .data(dataset)
    .enter()
    .append("rect")
    .attr("transform", `translate(${padding.left}, ${padding.top})`)
    .attr("x", 0)
    .attr("y", function (_, i) {
      return yScale(i) - rectHeight / 2;
    })
    .attr("width", function (d) {
      return xScale(d);
    })
    .attr("height", rectHeight - 4)
    .attr("fill", "steelblue")
    .on("mouseover", function () {
      d3.select(this).attr("fill", "red");
    })
    .on("mouseout", function () {
      d3.select(this).transition().duration(500).attr("fill", "steelblue");
    });

  svg
    .selectAll(".my-text")
    .data(dataset)
    .enter()
    .append("text")
    .attr("transform", `translate(${padding.left}, ${padding.top})`)
    .attr("x", function (d) {
      return xScale(d) + 8;
    })
    .attr("y", function (_, i) {
      return yScale(i) + 4;
    })
    .text((d) => d);
};

function View() {
  useEffect(() => main(), []);
  return <div id={ID}></div>;
}

export default View;

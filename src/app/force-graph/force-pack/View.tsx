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

const IS_COMPLETE = true;

const graphData = {
  nodes: [
    { id: "0", parent: null },
    { id: "1", parent: null },
    { id: "2", parent: null },
    { id: "3", parent: null },
    ...(IS_COMPLETE
      ? [
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
        ]
      : []),
  ],
  links: [
    { target: "1", source: "0" },
    { target: "2", source: "0" },
    { target: "3", source: "2" },
    ...(IS_COMPLETE
      ? [
          { target: "01", source: "00" },
          { target: "02", source: "00" },
          { target: "11", source: "10" },
          { target: "12", source: "10" },
          { target: "13", source: "12" },
          { target: "21", source: "20" },
          { target: "22", source: "20" },
          { target: "23", source: "20" },
          { target: "24", source: "22" },
          { target: "31", source: "30" },
          { target: "32", source: "30" },
        ]
      : []),
  ],
};

function View() {
  return <ForceGraph3D graphData={graphData} />;
}

export default View;
"use client";
import React, { useEffect } from "react";
import ForcePack from "@/libs/force-pack";

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

const ID = "force-park";

const main = () => {
  const forcePack = ForcePack({})(document.getElementById(ID)).graphData(
    graphData
  );

  const animate = () => {
    forcePack.tick();
    requestAnimationFrame(animate);
  };
  animate();
};

function View() {
  useEffect(() => main(), []);
  return (
    <div
      id={ID}
      style={{
        width: "100vw",
        height: "100vh",
      }}
    ></div>
  );
}

export default View;

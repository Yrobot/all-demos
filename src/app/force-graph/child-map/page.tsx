"use client";
// import dynamic from "next/dynamic";
// import ForceGraph3D from "react-force-graph-3d";
import ForceGraph3D from "@/libs/force-graph";

// const ForceGraph3D = dynamic(() => import("@/libs/force-graph"), {
//   ssr: false,
//   loading: () => <p>Loading...</p>,
// });

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

export default function Page() {
  return <ForceGraph3D graphData={graphData} />;
}

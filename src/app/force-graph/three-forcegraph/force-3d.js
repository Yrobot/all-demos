// import {
//   forceSimulation as d3ForceSimulation,
//   forceLink as d3ForceLink,
//   forceManyBody as d3ForceManyBody,
//   forceCenter as d3ForceCenter,
//   forceRadial as d3ForceRadial,
// } from "@/libs/d3-force-3d";

import * as THREE from "three";
import ThreeForceGraph from "@/libs/three-forcegraph";

export default ({ graphData }) => {
  const Graph = new ThreeForceGraph().graphData(graphData);
  const len = graphData.nodes.length;

  // Setup renderer
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Setup scene
  const scene = new THREE.Scene();
  scene.add(Graph);
  scene.add(new THREE.AmbientLight(0xcccccc, Math.PI));

  // Setup camera
  const camera = new THREE.PerspectiveCamera();
  camera.far = 10000;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  camera.lookAt(Graph.position);
  camera.position.z = Math.cbrt(len) * 180;

  // Kick-off renderer
  (function animate() {
    // IIFE
    Graph.tickFrame();

    // Frame cycle
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  })();

  return renderer.domElement;
};

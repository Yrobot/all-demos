import * as THREE from "three";
import ThreeForceGraph from "@/libs/three-forcegraph_loop";

export default ({ graphData }) => {
  const Graph = new ThreeForceGraph().graphData(graphData);
  const len = graphData.nodes.length;

  // Setup renderer
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Setup scene
  const scene = new THREE.Scene();
  scene.add(Graph);

  // Lights
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

import * as THREE from "three";
import ThreeForceGraph from "@/libs/three-forcegraph";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export default ({ graphData }) => {
  const Graph = new ThreeForceGraph()
    .graphData(graphData)
    .nodeResolution(24)
    .nodeColor((node, level) => {
      const id = node.id;
      let color = null;

      Object.entries({
        "#FB5A5A": ["1", "12", "2", "22", "23"],
        "#FF991F": ["13", "3", "31"],
      }).forEach(([colorCode, ids]) => {
        if (!!color) return;
        if (ids.includes(id)) color = colorCode;
      });
      return color ?? "#05B4A2";
    });
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

  // Add orbitControl
  const orbitControl = new OrbitControls(camera, renderer.domElement);
  orbitControl.enableDamping = true;
  orbitControl.dampingFactor = 0.25;
  orbitControl.enableZoom = true;

  let initZoom = 0;
  setTimeout(() => {
    initZoom = orbitControl.target.distanceTo(orbitControl.object.position);
    calcDisplayLevel();
  }, 500);
  const calcDisplayLevel = () => {
    if (initZoom === 0) return;
    const currentZoom = orbitControl.target.distanceTo(
      orbitControl.object.position
    );
    const zoom = initZoom / currentZoom;
    const displayLevel = zoom > 1.4 ? 1 : 0;
    if (displayLevel !== Graph.displayLevel()) {
      console.log("displayLevel", Graph.displayLevel(), displayLevel);
      Graph.displayLevel(displayLevel);
    }
  };
  orbitControl.addEventListener("change", () => {
    calcDisplayLevel();
  });

  // Kick-off renderer
  (function animate() {
    // IIFE
    Graph.tickFrame();

    // Frame cycle
    renderer.render(scene, camera);
    orbitControl.update();
    requestAnimationFrame(animate);
  })();

  return renderer.domElement;
};

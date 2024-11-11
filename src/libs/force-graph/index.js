import fromKapsule from "react-kapsule";
import ForceGraph3DKapsule from "./3d-force-graph";

const ForceGraph3D = fromKapsule(ForceGraph3DKapsule, {
  methodNames: [
    // bind methods
    "emitParticle",
    "d3Force",
    "d3ReheatSimulation",
    "stopAnimation",
    "pauseAnimation",
    "resumeAnimation",
    "cameraPosition",
    "zoomToFit",
    "getGraphBbox",
    "screen2GraphCoords",
    "graph2ScreenCoords",
    "postProcessingComposer",
    "lights",
    "scene",
    "camera",
    "renderer",
    "controls",
    "refresh",
    "cameraAnimationTime",
  ],
  initPropNames: ["controlType", "rendererConfig", "extraRenderers"],
});

ForceGraph3D.displayName = "ForceGraph3D";

export default ForceGraph3D;

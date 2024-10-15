import {
  Group,
  Mesh,
  MeshLambertMaterial,
  Color,
  BufferGeometry,
  BufferAttribute,
  Matrix4,
  Vector3,
  SphereGeometry,
  CylinderGeometry,
  TubeGeometry,
  ConeGeometry,
  Line,
  LineBasicMaterial,
  QuadraticBezierCurve3,
  CubicBezierCurve3,
  Box3,
} from "three";

import {
  NodePos,
  NodeGen,
  LinkGen,
  getNodePosition,
  hexToThreeColor,
  updateLinkObjPosition,
  createLinkObject,
  createNodeObject,
  getAllChildLength,
  nodeRadiusScale,
  getHexColor,
} from "@/libs/three-utils";

const three = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : {
      Group,
      Mesh,
      MeshLambertMaterial,
      Color,
      BufferGeometry,
      BufferAttribute,
      Matrix4,
      Vector3,
      SphereGeometry,
      CylinderGeometry,
      TubeGeometry,
      ConeGeometry,
      Line,
      LineBasicMaterial,
      QuadraticBezierCurve3,
      CubicBezierCurve3,
      Box3,
    };

import {
  forceSimulation as d3ForceSimulation,
  forceLink as d3ForceLink,
  forceManyBody as d3ForceManyBody,
  forceCenter as d3ForceCenter,
  forceRadial as d3ForceRadial,
} from "@/libs/d3-force-3d";

import graph from "ngraph.graph";
import forcelayout from "ngraph.forcelayout";
const ngraph = { graph, forcelayout };

import Kapsule from "kapsule";
import accessorFn from "accessor-fn";

import { min as d3Min, max as d3Max } from "d3-array";

import threeDigest from "./utils/three-digest";
import { emptyObject } from "./utils/three-gc";
import {
  autoColorObjects,
  colorStr2Hex,
  colorAlpha,
} from "./utils/color-utils";
import getDagDepths from "./utils/dagDepths";

import {
  loopLevelScene,
  loopData,
  getLayout,
  setLayout,
  tickAllLayout,
  initLevelLayout,
  tickLevelLayout,
} from "./abstract";

export default Kapsule({
  props: {
    jsonUrl: {
      onChange: function (jsonUrl, state) {
        if (jsonUrl && !state.fetchingJson) {
          // Load data asynchronously
          state.fetchingJson = true;
          state.onLoading();

          fetch(jsonUrl)
            .then((r) => r.json())
            .then((json) => {
              state.fetchingJson = false;
              state.onFinishLoading(json);
              this.graphData(json);
            });
        }
      },
      triggerUpdate: false,
    },
    graphData: {
      default: {
        nodes: [],
        links: [],
      },
      onChange(graphData, state) {
        state.engineRunning = false; // Pause simulation immediately
      },
    },
    numDimensions: {
      default: 3,
      onChange(numDim, state) {
        const chargeForce = state.d3ForceLayout.force("charge");
        // Increase repulsion on 3D mode for improved spatial separation
        if (chargeForce) {
          chargeForce.strength(numDim > 2 ? -60 : -30);
        }

        if (numDim < 3) {
          eraseDimension(state.graphData.nodes, "z");
        }
        if (numDim < 2) {
          eraseDimension(state.graphData.nodes, "y");
        }

        function eraseDimension(nodes, dim) {
          nodes.forEach((d) => {
            delete d[dim]; // position
            delete d[`v${dim}`]; // velocity
          });
        }
      },
    },
    dagMode: {
      onChange(dagMode, state) {
        // td, bu, lr, rl, zin, zout, radialin, radialout
        !dagMode &&
          state.forceEngine === "d3" &&
          (state.graphData.nodes || []).forEach(
            (n) => (n.fx = n.fy = n.fz = undefined)
          ); // unfix nodes when disabling dag mode
      },
    },
    dagLevelDistance: {},
    dagNodeFilter: { default: (node) => true },
    onDagError: { triggerUpdate: false },
    nodeRelSize: { default: 4 }, // volume per val unit
    nodeId: { default: "id" },
    nodeVal: { default: "val" },
    nodeResolution: { default: 8 }, // how many slice segments in the sphere's circumference
    nodeColor: { default: "color" },
    nodeAutoColorBy: {},
    nodeOpacity: { default: 0.75 },
    nodeVisibility: { default: true },
    nodeThreeObject: {},
    nodeThreeObjectExtend: { default: false },
    nodePositionUpdate: { triggerUpdate: false }, // custom function to call for updating the node's position. Signature: (threeObj, { x, y, z}, node). If the function returns a truthy value, the regular node position update will not run.
    linkSource: { default: "source" },
    linkTarget: { default: "target" },
    linkVisibility: { default: true },
    linkColor: { default: "color" },
    linkAutoColorBy: {},
    linkOpacity: { default: 0.2 },
    linkWidth: {}, // Rounded to nearest decimal. For falsy values use dimensionless line with 1px regardless of distance.
    linkResolution: { default: 6 }, // how many radial segments in each line tube's geometry
    linkCurvature: { default: 0, triggerUpdate: false }, // line curvature radius (0: straight, 1: semi-circle)
    linkCurveRotation: { default: 0, triggerUpdate: false }, // line curve rotation along the line axis (0: interection with XY plane, PI: upside down)
    linkMaterial: {},
    linkThreeObject: {},
    linkThreeObjectExtend: { default: false },
    linkPositionUpdate: { triggerUpdate: false }, // custom function to call for updating the link's position. Signature: (threeObj, { start: { x, y, z},  end: { x, y, z }}, link). If the function returns a truthy value, the regular link position update will not run.
    linkDirectionalArrowLength: { default: 0 },
    linkDirectionalArrowColor: {},
    linkDirectionalArrowRelPos: { default: 0.5, triggerUpdate: false }, // value between 0<>1 indicating the relative pos along the (exposed) line
    linkDirectionalArrowResolution: { default: 8 }, // how many slice segments in the arrow's conic circumference
    linkDirectionalParticles: { default: 0 }, // animate photons travelling in the link direction
    linkDirectionalParticleSpeed: { default: 0.01, triggerUpdate: false }, // in link length ratio per frame
    linkDirectionalParticleWidth: { default: 0.5 },
    linkDirectionalParticleColor: {},
    linkDirectionalParticleResolution: { default: 4 }, // how many slice segments in the particle sphere's circumference
    forceEngine: { default: "d3" }, // d3 or ngraph
    d3AlphaMin: { default: 0 },
    d3AlphaDecay: {
      default: 0.0228,
      triggerUpdate: false,
      onChange(alphaDecay, state) {
        state.d3ForceLayout.alphaDecay(alphaDecay);
      },
    },
    d3AlphaTarget: {
      default: 0,
      triggerUpdate: false,
      onChange(alphaTarget, state) {
        state.d3ForceLayout.alphaTarget(alphaTarget);
      },
    },
    d3VelocityDecay: {
      default: 0.4,
      triggerUpdate: false,
      onChange(velocityDecay, state) {
        state.d3ForceLayout.velocityDecay(velocityDecay);
      },
    },
    ngraphPhysics: {
      default: {
        // defaults from https://github.com/anvaka/ngraph.physics.simulator/blob/master/index.js
        timeStep: 20,
        gravity: -1.2,
        theta: 0.8,
        springLength: 30,
        springCoefficient: 0.0008,
        dragCoefficient: 0.02,
      },
    },
    warmupTicks: { default: 0, triggerUpdate: false }, // how many times to tick the force engine at init before starting to render
    cooldownTicks: { default: Infinity, triggerUpdate: false },
    cooldownTime: { default: 15000, triggerUpdate: false }, // ms
    onLoading: { default: () => {}, triggerUpdate: false },
    onFinishLoading: { default: () => {}, triggerUpdate: false },
    onUpdate: { default: () => {}, triggerUpdate: false },
    onFinishUpdate: { default: () => {}, triggerUpdate: false },
    onEngineTick: { default: () => {}, triggerUpdate: false },
    onEngineStop: { default: () => {}, triggerUpdate: false },
  },

  methods: {
    refresh: function (state) {
      state._flushObjects = true;
      state._rerender();
      return this;
    },
    // Expose d3 forces for external manipulation
    d3Force: function (state, forceName, forceFn) {
      if (forceFn === undefined) {
        return state.d3ForceLayout.force(forceName); // Force getter
      }
      state.d3ForceLayout.force(forceName, forceFn); // Force setter
      return this;
    },
    d3ReheatSimulation: function (state) {
      state.d3ForceLayout.alpha(1);
      this.resetCountdown();
      return this;
    },
    // reset cooldown state
    resetCountdown: function (state) {
      state.cntTicks = 0;
      state.startTickTime = new Date();
      state.engineRunning = true;
      return this;
    },
    tickFrame: function (state) {
      // return;
      const isD3Sim = state.forceEngine !== "ngraph";

      if (state.engineRunning) {
        layoutTick();
      }
      updateArrows();
      updatePhotons();

      return this;

      //

      function layoutTick() {
        if (
          ++state.cntTicks > state.cooldownTicks ||
          new Date() - state.startTickTime > state.cooldownTime ||
          (isD3Sim &&
            state.d3AlphaMin > 0 &&
            state.d3ForceLayout.alpha() < state.d3AlphaMin)
        ) {
          state.engineRunning = false; // Stop ticking graph
          state.onEngineStop();
        } else {
          // state.layout[isD3Sim ? "tick" : "step"](); // Tick it
          tickAllLayout(state.graphData, isD3Sim);
          state.onEngineTick();
        }

        tickLevelLayout({
          data: state.graphData,
          state,
          isD3Sim,
        });
      }

      function updateArrows() {
        // update link arrow position
        const arrowRelPosAccessor = accessorFn(
          state.linkDirectionalArrowRelPos
        );
        const arrowLengthAccessor = accessorFn(
          state.linkDirectionalArrowLength
        );
        const nodeValAccessor = accessorFn(state.nodeVal);

        state.graphData.links.forEach((link) => {
          const arrowObj = link.__arrowObj;
          if (!arrowObj) return;

          const pos = isD3Sim
            ? link
            : state.layout.getLinkPosition(
                state.layout.graph.getLink(link.source, link.target).id
              );
          const start = pos[isD3Sim ? "source" : "from"];
          const end = pos[isD3Sim ? "target" : "to"];

          if (
            !start ||
            !end ||
            !start.hasOwnProperty("x") ||
            !end.hasOwnProperty("x")
          )
            return; // skip invalid link

          const startR =
            Math.cbrt(Math.max(0, nodeValAccessor(start) || 1)) *
            state.nodeRelSize;
          const endR =
            Math.cbrt(Math.max(0, nodeValAccessor(end) || 1)) *
            state.nodeRelSize;

          const arrowLength = arrowLengthAccessor(link);
          const arrowRelPos = arrowRelPosAccessor(link);

          const getPosAlongLine = link.__curve
            ? (t) => link.__curve.getPoint(t) // interpolate along bezier curve
            : (t) => {
                // straight line: interpolate linearly
                const iplt = (dim, start, end, t) =>
                  start[dim] + (end[dim] - start[dim]) * t || 0;
                return {
                  x: iplt("x", start, end, t),
                  y: iplt("y", start, end, t),
                  z: iplt("z", start, end, t),
                };
              };

          const lineLen = link.__curve
            ? link.__curve.getLength()
            : Math.sqrt(
                ["x", "y", "z"]
                  .map((dim) =>
                    Math.pow((end[dim] || 0) - (start[dim] || 0), 2)
                  )
                  .reduce((acc, v) => acc + v, 0)
              );

          const posAlongLine =
            startR +
            arrowLength +
            (lineLen - startR - endR - arrowLength) * arrowRelPos;

          const arrowHead = getPosAlongLine(posAlongLine / lineLen);
          const arrowTail = getPosAlongLine(
            (posAlongLine - arrowLength) / lineLen
          );

          ["x", "y", "z"].forEach(
            (dim) => (arrowObj.position[dim] = arrowTail[dim])
          );

          const headVec = new three.Vector3(
            ...["x", "y", "z"].map((c) => arrowHead[c])
          );
          arrowObj.parent.localToWorld(headVec); // lookAt requires world coords
          arrowObj.lookAt(headVec);
        });
      }

      function updatePhotons() {
        // update link particle positions
        const particleSpeedAccessor = accessorFn(
          state.linkDirectionalParticleSpeed
        );
        state.graphData.links.forEach((link) => {
          const cyclePhotons = link.__photonsObj && link.__photonsObj.children;
          const singleHopPhotons =
            link.__singleHopPhotonsObj && link.__singleHopPhotonsObj.children;

          if (
            (!singleHopPhotons || !singleHopPhotons.length) &&
            (!cyclePhotons || !cyclePhotons.length)
          )
            return;

          const pos = isD3Sim
            ? link
            : state.layout.getLinkPosition(
                state.layout.graph.getLink(link.source, link.target).id
              );
          const start = pos[isD3Sim ? "source" : "from"];
          const end = pos[isD3Sim ? "target" : "to"];

          if (
            !start ||
            !end ||
            !start.hasOwnProperty("x") ||
            !end.hasOwnProperty("x")
          )
            return; // skip invalid link

          const particleSpeed = particleSpeedAccessor(link);

          const getPhotonPos = link.__curve
            ? (t) => link.__curve.getPoint(t) // interpolate along bezier curve
            : (t) => {
                // straight line: interpolate linearly
                const iplt = (dim, start, end, t) =>
                  start[dim] + (end[dim] - start[dim]) * t || 0;
                return {
                  x: iplt("x", start, end, t),
                  y: iplt("y", start, end, t),
                  z: iplt("z", start, end, t),
                };
              };

          const photons = [
            ...(cyclePhotons || []),
            ...(singleHopPhotons || []),
          ];

          photons.forEach((photon, idx) => {
            const singleHop =
              photon.parent.__linkThreeObjType === "singleHopPhotons";

            if (!photon.hasOwnProperty("__progressRatio")) {
              photon.__progressRatio = singleHop
                ? 0
                : idx / cyclePhotons.length;
            }

            photon.__progressRatio += particleSpeed;

            if (photon.__progressRatio >= 1) {
              if (!singleHop) {
                photon.__progressRatio = photon.__progressRatio % 1;
              } else {
                // remove particle
                photon.parent.remove(photon);
                emptyObject(photon);
                return;
              }
            }

            const photonPosRatio = photon.__progressRatio;

            const pos = getPhotonPos(photonPosRatio);
            ["x", "y", "z"].forEach((dim) => (photon.position[dim] = pos[dim]));
          });
        });
      }
    },
    emitParticle: function (state, link) {
      if (link && state.graphData.links.includes(link)) {
        if (!link.__singleHopPhotonsObj) {
          const obj = new three.Group();
          obj.__linkThreeObjType = "singleHopPhotons";
          link.__singleHopPhotonsObj = obj;

          state.graphScene.add(obj);
        }

        const particleWidthAccessor = accessorFn(
          state.linkDirectionalParticleWidth
        );
        const photonR = Math.ceil(particleWidthAccessor(link) * 10) / 10 / 2;
        const numSegments = state.linkDirectionalParticleResolution;
        const particleGeometry = new three.SphereGeometry(
          photonR,
          numSegments,
          numSegments
        );

        const linkColorAccessor = accessorFn(state.linkColor);
        const particleColorAccessor = accessorFn(
          state.linkDirectionalParticleColor
        );
        const photonColor =
          particleColorAccessor(link) || linkColorAccessor(link) || "#f0f0f0";
        const materialColor = new three.Color(colorStr2Hex(photonColor));
        const opacity = state.linkOpacity * 3;
        const particleMaterial = new three.MeshLambertMaterial({
          color: materialColor,
          transparent: true,
          opacity,
        });

        // add a single hop particle
        link.__singleHopPhotonsObj.add(
          new three.Mesh(particleGeometry, particleMaterial)
        );
      }

      return this;
    },
    getGraphBbox: function (state, nodeFilter = () => true) {
      if (!state.initialised) return null;

      // recursively collect all nested geometries bboxes
      const bboxes = (function getBboxes(obj) {
        const bboxes = [];

        if (obj.geometry) {
          obj.geometry.computeBoundingBox();
          const box = new three.Box3();
          box.copy(obj.geometry.boundingBox).applyMatrix4(obj.matrixWorld);
          bboxes.push(box);
        }
        return bboxes.concat(
          ...(obj.children || [])
            .filter(
              (obj) =>
                !obj.hasOwnProperty("__graphObjType") ||
                (obj.__graphObjType === "node" && nodeFilter(obj.__data)) // exclude filtered out nodes
            )
            .map(getBboxes)
        );
      })(state.graphScene);

      if (!bboxes.length) return null;

      // extract global x,y,z min/max
      return Object.assign(
        ...["x", "y", "z"].map((c) => ({
          [c]: [
            d3Min(bboxes, (bb) => bb.min[c]),
            d3Max(bboxes, (bb) => bb.max[c]),
          ],
        }))
      );
    },
  },

  stateInit: () => ({
    d3ForceLayout: d3ForceSimulation()
      .force("link", d3ForceLink())
      .force("charge", d3ForceManyBody())
      .force("center", d3ForceCenter())
      .force("dagRadial", null)
      .stop(),
    engineRunning: false,
  }),

  init(threeObj, state) {
    // Main three object to manipulate
    state.graphScene = threeObj;
  },

  update(state, changedProps) {
    const hasAnyPropChanged = (propList) =>
      propList.some((p) => changedProps.hasOwnProperty(p));

    state.engineRunning = false; // pause simulation
    state.onUpdate();

    loopLevelScene({
      data: state.graphData,
      state,
      hasAnyPropChanged,
      group: state.graphScene,
      changedProps,
    });

    state._flushObjects = false; // reset objects refresh flag

    this.resetCountdown();

    state.engineRunning = true; // resume simulation

    state.onFinishUpdate();
  },
});

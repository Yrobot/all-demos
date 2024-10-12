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

const OPEN_LOOP = true;

const initScene = ({
  hasAnyPropChanged,
  state,
  data,
  changedProps,
  layout = d3ForceSimulation()
    .force("link", d3ForceLink())
    .force("charge", d3ForceManyBody())
    .force("center", d3ForceCenter())
    .force("dagRadial", null)
    .stop(),
}) => {
  if (
    state.nodeAutoColorBy !== null &&
    hasAnyPropChanged(["nodeAutoColorBy", "graphData", "nodeColor"])
  ) {
    // Auto add color to uncolored nodes
    autoColorObjects(
      data.nodes,
      accessorFn(state.nodeAutoColorBy),
      state.nodeColor
    );
  }
  if (
    state.linkAutoColorBy !== null &&
    hasAnyPropChanged(["linkAutoColorBy", "graphData", "linkColor"])
  ) {
    // Auto add color to uncolored links
    autoColorObjects(
      data.links,
      accessorFn(state.linkAutoColorBy),
      state.linkColor
    );
  }

  // Digest nodes WebGL objects
  if (
    state._flushObjects ||
    hasAnyPropChanged([
      "graphData",
      "nodeThreeObject",
      "nodeThreeObjectExtend",
      "nodeVal",
      "nodeColor",
      "nodeVisibility",
      "nodeRelSize",
      "nodeResolution",
      "nodeOpacity",
    ])
  ) {
    const customObjectAccessor = accessorFn(state.nodeThreeObject);
    const customObjectExtendAccessor = accessorFn(state.nodeThreeObjectExtend);
    const valAccessor = accessorFn(state.nodeVal);
    const colorAccessor = accessorFn(state.nodeColor);
    const visibilityAccessor = accessorFn(state.nodeVisibility);

    const sphereGeometries = {}; // indexed by node value
    const sphereMaterials = {}; // indexed by color

    threeDigest(data.nodes.filter(visibilityAccessor), state.graphScene, {
      purge:
        state._flushObjects ||
        hasAnyPropChanged([
          // recreate objects if any of these props have changed
          "nodeThreeObject",
          "nodeThreeObjectExtend",
        ]),
      objFilter: (obj) => obj.__graphObjType === "node",
      createObj: (node) => {
        let customObj = customObjectAccessor(node);
        const extendObj = customObjectExtendAccessor(node);

        if (customObj && state.nodeThreeObject === customObj) {
          // clone object if it's a shared object among all nodes
          customObj = customObj.clone();
        }

        let obj;

        if (customObj && !extendObj) {
          obj = customObj;
        } else {
          // Add default object (sphere mesh)
          obj = new three.Mesh();
          obj.__graphDefaultObj = true;

          if (customObj && extendObj) {
            obj.add(customObj); // extend default with custom
          }
        }

        obj.__graphObjType = "node"; // Add object type

        return obj;
      },
      updateObj: (obj, node) => {
        if (obj.__graphDefaultObj) {
          // bypass internal updates for custom node objects
          const val = valAccessor(node) || 1;
          const radius = Math.cbrt(val) * state.nodeRelSize;
          const numSegments = state.nodeResolution;

          if (
            !obj.geometry.type.match(/^Sphere(Buffer)?Geometry$/) ||
            obj.geometry.parameters.radius !== radius ||
            obj.geometry.parameters.widthSegments !== numSegments
          ) {
            if (!sphereGeometries.hasOwnProperty(val)) {
              sphereGeometries[val] = new three.SphereGeometry(
                radius,
                numSegments,
                numSegments
              );
            }

            obj.geometry.dispose();
            obj.geometry = sphereGeometries[val];
          }

          const color = colorAccessor(node);
          const materialColor = new three.Color(
            colorStr2Hex(color || "#ffffaa")
          );
          const opacity = state.nodeOpacity * colorAlpha(color);

          if (
            obj.material.type !== "MeshLambertMaterial" ||
            !obj.material.color.equals(materialColor) ||
            obj.material.opacity !== opacity
          ) {
            if (!sphereMaterials.hasOwnProperty(color)) {
              sphereMaterials[color] = new three.MeshLambertMaterial({
                color: materialColor,
                transparent: true,
                opacity,
              });
            }

            obj.material.dispose();
            obj.material = sphereMaterials[color];
          }
        }
      },
    });
  }

  // Digest links WebGL objects
  if (
    state._flushObjects ||
    hasAnyPropChanged([
      "graphData",
      "linkThreeObject",
      "linkThreeObjectExtend",
      "linkMaterial",
      "linkColor",
      "linkWidth",
      "linkVisibility",
      "linkResolution",
      "linkOpacity",
      "linkDirectionalArrowLength",
      "linkDirectionalArrowColor",
      "linkDirectionalArrowResolution",
      "linkDirectionalParticles",
      "linkDirectionalParticleWidth",
      "linkDirectionalParticleColor",
      "linkDirectionalParticleResolution",
    ])
  ) {
    const customObjectAccessor = accessorFn(state.linkThreeObject);
    const customObjectExtendAccessor = accessorFn(state.linkThreeObjectExtend);
    const customMaterialAccessor = accessorFn(state.linkMaterial);
    const visibilityAccessor = accessorFn(state.linkVisibility);
    const colorAccessor = accessorFn(state.linkColor);
    const widthAccessor = accessorFn(state.linkWidth);

    const cylinderGeometries = {}; // indexed by link width
    const lambertLineMaterials = {}; // for cylinder objects, indexed by link color
    const basicLineMaterials = {}; // for line objects, indexed by link color

    const visibleLinks = data.links.filter(visibilityAccessor);

    // lines digest cycle
    threeDigest(visibleLinks, state.graphScene, {
      objBindAttr: "__lineObj",
      purge:
        state._flushObjects ||
        hasAnyPropChanged([
          // recreate objects if any of these props have changed
          "linkThreeObject",
          "linkThreeObjectExtend",
          "linkWidth",
        ]),
      objFilter: (obj) => obj.__graphObjType === "link",
      exitObj: (obj) => {
        // remove trailing single photons
        const singlePhotonsObj = obj.__data && obj.__data.__singleHopPhotonsObj;
        if (singlePhotonsObj) {
          singlePhotonsObj.parent.remove(singlePhotonsObj);
          emptyObject(singlePhotonsObj);
          delete obj.__data.__singleHopPhotonsObj;
        }
      },
      createObj: (link) => {
        let customObj = customObjectAccessor(link);
        const extendObj = customObjectExtendAccessor(link);

        if (customObj && state.linkThreeObject === customObj) {
          // clone object if it's a shared object among all links
          customObj = customObj.clone();
        }

        let defaultObj;
        if (!customObj || extendObj) {
          // construct default line obj
          const useCylinder = !!widthAccessor(link);

          if (useCylinder) {
            defaultObj = new three.Mesh();
          } else {
            // Use plain line (constant width)
            const lineGeometry = new three.BufferGeometry();
            lineGeometry[setAttributeFn](
              "position",
              new three.BufferAttribute(new Float32Array(2 * 3), 3)
            );

            defaultObj = new three.Line(lineGeometry);
          }
        }

        let obj;
        if (!customObj) {
          obj = defaultObj;
          obj.__graphDefaultObj = true;
        } else {
          if (!extendObj) {
            // use custom object
            obj = customObj;
          } else {
            // extend default with custom in a group
            obj = new three.Group();
            obj.__graphDefaultObj = true;

            obj.add(defaultObj);
            obj.add(customObj);
          }
        }

        obj.renderOrder = 10; // Prevent visual glitches of dark lines on top of nodes by rendering them last

        obj.__graphObjType = "link"; // Add object type

        return obj;
      },
      updateObj: (updObj, link) => {
        if (updObj.__graphDefaultObj) {
          // bypass internal updates for custom link objects
          // select default object if it's an extended group
          const obj = updObj.children.length ? updObj.children[0] : updObj;

          const linkWidth = Math.ceil(widthAccessor(link) * 10) / 10;

          const useCylinder = !!linkWidth;

          if (useCylinder) {
            const r = linkWidth / 2;
            const numSegments = state.linkResolution;

            if (
              !obj.geometry.type.match(/^Cylinder(Buffer)?Geometry$/) ||
              obj.geometry.parameters.radiusTop !== r ||
              obj.geometry.parameters.radialSegments !== numSegments
            ) {
              if (!cylinderGeometries.hasOwnProperty(linkWidth)) {
                const geometry = new three.CylinderGeometry(
                  r,
                  r,
                  1,
                  numSegments,
                  1,
                  false
                );
                geometry[applyMatrix4Fn](
                  new three.Matrix4().makeTranslation(0, 1 / 2, 0)
                );
                geometry[applyMatrix4Fn](
                  new three.Matrix4().makeRotationX(Math.PI / 2)
                );
                cylinderGeometries[linkWidth] = geometry;
              }

              obj.geometry.dispose();
              obj.geometry = cylinderGeometries[linkWidth];
            }
          }

          const customMaterial = customMaterialAccessor(link);
          if (customMaterial) {
            obj.material = customMaterial;
          } else {
            const color = colorAccessor(link);
            const materialColor = new three.Color(
              colorStr2Hex(color || "#f0f0f0")
            );
            const opacity = state.linkOpacity * colorAlpha(color);

            const materialType = useCylinder
              ? "MeshLambertMaterial"
              : "LineBasicMaterial";
            if (
              obj.material.type !== materialType ||
              !obj.material.color.equals(materialColor) ||
              obj.material.opacity !== opacity
            ) {
              const lineMaterials = useCylinder
                ? lambertLineMaterials
                : basicLineMaterials;
              if (!lineMaterials.hasOwnProperty(color)) {
                lineMaterials[color] = new three[materialType]({
                  color: materialColor,
                  transparent: opacity < 1,
                  opacity,
                  depthWrite: opacity >= 1, // Prevent transparency issues
                });
              }

              obj.material.dispose();
              obj.material = lineMaterials[color];
            }
          }
        }
      },
    });

    // Arrows digest cycle
    if (
      state.linkDirectionalArrowLength ||
      changedProps.hasOwnProperty("linkDirectionalArrowLength")
    ) {
      const arrowLengthAccessor = accessorFn(state.linkDirectionalArrowLength);
      const arrowColorAccessor = accessorFn(state.linkDirectionalArrowColor);

      threeDigest(visibleLinks.filter(arrowLengthAccessor), state.graphScene, {
        objBindAttr: "__arrowObj",
        objFilter: (obj) => obj.__linkThreeObjType === "arrow",
        createObj: () => {
          const obj = new three.Mesh(
            undefined,
            new three.MeshLambertMaterial({ transparent: true })
          );
          obj.__linkThreeObjType = "arrow"; // Add object type

          return obj;
        },
        updateObj: (obj, link) => {
          const arrowLength = arrowLengthAccessor(link);
          const numSegments = state.linkDirectionalArrowResolution;

          if (
            !obj.geometry.type.match(/^Cone(Buffer)?Geometry$/) ||
            obj.geometry.parameters.height !== arrowLength ||
            obj.geometry.parameters.radialSegments !== numSegments
          ) {
            const coneGeometry = new three.ConeGeometry(
              arrowLength * 0.25,
              arrowLength,
              numSegments
            );
            // Correct orientation
            coneGeometry.translate(0, arrowLength / 2, 0);
            coneGeometry.rotateX(Math.PI / 2);

            obj.geometry.dispose();
            obj.geometry = coneGeometry;
          }

          const arrowColor =
            arrowColorAccessor(link) || colorAccessor(link) || "#f0f0f0";
          obj.material.color = new three.Color(colorStr2Hex(arrowColor));
          obj.material.opacity = state.linkOpacity * 3 * colorAlpha(arrowColor);
        },
      });
    }

    // Photon particles digest cycle
    if (
      state.linkDirectionalParticles ||
      changedProps.hasOwnProperty("linkDirectionalParticles")
    ) {
      const particlesAccessor = accessorFn(state.linkDirectionalParticles);
      const particleWidthAccessor = accessorFn(
        state.linkDirectionalParticleWidth
      );
      const particleColorAccessor = accessorFn(
        state.linkDirectionalParticleColor
      );

      const particleMaterials = {}; // indexed by link color
      const particleGeometries = {}; // indexed by particle width

      threeDigest(visibleLinks.filter(particlesAccessor), state.graphScene, {
        objBindAttr: "__photonsObj",
        objFilter: (obj) => obj.__linkThreeObjType === "photons",
        createObj: () => {
          const obj = new three.Group();
          obj.__linkThreeObjType = "photons"; // Add object type

          return obj;
        },
        updateObj: (obj, link) => {
          const numPhotons = Math.round(Math.abs(particlesAccessor(link)));

          const curPhoton = !!obj.children.length && obj.children[0];

          const photonR = Math.ceil(particleWidthAccessor(link) * 10) / 10 / 2;
          const numSegments = state.linkDirectionalParticleResolution;

          let particleGeometry;
          if (
            curPhoton &&
            curPhoton.geometry.parameters.radius === photonR &&
            curPhoton.geometry.parameters.widthSegments === numSegments
          ) {
            particleGeometry = curPhoton.geometry;
          } else {
            if (!particleGeometries.hasOwnProperty(photonR)) {
              particleGeometries[photonR] = new three.SphereGeometry(
                photonR,
                numSegments,
                numSegments
              );
            }
            particleGeometry = particleGeometries[photonR];

            curPhoton && curPhoton.geometry.dispose();
          }

          const photonColor =
            particleColorAccessor(link) || colorAccessor(link) || "#f0f0f0";
          const materialColor = new three.Color(colorStr2Hex(photonColor));
          const opacity = state.linkOpacity * 3;

          let particleMaterial;
          if (
            curPhoton &&
            curPhoton.material.color.equals(materialColor) &&
            curPhoton.material.opacity === opacity
          ) {
            particleMaterial = curPhoton.material;
          } else {
            if (!particleMaterials.hasOwnProperty(photonColor)) {
              particleMaterials[photonColor] = new three.MeshLambertMaterial({
                color: materialColor,
                transparent: true,
                opacity,
              });
            }
            particleMaterial = particleMaterials[photonColor];

            curPhoton && curPhoton.material.dispose();
          }

          // digest cycle for each photon
          threeDigest(
            [...new Array(numPhotons)].map((_, idx) => ({ idx })),
            obj,
            {
              idAccessor: (d) => d.idx,
              createObj: () =>
                new three.Mesh(particleGeometry, particleMaterial),
              updateObj: (obj) => {
                obj.geometry = particleGeometry;
                obj.material = particleMaterial;
              },
            }
          );
        },
      });
    }
  }

  // simulation engine
  if (
    hasAnyPropChanged([
      "graphData",
      "nodeId",
      "linkSource",
      "linkTarget",
      "numDimensions",
      "forceEngine",
      "dagMode",
      "dagNodeFilter",
      "dagLevelDistance",
    ])
  ) {
    state.engineRunning = false; // Pause simulation

    // parse links
    data.links.forEach((link) => {
      link.source = link[state.linkSource];
      link.target = link[state.linkTarget];
    });

    // Feed data to force-directed layout

    layout
      .stop()
      .alpha(1) // re-heat the simulation
      .numDimensions(state.numDimensions)
      .nodes(data.nodes);

    data.layout = layout;

    // add links (if link force is still active)
    const linkForce = layout.force("link");
    if (linkForce) {
      linkForce.id((d) => d[state.nodeId]).links(data.links);
    }
  }

  // loop
  if (OPEN_LOOP)
    data?.nodes?.forEach((node) => {
      if (!!node?.children) {
        initScene({
          hasAnyPropChanged,
          state,
          data: node.children,
          changedProps,
        });
      }
    });
};

const levelTick = ({ state, data }) => {
  const layout = data.layout;
  if (!layout) return;

  if (
    ++state.cntTicks > state.cooldownTicks ||
    new Date() - state.startTickTime > state.cooldownTime ||
    state.d3AlphaMin > 0
  ) {
    state.engineRunning = false; // Stop ticking graph
    state.onEngineStop();
  } else {
    layout["tick"](); // Tick it
    state.onEngineTick();
  }

  const nodeThreeObjectExtendAccessor = accessorFn(state.nodeThreeObjectExtend);

  // Update nodes position
  data.nodes.forEach((node) => {
    const obj = node.__threeObj;
    if (!obj) return;

    const pos = node;

    const extendedObj = nodeThreeObjectExtendAccessor(node);
    if (
      !state.nodePositionUpdate ||
      !state.nodePositionUpdate(
        extendedObj ? obj.children[0] : obj,
        { x: pos.x, y: pos.y, z: pos.z },
        node
      ) || // pass child custom object if extending the default
      extendedObj
    ) {
      obj.position.x = pos.x;
      obj.position.y = pos.y || 0;
      obj.position.z = pos.z || 0;
    }
  });

  // Update links position
  const linkWidthAccessor = accessorFn(state.linkWidth);
  const linkCurvatureAccessor = accessorFn(state.linkCurvature);
  const linkCurveRotationAccessor = accessorFn(state.linkCurveRotation);
  const linkThreeObjectExtendAccessor = accessorFn(state.linkThreeObjectExtend);

  data.links.forEach((link) => {
    const lineObj = link.__lineObj;
    if (!lineObj) return;

    const pos = link;
    const start = pos["source"];
    const end = pos["target"];

    if (
      !start ||
      !end ||
      !start.hasOwnProperty("x") ||
      !end.hasOwnProperty("x")
    )
      return; // skip invalid link

    // calcLinkCurve(link); // calculate link curve for all links, including custom replaced, so it can be used in directional functionality

    const extendedObj = linkThreeObjectExtendAccessor(link);
    if (
      state.linkPositionUpdate &&
      state.linkPositionUpdate(
        extendedObj ? lineObj.children[1] : lineObj, // pass child custom object if extending the default
        {
          start: { x: start.x, y: start.y, z: start.z },
          end: { x: end.x, y: end.y, z: end.z },
        },
        link
      ) &&
      !extendedObj
    ) {
      // exit if successfully custom updated position of non-extended obj
      return;
    }

    const curveResolution = 30; // # line segments
    const curve = link.__curve;

    // select default line obj if it's an extended group
    const line = lineObj.children.length ? lineObj.children[0] : lineObj;

    // default Line
    if (line.type === "Line") {
      // Update line geometry
      if (!curve) {
        // straight line
        let linePos = line.geometry.getAttribute("position");
        if (!linePos || !linePos.array || linePos.array.length !== 6) {
          line.geometry[setAttributeFn](
            "position",
            (linePos = new three.BufferAttribute(new Float32Array(2 * 3), 3))
          );
        }

        linePos.array[0] = start.x;
        linePos.array[1] = start.y || 0;
        linePos.array[2] = start.z || 0;
        linePos.array[3] = end.x;
        linePos.array[4] = end.y || 0;
        linePos.array[5] = end.z || 0;

        linePos.needsUpdate = true;
      } else {
        // bezier curve line
        line.geometry.setFromPoints(curve.getPoints(curveResolution));
      }
      line.geometry.computeBoundingSphere();
    } else if (line.type === "Mesh") {
      // Update cylinder geometry

      if (!curve) {
        // straight tube
        if (!line.geometry.type.match(/^Cylinder(Buffer)?Geometry$/)) {
          const linkWidth = Math.ceil(linkWidthAccessor(link) * 10) / 10;
          const r = linkWidth / 2;

          const geometry = new three.CylinderGeometry(
            r,
            r,
            1,
            state.linkResolution,
            1,
            false
          );
          geometry[applyMatrix4Fn](
            new three.Matrix4().makeTranslation(0, 1 / 2, 0)
          );
          geometry[applyMatrix4Fn](
            new three.Matrix4().makeRotationX(Math.PI / 2)
          );

          line.geometry.dispose();
          line.geometry = geometry;
        }

        const vStart = new three.Vector3(start.x, start.y || 0, start.z || 0);
        const vEnd = new three.Vector3(end.x, end.y || 0, end.z || 0);
        const distance = vStart.distanceTo(vEnd);

        line.position.x = vStart.x;
        line.position.y = vStart.y;
        line.position.z = vStart.z;

        line.scale.z = distance;

        line.parent.localToWorld(vEnd); // lookAt requires world coords
        line.lookAt(vEnd);
      } else {
        // curved tube
        if (!line.geometry.type.match(/^Tube(Buffer)?Geometry$/)) {
          // reset object positioning
          line.position.set(0, 0, 0);
          line.rotation.set(0, 0, 0);
          line.scale.set(1, 1, 1);
        }

        const linkWidth = Math.ceil(linkWidthAccessor(link) * 10) / 10;
        const r = linkWidth / 2;

        const geometry = new three.TubeGeometry(
          curve,
          curveResolution,
          r,
          state.linkResolution,
          false
        );

        line.geometry.dispose();
        line.geometry = geometry;
      }
    }
  });

  // loop
  if (OPEN_LOOP)
    data?.nodes?.forEach((node) => {
      if (!!node?.children) {
        levelTick({
          state,
          data: node.children,
        });
      }
    });
};

// support multiple method names for backwards threejs compatibility
const setAttributeFn = new three.BufferGeometry().setAttribute
  ? "setAttribute"
  : "addAttribute";
const applyMatrix4Fn = new three.BufferGeometry().applyMatrix4
  ? "applyMatrix4"
  : "applyMatrix";

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
      const isD3Sim = true;

      if (state.engineRunning) {
        layoutTick();
      }
      updateArrows();
      updatePhotons();

      return this;

      //

      function layoutTick() {
        levelTick({
          state,
          data: state.graphData,
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

          const pos = link;
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

          const start = link["source"];
          const end = link["target"];

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

    initScene({
      hasAnyPropChanged,
      state,
      data: state.graphData,
      layout: state.d3ForceLayout,
      changedProps,
    });

    this.resetCountdown();

    state._flushObjects = false; // reset objects refresh flag

    state.layout = state.d3ForceLayout;

    state.engineRunning = true; // resume simulation

    state.onFinishUpdate();
  },
});
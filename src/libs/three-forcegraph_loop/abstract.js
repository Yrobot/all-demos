import * as three from "three";

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
  setGroupCenter,
  getSphereIntersectionPoints,
} from "@/libs/three-utils";

import {
  forceSimulation as d3ForceSimulation,
  forceLink as d3ForceLink,
  forceManyBody as d3ForceManyBody,
  forceCenter as d3ForceCenter,
  forceRadial as d3ForceRadial,
  forceCollide as d3ForceCollide,
} from "@/libs/d3-force-3d";
import graph from "ngraph.graph";
import forcelayout from "ngraph.forcelayout";
const ngraph = { graph, forcelayout };

import Kapsule from "kapsule";
import accessorFn from "accessor-fn";
import threeDigest from "./utils/three-digest";
import { emptyObject } from "./utils/three-gc";
import {
  autoColorObjects,
  colorStr2Hex,
  colorAlpha,
} from "./utils/color-utils";
import getDagDepths from "./utils/dagDepths";

const DAG_LEVEL_NODE_RATIO = 2;

// support multiple method names for backwards threejs compatibility
const setAttributeFn = new three.BufferGeometry().setAttribute
  ? "setAttribute"
  : "addAttribute";
const applyMatrix4Fn = new three.BufferGeometry().applyMatrix4
  ? "applyMatrix4"
  : "applyMatrix";

const MIN_RADIUS = 4;
const MIN_LINK_LEN = 12;
const radiusToLinkLen = (radius = MIN_RADIUS) =>
  Math.min(
    Math.max(MIN_LINK_LEN, radius * 3.6),
    Math.max(MIN_LINK_LEN, radius * 3)
  );

export const loopLevelScene = ({
  data,
  state,
  hasAnyPropChanged,
  group,
  level = 0,
  changedProps,
  parentRadius,
}) => {
  const levelMaxLen = Math.max(...data.nodes.map(getAllChildLength)) || 1;
  const radius = (() => {
    if (levelMaxLen === 1) return MIN_RADIUS;
    return (
      (MIN_RADIUS * levelMaxLen) / 4 + MIN_LINK_LEN * levelMaxLen * 0.2 + 8 * 2
    );
  })();
  data.radius = radius;
  const color = getHexColor(level);
  const linkColor = "#f0f0f0";
  // const opacity = !!level ? 1 : 0.6;
  const opacity = 1;
  setGroup(data, group);

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

    threeDigest(data.nodes.filter(visibilityAccessor), group, {
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

        obj.renderOrder = level; // threejs render order

        return obj;
      },
      updateObj: (obj, node) => {
        if (obj.__graphDefaultObj) {
          // bypass internal updates for custom node objects
          const val = valAccessor(node) || 1;
          // const radius = Math.cbrt(val) * state.nodeRelSize;
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

          const materialColor = new three.Color(
            colorStr2Hex(color || "#ffffaa")
          );
          // const opacity = state.nodeOpacity * colorAlpha(color);

          if (
            obj.material.type !== "MeshLambertMaterial" ||
            !obj.material.color.equals(materialColor) ||
            obj.material.opacity !== opacity
          ) {
            if (!sphereMaterials.hasOwnProperty(color)) {
              sphereMaterials[color] = new three.MeshLambertMaterial({
                color: materialColor,
                opacity,
                transparent: true,
                depthWrite: false,
                // depthTest: true,
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
    threeDigest(visibleLinks, group, {
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
            // const color = colorAccessor(link);
            const color = linkColor;
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
                  depthWrite: false, // Prevent transparency issues
                  // depthTest: true,
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

      threeDigest(visibleLinks.filter(arrowLengthAccessor), group, {
        objBindAttr: "__arrowObj",
        objFilter: (obj) => obj.__linkThreeObjType === "arrow",
        createObj: () => {
          const obj = new three.Mesh(
            undefined,
            new three.MeshLambertMaterial({
              transparent: true,
              depthWrite: false,
            })
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

      threeDigest(visibleLinks.filter(particlesAccessor), group, {
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
                depthWrite: false,
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

  // init level force layout

  initLevelLayout({
    hasAnyPropChanged,
    state,
    data: data,
    changedProps,
    level,
    radius,
    parentRadius,
  });

  loopData(data, (node) => {
    const childGroup = new three.Group();
    group.add(childGroup);
    loopLevelScene({
      data: node,
      state,
      hasAnyPropChanged,
      group: childGroup,
      changedProps,
      level: level + 1,
      parentRadius: radius,
    });
  });
};

export const loopData = (data, hook) => {
  // return;
  data?.nodes?.forEach((node) => {
    if (node.children) {
      hook(node.children, node);
    }
  });
};

export const getLayout = (node, initLayout = () => null) =>
  node["__level_layout"] || initLayout();

export const setLayout = (node, layout) => (node["__level_layout"] = layout);

export const getGroup = (node, initGroup = () => null) =>
  node["__level_group"] || initGroup();

export const setGroup = (node, layout) => (node["__level_group"] = layout);

export const tickAllLayout = (data, isD3Sim = true) => {
  const layout = getLayout(data, () => null);
  layout?.[isD3Sim ? "tick" : "step"]?.(); // Tick it
  loopData(data, (node) => {
    tickAllLayout(node, isD3Sim);
  });
};

export const triggerAllLayout = (data, hook) => {
  hook(getLayout(data, () => null));
  loopData(data, (node) => {
    hook(getLayout(node, () => null));
  });
};

export const initLevelLayout = ({
  hasAnyPropChanged,
  state,
  data,
  changedProps,
  level,
  radius,
  parentRadius,
}) => {
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
    const isD3Sim = state.forceEngine !== "ngraph";
    let layout;
    if (isD3Sim) {
      layout = getLayout(data, () =>
        d3ForceSimulation()
          .force("link", d3ForceLink())
          .force("charge", d3ForceManyBody())
          .force("center", d3ForceCenter())
          .force("dagRadial", null)
          .force("circularConstraint", (alpha) => {
            if (!parentRadius || !radius) return;
            const padding = 8;
            data.nodes.forEach((node, i) => {
              const dx = node.x;
              const dy = node.y;
              const dz = node.z;
              const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
              const max = parentRadius - padding - radius;
              if (distance > max) {
                const scale = max / distance;
                node.x = dx * scale;
                node.y = dy * scale;
                node.z = dz * scale;
              }
            });
          })
          // .alphaMin(-Infinity)
          .stop()
      );

      if (data.radius) layout.force("collision", d3ForceCollide(data.radius));

      // D3-force
      layout
        .stop()
        .alpha(1) // re-heat the simulation
        .numDimensions(state.numDimensions)
        .nodes(data.nodes);

      setLayout(data, layout);

      // add links (if link force is still active)
      const linkForce = layout.force("link");
      if (linkForce) {
        linkForce
          .id((d) => d[state.nodeId])
          .links(data.links)
          .distance(radiusToLinkLen(data.radius));
      }

      // setup dag force constraints
      const nodeDepths =
        state.dagMode &&
        getDagDepths(data, (node) => node[state.nodeId], {
          nodeFilter: state.dagNodeFilter,
          onLoopError: state.onDagError || undefined,
        });
      const maxDepth = Math.max(...Object.values(nodeDepths || []));
      const dagLevelDistance =
        state.dagLevelDistance ||
        (data.nodes.length / (maxDepth || 1)) *
          DAG_LEVEL_NODE_RATIO *
          (["radialin", "radialout"].indexOf(state.dagMode) !== -1 ? 0.7 : 1);

      // Reset relevant f* when swapping dag modes
      if (
        ["lr", "rl", "td", "bu", "zin", "zout"].includes(changedProps.dagMode)
      ) {
        const resetProp = ["lr", "rl"].includes(changedProps.dagMode)
          ? "fx"
          : ["td", "bu"].includes(changedProps.dagMode)
          ? "fy"
          : "fz";
        data.nodes
          .filter(state.dagNodeFilter)
          .forEach((node) => delete node[resetProp]);
      }

      // Fix nodes to x,y,z for dag mode
      if (["lr", "rl", "td", "bu", "zin", "zout"].includes(state.dagMode)) {
        const invert = ["rl", "td", "zout"].includes(state.dagMode);
        const fixFn = (node) =>
          (nodeDepths[node[state.nodeId]] - maxDepth / 2) *
          dagLevelDistance *
          (invert ? -1 : 1);

        const resetProp = ["lr", "rl"].includes(state.dagMode)
          ? "fx"
          : ["td", "bu"].includes(state.dagMode)
          ? "fy"
          : "fz";
        data.nodes
          .filter(state.dagNodeFilter)
          .forEach((node) => (node[resetProp] = fixFn(node)));
      }

      // Use radial force for radial dags
      layout.force(
        "dagRadial",
        ["radialin", "radialout"].indexOf(state.dagMode) !== -1
          ? d3ForceRadial((node) => {
              const nodeDepth = nodeDepths[node[state.nodeId]] || -1;
              return (
                (state.dagMode === "radialin"
                  ? maxDepth - nodeDepth
                  : nodeDepth) * dagLevelDistance
              );
            }).strength((node) => (state.dagNodeFilter(node) ? 1 : 0))
          : null
      );
    } else {
      // ngraph
      const graph = ngraph.graph();
      data.nodes.forEach((node) => {
        graph.addNode(node[state.nodeId]);
      });
      data.links.forEach((link) => {
        graph.addLink(link.source, link.target);
      });
      layout = ngraph.forcelayout(graph, {
        dimensions: state.numDimensions,
        ...state.ngraphPhysics,
      });
      layout.graph = graph; // Attach graph reference to layout
    }

    for (
      let i = 0;
      i < state.warmupTicks &&
      !(
        isD3Sim &&
        state.d3AlphaMin > 0 &&
        state.d3ForceLayout.alpha() < state.d3AlphaMin
      );
      i++
    ) {
      layout[isD3Sim ? "tick" : "step"]();
    } // Initial ticks before starting to render

    state.layout = layout;
  }

  // loopData(data, (node) => {
  //   initLevelLayout({
  //     data: node,
  //     hasAnyPropChanged,
  //     state,
  //     changedProps,
  //     level: level + 1,
  //   });
  // });
};

export const loopLevelDisplay = ({ data, state, level = 0, loop = true }) => {
  const displayLevel = state.displayLevel || 0;
  const isDisplayLevel = level <= displayLevel;
  const groupObj = getGroup(data, () => null);
  if (groupObj) groupObj.visible = isDisplayLevel;

  data.nodes.forEach((node) => {
    const obj = node.__threeObj;
    if (!obj) return;
    obj.material.opacity = level < displayLevel ? 0.3 : 1;
  });

  if (loop)
    loopData(data, (node, parentNode) => {
      loopLevelDisplay({
        data: node,
        state,
        level: level + 1,
      });
    });
};

export const tickLevelLayout = ({
  data,
  state,
  isD3Sim,
  parentNode,
  level = 0,
}) => {
  // const displayLevel = state.displayLevel || 0;
  // const isDisplayLevel = level <= displayLevel;
  const groupObj = getGroup(data, () => null);
  // if (groupObj) groupObj.visible = isDisplayLevel;
  if (groupObj) setGroupCenter(groupObj, getNodePosition(parentNode));

  loopLevelDisplay({ data, state, level, loop: false });

  const nodeThreeObjectExtendAccessor = accessorFn(state.nodeThreeObjectExtend);

  // Update nodes position
  data.nodes.forEach((node) => {
    const obj = node.__threeObj;
    if (!obj) return;

    const pos = isD3Sim
      ? node
      : getLayout(data).getNodePosition(node[state.nodeId]);

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

    const pos = isD3Sim
      ? link
      : getLayout(data).getLinkPosition(
          getLayout(data).graph.getLink(link.source, link.target).id
        );
    const startNode = pos[isD3Sim ? "source" : "from"];
    const endNode = pos[isD3Sim ? "target" : "to"];

    if (
      !startNode ||
      !endNode ||
      !startNode.hasOwnProperty("x") ||
      !endNode.hasOwnProperty("x")
    )
      return; // skip invalid link

    const radius = data.radius || MIN_RADIUS;

    // get sphere intersection points as link start and end
    const [start, end] = getSphereIntersectionPoints({
      c1: [startNode.x, startNode.y, startNode.z],
      c2: [endNode.x, endNode.y, endNode.z],
      r1: radius,
      r2: radius,
    }).map(([x, y, z]) => ({
      x,
      y,
      z,
    }));

    calcLinkCurve(link); // calculate link curve for all links, including custom replaced, so it can be used in directional functionality

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

  function calcLinkCurve(link) {
    const pos = isD3Sim
      ? link
      : getLayout(data).getLinkPosition(
          getLayout(data).graph.getLink(link.source, link.target).id
        );
    const startNode = pos[isD3Sim ? "source" : "from"];
    const endNode = pos[isD3Sim ? "target" : "to"];

    if (
      !startNode ||
      !endNode ||
      !startNode.hasOwnProperty("x") ||
      !endNode.hasOwnProperty("x")
    )
      return; // skip invalid link

    const radius = data.radius || MIN_RADIUS;

    // get sphere intersection points as link start and end
    const [start, end] = getSphereIntersectionPoints({
      c1: [startNode.x, startNode.y, startNode.z],
      c2: [endNode.x, endNode.y, endNode.z],
      r1: radius,
      r2: radius,
    }).map(([x, y, z]) => ({
      x,
      y,
      z,
    }));

    const curvature = linkCurvatureAccessor(link);

    if (!curvature) {
      link.__curve = null; // Straight line
    } else {
      // bezier curve line (only for line types)
      const vStart = new three.Vector3(start.x, start.y || 0, start.z || 0);
      const vEnd = new three.Vector3(end.x, end.y || 0, end.z || 0);

      const l = vStart.distanceTo(vEnd); // line length

      let curve;
      const curveRotation = linkCurveRotationAccessor(link);

      if (l > 0) {
        const dx = end.x - start.x;
        const dy = end.y - start.y || 0;

        const vLine = new three.Vector3().subVectors(vEnd, vStart);

        const cp = vLine
          .clone()
          .multiplyScalar(curvature)
          .cross(
            dx !== 0 || dy !== 0
              ? new three.Vector3(0, 0, 1)
              : new three.Vector3(0, 1, 0)
          ) // avoid cross-product of parallel vectors (prefer Z, fallback to Y)
          .applyAxisAngle(vLine.normalize(), curveRotation) // rotate along line axis according to linkCurveRotation
          .add(new three.Vector3().addVectors(vStart, vEnd).divideScalar(2));

        curve = new three.QuadraticBezierCurve3(vStart, cp, vEnd);
      } else {
        // Same point, draw a loop
        const d = curvature * 70;
        const endAngle = -curveRotation; // Rotate clockwise (from Z angle perspective)
        const startAngle = endAngle + Math.PI / 2;

        curve = new three.CubicBezierCurve3(
          vStart,
          new three.Vector3(
            d * Math.cos(startAngle),
            d * Math.sin(startAngle),
            0
          ).add(vStart),
          new three.Vector3(
            d * Math.cos(endAngle),
            d * Math.sin(endAngle),
            0
          ).add(vStart),
          vEnd
        );
      }

      link.__curve = curve;
    }
  }

  loopData(data, (node, parentNode) => {
    // node.center = getNodePosition(parentNode);
    tickLevelLayout({
      data: node,
      parentNode,
      state,
      isD3Sim,
      level: level + 1,
    });
  });
};

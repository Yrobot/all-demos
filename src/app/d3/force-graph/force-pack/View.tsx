"use client";
import React, {
  useRef,
  useCallback,
  useState,
  useMemo,
  useEffect,
} from "react";
import ForceGraph3D from "@/libs/force-graph";
import SpriteText from "three-spritetext";

const loopData = (d: typeof data, hook: Function) => {
  hook(d, null);
  // return;
  d?.nodes?.forEach((node: any) => {
    if (node.children) {
      hook(node.children as typeof data, node);
    }
  });
};

const getSP = (svId: string, d: typeof data) => {
  if (!d?.nodes) return null;
  let result: any = [];
  d.nodes.forEach((sp) => {
    if (result[0]) return;
    const svList = sp?.children?.nodes || [];
    svList.forEach((sv) => {
      if (sv.id === svId) {
        result.push(sp, sv);
        return;
      }
    });
  });
  return result;
};

const getSVPos = (d: typeof data, svId: string) => {
  const [sp, sv] = getSP(svId, d);
  return {
    x: sp.x + sv.x,
    y: sp.y + sv.y,
    z: sp.z + sv.z,
  };
};

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

const getTextHeight = (text = "") => {
  if (text?.length > 6) return 2;
  if (text?.length > 4) return 3;
  return 4;
};

const getNodeColor = (
  node: any,
  {
    isHover,
    isSelected,
  }: {
    isHover: boolean;
    isSelected: boolean;
  }
) => {
  const id = node.id;
  const marked = isHover || isSelected;

  let colorType = "default";
  const isError = ["1", "12", "2", "22", "23"].includes(id);
  const isWarning = ["13", "3", "31"].includes(id);
  if (isWarning) colorType = "warning";
  if (isError) colorType = "error";

  return (
    (
      {
        default: ["#3DD598", "#05B4A2"],
        warning: ["#FF991F", "#B46C15"],
        error: ["#FB5A5A", "#F9372A"],
      }[colorType] as string[]
    )[marked ? 1 : 0] ?? "#ffffff"
  );
};

function View() {
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [hoverNode, setHoverNode] = useState<any>(null);
  const [highlightParentId, setHighlightParentId] = useState<string | null>(
    null
  );

  useEffect(() => {
    setHighlightParentId(() => {
      const childId = selectedNode?.id;
      if (!childId) return null;

      for (let index = 0; index < data.nodes.length; index++) {
        const parent = data.nodes[index];
        if (parent.children?.nodes?.find((n: any) => n.id === childId)) {
          return parent.id;
        }
      }
      return null;
    });
  }, [selectedNode?.id]);

  useEffect(() => {
    loopData(data, (d: typeof data, parent: any | null) => {
      const isFirstLevel = parent === null;
      d.nodes.forEach((node) => {
        const opacity = (() => {
          if (highlightParentId === null) return 1;
          if (isFirstLevel) {
            return node.id === highlightParentId ? 1 : 0.1;
          } else {
            return parent.id === highlightParentId ? 1 : 0.1;
          }
        })();
        (node as any)["opacity"] = opacity;
      });
      d.links.forEach((link) => {
        const opacity = (() => {
          if (highlightParentId === null) return 1;
          if (isFirstLevel) {
            return 0.1;
          } else {
            return parent.id === highlightParentId ? 1 : 0.1;
          }
        })();
        (link as any)["opacity"] = opacity;
      });
    });
  }, [highlightParentId]);

  const fgRef = useRef<any>(null);

  const lookAt = useCallback(
    (position: any, ignoreLevelChange = false) => {
      const graph = fgRef.current;
      const distance = 120;
      const distRatio =
        1 + distance / Math.hypot(position.x, position.y, position.z);
      if (ignoreLevelChange) graph.cameraAnimationTime(Date.now());
      graph.cameraPosition(
        {
          x: position.x * distRatio,
          y: position.y * distRatio,
          z: position.z * distRatio,
        }, // new position
        position, // lookAt ({ x, y, z })
        3000 // ms transition duration
      );
    },
    [fgRef.current]
  );

  // hover or selected
  const isRelatedLink = useCallback(
    (link: any) => {
      if (!!hoverNode || !!selectedNode) {
        return (
          [link.source.id, link.target.id].includes(hoverNode?.id) ||
          [link.source.id, link.target.id].includes(selectedNode?.id)
        );
      }
      return false;
    },
    [hoverNode?.id, selectedNode?.id]
  );

  const linkWidth = useCallback(
    (link: any) => (isRelatedLink(link) ? 1 : 0.5),
    [isRelatedLink]
  );

  const linkDirectionalArrowLength = useCallback(
    (link: any) => (isRelatedLink(link) ? 4 : 2),
    [isRelatedLink]
  );

  const linkDirectionalParticles = useCallback(
    (link: any) => (isRelatedLink(link) ? 8 : 0),
    [isRelatedLink]
  );

  const nodeColor = useCallback(
    (node: any, level: number) =>
      getNodeColor(node, {
        isHover: hoverNode?.id === node.id,
        isSelected: selectedNode?.id === node.id,
      }),
    [getNodeColor, hoverNode?.id, selectedNode?.id]
  );

  const linkColor = useCallback(
    (link: any) =>
      [link.source.id, link.target.id].some((id) =>
        [hoverNode?.id, selectedNode?.id].includes(id)
      )
        ? "#3DD598"
        : "#05B4A2",
    [(hoverNode?.id, selectedNode?.id)]
  );

  const onNodeClick = useCallback(
    (node: any) => {
      console.log(`onNodeClick [${node?.id}]`, node);
      const level = node?.__threeObj?.__renderLevel;
      if (level === 0) {
        // const group = node?.__threeObj?.__group;
        // const center = [group.position, node].reduce(
        //   (pre, cur) => {
        //     pre.x += cur.x;
        //     pre.y += cur.y;
        //     pre.z += cur.z;
        //     return pre;
        //   },
        //   {
        //     x: 0,
        //     y: 0,
        //     z: 0,
        //   }
        // );
        // lookAt(center);
        lookAt(node);
        setHighlightParentId(node.id);
      } else {
        // alert(`onNodeClick [${node?.id}]`);
        lookAt(getSVPos(data, node.id), true);
        setSelectedNode((old: any) => {
          if (old?.id === node?.id) return null;
          return node;
        });
      }
    },
    [setSelectedNode, lookAt, setHighlightParentId]
  );

  const onNodeHover = useCallback(
    (node: any) => {
      console.log(`onNodeHover [${node?.id}]`, node);
      setHoverNode(node);
    },
    [setHoverNode]
  );

  const nodeLabel = useCallback((node: any) => node.id, []);

  const nodeThreeObject = useCallback(
    (node: any, isCurrentLevel: boolean = false) => {
      if (!isCurrentLevel) return null;
      const sprite = new SpriteText(node?.id);
      // sprite.center.set(0.5, 3.5); // set the text position
      sprite.textHeight = getTextHeight(node?.data?.shortName);
      sprite.color = "white";
      sprite.material.opacity = node.opacity || 1;
      sprite.renderOrder = 99; // make sure it is rendered on top of the text
      return sprite;
    },
    []
  );

  return (
    <ForceGraph3D
      ref={fgRef}
      graphData={data}
      showNavInfo={false}
      backgroundColor="#12151D"
      nodeLabel={nodeLabel}
      nodeResolution={24}
      nodeRelSize={6}
      nodeThreeObjectExtend
      nodeThreeObject={nodeThreeObject}
      // link style
      linkWidth={linkWidth}
      linkColor={"#05B4A2"}
      // linkColor={linkColor}
      linkOpacity={0.5}
      linkCurvature={0.1}
      linkDirectionalArrowLength={linkDirectionalArrowLength}
      linkDirectionalParticleWidth={1}
      linkDirectionalParticleColor="#05B4A2"
      linkDirectionalParticles={linkDirectionalParticles}
      linkDirectionalArrowColor="#05B4A2"
      linkDirectionalArrowRelPos={1}
      nodeColor={nodeColor}
      onNodeHover={onNodeHover}
      onNodeClick={onNodeClick}
    />
  );
}

export default View;

import * as d3 from "d3";
import { Canvas, NodeProps, LinkProps } from "./types";

class SVGCanvas extends Canvas {
  container: HTMLDivElement;
  svg?: d3.Selection<any, any, any, any>;
  nodeMap: Record<
    string,
    {
      root: d3.Selection<SVGGElement, undefined, null, undefined>;
      container: d3.Selection<SVGGElement, undefined, null, undefined>;
      node: d3.Selection<SVGCircleElement, undefined, null, undefined>;
    }
  > = {};
  linkMap: Record<
    string,
    d3.Selection<SVGLineElement, undefined, null, undefined>
  > = {};
  constructor({ container }: { container: HTMLDivElement }) {
    super();
    this.container = container;
  }

  init() {
    const { width, height } = this.container.getBoundingClientRect();

    const svg = d3
      .select(this.container)
      .append("svg")
      .attr("width", width || 400)
      .attr("height", height || 300)
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    this.svg = svg;
    return svg;
  }

  prepareNode: Canvas["prepareNode"] = ({ props, id, parent }) => {
    const root: d3.Selection<SVGGElement, undefined, null, undefined> = !!parent
      ? (() => {
          const parentGroup = this.nodeMap[parent.id as string];
          if (!parentGroup) throw new Error(`Parent Node is not found`);
          return parentGroup.container.append("g");
        })()
      : (() => {
          if (!this.svg) throw new Error("svg scene is not ready");
          return this.svg.append("g");
        })();

    const container = root.append("g");
    const node = root.append("circle");

    const result = {
      root,
      container,
      node,
    };

    this.nodeMap[id] = result;

    this.updateNode({
      props,
      id,
    });

    return result;
  };

  updateNode: Canvas["updateNode"] = ({ props, id }) => {
    const group = this.nodeMap[id];

    if (!group) throw new Error("node is not found");
    const node = group.node;
    const root = group.root;
    if (props.radius) node.attr("r", props.radius);
    if (props.color) node.attr("fill", props.color);
    if (props.opacity) node.attr("opacity", props.opacity);
    if (props.position)
      root.attr("transform", `translate(${props.position.join(",")})`);
  };

  prepareLink: Canvas["prepareLink"] = ({ props, id, parent }) => {
    const link: d3.Selection<SVGLineElement, undefined, null, undefined> =
      !!parent
        ? (() => {
            const parentGroup = this.nodeMap[parent.id as string];
            if (!parentGroup) throw new Error(`Parent Node is not found`);
            return parentGroup.container.append("line");
          })()
        : (() => {
            if (!this.svg) throw new Error("svg scene is not ready");
            return this.svg.append("line");
          })();
    this.linkMap[id] = link;
    this.updateLink({ props, id });
    return link;
  };

  updateLink: Canvas["updateLink"] = ({ props, id }) => {
    const link = this.linkMap[id];
    if (!link) throw new Error("link is not found");
    if (props.color) link.attr("stroke", props.color);
    if (props.opacity) link.attr("stroke-opacity", props.opacity);
    if (props.width) link.attr("stroke-width", props.width);
    if (props.position) {
      const [start = [], end = []] = props.position;
      if (start[0] && start[1] && end[0] && end[1]) {
        link.attr("x1", start[0]).attr("y1", start[1]);
        link.attr("x2", end[0]).attr("y2", end[1]);
      }
    }
  };

  removeNode: Canvas["removeNode"] = ({ id }) => {
    const node = this.nodeMap[id];
    delete this.nodeMap[id];
    node?.root.remove();
  };

  removeLink: Canvas["removeLink"] = ({ id }) => {
    const link = this.linkMap[id];
    delete this.linkMap[id];
    link?.remove();
  };
}

export default SVGCanvas;

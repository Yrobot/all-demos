import * as d3 from "d3";
import { Canvas, NodeProps, LinkProps } from "./types";

export class SVGCanvas extends Canvas {
  containerId?: string;
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
  constructor({ containerId }: { containerId: string }) {
    super();
    this.containerId = containerId;
  }

  init() {
    if (!this.containerId) throw new Error("containerId is required");

    const container = document.getElementById(this.containerId);

    if (!container) throw new Error("container is not found");

    const { width, height } = container.getBoundingClientRect();

    const svg = d3
      .select(this.containerId)
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    this.svg = svg;
    return svg;
  }

  prepareNode: Canvas["prepareNode"] = ({ props, id }) => {
    const root = d3.create("g");
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

  prepareLink: Canvas["prepareLink"] = ({ props, id }) => {
    const link = d3.create("line");
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
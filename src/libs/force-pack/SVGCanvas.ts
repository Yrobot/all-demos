import * as d3 from "d3";
import mitt, { Emitter, EventType } from "mitt";
import { Canvas, NodeProps, Data } from "./types";

type Events = {
  dragStart: {
    id: string;
    event: d3.D3DragEvent<any, any, any>;
  };
  dragging: {
    id: string;
    event: d3.D3DragEvent<any, any, any>;
  };
  dragEnd: {
    id: string;
    event: d3.D3DragEvent<any, any, any>;
  };
};

type Mitt = Emitter<Events>;

const updatePosition = ({
  node,
  position,
}: {
  node: d3.Selection<SVGGElement, undefined, null, undefined>;
  position: number[];
}) => {
  node.attr("transform", `translate(${position.join(",")})`);
};

const listenDrag = ({
  node,
  id,
  emitter,
}: {
  node: d3.Selection<SVGCircleElement, undefined, null, undefined>;
  emitter: Mitt;
  id: string;
}): Function => {
  // 拖拽开始
  function dragStart(event: d3.D3DragEvent<any, any, any>) {
    emitter.emit("dragStart", { id, event });
  }

  // 拖拽中
  function dragged(event: d3.D3DragEvent<any, any, any>, ...props: any[]) {
    emitter.emit("dragging", { id, event });
  }

  // 拖拽结束
  function dragEnd(event: d3.D3DragEvent<any, any, any>) {
    emitter.emit("dragEnd", { id, event });
  }

  const eventBehavior = d3
    .drag<any, any>()
    .on("start", dragStart)
    .on("drag", dragged)
    .on("end", dragEnd);

  node.call(eventBehavior);

  const unListen = () => {
    eventBehavior.on("start", null).on("drag", null).on("end", null);
  };

  return unListen;
};

class SVGCanvas extends Canvas {
  container: HTMLDivElement;
  emitter = mitt<Events>();
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
  unListenHookMap: Record<string, Function> = {};

  on = this.emitter.on.bind(this.emitter);

  off = this.emitter.off.bind(this.emitter);

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

  destroy() {
    this.emitter.all.clear();
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

    this.listenNodeEvents({ id });

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
      updatePosition({ node: root, position: props.position });
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
    this.unListenNodeEvents({ id });
  };

  removeLink: Canvas["removeLink"] = ({ id }) => {
    const link = this.linkMap[id];
    delete this.linkMap[id];
    link?.remove();
  };

  listenNodeEvents = ({ id }: { id: string }) => {
    const node = this.nodeMap[id]?.node;
    if (!node) throw new Error("node is not found");
    if (this.unListenHookMap[id]) {
      this.unListenHookMap[id]();
      delete this.unListenHookMap[id];
    }
    const unListenHook = listenDrag({ node, emitter: this.emitter, id });
    this.unListenHookMap[id] = unListenHook;
  };
  unListenNodeEvents = ({ id }: { id: string }) => {
    const unListenHook = this.unListenHookMap[id];
    if (unListenHook) {
      unListenHook();
      delete this.unListenHookMap[id];
    }
  };
}

export default SVGCanvas;

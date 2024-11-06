import * as d3 from "d3";
import { dataLoop } from "./loop";
import type { Data, Node, Link } from "./types";

const createSimulation = (...props: Parameters<typeof d3.forceSimulation>) =>
  d3
    .forceSimulation(...props)
    .force("charge", d3.forceManyBody().strength(-500));

type SimulationProps = {
  nodes?: Node[];
  links?: Link[];
  nodeRadius?: number;
  containerRadius?: number;
  center?: number[];
};

class ForceEngine {
  maps: Record<string, d3.Simulation<d3.SimulationNodeDatum, undefined>> = {};
  constructor() {}
  add(ids: string[], dataList: SimulationProps[] = []) {
    ids.forEach((id, index) => {
      if (!!this.maps[id]) {
        console.warn(`[ForceEngine.add] ${id} is already added`);
        return;
      }
      this.maps[id] = createSimulation();
      if (dataList[index]) {
        this.update({
          ...dataList[index],
          id,
        });
      }
    });
  }
  remove(ids: string[]) {
    ids.forEach((id) => {
      if (this.maps[id]) {
        this.maps[id].stop();
        delete this.maps[id];
      }
    });
  }
  get(id: string) {
    if (!this.maps[id]) this.add([id]);
    return this.maps[id];
  }
  update(props: { id: string } & SimulationProps) {
    const simulation = this.maps[props.id];
    if (!simulation) return;

    const {
      links = [],
      nodes = [],
      center = [0, 0],
      nodeRadius,
      containerRadius,
    } = props;

    const linkLen = (nodeRadius || 4) * 3;

    if (nodes) simulation.nodes(nodes as d3.SimulationNodeDatum[]);
    if (links)
      simulation.force(
        "link",
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance(linkLen)
      );
    if (center) simulation.force("center", d3.forceCenter(...center));
    if (nodeRadius) simulation.force("collision", d3.forceCollide(nodeRadius));
    if (containerRadius)
      simulation.force("circularConstraint", (alpha) => {
        const nodeList = (simulation.nodes() as d3.SimulationNodeDatum[]) || [];
        const padding = 8;
        const radius = nodeRadius || 4;
        nodeList.forEach((node: any, i) => {
          const dx = node.x! - center[0];
          const dy = node.y! - center[1];
          const distance = Math.sqrt(dx * dx + dy * dy);
          const max = containerRadius - padding - radius;
          if (distance > max) {
            const scale = max / distance;
            node.x = center[0] + dx * scale;
            node.y = center[1] + dy * scale;
          }
        });
      });
  }
}

export default ForceEngine;

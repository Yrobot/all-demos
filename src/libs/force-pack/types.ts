export type NodeProps = {
  radius?: number;
  color?: string;
  opacity?: number;
  position?: number[];
};

export type LinkProps = {
  color?: string;
  opacity?: number;
  width?: number;
  position?: number[][];
};

type ResProps = {
  [key: string]: unknown;
};

export type Data = {
  nodes: ({ id: string; children?: Data } & ResProps)[];
  links: ({ source: string; target: string } & ResProps)[];
};

export type Node = Data["nodes"][0];
export type Link = Data["links"][0];

export class Canvas {
  init() {}
  prepareNode(params: { props: NodeProps; id: string; parent?: Node }) {}
  updateNode(params: { props: NodeProps; id: string }) {}
  prepareLink(params: { props: LinkProps; id: string; parent?: Node }) {}
  updateLink(params: { props: LinkProps; id: string }) {}
  removeNode(params: { id: string }) {}
  removeLink(params: { id: string }) {}
  tick() {}
}

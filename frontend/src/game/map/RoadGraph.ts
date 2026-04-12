/**
 * RoadGraph — intersection node graph derived from WorldScene ROAD_SEGMENTS.
 *
 * The city road network forms a 4×2 grid of intersection nodes. NPCs travel
 * node-to-node along road edges, making them feel like data packets routing
 * through a network topology.
 *
 * Road segments (from WorldScene.ts):
 *   Horizontal top:     cols 8–35, rows 10–11
 *   Horizontal bottom:  cols 8–35, rows 21–22
 *   Vertical left:      cols 8–9,  rows 10–22
 *   Vertical center-L:  cols 19–20, rows 10–22
 *   Vertical center-R:  cols 28–29, rows 10–22
 *   Vertical right:     cols 35–36, rows 11–22
 *
 * Intersection nodes (tile col/row):
 *   A(8,10) ── B(19,10) ── C(28,10) ── D(35,10)
 *   |          |            |            |
 *   E(8,21) ── F(19,21) ── G(28,21) ── H(35,21)
 */

export interface RoadNode {
  id: string;
  col: number;
  row: number;
}

export const ROAD_GRAPH_NODES: RoadNode[] = [
  { id: "A", col: 8,  row: 10 },
  { id: "B", col: 19, row: 10 },
  { id: "C", col: 28, row: 10 },
  { id: "D", col: 35, row: 10 },
  { id: "E", col: 8,  row: 21 },
  { id: "F", col: 19, row: 21 },
  { id: "G", col: 28, row: 21 },
  { id: "H", col: 35, row: 21 },
];

/** Adjacency list — undirected edges */
const ADJACENCY: Record<string, string[]> = {
  A: ["B", "E"],
  B: ["A", "C", "F"],
  C: ["B", "D", "G"],
  D: ["C", "H"],
  E: ["A", "F"],
  F: ["E", "B", "G"],
  G: ["F", "C", "H"],
  H: ["G", "D"],
};

export function getConnectedNodes(nodeId: string): string[] {
  return ADJACENCY[nodeId] ?? [];
}

/** Returns the RoadNode for an id, or undefined */
export function getRoadNode(id: string): RoadNode | undefined {
  return ROAD_GRAPH_NODES.find((n) => n.id === id);
}

/** Find the nearest graph node to a given tile position */
export function getNearestGraphNode(col: number, row: number): string {
  let minDist = Infinity;
  let nearest = "A";
  for (const node of ROAD_GRAPH_NODES) {
    const dist = Math.abs(node.col - col) + Math.abs(node.row - row);
    if (dist < minDist) {
      minDist = dist;
      nearest = node.id;
    }
  }
  return nearest;
}

/**
 * Returns the sequence of tile positions (inclusive of start, inclusive of end)
 * to walk along the road between two adjacent nodes.
 */
export function getEdgeSteps(
  fromId: string,
  toId: string,
): { col: number; row: number }[] {
  const from = getRoadNode(fromId);
  const to = getRoadNode(toId);
  if (!from || !to) return [];

  const steps: { col: number; row: number }[] = [];

  if (from.row === to.row) {
    // Horizontal edge
    const dir = from.col < to.col ? 1 : -1;
    for (let col = from.col; col !== to.col + dir; col += dir) {
      steps.push({ col, row: from.row });
    }
  } else {
    // Vertical edge
    const dir = from.row < to.row ? 1 : -1;
    for (let row = from.row; row !== to.row + dir; row += dir) {
      steps.push({ col: from.col, row });
    }
  }

  return steps;
}

/** Pick a random connected node, optionally excluding the origin */
export function pickNextNode(fromId: string, excludeId?: string): string {
  const connected = getConnectedNodes(fromId).filter(
    (id) => id !== excludeId || getConnectedNodes(fromId).length === 1,
  );
  return connected[Math.floor(Math.random() * connected.length)] ?? fromId;
}

import { CENTER_BOUNDS } from "../config";
import type { NPC } from "../entities/NPC";
import {
  getConnectedNodes,
  getNearestGraphNode,
  getRoadNode,
  ROAD_GRAPH_NODES,
} from "../map/RoadGraph";
import type { OccupancyGrid } from "./OccupancyGrid";
import { compressPath, findPath } from "./Pathfinder";

type TileCheck = (col: number, row: number) => boolean;
const ZONE_NODE_PREFERENCES: Record<string, string[]> = {
  government: ["A", "B", "C", "D"],
  commercial: ["B", "C", "F", "G"],
  industrial: ["E", "F", "G", "H"],
  residential: ROAD_GRAPH_NODES.map((node) => node.id),
};
/**
 * Handles NPC roaming with natural movement behavior.
 * - NPCs prefer roads and sidewalks over grass
 * - NPCs maintain momentum (avoid instant 180-degree turns)
 * - NPCs are leashed to their assigned zone
 * - Walk→pause→walk cycle with variable timing
 */
export class MovementSystem {
  private timers: Map<string, Phaser.Time.TimerEvent> = new Map();
  private scene: Phaser.Scene;
  private isWalkable: TileCheck;
  private isRoad: TileCheck;
  /** Assigned zone per NPC */
  private npcZone: Map<string, string> = new Map();
  /** Last completed graph node per NPC */
  private currentNode: Map<string, string> = new Map();
  /** Previous graph node per NPC to avoid ping-ponging */
  private previousNode: Map<string, string | undefined> = new Map();
  /** NPCs currently overridden (protesting/striking) — skip random movement */
  private overridden = new Set<string>();
  private occupancy: OccupancyGrid;

  constructor(
    scene: Phaser.Scene,
    isWalkable: TileCheck,
    isRoad: TileCheck,
    occupancy: OccupancyGrid,
  ) {
    this.scene = scene;
    this.isWalkable = isWalkable;
    this.isRoad = isRoad;
    this.occupancy = occupancy;
  }

  /** Start random roaming for an NPC */
  startRoaming(npc: NPC, zone?: string) {
    if (zone) {
      this.npcZone.set(npc.npcId, zone);
    }
    // Stagger initial delay so NPCs don't all move at once
    const delay = 1500 + Math.random() * 3000;
    const timer = this.scene.time.addEvent({
      delay,
      callback: () => this.step(npc),
      loop: false,
    });
    this.timers.set(npc.npcId, timer);
  }

  /** Pause random movement for an NPC (e.g. while protesting) */
  override(npcId: string) {
    this.overridden.add(npcId);
    const timer = this.timers.get(npcId);
    if (timer) timer.destroy();
    this.timers.delete(npcId);
  }

  /** Resume random movement */
  release(npcId: string) {
    this.overridden.delete(npcId);
  }

  private step(npc: NPC) {
    if (this.overridden.has(npc.npcId)) return;
    if (npc.isMoving) {
      this.scheduleNext(npc, 200);
      return;
    }

    // 18% chance to idle, otherwise follow a longer road segment.
    if (Math.random() < 0.18) {
      // Idle: face a random direction without moving
      const dirs = ["up", "down", "left", "right"] as const;
      npc.face(dirs[Math.floor(Math.random() * dirs.length)]);
      npc.npcState = "idle";
      this.scheduleNext(npc, 1200 + Math.random() * 1800);
      return;
    }

    const route = this.pickRoute(npc);
    if (!route || route.waypoints.length === 0) {
      npc.npcState = "idle";
      this.scheduleNext(npc, 450);
      return;
    }

    npc.npcState = "walking";

    void this.walkWaypoints(npc, route.waypoints).then((completed) => {
      npc.npcState = "idle";
      if (completed) {
        this.currentNode.set(npc.npcId, route.nextNodeId);
        if (route.arrivedAtNewNode) {
          this.previousNode.set(npc.npcId, route.previousNodeId);
        }
      }
      this.scheduleNext(npc, 300 + Math.random() * 700);
    });
  }

  private pickRoute(
    npc: NPC,
  ): {
    waypoints: { col: number; row: number }[];
    nextNodeId: string;
    previousNodeId?: string;
    arrivedAtNewNode: boolean;
  } | null {
    const zone = this.npcZone.get(npc.npcId);
    const currentNodeId =
      this.currentNode.get(npc.npcId) ?? getNearestGraphNode(npc.tileX, npc.tileY);
    const currentNode = getRoadNode(currentNodeId);
    if (!currentNode) return null;

    const routeToCurrentNode = findPath(
      { col: npc.tileX, row: npc.tileY },
      { col: currentNode.col, row: currentNode.row },
      (col, row) => this.isRoadWalkable(col, row),
    );

    if (routeToCurrentNode && routeToCurrentNode.length > 0) {
      const waypoints = compressPath(routeToCurrentNode);
      if (waypoints.length > 0) {
        return {
          waypoints,
          nextNodeId: currentNodeId,
          previousNodeId: this.previousNode.get(npc.npcId),
          arrivedAtNewNode: false,
        };
      }
    }

    const previousNodeId = this.previousNode.get(npc.npcId);
    const nextNodeId = this.pickNextGraphNode(currentNodeId, zone, previousNodeId);
    const nextNode = getRoadNode(nextNodeId);
    if (!nextNode) return null;
    if (this.occupancy.isOccupiedByOther(npc.npcId, nextNode.col, nextNode.row)) {
      return null;
    }

    const routeToNextNode = findPath(
      { col: npc.tileX, row: npc.tileY },
      { col: nextNode.col, row: nextNode.row },
      (col, row) => this.isRoadWalkable(col, row),
    );
    if (!routeToNextNode || routeToNextNode.length === 0) return null;

    return {
      waypoints: compressPath(routeToNextNode),
      nextNodeId,
      previousNodeId: currentNodeId,
      arrivedAtNewNode: true,
    };
  }

  private pickNextGraphNode(
    currentNodeId: string,
    zone?: string,
    previousNodeId?: string,
  ): string {
    const connected = getConnectedNodes(currentNodeId).filter(
      (nodeId) =>
        nodeId !== previousNodeId || getConnectedNodes(currentNodeId).length === 1,
    );
    if (connected.length === 0) return currentNodeId;

    const preferredIds = new Set(
      zone ? (ZONE_NODE_PREFERENCES[zone] ?? ROAD_GRAPH_NODES.map((node) => node.id)) : ROAD_GRAPH_NODES.map((node) => node.id),
    );
    const preferredConnected = connected.filter((nodeId) => preferredIds.has(nodeId));
    const pool = preferredConnected.length > 0 ? preferredConnected : connected;
    return pool[Math.floor(Math.random() * pool.length)] ?? currentNodeId;
  }

  private isRoadWalkable(col: number, row: number): boolean {
    if (
      col < CENTER_BOUNDS.minCol ||
      col > CENTER_BOUNDS.maxCol ||
      row < CENTER_BOUNDS.minRow ||
      row > CENTER_BOUNDS.maxRow
    ) {
      return false;
    }
    return this.isWalkable(col, row) && this.isRoad(col, row);
  }

  private async walkWaypoints(
    npc: NPC,
    waypoints: { col: number; row: number }[],
  ): Promise<boolean> {
    for (const waypoint of waypoints) {
      if (this.overridden.has(npc.npcId)) return false;
      if (this.occupancy.isOccupiedByOther(npc.npcId, waypoint.col, waypoint.row)) {
        return false;
      }
      this.occupancy.occupy(npc.npcId, waypoint.col, waypoint.row);
      await npc.walkTo(waypoint.col, waypoint.row);
    }
    return true;
  }

  private scheduleNext(npc: NPC, delay: number) {
    if (this.overridden.has(npc.npcId)) return;
    const timer = this.scene.time.addEvent({
      delay,
      callback: () => this.step(npc),
      loop: false,
    });
    this.timers.set(npc.npcId, timer);
  }

  destroy() {
    for (const timer of this.timers.values()) {
      timer.destroy();
    }
    this.timers.clear();
    this.overridden.clear();
    this.npcZone.clear();
    this.currentNode.clear();
    this.previousNode.clear();
  }
}

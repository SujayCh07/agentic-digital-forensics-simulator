import * as Phaser from "phaser";
import { CYBER_CITY_SECTOR_SEEDS } from "@/data/cyberCitySectors";
import type { BuildingPositions } from "@/types";
import { eventBridge } from "../bridge/EventBridge";
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  TILE_SIZE,
} from "../config";
import { SimEventHandler } from "../events/SimEventHandler";
import {
  ALL_CHARACTERS,
  ALL_DIRECTIONS,
  getAnimKey,
  getWalkFrames,
} from "../map/NPCCharacterRegistry";
import { NPCManager } from "../systems/NPCManager";

const VISIBLE_MIN_COL = 2;
const VISIBLE_MAX_COL = 37;
const VISIBLE_MIN_ROW = 2;
const VISIBLE_MAX_ROW = 29;

const DEFAULT_ZOOM = 1.12;
const MAX_ZOOM = 1.22;

interface RoadSegment {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

const ROAD_SEGMENTS: RoadSegment[] = [
  { x1: 8, x2: 35, y1: 10, y2: 11 },
  { x1: 8, x2: 35, y1: 21, y2: 22 },
  { x1: 8, x2: 9, y1: 10, y2: 22 },
  { x1: 19, x2: 20, y1: 10, y2: 22 },
  { x1: 28, x2: 29, y1: 10, y2: 22 },
  { x1: 35, x2: 36, y1: 11, y2: 22 },
];

function isRoadTile(col: number, row: number) {
  return ROAD_SEGMENTS.some(
    (segment) =>
      col >= segment.x1 &&
      col <= segment.x2 &&
      row >= segment.y1 &&
      row <= segment.y2,
  );
}

function anchorFor(id: string, fallback: { x: number; y: number }) {
  const seed = CYBER_CITY_SECTOR_SEEDS.find((entry) => entry.id === id);
  return seed ? { x: seed.anchor.tileX, y: seed.anchor.tileY } : fallback;
}

export class WorldScene extends Phaser.Scene {
  private groundLayer?: Phaser.Tilemaps.TilemapLayer;
  private phaseOverlay?: Phaser.GameObjects.Rectangle;
  private npcManager?: NPCManager;
  private simEventHandler?: SimEventHandler;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private sceneReady = false;
  private cleanedUp = false;
  private mapPixelLeft = VISIBLE_MIN_COL * TILE_SIZE;
  private mapPixelTop = VISIBLE_MIN_ROW * TILE_SIZE;
  private mapPixelWidth = (VISIBLE_MAX_COL - VISIBLE_MIN_COL + 1) * TILE_SIZE;
  private mapPixelHeight = (VISIBLE_MAX_ROW - VISIBLE_MIN_ROW + 1) * TILE_SIZE;

  constructor() {
    super({ key: "WorldScene" });
  }

  create() {
    this.sceneReady = false;
    this.cleanedUp = false;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupScene, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanupScene, this);

    const map = this.make.tilemap({ key: "moonCity" });
    const tileset = map.addTilesetImage("moon-city-tileset", "moonTiles");
    if (!tileset) {
      throw new Error("Missing moon-city tileset binding");
    }

    const layerName = map.layers[0]?.name ?? "Tile Layer 1";
    const groundLayer = map.createLayer(layerName, tileset, 0, 0);
    if (!groundLayer) {
      throw new Error("Failed to create moon-city tile layer");
    }

    this.groundLayer = groundLayer;
    this.groundLayer.setDepth(0);

    const cam = this.cameras.main;
    cam.setBackgroundColor("#050911");
    cam.setBounds(
      this.mapPixelLeft,
      this.mapPixelTop,
      this.mapPixelWidth,
      this.mapPixelHeight,
      true,
    );
    cam.setZoom(DEFAULT_ZOOM);
    cam.centerOn(
      this.mapPixelLeft + this.mapPixelWidth / 2,
      this.mapPixelTop + this.mapPixelHeight / 2,
    );
    cam.roundPixels = true;
    this.clampCamera();

    this.phaseOverlay = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH * 2,
      GAME_HEIGHT * 2,
      0x000000,
      0,
    );
    this.phaseOverlay.setDepth(8);
    this.phaseOverlay.setScrollFactor(0);

    eventBridge.on("sim:phase-change", this.onPhaseChange, this);
    eventBridge.on("sim:camera-pan", this.onCameraPan, this);
    eventBridge.on("sim:camera-zoom", this.onCameraZoom, this);
    eventBridge.on("sim:camera-snap-npc", this.onCameraSnapNPC, this);

    this.registerNPCAnimations();
    this.npcManager = new NPCManager(
      this,
      this.getBuildingPositions(),
      this.isWalkable.bind(this),
      this.getIsRoad(),
      this.getRoadTypeFn(),
    );
    this.simEventHandler = new SimEventHandler(this, this.npcManager);

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
    }

    this.sceneReady = true;
    this.events.emit("world-ready");
  }

  update() {
    if (!this.sceneReady || this.cleanedUp) return;

    if (this.cursors) {
      const cam = this.cameras.main;
      const speed = 10 / cam.zoom;
      if (this.cursors.left.isDown) cam.scrollX -= speed;
      if (this.cursors.right.isDown) cam.scrollX += speed;
      if (this.cursors.up.isDown) cam.scrollY -= speed;
      if (this.cursors.down.isDown) cam.scrollY += speed;
      this.clampCamera();
    }

    this.npcManager?.refreshActiveBubblePositions();
  }

  private registerNPCAnimations() {
    for (const char of ALL_CHARACTERS) {
      for (const dir of ALL_DIRECTIONS) {
        const key = getAnimKey(char, dir);
        if (this.anims.exists(key)) continue;
        const [frameA, frameB] = getWalkFrames(char, dir);
        this.anims.create({
          key,
          frames: [
            { key: "city-tiles", frame: frameA },
            { key: "city-tiles", frame: frameB },
          ],
          frameRate: 6,
          repeat: -1,
        });
      }
    }
  }

  getBuildingPositions(): BuildingPositions {
    return {
      government: anchorFor("AUTH-05", { x: 25, y: 7 }),
      shops: [
        { id: "edu", ...anchorFor("EDU-01", { x: 8, y: 7 }) },
        { id: "med", ...anchorFor("MED-02", { x: 35, y: 20 }) },
        { id: "civ", ...anchorFor("CIV-08", { x: 20, y: 18 }) },
      ],
      factories: [
        { id: "fin", ...anchorFor("FIN-03", { x: 34, y: 8 }) },
        { id: "net", ...anchorFor("NET-04", { x: 17, y: 7 }) },
        { id: "pwr", ...anchorFor("PWR-06", { x: 8, y: 25 }) },
        { id: "cloud", ...anchorFor("CLOUD-07", { x: 26, y: 25 }) },
      ],
      houses: [
        { id: "auth", ...anchorFor("AUTH-05", { x: 25, y: 7 }) },
        { id: "south-1", x: 12, y: 26 },
        { id: "south-2", x: 30, y: 26 },
      ],
    };
  }

  private getRoadTypeFn(): (col: number, row: number) => "v" | "h" | "none" {
    return (col, row) => {
      const vertical = ROAD_SEGMENTS.some(
        (segment) =>
          col >= segment.x1 &&
          col <= segment.x2 &&
          row >= segment.y1 &&
          row <= segment.y2 &&
          segment.x1 === segment.x2 - 1,
      );
      const horizontal = ROAD_SEGMENTS.some(
        (segment) =>
          col >= segment.x1 &&
          col <= segment.x2 &&
          row >= segment.y1 &&
          row <= segment.y2 &&
          segment.y1 === segment.y2 - 1,
      );
      if (vertical && !horizontal) return "v";
      if (horizontal && !vertical) return "h";
      return "none";
    };
  }

  private getIsRoad(): (col: number, row: number) => boolean {
    return (col, row) => isRoadTile(col, row);
  }

  isWalkable(col: number, row: number): boolean {
    if (col < VISIBLE_MIN_COL || col > VISIBLE_MAX_COL) return false;
    if (row < VISIBLE_MIN_ROW || row > VISIBLE_MAX_ROW) return false;
    return isRoadTile(col, row);
  }

  private onCameraPan(data: { dx: number; dy: number }) {
    const cam = this.getMainCamera();
    if (!cam) return;

    cam.scrollX = Math.round(cam.scrollX + data.dx / cam.zoom);
    cam.scrollY = Math.round(cam.scrollY + data.dy / cam.zoom);
    this.clampCamera();
    this.npcManager?.refreshActiveBubblePositions();
  }

  private onCameraZoom(data: { delta: number }) {
    const cam = this.getMainCamera();
    if (!cam) return;

    const nextZoom = Phaser.Math.Clamp(
      cam.zoom + data.delta * 0.08,
      DEFAULT_ZOOM,
      MAX_ZOOM,
    );
    cam.setZoom(nextZoom);
    this.clampCamera();
    this.npcManager?.refreshActiveBubblePositions();
  }

  private onCameraSnapNPC(data: { npcId: string }) {
    const npc = this.npcManager?.getNPC(data.npcId);
    if (!npc) return;
    const targetX = npc.tileX * TILE_SIZE + TILE_SIZE / 2;
    const targetY = npc.tileY * TILE_SIZE + TILE_SIZE / 2;
    this.cameras.main.pan(targetX, targetY, 260, "Sine.easeOut");
    this.time.delayedCall(270, () => this.clampCamera());
    this.npcManager?.refreshActiveBubblePositions();
  }

  private onPhaseChange(data: { phase: number; sentiment?: number }) {
    if (!this.phaseOverlay) return;

    const sentiment = data.sentiment ?? 0.5;
    if (data.phase <= 1) {
      this.phaseOverlay.setFillStyle(0x000000, 0);
      return;
    }

    const color =
      sentiment >= 0.6 ? 0x1dd1a1 : sentiment <= 0.35 ? 0xff3a3a : 0xffb347;
    const alpha = sentiment <= 0.35 ? 0.12 : 0.08;
    this.phaseOverlay.setFillStyle(color, alpha);
  }

  private clampCamera() {
    const cam = this.cameras.main;
    const visibleWidth = cam.width / cam.zoom;
    const visibleHeight = cam.height / cam.zoom;
    const minScrollX = this.mapPixelLeft;
    const minScrollY = this.mapPixelTop;
    const maxScrollX = Math.max(
      minScrollX,
      this.mapPixelLeft + this.mapPixelWidth - visibleWidth,
    );
    const maxScrollY = Math.max(
      minScrollY,
      this.mapPixelTop + this.mapPixelHeight - visibleHeight,
    );
    cam.scrollX = Phaser.Math.Clamp(cam.scrollX, minScrollX, maxScrollX);
    cam.scrollY = Phaser.Math.Clamp(cam.scrollY, minScrollY, maxScrollY);
  }

  private getMainCamera(): Phaser.Cameras.Scene2D.Camera | null {
    if (!this.sceneReady || this.cleanedUp) return null;
    return this.cameras?.main ?? null;
  }

  private cleanupScene() {
    if (this.cleanedUp) return;

    this.cleanedUp = true;
    this.sceneReady = false;
    eventBridge.off("sim:phase-change", this.onPhaseChange, this);
    eventBridge.off("sim:camera-pan", this.onCameraPan, this);
    eventBridge.off("sim:camera-zoom", this.onCameraZoom, this);
    eventBridge.off("sim:camera-snap-npc", this.onCameraSnapNPC, this);
    this.simEventHandler?.destroy();
    this.simEventHandler = undefined;
    this.npcManager?.destroy();
    this.npcManager = undefined;
    this.cursors = undefined;
    this.phaseOverlay = undefined;
    this.groundLayer = undefined;
  }

  shutdown() {
    this.cleanupScene();
  }
}

export type SpriteDirection = "west" | "south" | "north" | "east";
export type AgentSpriteCharacter = "logis" | "nexus" | "filer" | "chrono";

export interface DirectionFrameSet {
  idle: number;
  walkA: number;
  walkB: number;
}

export type CharacterFrameMap = Record<SpriteDirection, DirectionFrameSet>;

export interface AgentSpriteSheetConfig {
  key: string;
  path: string;
  frameWidth: number;
  frameHeight: number;
  margin: number;
  spacing: number;
  sheetColumns: number;
  targetDisplayHeight: number;
  applyRoleTint: boolean;
  characters: Record<AgentSpriteCharacter, CharacterFrameMap>;
}

interface TrimRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const SHEET_COLUMNS = 16;
const TRIM_ALPHA_THRESHOLD = 8;
const TRIM_PADDING = 2;

export const ACTIVE_AGENT_SPRITE_SHEET: AgentSpriteSheetConfig = {
  key: "lunar-agent-sprites-sheet",
  path: "/assets/agents/lunar_agents.png",
  frameWidth: 176,
  frameHeight: 192,
  margin: 0,
  spacing: 0,
  sheetColumns: SHEET_COLUMNS,
  targetDisplayHeight: 30,
  applyRoleTint: false,
  /**
   * Provisional role mapping from the currently supplied lunar sheet.
   * Rows 3-4 (0-indexed frame ids 32-63) contain clear four-column role groups:
   * south, east, north, west across the row with the next row as the walk pose.
   */
  characters: {
    logis: {
      south: { idle: 32, walkA: 32, walkB: 48 },
      east: { idle: 33, walkA: 33, walkB: 49 },
      north: { idle: 34, walkA: 34, walkB: 50 },
      west: { idle: 35, walkA: 35, walkB: 51 },
    },
    nexus: {
      south: { idle: 36, walkA: 36, walkB: 52 },
      east: { idle: 37, walkA: 37, walkB: 53 },
      north: { idle: 38, walkA: 38, walkB: 54 },
      west: { idle: 39, walkA: 39, walkB: 55 },
    },
    filer: {
      south: { idle: 40, walkA: 40, walkB: 56 },
      east: { idle: 41, walkA: 41, walkB: 57 },
      north: { idle: 42, walkA: 42, walkB: 58 },
      west: { idle: 43, walkA: 43, walkB: 59 },
    },
    chrono: {
      south: { idle: 44, walkA: 44, walkB: 60 },
      east: { idle: 45, walkA: 45, walkB: 61 },
      north: { idle: 46, walkA: 46, walkB: 62 },
      west: { idle: 47, walkA: 47, walkB: 63 },
    },
  },
};

export const ALL_SPRITE_DIRECTIONS: SpriteDirection[] = ["west", "south", "north", "east"];

const CHARACTER_TRIM_CACHE = new Map<AgentSpriteCharacter, TrimRect>();

function getFrameRect(frameIndex: number): TrimRect {
  const col = frameIndex % ACTIVE_AGENT_SPRITE_SHEET.sheetColumns;
  const row = Math.floor(frameIndex / ACTIVE_AGENT_SPRITE_SHEET.sheetColumns);
  return {
    x: col * ACTIVE_AGENT_SPRITE_SHEET.frameWidth,
    y: row * ACTIVE_AGENT_SPRITE_SHEET.frameHeight,
    width: ACTIVE_AGENT_SPRITE_SHEET.frameWidth,
    height: ACTIVE_AGENT_SPRITE_SHEET.frameHeight,
  };
}

function makeScratchCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function scanOpaqueBounds(
  sourceImage: CanvasImageSource,
  frameRect: TrimRect,
): TrimRect {
  const canvas = makeScratchCanvas(frameRect.width, frameRect.height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return { x: 0, y: 0, width: frameRect.width, height: frameRect.height };
  }

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, frameRect.width, frameRect.height);
  ctx.drawImage(
    sourceImage,
    frameRect.x,
    frameRect.y,
    frameRect.width,
    frameRect.height,
    0,
    0,
    frameRect.width,
    frameRect.height,
  );

  const { data } = ctx.getImageData(0, 0, frameRect.width, frameRect.height);
  let minX = frameRect.width;
  let minY = frameRect.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < frameRect.height; y++) {
    for (let x = 0; x < frameRect.width; x++) {
      const alpha = data[(y * frameRect.width + x) * 4 + 3];
      if (alpha < TRIM_ALPHA_THRESHOLD) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) {
    return { x: 0, y: 0, width: frameRect.width, height: frameRect.height };
  }

  return {
    x: Math.max(0, minX - TRIM_PADDING),
    y: Math.max(0, minY - TRIM_PADDING),
    width: Math.min(frameRect.width, maxX - minX + 1 + TRIM_PADDING * 2),
    height: Math.min(frameRect.height, maxY - minY + 1 + TRIM_PADDING * 2),
  };
}

function unionRects(rects: TrimRect[], maxWidth: number, maxHeight: number): TrimRect {
  const minX = Math.min(...rects.map((rect) => rect.x));
  const minY = Math.min(...rects.map((rect) => rect.y));
  const maxX = Math.max(...rects.map((rect) => rect.x + rect.width));
  const maxY = Math.max(...rects.map((rect) => rect.y + rect.height));

  return {
    x: Math.max(0, minX),
    y: Math.max(0, minY),
    width: Math.min(maxWidth, maxX - minX),
    height: Math.min(maxHeight, maxY - minY),
  };
}

function buildCharacterTrimRect(sourceImage: CanvasImageSource, character: AgentSpriteCharacter): TrimRect {
  const rects: TrimRect[] = [];

  for (const dir of ALL_SPRITE_DIRECTIONS) {
    const frames = ACTIVE_AGENT_SPRITE_SHEET.characters[character][dir];
    rects.push(scanOpaqueBounds(sourceImage, getFrameRect(frames.idle)));
    rects.push(scanOpaqueBounds(sourceImage, getFrameRect(frames.walkA)));
    rects.push(scanOpaqueBounds(sourceImage, getFrameRect(frames.walkB)));
  }

  return unionRects(
    rects,
    ACTIVE_AGENT_SPRITE_SHEET.frameWidth,
    ACTIVE_AGENT_SPRITE_SHEET.frameHeight,
  );
}

export function getCharacterTrimRect(character: AgentSpriteCharacter): TrimRect {
  const rect = CHARACTER_TRIM_CACHE.get(character);
  if (!rect) {
    throw new Error(`Missing trim rect for ${character}. BootScene must prepare trim cache first.`);
  }
  return rect;
}

export function prepareAgentTrimCache(sourceImage: CanvasImageSource) {
  CHARACTER_TRIM_CACHE.clear();
  for (const character of Object.keys(
    ACTIVE_AGENT_SPRITE_SHEET.characters,
  ) as AgentSpriteCharacter[]) {
    CHARACTER_TRIM_CACHE.set(character, buildCharacterTrimRect(sourceImage, character));
  }
}

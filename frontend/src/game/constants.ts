export type MapType = "moonCity";

export const TILE_SIZE = 32;
export const MAP_COLS = 40;
export const MAP_ROWS = 32;
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 960;
export const SCALE_FACTOR = 1;

export const MAP_CONFIGS = {
  moonCity: { tileSize: 32, cols: 40, rows: 32, spacing: 0 },
} as const;

export let selectedMap: MapType = "moonCity";
export function setSelectedMap(m: MapType) {
  selectedMap = m;
}

export let proceduralMap = false;
export function setProceduralMap(v: boolean) {
  proceduralMap = v;
}

export function getMapConfig() {
  return MAP_CONFIGS[selectedMap];
}

export const CENTER_BOUNDS = {
  minCol: 1,
  maxCol: 38,
  minRow: 1,
  maxRow: 30,
} as const;

import type { SectorBounds, SectorId } from "@/types/investigation";

export interface SectorSeed {
  id: SectorId;
  label: SectorId;
  domain: string;
  nodeId: string;
  bounds: SectorBounds;
  anchor: {
    tileX: number;
    tileY: number;
  };
}

/**
 * Sector layout — clean 4×2 grid across the visible map (cols 2–37, rows 2–29).
 *
 * Top row    (rows  2–14): EDU-01 | NET-04 | AUTH-05 | FIN-03
 * Bottom row (rows 15–29): PWR-06 | CIV-08 | CLOUD-07 | MED-02
 *
 * Each column is ~9 tiles wide so the sectors tile evenly with no overlap.
 */
export const CYBER_CITY_SECTOR_SEEDS: SectorSeed[] = [
  // ── Top row ──────────────────────────────────────────────────────────────
  {
    id: "EDU-01",
    label: "EDU-01",
    domain: "University Network",
    nodeId: "WKS-03",
    bounds: { x: 2, y: 2, width: 9, height: 13 },
    anchor: { tileX: 8, tileY: 7 },
  },
  {
    id: "NET-04",
    label: "NET-04",
    domain: "ISP Backbone",
    nodeId: "GW-01",
    bounds: { x: 11, y: 2, width: 9, height: 13 },
    anchor: { tileX: 17, tileY: 7 },
  },
  {
    id: "AUTH-05",
    label: "AUTH-05",
    domain: "Identity Gateway",
    nodeId: "EXT-01",
    bounds: { x: 20, y: 2, width: 9, height: 13 },
    anchor: { tileX: 25, tileY: 7 },
  },
  {
    id: "FIN-03",
    label: "FIN-03",
    domain: "Bank Core",
    nodeId: "MAIL-01",
    bounds: { x: 29, y: 2, width: 9, height: 13 },
    anchor: { tileX: 34, tileY: 8 },
  },
  // ── Bottom row ───────────────────────────────────────────────────────────
  {
    id: "PWR-06",
    label: "PWR-06",
    domain: "Power Grid",
    nodeId: "BACKUP-01",
    bounds: { x: 2, y: 15, width: 9, height: 14 },
    anchor: { tileX: 8, tileY: 25 },
  },
  {
    id: "CIV-08",
    label: "CIV-08",
    domain: "Transit / Civic Ops",
    nodeId: "CIV-08",
    bounds: { x: 11, y: 15, width: 11, height: 14 },
    anchor: { tileX: 20, tileY: 18 },
  },
  {
    id: "CLOUD-07",
    label: "CLOUD-07",
    domain: "Cloud Archive",
    nodeId: "CLOUD-07",
    bounds: { x: 22, y: 15, width: 8, height: 14 },
    anchor: { tileX: 26, tileY: 25 },
  },
  {
    id: "MED-02",
    label: "MED-02",
    domain: "Medical Systems",
    nodeId: "DB-02",
    bounds: { x: 30, y: 15, width: 8, height: 14 },
    anchor: { tileX: 35, tileY: 20 },
  },
];

export const CYBER_CITY_LINKS: Array<{
  sourceId: SectorId;
  targetId: SectorId;
  suspicious: boolean;
}> = [
  { sourceId: "EDU-01", targetId: "FIN-03", suspicious: true },
  { sourceId: "FIN-03", targetId: "MED-02", suspicious: true },
  { sourceId: "FIN-03", targetId: "NET-04", suspicious: false },
  { sourceId: "MED-02", targetId: "PWR-06", suspicious: true },
  { sourceId: "NET-04", targetId: "AUTH-05", suspicious: true },
  { sourceId: "NET-04", targetId: "CIV-08", suspicious: false },
  { sourceId: "PWR-06", targetId: "CLOUD-07", suspicious: false },
  { sourceId: "CLOUD-07", targetId: "AUTH-05", suspicious: false },
  { sourceId: "CIV-08", targetId: "EDU-01", suspicious: false },
];

export const DOMAIN_LABEL_BY_SECTOR: Record<SectorId, string> = {
  "EDU-01": "University Network",
  "MED-02": "City Medical DB",
  "FIN-03": "Central Bank Core",
  "NET-04": "ISP Core Tower",
  "AUTH-05": "Identity Gateway",
  "PWR-06": "Grid Control",
  "CLOUD-07": "Cloud Archive",
  "CIV-08": "Transit Ops / City Hall Ops",
};

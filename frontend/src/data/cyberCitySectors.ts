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
 * Sector layout keeps the existing city tilemap as the base world.
 * Bounds and anchors were chosen to align with major visual building clusters.
 */
export const CYBER_CITY_SECTOR_SEEDS: SectorSeed[] = [
  {
    id: "EDU-01",
    label: "EDU-01",
    domain: "University Network",
    nodeId: "WKS-03",
    bounds: { x: 2, y: 3, width: 10, height: 8 },
    anchor: { tileX: 8, tileY: 7 },
  },
  {
    id: "MED-02",
    label: "MED-02",
    domain: "Medical Systems",
    nodeId: "DB-02",
    bounds: { x: 30, y: 16, width: 8, height: 10 },
    anchor: { tileX: 35, tileY: 20 },
  },
  {
    id: "FIN-03",
    label: "FIN-03",
    domain: "Bank Core",
    nodeId: "MAIL-01",
    bounds: { x: 30, y: 4, width: 8, height: 10 },
    anchor: { tileX: 34, tileY: 8 },
  },
  {
    id: "NET-04",
    label: "NET-04",
    domain: "ISP Backbone",
    nodeId: "GW-01",
    bounds: { x: 13, y: 3, width: 8, height: 8 },
    anchor: { tileX: 17, tileY: 7 },
  },
  {
    id: "AUTH-05",
    label: "AUTH-05",
    domain: "Identity Gateway",
    nodeId: "EXT-01",
    bounds: { x: 22, y: 3, width: 7, height: 8 },
    anchor: { tileX: 25, tileY: 7 },
  },
  {
    id: "PWR-06",
    label: "PWR-06",
    domain: "Power Grid",
    nodeId: "BACKUP-01",
    bounds: { x: 3, y: 21, width: 10, height: 8 },
    anchor: { tileX: 8, tileY: 25 },
  },
  {
    id: "CLOUD-07",
    label: "CLOUD-07",
    domain: "Cloud Archive",
    nodeId: "CLOUD-07",
    bounds: { x: 22, y: 22, width: 8, height: 7 },
    anchor: { tileX: 26, tileY: 25 },
  },
  {
    id: "CIV-08",
    label: "CIV-08",
    domain: "Transit / Civic Ops",
    nodeId: "CIV-08",
    bounds: { x: 14, y: 14, width: 12, height: 8 },
    anchor: { tileX: 20, tileY: 18 },
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

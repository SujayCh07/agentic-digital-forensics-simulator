import type { SectorBounds, SectorId } from "@/types/investigation";

export interface SectorSeed {
  id: SectorId;
  label: SectorId;
  locationName: string;
  domain: string;
  nodeId: string;
  bounds: SectorBounds;
  anchor: {
    tileX: number;
    tileY: number;
  };
  isPrimary: boolean;
  panelOrder: number;
}

export type SectorThreatTone = "healthy" | "suspicious" | "compromised";

export interface SectorThreatStatus {
  sectorId: SectorId;
  threat: number;
  tone: SectorThreatTone;
}

const SECTOR_THREAT_SEED: Record<SectorId, number> = {
  "EDU-01": 0.18,
  "AUTH-05": 0.63,
  "FIN-03": 0.78,
  "NET-04": 0.08,
  "MED-02": 0.46,
  "CIV-08": 0.26,
  "PWR-06": 0.58,
  "CLOUD-07": 0.52,
};

/**
 * Active moon-city region map.
 *
 * These bounds are intentionally hand-aligned to the actual visible landmarks
 * rather than the old generic 4×2 slice. The top-right block remains in the
 * config for completeness, but is marked non-primary and is excluded from the
 * active panel/click flow.
 */
export const CYBER_CITY_SECTOR_SEEDS: SectorSeed[] = [
  {
    id: "EDU-01",
    label: "EDU-01",
    locationName: "Research Glass Labs",
    domain: "University Research Systems",
    nodeId: "WKS-03",
    bounds: { x: 3, y: 10, width: 8, height: 6 },
    anchor: { tileX: 7, tileY: 14 },
    isPrimary: true,
    panelOrder: 1,
  },
  {
    id: "AUTH-05",
    label: "AUTH-05",
    locationName: "Security Bastion",
    domain: "Access Control / Identity Gateway",
    nodeId: "GW-01",
    bounds: { x: 12, y: 5, width: 8, height: 7 },
    anchor: { tileX: 17, tileY: 11 },
    isPrimary: true,
    panelOrder: 2,
  },
  {
    id: "FIN-03",
    label: "FIN-03",
    locationName: "Neon Finance Tower",
    domain: "Transaction Core / Treasury Systems",
    nodeId: "DB-02",
    bounds: { x: 21, y: 8, width: 7, height: 8},
    anchor: { tileX: 27, tileY: 11 },
    isPrimary: true,
    panelOrder: 3,
  },
  {
    id: "NET-04",
    label: "NET-04",
    locationName: "Peripheral Hab Block",
    domain: "Inactive Peripheral Zone",
    nodeId: "EXT-01",
    bounds: { x: 29, y: 12, width: 8, height: 15 },
    anchor: { tileX: 34, tileY: 10 },
    isPrimary: true,
    panelOrder: 99,
  },
  {
    id: "MED-02",
    label: "MED-02",
    locationName: "Medical Sector Block",
    domain: "Clinical Monitoring / Diagnostics",
    nodeId: "MAIL-01",
    bounds: { x: 3, y: 19, width: 8, height: 11 },
    anchor: { tileX: 7, tileY: 22 },
    isPrimary: true,
    panelOrder: 4,
  },
  {
    id: "CIV-08",
    label: "CIV-08",
    locationName: "Civic Transit Hub",
    domain: "Transit Routing / Civic Process Control",
    nodeId: "GW-01",
    bounds: { x: 12, y: 17, width: 8, height: 12 },
    anchor: { tileX: 21, tileY: 24 },
    isPrimary: true,
    panelOrder: 5,
  },
  {
    id: "PWR-06",
    label: "PWR-06",
    locationName: "Data Core + Power Plant",
    domain: "Compute Halls / Cooling / Power Control",
    nodeId: "BACKUP-01",
    bounds: { x: 21, y: 19, width: 7, height: 5 },
    anchor: { tileX: 28, tileY: 23 },
    isPrimary: true,
    panelOrder: 6,
  },
  {
    id: "CLOUD-07",
    label: "CLOUD-07",
    locationName: "Comms Relay + Rocket Square",
    domain: "Telemetry Uplink / Launch Communications",
    nodeId: "EXT-01",
    bounds: { x: 21, y: 23, width: 7, height: 5 },
    anchor: { tileX: 35, tileY: 22 },
    isPrimary: true,
    panelOrder: 7,
  },
];

export const PRIMARY_CYBER_CITY_SECTOR_SEEDS = CYBER_CITY_SECTOR_SEEDS
  .filter((seed) => seed.isPrimary)
  .sort((a, b) => a.panelOrder - b.panelOrder);

export const PRIMARY_SECTOR_IDS = PRIMARY_CYBER_CITY_SECTOR_SEEDS.map(
  (seed) => seed.id,
);

export const CYBER_CITY_LINKS: Array<{
  sourceId: SectorId;
  targetId: SectorId;
  suspicious: boolean;
}> = [
  { sourceId: "EDU-01", targetId: "AUTH-05", suspicious: true },
  { sourceId: "AUTH-05", targetId: "FIN-03", suspicious: true },
  { sourceId: "FIN-03", targetId: "PWR-06", suspicious: true },
  { sourceId: "PWR-06", targetId: "CLOUD-07", suspicious: true },
  { sourceId: "CIV-08", targetId: "MED-02", suspicious: false },
  { sourceId: "CIV-08", targetId: "AUTH-05", suspicious: false },
  { sourceId: "MED-02", targetId: "EDU-01", suspicious: false },
];

export const DOMAIN_LABEL_BY_SECTOR: Record<SectorId, string> = {
  "EDU-01": "University Research Systems",
  "AUTH-05": "Access Control / Identity Gateway",
  "FIN-03": "Transaction Core / Treasury Systems",
  "NET-04": "Inactive Peripheral Zone",
  "MED-02": "Clinical Monitoring / Diagnostics",
  "CIV-08": "Transit Routing / Civic Process Control",
  "PWR-06": "Compute Halls / Cooling / Power Control",
  "CLOUD-07": "Telemetry Uplink / Launch Communications",
};

export const LOCATION_NAME_BY_SECTOR: Record<SectorId, string> = {
  "EDU-01": "Research Glass Labs",
  "AUTH-05": "Security Bastion",
  "FIN-03": "Neon Finance Tower",
  "NET-04": "Peripheral Hab Block",
  "MED-02": "Medical Sector Block",
  "CIV-08": "Civic Transit Hub",
  "PWR-06": "Data Core + Power Plant",
  "CLOUD-07": "Comms Relay + Rocket Square",
};

export function getSectorSeed(sectorId: SectorId) {
  return CYBER_CITY_SECTOR_SEEDS.find((seed) => seed.id === sectorId);
}

export function getPrimarySectorSeed(sectorId: SectorId) {
  const seed = getSectorSeed(sectorId);
  return seed?.isPrimary ? seed : undefined;
}

function threatToneFromValue(threat: number): SectorThreatTone {
  if (threat >= 70) return "compromised";
  if (threat >= 25) return "suspicious";
  return "healthy";
}

export function computeSectorThreatStatuses(
  activeSectorId: SectorId | null,
  pressureLevel: number,
): SectorThreatStatus[] {
  const suspiciousNeighbors = new Set<SectorId>();
  if (activeSectorId) {
    for (const link of CYBER_CITY_LINKS) {
      if (!link.suspicious) continue;
      if (link.sourceId === activeSectorId) suspiciousNeighbors.add(link.targetId);
      if (link.targetId === activeSectorId) suspiciousNeighbors.add(link.sourceId);
    }
  }

  const pressure = Math.min(pressureLevel / 10, 1);

  return PRIMARY_CYBER_CITY_SECTOR_SEEDS.map((seed) => {
    const base = SECTOR_THREAT_SEED[seed.id] ?? 0.2;
    let threat = 6 + base * 18 + pressure * 18;

    if (seed.id === activeSectorId) {
      threat = 66 + base * 12 + pressure * 22;
    } else if (suspiciousNeighbors.has(seed.id)) {
      threat = 26 + base * 16 + pressure * 16;
    }

    const roundedThreat = Math.min(Math.round(threat), 100);
    return {
      sectorId: seed.id,
      threat: roundedThreat,
      tone: threatToneFromValue(roundedThreat),
    };
  });
}

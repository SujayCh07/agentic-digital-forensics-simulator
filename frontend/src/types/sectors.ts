import type { SectorId } from "./investigation";

// ---------------------------------------------------------------------------
// Sector case domain types
// ---------------------------------------------------------------------------

export type CaseStatus = "available" | "active" | "solved";

export type SectorEventType =
  | "malicious_code_commit"
  | "compromised_research_server"
  | "anomaly_detection"
  | "alert_flood"
  | "ransomware"
  | "data_exfiltration"
  | "packet_anomalies"
  | "traffic_spike"
  | "brute_force_login"
  | "credential_theft"
  | "server_compromise"
  | "storage_breach"
  | "process_overload"
  | "messaging_anomalies"
  | "multi_sector_attack"
  | "cascading_failure";

/** Agent IDs prioritised for this sector case */
export type AgentPriority = "logis" | "nexus" | "filer" | "chrono";

export interface SectorCase {
  id: string;
  sectorId: SectorId;
  eventType: SectorEventType;
  title: string;
  landmark: string;
  description: string;
  /** Sector accent color (CSS hex string) */
  color: string;
  visualTheme: string;
  timeLimit: number; // seconds
  status: CaseStatus;
  affectedNodes: string[]; // CaseSystemNode ids
  initialClues: string[];
  agentPriority: AgentPriority[];
  difficulty: "low" | "medium" | "high" | "critical";
}

export interface ActiveCase {
  case: SectorCase;
  startedAt: number; // Date.now()
}

// ---------------------------------------------------------------------------
// Sector accent colours — shared across Phaser + React
// ---------------------------------------------------------------------------
export const SECTOR_COLORS: Record<SectorId, string> = {
  "EDU-01": "#22d3ee",
  "MED-02": "#34d399",
  "FIN-03": "#f59e0b",
  "NET-04": "#60a5fa",
  "AUTH-05": "#a78bfa",
  "PWR-06": "#fb923c",
  "CLOUD-07": "#38bdf8",
  "CIV-08": "#f472b6",
};

/** Phaser hex number equivalents for GameObjects tinting */
export const SECTOR_COLORS_HEX: Record<SectorId, number> = {
  "EDU-01": 0x22d3ee,
  "MED-02": 0x34d399,
  "FIN-03": 0xf59e0b,
  "NET-04": 0x60a5fa,
  "AUTH-05": 0xa78bfa,
  "PWR-06": 0xfb923c,
  "CLOUD-07": 0x38bdf8,
  "CIV-08": 0xf472b6,
};

export const SECTOR_NAMES: Record<SectorId, string> = {
  "EDU-01": "Research Glass Labs",
  "MED-02": "Medical Sector Block",
  "FIN-03": "Neon Finance Tower",
  "NET-04": "Peripheral Hab Block",
  "AUTH-05": "Security Bastion",
  "PWR-06": "Data Core + Power Plant",
  "CLOUD-07": "Comms Relay + Rocket Square",
  "CIV-08": "Civic Transit Hub",
};

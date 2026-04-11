// NIPS — Investigation domain types
// These run alongside the existing SimEvent/SimMetrics types from index.ts.
// Wire these in as the backend is migrated; use mock data in the interim.

// ---------------------------------------------------------------------------
// Core investigation entities
// ---------------------------------------------------------------------------

export type SystemNodeType =
  | "server"       // general machine / server
  | "workstation"  // end-user machine
  | "router"       // network device
  | "database"     // data store
  | "archive"      // registry / long-term storage
  | "external";    // outside the perimeter

export type NodeStatus =
  | "clean"        // no known compromise
  | "suspicious"   // flagged for review
  | "compromised"  // confirmed infected/tampered
  | "offline"      // unreachable
  | "recovered";   // evidence extracted, cleared

export interface SystemNode {
  id: string;
  label: string;             // display name (e.g. "MAIL-01")
  type: SystemNodeType;
  status: NodeStatus;
  x: number;                 // tile position in city grid
  y: number;
  /** ISO 8601 timestamp of last known clean state */
  lastCleanAt?: string;
  /** ISO 8601 timestamp of first suspicious activity */
  firstAlertAt?: string;
  artifacts: EvidenceArtifact[];
}

export interface NetworkEdge {
  id: string;
  sourceId: string;          // SystemNode id
  targetId: string;          // SystemNode id
  /** bytes transferred during the incident window */
  bytesTransferred?: number;
  /** whether this connection was flagged as suspicious */
  isSuspicious: boolean;
  /** ISO 8601 timestamp of first suspicious packet */
  firstSeenAt?: string;
  /** ISO 8601 timestamp of last packet */
  lastSeenAt?: string;
  protocol?: string;         // e.g. "TCP/443", "SMB"
}

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

export type ArtifactType =
  | "log_entry"        // access/auth/system log line
  | "deleted_file"     // recovered via file carving
  | "registry_key"     // Windows registry artifact
  | "steg_payload"     // steganographic hidden data
  | "network_packet"   // captured packet / flow record
  | "process_record"   // running/terminated process info
  | "timeline_event";  // synthetic reconstructed event

export interface EvidenceArtifact {
  id: string;
  nodeId: string;            // which SystemNode this came from
  type: ArtifactType;
  timestamp: string;         // ISO 8601 — when the event occurred
  discoveredAt?: string;     // when the agent/player found it
  summary: string;           // one-line human-readable description
  raw?: string;              // raw log line / hex / text content
  confidence: number;        // 0.0 → 1.0 — agent certainty
  agentId?: string;          // which specialist found it (logis/nexus/filer/chrono)
  isRedHerring?: boolean;    // hidden from player; used by ECHO red herring logic
  tags: string[];            // e.g. ["lateral_movement", "privilege_escalation"]
}

// ---------------------------------------------------------------------------
// Forensic events (what streams to the UI)
// ---------------------------------------------------------------------------

export type ForensicEventType =
  | "log_anomaly"           // LOGIS found something in logs
  | "network_flag"          // NEXUS flagged a connection
  | "file_recovered"        // FILER recovered a deleted file
  | "steg_decoded"          // FILER decoded steganographic content
  | "timeline_updated"      // CHRONO updated event sequence
  | "echo_hypothesis"       // ECHO updated its working theory
  | "stage_change"          // investigation phase progressed
  | "alert"                 // player-visible alert / red herring
  | "player_action";        // player clicked / queried

export interface ForensicEvent {
  id: string;
  type: ForensicEventType;
  agentId: string;           // "logis" | "nexus" | "filer" | "chrono" | "echo" | "player"
  agentName: string;
  nodeId?: string;           // related SystemNode, if any
  edgeId?: string;           // related NetworkEdge, if any
  artifactId?: string;       // related EvidenceArtifact, if any
  message: string;
  stage: number;             // 1–3 investigation stages
  cycle: number;             // current agent reasoning cycle
  timestamp: number;         // Date.now() when emitted
  data?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Investigation-wide metrics (mirrors SimMetrics for the Dashboard)
// ---------------------------------------------------------------------------

export interface InvestigationMetrics {
  /** 0–1: fraction of nodes confirmed compromised */
  corruptionLevel: number;
  /** 0–1: integrity of recovered evidence chain */
  evidenceIntegrity: number;
  /** 0–1: fraction of nodes with confirmed lateral movement */
  compromisedSystems: number;
  /** 0–1: current observed network anomaly rate */
  networkActivity: number;
  /** 0–1: aggregate threat severity */
  threatLevel: number;
  /** 0–1: fraction of systems confirmed clean / recovered */
  systemsOnline: number;
  /** 0–1: ECHO's confidence in the current hypothesis */
  caseConfidence: number;
}

// ---------------------------------------------------------------------------
// ECHO hypothesis
// ---------------------------------------------------------------------------

export interface CausalLink {
  fromEventId: string;
  toEventId: string;
  reason: string;
  confidence: number;
}

export interface EchoHypothesis {
  originNodeId: string | null;    // suspected patient zero
  attackPath: string[];           // ordered SystemNode ids
  payloadType: string | null;     // "ransomware" | "exfiltration" | "insider" | ...
  confidence: number;             // 0.0 → 1.0
  supportingArtifacts: string[];  // EvidenceArtifact ids
  contradictions: string[];       // artifact ids that don't fit
  openQuestions: string[];        // things ECHO flags but can't explain
  lastUpdatedAt: string;          // ISO 8601
}

// ---------------------------------------------------------------------------
// Full investigation state (top-level)
// ---------------------------------------------------------------------------

export type InvestigationStage = "briefing" | "active" | "accusation" | "verdict";

export interface InvestigationState {
  scenarioId: string;
  scenarioName: string;
  incidentBrief: string;          // mayor's briefing text
  stage: InvestigationStage;
  currentCycle: number;
  maxCycles: number;
  nodes: SystemNode[];
  edges: NetworkEdge[];
  artifacts: EvidenceArtifact[];
  events: ForensicEvent[];
  metrics: InvestigationMetrics;
  echoHypothesis: EchoHypothesis;
  playerArtifacts: string[];      // artifact ids the player has personally collected
  isComplete: boolean;
  verdict?: {
    score: number;                // 0–110
    originCorrect: boolean;
    pathScore: number;            // 0–30
    payloadCorrect: boolean;
    timeBonus: number;
    redHerringPenalty: number;
    echoReliancePenalty: number;
  };
}

// ---------------------------------------------------------------------------
// Mock data helpers (used until backend is migrated)
// ---------------------------------------------------------------------------

export const MOCK_METRICS: InvestigationMetrics = {
  corruptionLevel: 0.0,
  evidenceIntegrity: 1.0,
  compromisedSystems: 0.0,
  networkActivity: 0.1,
  threatLevel: 0.0,
  systemsOnline: 1.0,
  caseConfidence: 0.0,
};

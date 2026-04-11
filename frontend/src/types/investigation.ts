// NIPS — Investigation domain types

// ---------------------------------------------------------------------------
// Agent system
// ---------------------------------------------------------------------------

export type AgentId = "logis" | "nexus" | "filer" | "chrono";

export type AgentStatus =
  | "idle"       // available for tasks
  | "moving"     // en route to target node
  | "executing"  // running task at node
  | "reporting"  // writing up result
  | "standby";   // not yet deployed

export type TaskType =
  // LOGIS
  | "analyze_logs"
  | "detect_anomalies"
  // NEXUS
  | "trace_connections"
  | "trace_lateral_movement"
  // FILER
  | "recover_files"
  | "inspect_artifacts"
  // CHRONO
  | "reconstruct_timeline"
  | "correlate_events";

export interface AgentDefinition {
  id: AgentId;
  name: string;          // "LOGIS"
  fullName: string;      // "Log Analysis Intelligence System"
  specialty: string;     // "Log Analysis"
  color: string;         // hex neon color
  capabilities: TaskType[];
  status: AgentStatus;
  currentTaskId?: string;
  currentNodeId?: string;
  /** Tile position in city grid (backend coordinate space 0-19 x 0-14) */
  tileX: number;
  tileY: number;
}

export interface Task {
  id: string;
  agentId: AgentId;
  targetNodeId: string;
  type: TaskType;
  status: "queued" | "moving" | "executing" | "complete" | "failed";
  startedAt: number; // Date.now()
  completedAt?: number;
  result?: AgentResult;
}

export interface AgentResult {
  agentId: AgentId;
  agentName: string;
  nodeId: string;
  nodeName: string;
  taskType: TaskType;
  summary: string;
  details: string;
  confidence: number;       // 0–1
  severity: "low" | "medium" | "high" | "critical";
  evidenceType: ArtifactType;
  tags: string[];
  isRedHerring?: boolean;
}

// ---------------------------------------------------------------------------
// Map entities
// ---------------------------------------------------------------------------

export type SystemNodeType =
  | "server"
  | "workstation"
  | "router"
  | "database"
  | "archive"
  | "external";

export type NodeStatus =
  | "clean"
  | "suspicious"
  | "compromised"
  | "offline"
  | "recovered";

export interface CaseSystemNode {
  id: string;
  name: string;
  type: SystemNodeType;
  status: NodeStatus;
  threatLevel: number;   // 0–1
  /** Backend coordinate space (0-19 x 0-14) */
  tileX: number;
  tileY: number;
  knownFindings: string[]; // agentResult ids found here so far
}

export interface CaseNetworkEdge {
  source: string;   // CaseSystemNode id
  target: string;
  isSuspicious: boolean;
}

// ---------------------------------------------------------------------------
// Evidence artifacts
// ---------------------------------------------------------------------------

export type ArtifactType =
  | "log_entry"
  | "deleted_file"
  | "registry_key"
  | "steg_payload"
  | "network_packet"
  | "process_record"
  | "timeline_event";

export interface EvidenceArtifact {
  id: string;
  nodeId: string;
  type: ArtifactType;
  timestamp: string;
  summary: string;
  raw?: string;
  confidence: number;
  agentId?: string;
  isRedHerring?: boolean;
  tags: string[];
}

// ---------------------------------------------------------------------------
// Full investigation state
// ---------------------------------------------------------------------------

export interface InvestigationState {
  scenarioId: string;
  scenarioName: string;
  incidentBrief: string;
  stage: number;          // 1-3 (maps to existing "phase")
  currentCycle: number;   // maps to existing "round"
  maxCycles: number;
  systemNodes: CaseSystemNode[];
  networkEdges: CaseNetworkEdge[];
  agents: AgentDefinition[];
  activeTasks: Task[];
  completedFindings: AgentResult[];
  selectedNodeId: string | null;
  isComplete: boolean;
  objective: string;
}

// ---------------------------------------------------------------------------
// Investigation metrics (maps to SimMetrics for Dashboard reuse)
// ---------------------------------------------------------------------------

export interface InvestigationMetrics {
  corruptionLevel: number;      // eggIndex slot
  evidenceIntegrity: number;    // priceIndex slot (inverted)
  compromisedSystems: number;   // unemploymentRate slot
  networkActivity: number;      // interestRate slot
  threatLevel: number;          // socialUnrest slot
  systemsOnline: number;        // businessSurvival slot
  caseConfidence: number;       // govApproval slot
}

export const MOCK_METRICS: InvestigationMetrics = {
  corruptionLevel: 0,
  evidenceIntegrity: 1.0,
  compromisedSystems: 0,
  networkActivity: 0.1,
  threatLevel: 0.1,
  systemsOnline: 1.0,
  caseConfidence: 0,
};

// ---------------------------------------------------------------------------
// Legacy aliases — kept for BuildingInspector / TimelineScrubber / EchoPanel
// scaffolding components that reference the old type names
// ---------------------------------------------------------------------------

/** @deprecated use CaseSystemNode */
export interface SystemNode {
  id: string;
  label: string;
  type: SystemNodeType;
  status: NodeStatus;
  x: number;
  y: number;
  firstAlertAt?: string;
  lastCleanAt?: string;
  artifacts: EvidenceArtifact[];
}

/** @deprecated use EvidenceArtifact directly */
export type ForensicEvent = EvidenceArtifact;

/** ECHO AI hypothesis — used by EchoPanel */
export interface EchoHypothesis {
  originNodeId?: string;
  payloadType?: string;
  attackPath: string[];
  openQuestions?: string[];
}

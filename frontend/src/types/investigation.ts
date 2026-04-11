export type SystemStatus =
  | "stable"
  | "investigating"
  | "suspicious"
  | "contained"
  | "compromised";

export type EvidenceSeverity = "low" | "medium" | "high" | "critical";

export interface SystemNode {
  id: string;
  name: string;
  kind: "server" | "workstation" | "gateway" | "archive" | "camera" | "vault";
  district: string;
  status: SystemStatus;
  clueCount: number;
  lastSeen: string;
}

export interface NetworkEdge {
  id: string;
  sourceId: string;
  targetId: string;
  protocol: string;
  risk: EvidenceSeverity;
  suspicious: boolean;
  note: string;
}

export interface ForensicEvent {
  id: string;
  type:
    | "log-anomaly"
    | "network-trace"
    | "file-recovery"
    | "timeline-shift"
    | "echo-brief"
    | "containment";
  agentId: string;
  agentName: string;
  buildingId: string;
  title: string;
  description: string;
  severity: EvidenceSeverity;
  timestamp: string;
}

export interface EvidenceArtifact {
  id: string;
  systemId: string;
  name: string;
  kind: "log" | "packet" | "binary" | "registry" | "image" | "timeline";
  summary: string;
  confidence: number;
  source: string;
}

export interface InvestigationAgentStatus {
  id: "logis" | "nexus" | "filer" | "chrono";
  name: string;
  role: string;
  status: "idle" | "investigating" | "reporting";
  confidence: number;
  currentLead: string;
}

export interface EchoHypothesis {
  originSystemId: string | null;
  payloadType: string | null;
  attackPath: string[];
  confidence: number;
  openQuestions: string[];
}

export interface InvestigationState {
  caseId: string;
  title: string;
  summary: string;
  systems: SystemNode[];
  edges: NetworkEdge[];
  clueFeed: ForensicEvent[];
  evidence: EvidenceArtifact[];
  agents: InvestigationAgentStatus[];
  hypothesis: EchoHypothesis;
  selectedSystemId: string | null;
  round: number;
  maxRounds: number;
}

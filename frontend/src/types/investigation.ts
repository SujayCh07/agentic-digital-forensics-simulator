// NIPS — Investigation domain types

// ---------------------------------------------------------------------------
// Helper / progression system
// ---------------------------------------------------------------------------

export interface Helper {
  id: string;
  name: string;
  role: AgentId;
  level: number; // 1 = rookie, 2 = veteran
  efficiency: number; // 0.4–1.0 → scales task execution speed
  accuracy: number; // 0.4–1.0 → scales result confidence + detail quality
  cost: number; // player credits required to unlock
  unlocked: boolean;
  description: string;
}

/** One active helper selected per role for the current case */
export type ActiveHelpers = Record<AgentId, Helper>;

// ---------------------------------------------------------------------------
// Agent system
// ---------------------------------------------------------------------------

export type AgentId = "logis" | "nexus" | "filer" | "chrono";

export type AgentStatus =
  | "idle" // available for tasks
  | "moving" // en route to target node
  | "executing" // running task at node
  | "reporting" // writing up result
  | "standby"; // not yet deployed

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
  name: string; // "LOGIS"
  fullName: string; // "Log Analysis Intelligence System"
  specialty: string; // "Log Analysis"
  color: string; // hex neon color
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
  findingId: string;
  evidenceKey: string;
  agentId: AgentId;
  agentName: string;
  nodeId: string;
  nodeName: string;
  taskType: TaskType | null;
  summary: string;
  details: string;
  confidence: number; // 0–1
  severity: "low" | "medium" | "high" | "critical";
  evidenceType: ArtifactType;
  tags: string[];
  isRedHerring?: boolean;
  source: "local_task" | "nips_chat" | "issue_resolution" | "system";
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
  threatLevel: number; // 0–1
  /** Backend coordinate space (0-19 x 0-14) */
  tileX: number;
  tileY: number;
  knownFindings: string[]; // finding ids discovered here so far
}

export interface CaseNetworkEdge {
  source: string; // CaseSystemNode id
  target: string;
  isSuspicious: boolean;
}

export type SectorId =
  | "EDU-01"
  | "MED-02"
  | "FIN-03"
  | "NET-04"
  | "AUTH-05"
  | "PWR-06"
  | "CLOUD-07"
  | "CIV-08";

export type CyberNodeStatus =
  | "healthy"
  | "suspicious"
  | "compromised"
  | "isolated";

export interface SectorBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SystemNodeModel {
  id: string;
  label: string;
  type: SystemNodeType;
  sectorId: SectorId;
  x?: number;
  y?: number;
  mapPosition?: {
    tileX: number;
    tileY: number;
  };
  status: CyberNodeStatus;
  threatLevel: number;
  logs: string[];
  evidence: EvidenceArtifact[] | string[];
  sourceNodeId?: string;
}

export interface SectorModel {
  id: SectorId;
  label: string;
  domain?: string;
  bounds: SectorBounds;
  nodeId: string;
  status: CyberNodeStatus;
}

export interface SystemLinkModel {
  sourceId: SectorId;
  targetId: SectorId;
  active: boolean;
  suspicious: boolean;
  compromisedFlow: boolean;
}

export interface CityFrameState {
  timestamp: number;
  sectors: SectorModel[];
  nodes: SystemNodeModel[];
  links: SystemLinkModel[];
  selectedNodeId: string | null;
  alerts: string[];
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
  stage: number; // 1-3 (maps to existing "phase")
  currentCycle: number; // maps to existing "round"
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
// Midgame / Endgame progression
// ---------------------------------------------------------------------------

export type IssueStatus =
  | "locked"
  | "available"
  | "resolved"
  | "failed_attempt";

export type IssueFailureReason =
  | "insufficient_evidence"
  | "wrong_agent"
  | "timeline_conflict"
  | "contradicted_by_findings";

export type IssueType =
  | "credential_abuse"
  | "lateral_movement"
  | "data_exfil"
  | "staging_relay"
  | "egress_control";

export interface IssueDefinition {
  id: string;
  buildingId: string;
  sectorId: SectorId;
  type: IssueType;
  title: string;
  description: string;
  requiredEvidence: string[];
  optionalEvidence?: string[];
  requiredAgent: "LOGIS" | "NEXUS" | "FILER" | "CHRONO";
  unlocksIssueIds: string[];
}

export interface IssueState extends IssueDefinition {
  status: IssueStatus;
  attempts: number;
  available: boolean;
  missingEvidence: string[];
  unlockedAt?: number;
  resolvedAt?: number;
  lastFailureReason?: IssueFailureReason;
  feedbackMessage?: string;
}

export interface ThreatState {
  spreadLevel: number;
  caseConfidence: number;
  nodeThreats: Record<string, number>;
  stabilizedNodeIds: string[];
}

export interface IssueResolutionRequest {
  issue_id: string;
  agent_archetype: "LOGIS" | "NEXUS" | "FILER" | "CHRONO";
}

export interface IssueResolutionResult {
  issue_id: string;
  building_id: string;
  sector_id: SectorId;
  success: boolean;
  status: IssueStatus;
  reason?: IssueFailureReason;
  message: string;
  unlocked_issue_ids: string[];
  revealed_evidence_keys: string[];
  threat_delta: number;
  case_confidence_delta: number;
  final_phase_ready: boolean;
}

export type AttackType = "data_exfil" | "credential_abuse" | "malware" | "intrusion";

export type MitigationPlanOption =
  | "reset_credentials"
  | "patch_vulnerability"
  | "isolate_system"
  | "restore_backups"
  | "remove_persistence"
  | "block_external_communication";

export interface FinalReportSubmission {
  origin_node_id: string;
  attack_path: string[];
  attack_type: AttackType;
  mitigation_plan: MitigationPlanOption[];
}

export interface FinalEvaluation {
  originCorrect: boolean;
  pathAccuracy: number;
  attackTypeCorrect: boolean;
  fixCorrect: boolean;
  score: number;
  passed: boolean;
  mitigationAccuracy: number;
}

export interface FinalFeedback {
  incorrectAssumptions: string[];
  misleadingEvidence: string[];
  missingConnections: string[];
  suggestedRecheckTargets: string[];
}

export interface NipsCaseState {
  case_id: string;
  issues: IssueState[];
  resolved_issue_count: number;
  final_phase_ready: boolean;
  threat_state: ThreatState;
  synced_finding_ids: string[];
  synced_evidence_keys: string[];
  latest_feedback?: FinalFeedback | null;
}

// ---------------------------------------------------------------------------
// Investigation metrics (maps to SimMetrics for Dashboard reuse)
// ---------------------------------------------------------------------------

export interface InvestigationMetrics {
  corruptionLevel: number; // eggIndex slot
  evidenceIntegrity: number; // priceIndex slot (inverted)
  compromisedSystems: number; // unemploymentRate slot
  networkActivity: number; // interestRate slot
  threatLevel: number; // socialUnrest slot
  systemsOnline: number; // businessSurvival slot
  caseConfidence: number; // govApproval slot
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

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// User Board types
// ---------------------------------------------------------------------------

export type BoardNodeType = "system" | "unknown" | "outcome" | "hypothesis" | "evidence";
export type BoardNodeStatus = "normal" | "suspicious" | "confirmed" | "contradicted" | "isolated";
export type BoardEdgeStatus = "unknown" | "suspected" | "confirmed" | "contradicted" | "isolated";
export type HypothesisStatus = "open" | "supported" | "challenged" | "inconclusive";
export type BoardRelation = "supports" | "questions" | "causes" | "contradicts" | "relates";

export interface BoardGraphNode {
  id: string;
  type: BoardNodeType;
  label: string;
  status: BoardNodeStatus;
  revealed: boolean;
  linkedEvidenceIds: string[];
  systemNodeId?: string;        // link back to CaseSystemNode.id
  metadata?: Record<string, unknown>;
  position: { x: number; y: number };
}

export interface BoardGraphEdge {
  id: string;
  source: string;
  target: string;
  status: BoardEdgeStatus;
  revealed: boolean;
  linkedEvidenceIds: string[];
  label?: string;
}

export interface HypothesisNode {
  id: string;
  text: string;
  attachedToIds: string[];
  status: HypothesisStatus;
  createdAt: number;
  position: { x: number; y: number };
}

export interface BoardConnection {
  id: string;
  sourceId: string;
  targetId: string;
  relation: BoardRelation;
}

/** Defines what happens when evidence is placed on a specific board node */
export interface EvidencePlacement {
  evidenceKey: string;     // `${nodeId}:${taskType}` key
  revealsNodeId?: string;  // unhide a hidden board node
  upgradesEdgeId?: string; // change edge status
  upgradesEdgeTo?: BoardEdgeStatus;
  marksNodeId?: string;    // change a node's status
  marksNodeAs?: BoardNodeStatus;
}

export interface ConsultationResponse {
  agentId: AgentId;
  agentName: string;
  message: string;
  tone: "agreement" | "skepticism" | "contradiction" | "nuance" | "suggestion";
  timestamp: number;
}

export interface BoardState {
  pinnedEvidenceIds: string[];
  graphNodes: BoardGraphNode[];
  graphEdges: BoardGraphEdge[];
  hypotheses: HypothesisNode[];
  connections: BoardConnection[];
  selectedItemIds: string[];
  consultations: ConsultationResponse[];
}

// ---------------------------------------------------------------------------
// NIPS Gemini-backed agent instance types
// ---------------------------------------------------------------------------

export type NipsArchetype = "LOGIS" | "NEXUS" | "FILER" | "CHRONO";

export type NipsRoleLevel =
  | "Trainee Analyst"
  | "Junior Analyst"
  | "Analyst I"
  | "Analyst II"
  | "Senior Analyst"
  | "Lead Investigator"
  | "Principal Investigator";

/** A unique agent instance generated by the backend. */
export interface NipsAgentInstance {
  instance_id: string;
  archetype: NipsArchetype;
  display_name: string;
  codename: string;
  avatar_seed: number;

  role_level: NipsRoleLevel;
  years_experience: number;
  seniority_band: string;
  team_role: string;
  value_tier: number;

  personality_type: string;
  communication_style: string;
  risk_tolerance: number;
  confidence_level: number;
  curiosity: number;
  thoroughness: number;
  speed: number;
  creativity: number;
  caution: number;
  collaboration: number;
  reliability: number;
  pressure_resilience: number;

  primary_specialties: string[];
  secondary_specialties: string[];
  weak_areas: string[];
  tools_proficiency: Record<string, number>;
  preferred_evidence_types: string[];
  preferred_node_types: string[];

  evidence_yield_modifier: number;
  evidence_quality_modifier: number;
  false_positive_risk: number;
  scope_breadth: number;
  response_latency_modifier: number;
  stamina: number;

  cost: number;
  upkeep: number;

  bio: string;
  one_liner: string;
  starter_prompts: string[];
  profile_tags: string[];

  created_at: number;
  seed: number;
}

/** Marketplace offer from the backend. */
export interface NipsMarketplaceOffer {
  offer_id: string;
  agent: NipsAgentInstance;
  expires_at: number;
}

/** A single chat message in an agent session. */
export interface NipsChatMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  createdAt: number;
  toolName?: string;
}

/** Streaming state for a single agent chat. */
export interface NipsChatStreamState {
  agentInstanceId: string;
  messages: NipsChatMessage[];
  interactionId: string;
  isStreaming: boolean;
  thoughtChunks: string;
  pendingAssistantText: string;
  toolActivity: NipsToolActivity[];
}

export interface NipsToolActivity {
  tool: string;
  status: "started" | "completed";
  args?: Record<string, unknown>;
  preview?: string;
  yield?: number;
  quality?: number;
  severity?: string;
}

/** Evidence update pushed from backend during chat. */
export interface NipsEvidenceUpdate {
  node_id: string;
  summary: string;
  details: string;
  severity: "low" | "medium" | "high" | "critical";
  evidence_type: string;
  confidence: number;
  tags: string[];
  agent_instance_id: string;
  agent_display_name: string;
  is_false_positive: boolean;
  agent_archetype?: NipsArchetype;
  finding_id?: string;
  evidence_key?: string;
  task_type?: TaskType | null;
}

// Types referenced by AgentCommandModal (kept for compatibility)
export interface InvestigationAgentSession {
  interactionId: string;
  messages: NipsChatMessage[];
}

export interface InvestigationRecentEvent {
  type: string;
  summary: string;
  timestamp: number;
}

export interface InvestigationTaskDispatch {
  taskType: string;
  nodeId: string;
  agentId: string;
}

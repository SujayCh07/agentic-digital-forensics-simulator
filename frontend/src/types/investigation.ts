export type AgentStatus = "idle" | "in_transit" | "running_task";

export type AgentCapability =
  | "analyze_logs"
  | "detect_anomalies"
  | "trace_connections"
  | "identify_lateral_movement"
  | "recover_files"
  | "inspect_artifacts"
  | "reconstruct_timeline"
  | "correlate_events";

export interface AgentDefinition {
  id: string;
  name: string;
  title: string;
  specialty: string;
  experienceYears: number;
  personality: string;
  communicationStyle: string;
  helpfulnessStyle: string;
  expertiseAreas: string[];
  starterPrompts: string[];
  color: string;
  capabilities: AgentCapability[];
  currentStatus: AgentStatus;
  currentTask: string | null;
  homeNodeId: string;
}

export type TaskType = AgentCapability;
export type TaskStatus = "queued" | "in_progress" | "completed" | "failed";

export interface AgentResult {
  agent: string;
  nodeId: string;
  summary: string;
  confidence: number;
  severity: "low" | "medium" | "high" | "critical";
  evidenceType: "log" | "network" | "artifact" | "timeline";
}

export interface Task {
  id: string;
  agentId: string;
  targetNodeId: string;
  type: TaskType;
  status: TaskStatus;
  startedAt: number;
  completedAt: number | null;
  result: AgentResult | null;
}

export interface SystemNode {
  id: string;
  name: string;
  type: "server" | "workstation" | "router" | "database" | "gateway";
  threatLevel: "low" | "medium" | "high" | "critical";
  knownFindings: AgentResult[];
  x: number;
  y: number;
}

export interface NetworkEdge {
  source: string;
  target: string;
  status: "normal" | "suspicious" | "compromised";
}

export interface InvestigationState {
  selectedNodeId: string | null;
  availableAgents: AgentDefinition[];
  activeTasks: Task[];
  completedFindings: AgentResult[];
  discoveredEvidence: AgentResult[];
  currentObjective: string;
}

export interface AgentChatMessage {
  id: string;
  role: "user" | "agent" | "system";
  content: string;
  createdAt: number;
}

export interface InvestigationAgentSession {
  interactionId: string | null;
  messages: AgentChatMessage[];
}

export interface InvestigationRecentEvent {
  id: string;
  type: string;
  agentName: string;
  message: string;
  round: number;
}

export interface InvestigationAgentChatRequest {
  agentId: string;
  message: string;
  previousInteractionId?: string | null;
  currentObjective: string;
  agentStatus: AgentStatus;
  selectedNode: SystemNode | null;
  completedFindings: AgentResult[];
  recentEvents: InvestigationRecentEvent[];
}

export interface InvestigationTaskDispatch {
  taskType: TaskType;
  objective: string;
  rationale: string;
  confidence: number;
}

export interface InvestigationAgentChatResponse {
  reply: string;
  interactionId: string | null;
  dispatchedTask?: InvestigationTaskDispatch | null;
  refusalReason?: string | null;
}

export interface InvestigationTaskCompletionRequest {
  agentId: string;
  taskType: TaskType;
  taskObjective: string;
  currentObjective: string;
  selectedNode: SystemNode;
  completedFindings: AgentResult[];
  recentEvents: InvestigationRecentEvent[];
}

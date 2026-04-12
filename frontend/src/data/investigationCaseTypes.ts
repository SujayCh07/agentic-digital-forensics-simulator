import type { BackendNPC, BackendRelationship } from "@/types/backend";
import type {
  AgentDefinition,
  AgentId,
  AgentResult,
  CaseSystemNode,
  NodeStatus,
} from "@/types/investigation";

export interface InvestigationCaseMeta {
  id: string;
  name: string;
  brief: string;
  objective: string;
  incidentTime?: string;
  windowEnd?: string;
  maxCycles?: number;
}

export interface InvestigationPressureMilestone {
  level: number;
  nodeId: string;
  status: NodeStatus;
  threatLevel: number;
  message: string;
}

export type InvestigationResultTemplate = Omit<
  AgentResult,
  "findingId" | "evidenceKey" | "agentId" | "agentName" | "source"
>;

export interface InvestigationCaseConfig {
  meta: InvestigationCaseMeta;
  nodes: CaseSystemNode[];
  agentsNpcs: BackendNPC[];
  initialAgents: AgentDefinition[];
  relationships: BackendRelationship[];
  taskResults: Record<string, InvestigationResultTemplate>;
  fallbackResult: InvestigationResultTemplate;
  backendCaseId?: string;
  initialLockedAgents?: AgentId[];
  startingFunds?: number;
  pressureEnabled?: boolean;
  pressureMilestones?: InvestigationPressureMilestone[];
}

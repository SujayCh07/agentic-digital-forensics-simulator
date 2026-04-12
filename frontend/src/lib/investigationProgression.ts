import type {
  AgentId,
  AgentResult,
  ArtifactType,
  NipsAgentInstance,
  NipsArchetype,
  NipsEvidenceUpdate,
  TaskType,
} from "@/types/investigation";
import { TASK_RESULTS } from "@/data/case_midnight_exfil";

const AGENT_ID_BY_ARCHETYPE: Record<NipsArchetype, AgentId> = {
  LOGIS: "logis",
  NEXUS: "nexus",
  FILER: "filer",
  CHRONO: "chrono",
};

const VALID_ARTIFACT_TYPES = new Set<ArtifactType>([
  "log_entry",
  "deleted_file",
  "registry_key",
  "steg_payload",
  "network_packet",
  "process_record",
  "timeline_event",
]);

const VALID_TASK_TYPES = new Set<TaskType>([
  "analyze_logs",
  "detect_anomalies",
  "trace_connections",
  "trace_lateral_movement",
  "recover_files",
  "inspect_artifacts",
  "reconstruct_timeline",
  "correlate_events",
]);

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function buildStableFindingSeed(params: {
  nodeId: string;
  summary: string;
  tags?: string[];
}): string {
  const tagPart = (params.tags ?? [])
    .slice()
    .sort()
    .join("-")
    .slice(0, 32);
  const summaryPart = slugify(params.summary) || "finding";
  return [params.nodeId.toLowerCase(), summaryPart, tagPart].filter(Boolean).join(":");
}

export function resolveAgentIdFromArchetype(
  archetype: NipsArchetype | undefined,
): AgentId | null {
  if (!archetype) return null;
  return AGENT_ID_BY_ARCHETYPE[archetype] ?? null;
}

export function resolveAgentIdFromEvidence(
  evidence: NipsEvidenceUpdate,
  roster: NipsAgentInstance[] = [],
): AgentId {
  const direct = resolveAgentIdFromArchetype(evidence.agent_archetype);
  if (direct) return direct;

  const agent = roster.find((entry) => entry.instance_id === evidence.agent_instance_id);
  const mapped = resolveAgentIdFromArchetype(agent?.archetype);
  return mapped ?? "logis";
}

export function resolveArtifactType(evidenceType: string): ArtifactType {
  if (VALID_ARTIFACT_TYPES.has(evidenceType as ArtifactType)) {
    return evidenceType as ArtifactType;
  }

  if (evidenceType.includes("timeline")) return "timeline_event";
  if (evidenceType.includes("network")) return "network_packet";
  if (evidenceType.includes("file")) return "deleted_file";
  if (evidenceType.includes("registry")) return "registry_key";
  if (evidenceType.includes("process")) return "process_record";
  if (evidenceType.includes("payload")) return "steg_payload";
  return "log_entry";
}

export function resolveTaskType(taskType: string | null | undefined): TaskType | null {
  if (!taskType) return null;
  return VALID_TASK_TYPES.has(taskType as TaskType) ? (taskType as TaskType) : null;
}

export function inferTaskTypeFromEvidenceUpdate(
  evidence: Pick<NipsEvidenceUpdate, "node_id" | "summary" | "tags" | "evidence_type" | "task_type">,
): TaskType | null {
  const declared = resolveTaskType(evidence.task_type);
  if (declared) return declared;

  const candidates = Object.entries(TASK_RESULTS)
    .filter(([key]) => key.startsWith(`${evidence.node_id}:`))
    .map(([, result]) => result);

  if (candidates.length === 0) return null;

  const summaryLower = evidence.summary.toLowerCase();
  const normalizedTags = new Set((evidence.tags ?? []).map((tag) => tag.toLowerCase()));

  let best: { taskType: TaskType | null; score: number } = { taskType: null, score: 0 };
  for (const candidate of candidates) {
    let score = 0;
    if (candidate.summary.toLowerCase() === summaryLower) {
      score += 100;
    }
    if (summaryLower.includes(candidate.summary.toLowerCase().slice(0, 20))) {
      score += 25;
    }
    if (candidate.evidenceType === resolveArtifactType(evidence.evidence_type)) {
      score += 10;
    }
    for (const tag of candidate.tags) {
      if (normalizedTags.has(tag.toLowerCase())) {
        score += 8;
      }
    }
    if (score > best.score) {
      best = { taskType: candidate.taskType, score };
    }
  }

  return best.score >= 10 ? best.taskType : null;
}

export function buildEvidenceKey(
  nodeId: string,
  taskType: TaskType | null,
  fallbackSeed?: string,
): string {
  if (taskType) return `${nodeId}:${taskType}`;
  if (fallbackSeed) return `finding:${fallbackSeed}`;
  return `finding:${nodeId.toLowerCase()}`;
}

export function buildFindingId(params: {
  findingId?: string | null;
  evidenceKey?: string | null;
  nodeId: string;
  taskType?: TaskType | null;
  summary: string;
}): string {
  if (params.findingId) return params.findingId;
  if (params.evidenceKey?.startsWith("finding:")) {
    return params.evidenceKey.slice("finding:".length);
  }
  if (params.evidenceKey) return params.evidenceKey;
  if (params.taskType) return `${params.nodeId}:${params.taskType}`;
  return `${params.nodeId}:${slugify(params.summary) || "finding"}`;
}

export function evidenceKeyForFinding(finding: AgentResult): string {
  return finding.evidenceKey || buildEvidenceKey(finding.nodeId, finding.taskType, finding.findingId);
}

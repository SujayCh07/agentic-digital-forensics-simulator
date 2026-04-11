import { BASE_EVIDENCE, BASE_HYPOTHESIS, INVESTIGATION_AGENTS } from "@/mocks/mockInvestigation";
import type { SimEvent } from "@/types";
import type {
  BackendNPC,
  BackendRelationship,
} from "@/types/backend";
import type {
  EvidenceArtifact,
  EvidenceSeverity,
  ForensicEvent,
  InvestigationState,
  NetworkEdge,
  SystemNode,
  SystemStatus,
} from "@/types/investigation";

function systemKindFromRole(role?: string): SystemNode["kind"] {
  switch (role) {
    case "politician":
      return "archive";
    case "business_owner":
    case "shopkeeper":
      return "gateway";
    case "driver":
      return "camera";
    case "activist":
      return "vault";
    default:
      return "server";
  }
}

function systemStatusFromMood(mood?: string): SystemStatus {
  switch (mood) {
    case "angry":
      return "compromised";
    case "anxious":
    case "worried":
      return "suspicious";
    case "hopeful":
    case "excited":
      return "contained";
    default:
      return "investigating";
  }
}

function severityFromEvent(event: SimEvent): EvidenceSeverity {
  switch (event.type) {
    case "closure":
    case "strike":
      return "critical";
    case "layoff":
    case "protest":
    case "price_change":
      return "high";
    case "policy_response":
      return "medium";
    default:
      return "low";
  }
}

function forensicTypeFromEvent(event: SimEvent): ForensicEvent["type"] {
  switch (event.type) {
    case "closure":
    case "layoff":
      return "file-recovery";
    case "price_change":
      return "network-trace";
    case "phase_change":
      return "echo-brief";
    case "protest":
    case "strike":
      return "containment";
    default:
      return "log-anomaly";
  }
}

export function mapNpcToSystemNode(npc: BackendNPC, clueCount = 0): SystemNode {
  return {
    id: npc.id,
    name: npc.name,
    kind: systemKindFromRole(npc.role),
    district: npc.profession || npc.role,
    status: systemStatusFromMood(npc.mood),
    clueCount,
    lastSeen: `${npc.x},${npc.y}`,
  };
}

export function mapRelationshipToNetworkEdge(
  relationship: BackendRelationship,
): NetworkEdge {
  const suspicious = relationship.trust < 0.35 || relationship.affinity < -0.25;
  const risk: EvidenceSeverity =
    suspicious || relationship.trust < 0.2 ? "high" : "medium";

  return {
    id: `${relationship.source_id}-${relationship.target_id}`,
    sourceId: relationship.source_id,
    targetId: relationship.target_id,
    protocol: relationship.rel_type?.toUpperCase() || "LINK",
    risk,
    suspicious,
    note:
      suspicious
        ? "Unusual movement path or weak trust signal."
        : "Routine neighborhood chatter.",
  };
}

export function mapSimEventToForensicEvent(event: SimEvent): ForensicEvent {
  return {
    id: event.id,
    type: forensicTypeFromEvent(event),
    agentId: event.agentId,
    agentName: event.agentName,
    buildingId: event.agentId,
    title: event.type.replaceAll("_", " ").toUpperCase(),
    description: event.message,
    severity: severityFromEvent(event),
    timestamp: `R${event.round.toString().padStart(2, "0")}`,
  };
}

function buildEvidenceArtifacts(
  systems: SystemNode[],
  clueFeed: ForensicEvent[],
): EvidenceArtifact[] {
  const derived = clueFeed.slice(0, 6).map((event, index) => ({
    id: `derived-${event.id}`,
    systemId: event.buildingId,
    name: `${event.type.toUpperCase()}-${index + 1}`,
    kind:
      event.type === "network-trace"
        ? "packet"
        : event.type === "file-recovery"
          ? "binary"
          : event.type === "timeline-shift"
            ? "timeline"
            : "log",
    summary: event.description,
    confidence: Math.max(0.35, 0.92 - index * 0.08),
    source: event.agentName,
  }));

  const seenIds = new Set(derived.map((artifact) => artifact.id));
  const fallback = BASE_EVIDENCE.filter(
    (artifact) =>
      systems.some((system) => system.id === artifact.systemId) &&
      !seenIds.has(artifact.id),
  );

  return [...derived, ...fallback].slice(0, 8);
}

export function buildInvestigationState(params: {
  npcs: BackendNPC[];
  relationships: BackendRelationship[];
  events: SimEvent[];
  round: number;
  maxRounds: number;
  selectedSystemId?: string | null;
}): InvestigationState {
  const clueCounts = new Map<string, number>();
  for (const event of params.events) {
    clueCounts.set(event.agentId, (clueCounts.get(event.agentId) || 0) + 1);
  }

  const systems = params.npcs.map((npc) =>
    mapNpcToSystemNode(npc, clueCounts.get(npc.id) || 0),
  );
  const clueFeed = params.events.map(mapSimEventToForensicEvent).slice(-32).reverse();
  const edges = params.relationships.map(mapRelationshipToNetworkEdge);
  const selectedSystemId =
    params.selectedSystemId || systems[0]?.id || BASE_HYPOTHESIS.originSystemId;
  const evidence = buildEvidenceArtifacts(systems, clueFeed);

  return {
    caseId: "NIPS-001",
    title: "Midnight Exfiltration",
    summary:
      "A noir city of systems is showing signs of coordinated intrusion. Specialist agents are triangulating the origin, path, and payload while ECHO maintains the working theory.",
    systems,
    edges,
    clueFeed,
    evidence,
    agents: INVESTIGATION_AGENTS,
    hypothesis: {
      ...BASE_HYPOTHESIS,
      originSystemId: selectedSystemId || BASE_HYPOTHESIS.originSystemId,
      confidence: Math.min(0.92, BASE_HYPOTHESIS.confidence + params.round * 0.02),
    },
    selectedSystemId,
    round: params.round,
    maxRounds: params.maxRounds,
  };
}

import {
  CYBER_CITY_LINKS,
  CYBER_CITY_SECTOR_SEEDS,
  DOMAIN_LABEL_BY_SECTOR,
} from "@/data/cyberCitySectors";
import type { SimEvent } from "@/types";
import type {
  AgentResult,
  CaseSystemNode,
  CityFrameState,
  CyberNodeStatus,
  NodeStatus,
  SectorId,
  SectorModel,
  SystemNodeModel,
  SystemNodeType,
} from "@/types/investigation";

const TYPE_BY_SECTOR: Record<SectorId, SystemNodeType> = {
  "EDU-01": "server",
  "MED-02": "database",
  "FIN-03": "database",
  "NET-04": "router",
  "AUTH-05": "server",
  "PWR-06": "archive",
  "CLOUD-07": "archive",
  "CIV-08": "server",
};

const BASE_THREAT_BY_STATUS: Record<CyberNodeStatus, number> = {
  healthy: 0.12,
  suspicious: 0.45,
  compromised: 0.9,
  isolated: 0.18,
};

function mapStatus(status: NodeStatus, isolated: boolean): CyberNodeStatus {
  if (isolated) return "isolated";
  if (status === "compromised") return "compromised";
  if (status === "suspicious") return "suspicious";
  if (status === "offline") return "isolated";
  return "healthy";
}

function statusPriority(status: CyberNodeStatus): number {
  if (status === "compromised") return 4;
  if (status === "isolated") return 3;
  if (status === "suspicious") return 2;
  return 1;
}

function coerceThreatLevel(status: CyberNodeStatus, source?: CaseSystemNode): number {
  if (!source) return BASE_THREAT_BY_STATUS[status];
  if (status === "isolated") return Math.max(0.12, Math.min(0.35, source.threatLevel));
  return Math.max(BASE_THREAT_BY_STATUS[status], source.threatLevel);
}

function extractNodeLogs(nodeId: string, events: SimEvent[]): string[] {
  return events
    .filter((event) => {
      const payload = event.data as { nodeId?: string } | undefined;
      return payload?.nodeId === nodeId;
    })
    .slice(-4)
    .map((event) => event.message);
}

function extractEvidence(nodeId: string, findings: AgentResult[]): string[] {
  return findings
    .filter((finding) => finding.nodeId === nodeId)
    .slice(-4)
    .map((finding) => finding.summary);
}

export interface BuildCityFrameInput {
  systemNodes: CaseSystemNode[];
  findings: AgentResult[];
  events: SimEvent[];
  selectedNodeId: string | null;
  isolatedNodeIds: string[];
}

/**
 * Adapter layer between the existing investigation state and city-sector gameplay.
 *
 * TODO(backend): replace this deterministic adapter with a streamed frame payload
 * from the scenario/replay backend when sector-native telemetry is available.
 */
export function buildCityFrame({
  systemNodes,
  findings,
  events,
  selectedNodeId,
  isolatedNodeIds,
}: BuildCityFrameInput): CityFrameState {
  const nodeById = new Map(systemNodes.map((node) => [node.id, node]));
  const isolated = new Set(isolatedNodeIds);

  const nodes: SystemNodeModel[] = CYBER_CITY_SECTOR_SEEDS.map((seed) => {
    const source = nodeById.get(seed.nodeId);
    const status = mapStatus(source?.status ?? "clean", isolated.has(seed.nodeId));
    return {
      id: seed.id,
      label: DOMAIN_LABEL_BY_SECTOR[seed.id],
      type: source?.type ?? TYPE_BY_SECTOR[seed.id],
      sectorId: seed.id,
      mapPosition: {
        tileX: seed.anchor.tileX,
        tileY: seed.anchor.tileY,
      },
      status,
      logs: extractNodeLogs(seed.nodeId, events),
      evidence: extractEvidence(seed.nodeId, findings),
      sourceNodeId: seed.nodeId,
      threatLevel: coerceThreatLevel(status, source),
    };
  });

  const nodeBySector = new Map(nodes.map((node) => [node.sectorId, node]));

  const sectors: SectorModel[] = CYBER_CITY_SECTOR_SEEDS.map((seed) => {
    const node = nodeBySector.get(seed.id);
    return {
      id: seed.id,
      label: seed.label,
      domain: seed.domain,
      bounds: seed.bounds,
      nodeId: seed.id,
      status: node?.status ?? "healthy",
    };
  });

  const links = CYBER_CITY_LINKS.map((link) => {
    const source = nodeBySector.get(link.sourceId);
    const target = nodeBySector.get(link.targetId);
    const sourceCompromised = source?.status === "compromised";
    const targetIsolated = target?.status === "isolated";
    const active =
      source !== undefined &&
      target !== undefined &&
      source.status !== "isolated" &&
      target.status !== "isolated" &&
      (source.threatLevel > 0.2 || target.threatLevel > 0.2 || link.suspicious);
    return {
      sourceId: link.sourceId,
      targetId: link.targetId,
      active,
      suspicious: link.suspicious,
      compromisedFlow: Boolean(sourceCompromised && !targetIsolated),
    };
  });

  const selectedSector = selectedNodeId
    ? nodes.find((node) => node.id === selectedNodeId)?.sectorId ?? null
    : null;

  const alerts = events
    .slice(-6)
    .reverse()
    .filter((event) =>
      event.type === "phase_change" ||
      event.type === "strike" ||
      event.type === "layoff" ||
      event.type === "closure" ||
      event.type === "system_response",
    )
    .slice(0, 3)
    .map((event) => event.message);

  // Promote selected sector alerts to top for better inspector context.
  if (selectedSector) {
    const selectedNode = nodeBySector.get(selectedSector);
    if (selectedNode?.status && statusPriority(selectedNode.status) >= 3) {
      alerts.unshift(`${selectedSector} under ${selectedNode.status.toUpperCase()} state`);
    }
  }

  return {
    timestamp: Date.now(),
    sectors,
    nodes,
    links,
    selectedNodeId,
    alerts,
  };
}

export function sourceNodeIdForSector(sectorId: SectorId): string {
  return CYBER_CITY_SECTOR_SEEDS.find((seed) => seed.id === sectorId)?.nodeId ?? "";
}

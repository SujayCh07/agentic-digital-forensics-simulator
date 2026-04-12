/**
 * NIPS — Guided Tutorial Case
 *
 * A short, scripted scenario that teaches the full investigation loop with
 * fewer nodes, clearer evidence, and a guaranteed win path when followed.
 */

import type { BackendNPC, BackendRelationship } from "@/types/backend";
import type {
  AgentDefinition,
  CaseNetworkEdge,
  CaseSystemNode,
} from "@/types/investigation";
import { CASE_AGENTS_NPCS, INITIAL_AGENTS } from "./case_midnight_exfil";
import type {
  InvestigationCaseMeta,
  InvestigationPressureMilestone,
  InvestigationResultTemplate,
} from "./investigationCaseTypes";

export const TUTORIAL_CASE_META: InvestigationCaseMeta = {
  id: "guided_tutorial",
  name: "Guided Tutorial: Contain the Relay",
  brief:
    "A small proof-of-concept theft is unfolding across five systems. " +
    "Follow the guided steps to identify the origin workstation, confirm the pivot, " +
    "recover the staged archive, block the gateway, and submit the final report.",
  objective:
    "Learn the full loop: inspect the origin, follow the relay path, resolve issues, and file the winning report.",
  incidentTime: "2024-01-15T03:47:00Z",
  windowEnd: "2024-01-15T04:09:00Z",
  maxCycles: 8,
};

export const TUTORIAL_CASE_NODES: CaseSystemNode[] = [
  {
    id: "MAIL-01",
    name: "Mail Relay",
    type: "server",
    status: "suspicious",
    threatLevel: 0.46,
    tileX: 5,
    tileY: 7,
    knownFindings: [],
  },
  {
    id: "WKS-03",
    name: "Design Workstation",
    type: "workstation",
    status: "suspicious",
    threatLevel: 0.28,
    tileX: 3,
    tileY: 10,
    knownFindings: [],
  },
  {
    id: "GW-01",
    name: "Gateway Router",
    type: "router",
    status: "suspicious",
    threatLevel: 0.41,
    tileX: 10,
    tileY: 3,
    knownFindings: [],
  },
  {
    id: "BACKUP-01",
    name: "Backup Relay",
    type: "archive",
    status: "suspicious",
    threatLevel: 0.38,
    tileX: 10,
    tileY: 13,
    knownFindings: [],
  },
  {
    id: "EXT-01",
    name: "External Drop",
    type: "external",
    status: "clean",
    threatLevel: 0,
    tileX: 18,
    tileY: 6,
    knownFindings: [],
  },
];

export const TUTORIAL_CASE_EDGES: CaseNetworkEdge[] = [
  { source: "WKS-03", target: "MAIL-01", isSuspicious: true },
  { source: "MAIL-01", target: "BACKUP-01", isSuspicious: true },
  { source: "BACKUP-01", target: "GW-01", isSuspicious: true },
  { source: "GW-01", target: "EXT-01", isSuspicious: true },
];

export const TUTORIAL_CASE_RELATIONSHIPS: BackendRelationship[] =
  TUTORIAL_CASE_EDGES.map((edge) => ({
    source_id: edge.source,
    target_id: edge.target,
    rel_type: "colleague" as const,
    strength: 0.85,
    affinity: edge.isSuspicious ? -0.75 : 0.3,
    trust: edge.isSuspicious ? 0.12 : 0.7,
  }));

type TutorialCaseAgents = {
  agentsNpcs: BackendNPC[];
  initialAgents: AgentDefinition[];
};

const TUTORIAL_CASE_AGENTS: TutorialCaseAgents = {
  agentsNpcs: CASE_AGENTS_NPCS,
  initialAgents: INITIAL_AGENTS,
};

export const TUTORIAL_TASK_RESULTS: Record<
  string,
  InvestigationResultTemplate
> = {
  "WKS-03:inspect_artifacts": {
    nodeId: "WKS-03",
    nodeName: "Design Workstation",
    taskType: "inspect_artifacts",
    summary:
      "Recovered a credential theft script from the USB image on WKS-03. This workstation started the chain.",
    details:
      "Artifact carving recovered creds_seed.ps1 and a stolen credential list under /tmp/.cache. " +
      "Execution time aligns with the first suspicious activity, making WKS-03 the confirmed origin node.",
    confidence: 0.97,
    severity: "critical",
    evidenceType: "steg_payload",
    tags: ["credential_dumping", "origin", "patient_zero"],
  },
  "MAIL-01:analyze_logs": {
    nodeId: "MAIL-01",
    nodeName: "Mail Relay",
    taskType: "analyze_logs",
    summary:
      "MAIL-01 accepted stolen credentials from WKS-03, then reused the same account to move the archive.",
    details:
      "Auth logs show repeated failed attempts from WKS-03 followed by a successful login with svc_backup. " +
      "Minutes later, that account was reused to stage the theft through the relay.",
    confidence: 0.95,
    severity: "high",
    evidenceType: "log_entry",
    tags: ["credential_abuse", "relay_access"],
  },
  "MAIL-01:trace_lateral_movement": {
    nodeId: "MAIL-01",
    nodeName: "Mail Relay",
    taskType: "trace_lateral_movement",
    summary:
      "MAIL-01 is the pivot: it links the workstation origin to the backup relay and onward to the gateway.",
    details:
      "Traffic reconstruction shows MAIL-01 receiving the stolen account activity from WKS-03 and then handing the archive toward BACKUP-01. " +
      "This node is the pivot that connects origin to staging.",
    confidence: 0.98,
    severity: "critical",
    evidenceType: "network_packet",
    tags: ["pivot_node", "lateral_movement", "hub"],
  },
  "BACKUP-01:recover_files": {
    nodeId: "BACKUP-01",
    nodeName: "Backup Relay",
    taskType: "recover_files",
    summary:
      "Recovered tutorial_bundle.tar.gz on BACKUP-01. The stolen files were staged here before egress.",
    details:
      "File recovery restored tutorial_bundle.tar.gz with the source archive intact. " +
      "The file was written to BACKUP-01, held briefly, and then forwarded to GW-01 for the final transfer.",
    confidence: 0.96,
    severity: "critical",
    evidenceType: "deleted_file",
    tags: ["source_code", "staging_file", "staging_relay"],
  },
  "GW-01:trace_connections": {
    nodeId: "GW-01",
    nodeName: "Gateway Router",
    taskType: "trace_connections",
    summary:
      "GW-01 carried the staged archive to the external endpoint over HTTPS. This is the exfiltration hop.",
    details:
      "NetFlow confirms GW-01 sent the staged archive out over TLS to the known external drop. " +
      "This is the final network hop under defender control.",
    confidence: 0.99,
    severity: "critical",
    evidenceType: "network_packet",
    tags: ["exfiltration", "outbound_transfer", "c2_server"],
  },
  "GW-01:analyze_logs": {
    nodeId: "GW-01",
    nodeName: "Gateway Router",
    taskType: "analyze_logs",
    summary:
      "A temporary allow rule on GW-01 opened the path long enough for the transfer to leave the network.",
    details:
      "Gateway change logs show a short-lived allow rule enabling the outbound session from the relay path. " +
      "That rule made the final exfiltration possible and confirms why the gateway is the right containment point.",
    confidence: 0.94,
    severity: "high",
    evidenceType: "log_entry",
    tags: ["firewall_evasion", "egress_path"],
  },
};

export const TUTORIAL_FALLBACK_RESULT: InvestigationResultTemplate = {
  nodeId: "unknown",
  nodeName: "Unknown",
  taskType: "analyze_logs",
  summary: "No tutorial signal matched that action.",
  details:
    "This tutorial only uses a small set of guided actions. Follow the highlighted instructions to stay on the winning path.",
  confidence: 0.2,
  severity: "low",
  evidenceType: "log_entry",
  tags: ["no_finding"],
};

export const TUTORIAL_PRESSURE_MILESTONES: InvestigationPressureMilestone[] =
  [];

export const TUTORIAL_CASE_AGENTS_NPCS = TUTORIAL_CASE_AGENTS.agentsNpcs;
export const TUTORIAL_INITIAL_AGENTS = TUTORIAL_CASE_AGENTS.initialAgents;

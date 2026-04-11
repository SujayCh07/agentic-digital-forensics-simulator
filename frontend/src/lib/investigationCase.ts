import type {
  AgentCapability,
  AgentDefinition,
  AgentResult,
  NetworkEdge,
  SystemNode,
  TaskType,
} from "@/types/investigation";

export const CASE_ID = "midnight-ledger";
export const CASE_NAME = "Operation Midnight Ledger";
export const CASE_OBJECTIVE =
  "Trace initial compromise path and contain lateral movement before exfiltration completes.";

export const CASE_SYSTEMS: SystemNode[] = [
  {
    id: "gateway-01",
    name: "EDGE-GW-01",
    type: "gateway",
    threatLevel: "medium",
    knownFindings: [],
    x: 4,
    y: 5,
  },
  {
    id: "mail-01",
    name: "MAIL-01",
    type: "server",
    threatLevel: "high",
    knownFindings: [],
    x: 9,
    y: 8,
  },
  {
    id: "db-01",
    name: "FIN-DB-01",
    type: "database",
    threatLevel: "critical",
    knownFindings: [],
    x: 13,
    y: 10,
  },
  {
    id: "ws-12",
    name: "HR-WS-12",
    type: "workstation",
    threatLevel: "medium",
    knownFindings: [],
    x: 7,
    y: 12,
  },
  {
    id: "router-02",
    name: "CORE-RTR-02",
    type: "router",
    threatLevel: "low",
    knownFindings: [],
    x: 15,
    y: 6,
  },
];

export const CASE_EDGES: NetworkEdge[] = [
  { source: "gateway-01", target: "mail-01", status: "suspicious" },
  { source: "mail-01", target: "db-01", status: "compromised" },
  { source: "mail-01", target: "ws-12", status: "suspicious" },
  { source: "router-02", target: "db-01", status: "normal" },
  { source: "router-02", target: "gateway-01", status: "normal" },
];

const presetAgents: Omit<AgentDefinition, "currentStatus" | "currentTask">[] = [
  {
    id: "logis",
    name: "LOGIS",
    title: "Senior Log Analysis Specialist",
    specialty: "Log Analysis",
    experienceYears: 12,
    personality: "Methodical, skeptical, and evidence-first.",
    communicationStyle:
      "Precise, concise, and grounded in timestamps and log evidence.",
    helpfulnessStyle:
      "Deeply helpful on logs and anomalies, but redirects outside that lane.",
    expertiseAreas: [
      "authentication anomalies",
      "identity abuse",
      "service-account misuse",
      "log correlation",
    ],
    starterPrompts: [
      "Review the authentication logs on this host.",
      "Do you see suspicious service-account behavior here?",
      "Summarize the biggest log anomalies so far.",
    ],
    color: "#8ad1ff",
    capabilities: ["analyze_logs", "detect_anomalies"],
    homeNodeId: "gateway-01",
  },
  {
    id: "nexus",
    name: "NEXUS",
    title: "Principal Network Intrusion Tracer",
    specialty: "Network Tracing",
    experienceYears: 15,
    personality: "Strategic, direct, and focused on attacker movement.",
    communicationStyle: "Operational and clear about probable attack paths.",
    helpfulnessStyle:
      "Very actionable on routing and lateral movement, but refuses artifact work.",
    expertiseAreas: [
      "network path tracing",
      "lateral movement",
      "east-west traffic analysis",
      "connection graph interpretation",
    ],
    starterPrompts: [
      "Trace suspicious connections from the selected system.",
      "Do you think this host is part of lateral movement?",
      "Explain the likely attack path through the network.",
    ],
    color: "#38e5b0",
    capabilities: ["trace_connections", "identify_lateral_movement"],
    homeNodeId: "router-02",
  },
  {
    id: "filer",
    name: "FILER",
    title: "Digital Artifact Recovery Analyst",
    specialty: "Artifact Recovery",
    experienceYears: 11,
    personality: "Patient, meticulous, and forensic-minded.",
    communicationStyle: "Practical and specific about recoverable evidence.",
    helpfulnessStyle:
      "Excellent on artifacts and recovered files, but redirects network or timeline asks.",
    expertiseAreas: [
      "deleted-file recovery",
      "forensic artifact triage",
      "payload residue",
      "installer inspection",
    ],
    starterPrompts: [
      "Recover any suspicious files from this host.",
      "Inspect artifacts tied to the selected system.",
      "What forensic evidence would you expect here?",
    ],
    color: "#f7b955",
    capabilities: ["recover_files", "inspect_artifacts"],
    homeNodeId: "ws-12",
  },
  {
    id: "chrono",
    name: "CHRONO",
    title: "Lead Incident Timeline Reconstruction Analyst",
    specialty: "Timeline Reconstruction",
    experienceYears: 14,
    personality: "Measured, analytical, and reassuring under uncertainty.",
    communicationStyle: "Builds ordered narratives from partial signals.",
    helpfulnessStyle:
      "Best for chronology and cross-system synthesis, not narrow technical deep dives outside timeline work.",
    expertiseAreas: [
      "timeline reconstruction",
      "event correlation",
      "sequence-of-compromise analysis",
      "incident narrative building",
    ],
    starterPrompts: [
      "Reconstruct the likely sequence of compromise here.",
      "Correlate the latest findings into a timeline.",
      "What do we know for sure about the incident chronology?",
    ],
    color: "#c491ff",
    capabilities: ["reconstruct_timeline", "correlate_events"],
    homeNodeId: "mail-01",
  },
];

export function buildPresetAgents(): AgentDefinition[] {
  return presetAgents.map((agent) => ({
    ...agent,
    currentStatus: "idle",
    currentTask: null,
  }));
}

const capabilityEvidence: Record<
  AgentCapability,
  Pick<AgentResult, "evidenceType" | "severity">
> = {
  analyze_logs: { evidenceType: "log", severity: "medium" },
  detect_anomalies: { evidenceType: "log", severity: "high" },
  trace_connections: { evidenceType: "network", severity: "medium" },
  identify_lateral_movement: { evidenceType: "network", severity: "critical" },
  recover_files: { evidenceType: "artifact", severity: "high" },
  inspect_artifacts: { evidenceType: "artifact", severity: "medium" },
  reconstruct_timeline: { evidenceType: "timeline", severity: "medium" },
  correlate_events: { evidenceType: "timeline", severity: "high" },
};

export function supportsTask(
  agent: AgentDefinition,
  taskType: TaskType,
): boolean {
  return agent.capabilities.includes(taskType);
}

export function buildDeterministicResult(
  agent: AgentDefinition,
  node: SystemNode,
  taskType: TaskType,
): AgentResult {
  const hints: Record<TaskType, string> = {
    analyze_logs: "abnormal auth spikes and service-account misuse",
    detect_anomalies: "a hidden task scheduler beacon firing every 12 minutes",
    trace_connections: "egress to 45.77.19.24 over atypical TLS fingerprints",
    identify_lateral_movement:
      "credential relay from MAIL-01 to FIN-DB-01 via SMB",
    recover_files: "deleted archive fragments under /tmp/.staging recovered",
    inspect_artifacts: "malicious loader artifact embedded in signed updater",
    reconstruct_timeline: "compromise sequence with 4-minute privilege window",
    correlate_events:
      "cross-node correlation confirms coordinated operator activity",
  };

  const detail = capabilityEvidence[taskType];
  const confidenceSeed = `${agent.id}-${node.id}-${taskType}`.length % 15;
  const confidence = Number((0.74 + confidenceSeed / 100).toFixed(2));

  return {
    agent: agent.name,
    nodeId: node.id,
    summary: `${agent.name} found ${hints[taskType]} on ${node.name}.`,
    confidence,
    severity: detail.severity,
    evidenceType: detail.evidenceType,
  };
}

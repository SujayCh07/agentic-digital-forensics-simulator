import type {
  EchoHypothesis,
  EvidenceArtifact,
  InvestigationAgentStatus,
} from "@/types/investigation";

export const INVESTIGATION_AGENTS: InvestigationAgentStatus[] = [
  {
    id: "logis",
    name: "LOGIS",
    role: "Log Analysis",
    status: "investigating",
    confidence: 0.72,
    currentLead: "Off-hours access is clustering around the archive district.",
  },
  {
    id: "nexus",
    name: "NEXUS",
    role: "Network Tracing",
    status: "investigating",
    confidence: 0.66,
    currentLead: "Beacon-like callbacks are hopping across east-west roads.",
  },
  {
    id: "filer",
    name: "FILER",
    role: "Artifact Recovery",
    status: "reporting",
    confidence: 0.58,
    currentLead: "Recovered fragments point to staged archives near abandoned blocks.",
  },
  {
    id: "chrono",
    name: "CHRONO",
    role: "Timeline Reconstruction",
    status: "idle",
    confidence: 0.61,
    currentLead: "The earliest credible pivot still precedes the visible outage.",
  },
];

export const BASE_HYPOTHESIS: EchoHypothesis = {
  originSystemId: "npc_01",
  payloadType: "credential theft + staged exfiltration",
  attackPath: ["npc_01", "npc_04", "npc_09"],
  confidence: 0.64,
  openQuestions: [
    "Why did the archive district go dark before the gateway alarms fired?",
    "Is the abandoned block a red herring or the real staging point?",
  ],
};

export const BASE_EVIDENCE: EvidenceArtifact[] = [
  {
    id: "artifact-auth-burst",
    systemId: "npc_01",
    name: "AUTH-LOG-881A",
    kind: "log",
    summary: "Repeated failed credentials followed by a privileged success.",
    confidence: 0.82,
    source: "Security Camera / Auth Ledger",
  },
  {
    id: "artifact-dns-loop",
    systemId: "npc_04",
    name: "DNS-CALLBACK-12",
    kind: "packet",
    summary: "Short-interval lookups to an external resolver every 45 seconds.",
    confidence: 0.74,
    source: "Road Sensor / DNS Relay",
  },
  {
    id: "artifact-ghost-archive",
    systemId: "npc_09",
    name: "GHOST-ARCHIVE.zip",
    kind: "binary",
    summary: "Recovered partial archive with signs of timed deletion.",
    confidence: 0.67,
    source: "Abandoned Building / Disk Fragment",
  },
];

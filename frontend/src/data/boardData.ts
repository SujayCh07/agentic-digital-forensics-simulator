/**
 * EchoLocate case board: initial problem graph and evidence placement rules.
 *
 * Defines the starting state of the investigation board for the
 * Midnight Exfiltration case. Some nodes start revealed, some hidden.
 * Evidence placement triggers graph enrichment.
 */

import type {
  BoardGraphNode,
  BoardGraphEdge,
  EvidencePlacement,
  AgentId,
} from "@/types/investigation";

// ---------------------------------------------------------------------------
// Initial board graph nodes
// ---------------------------------------------------------------------------

export const INITIAL_BOARD_NODES: BoardGraphNode[] = [
  // Revealed system nodes
  {
    id: "board-mail01",
    type: "system",
    label: "Mail Server",
    status: "suspicious",
    revealed: true,
    linkedEvidenceIds: [],
    systemNodeId: "MAIL-01",
    position: { x: 300, y: 200 },
  },
  {
    id: "board-db02",
    type: "system",
    label: "Database Server",
    status: "suspicious",
    revealed: true,
    linkedEvidenceIds: [],
    systemNodeId: "DB-02",
    position: { x: 600, y: 200 },
  },
  {
    id: "board-wks03",
    type: "system",
    label: "Workstation Alpha",
    status: "normal",
    revealed: true,
    linkedEvidenceIds: [],
    systemNodeId: "WKS-03",
    position: { x: 100, y: 300 },
  },
  {
    id: "board-gw01",
    type: "system",
    label: "Gateway Router",
    status: "normal",
    revealed: true,
    linkedEvidenceIds: [],
    systemNodeId: "GW-01",
    position: { x: 500, y: 400 },
  },
  // Hidden nodes — revealed by evidence
  {
    id: "board-backup01",
    type: "unknown",
    label: "??? Staging",
    status: "normal",
    revealed: false,
    linkedEvidenceIds: [],
    systemNodeId: "BACKUP-01",
    position: { x: 700, y: 350 },
  },
  {
    id: "board-ext01",
    type: "unknown",
    label: "??? Endpoint",
    status: "normal",
    revealed: false,
    linkedEvidenceIds: [],
    systemNodeId: "EXT-01",
    position: { x: 750, y: 200 },
  },
  // Outcome node — partially revealed
  {
    id: "board-outcome-exfil",
    type: "outcome",
    label: "47GB Data Exfiltrated",
    status: "confirmed",
    revealed: true,
    linkedEvidenceIds: [],
    position: { x: 700, y: 500 },
    metadata: { description: "Classified source code left the perimeter in a 22-minute window." },
  },
];

// ---------------------------------------------------------------------------
// Initial board edges
// ---------------------------------------------------------------------------

export const INITIAL_BOARD_EDGES: BoardGraphEdge[] = [
  {
    id: "edge-wks-mail",
    source: "board-wks03",
    target: "board-mail01",
    status: "unknown",
    revealed: true,
    linkedEvidenceIds: [],
    label: "Initial access?",
  },
  {
    id: "edge-mail-db",
    source: "board-mail01",
    target: "board-db02",
    status: "suspected",
    revealed: true,
    linkedEvidenceIds: [],
    label: "Data movement",
  },
  {
    id: "edge-mail-gw",
    source: "board-mail01",
    target: "board-gw01",
    status: "unknown",
    revealed: false,
    linkedEvidenceIds: [],
  },
  {
    id: "edge-db-backup",
    source: "board-db02",
    target: "board-backup01",
    status: "unknown",
    revealed: false,
    linkedEvidenceIds: [],
  },
  {
    id: "edge-gw-ext",
    source: "board-gw01",
    target: "board-ext01",
    status: "unknown",
    revealed: false,
    linkedEvidenceIds: [],
  },
  {
    id: "edge-gw-outcome",
    source: "board-gw01",
    target: "board-outcome-exfil",
    status: "suspected",
    revealed: true,
    linkedEvidenceIds: [],
    label: "Egress path?",
  },
];

// ---------------------------------------------------------------------------
// Evidence placement effects
// When evidence with a matching key is attached to any board node, apply effects
// ---------------------------------------------------------------------------

export const EVIDENCE_PLACEMENT_EFFECTS: EvidencePlacement[] = [
  // MAIL-01 brute force log → confirm WKS→MAIL edge
  {
    evidenceKey: "MAIL-01:analyze_logs",
    upgradesEdgeId: "edge-wks-mail",
    upgradesEdgeTo: "suspected",
    marksNodeId: "board-mail01",
    marksNodeAs: "confirmed",
  },
  // MAIL-01 lateral movement → confirm MAIL→DB edge, reveal MAIL→GW edge
  {
    evidenceKey: "MAIL-01:trace_lateral_movement",
    upgradesEdgeId: "edge-mail-db",
    upgradesEdgeTo: "confirmed",
    marksNodeId: "board-mail01",
    marksNodeAs: "confirmed",
  },
  // MAIL-01 log tampering → marks mail as suspicious/confirmed
  {
    evidenceKey: "MAIL-01:detect_anomalies",
    marksNodeId: "board-mail01",
    marksNodeAs: "confirmed",
  },
  // MAIL-01 connection to DB → reveals and confirms MAIL→DB edge
  {
    evidenceKey: "MAIL-01:trace_connections",
    upgradesEdgeId: "edge-mail-db",
    upgradesEdgeTo: "confirmed",
  },
  // MAIL-01 timeline → reveals MAIL→GW edge
  {
    evidenceKey: "MAIL-01:reconstruct_timeline",
    upgradesEdgeId: "edge-mail-gw",
    upgradesEdgeTo: "suspected",
  },
  // WKS-03 lateral movement → confirm WKS→MAIL, upgrade WKS to confirmed
  {
    evidenceKey: "WKS-03:trace_lateral_movement",
    upgradesEdgeId: "edge-wks-mail",
    upgradesEdgeTo: "confirmed",
    marksNodeId: "board-wks03",
    marksNodeAs: "confirmed",
  },
  // WKS-03 USB artifact → marks WKS as suspicious
  {
    evidenceKey: "WKS-03:inspect_artifacts",
    marksNodeId: "board-wks03",
    marksNodeAs: "suspicious",
  },
  // DB-02 full dump → confirm MAIL→DB, reveal DB→BACKUP edge & BACKUP node
  {
    evidenceKey: "DB-02:analyze_logs",
    upgradesEdgeId: "edge-mail-db",
    upgradesEdgeTo: "confirmed",
    marksNodeId: "board-db02",
    marksNodeAs: "confirmed",
    revealsNodeId: "board-backup01",
  },
  // DB-02 rsync → reveal BACKUP node, confirm DB→BACKUP edge
  {
    evidenceKey: "DB-02:trace_connections",
    revealsNodeId: "board-backup01",
    upgradesEdgeId: "edge-db-backup",
    upgradesEdgeTo: "confirmed",
  },
  // GW-01 exfil trace → confirm GW→outcome, reveal GW→EXT
  {
    evidenceKey: "GW-01:trace_connections",
    upgradesEdgeId: "edge-gw-outcome",
    upgradesEdgeTo: "confirmed",
    marksNodeId: "board-gw01",
    marksNodeAs: "confirmed",
  },
  // GW-01 firewall rule → marks GW as confirmed
  {
    evidenceKey: "GW-01:analyze_logs",
    marksNodeId: "board-gw01",
    marksNodeAs: "confirmed",
    upgradesEdgeId: "edge-mail-gw",
    upgradesEdgeTo: "confirmed",
  },
  // BACKUP-01 staging file → reveal BACKUP, confirm DB→BACKUP
  {
    evidenceKey: "BACKUP-01:recover_files",
    revealsNodeId: "board-backup01",
    upgradesEdgeId: "edge-db-backup",
    upgradesEdgeTo: "confirmed",
    marksNodeId: "board-backup01",
    marksNodeAs: "confirmed",
  },
  // EXT-01 red herring → reveal EXT as contradicted
  {
    evidenceKey: "EXT-01:trace_connections",
    revealsNodeId: "board-ext01",
    marksNodeId: "board-ext01",
    marksNodeAs: "contradicted",
  },
];

// ---------------------------------------------------------------------------
// Agent consultation response templates
// Keyed by agentId, with responses based on context tags
// ---------------------------------------------------------------------------

interface ConsultTemplate {
  tags: string[];          // match any of these tags on selected evidence
  message: string;
  tone: "agreement" | "skepticism" | "contradiction" | "nuance" | "suggestion";
}

export const AGENT_CONSULT_TEMPLATES: Record<AgentId, ConsultTemplate[]> = {
  logis: [
    { tags: ["brute_force", "credential_abuse"], message: "The auth trail is textbook credential stuffing. 47 attempts in 62 seconds — that's automated. The question is where the credential list came from. If WKS-03 had a credential dump tool, that's your answer.", tone: "agreement" },
    { tags: ["log_tampering", "anti_forensics"], message: "Selective log deletion between 01:01 and 01:48 — exactly during the lateral move window. Whoever did this knew which logs to wipe. That's not amateur hour.", tone: "agreement" },
    { tags: ["red_herring"], message: "I'd be cautious with this finding. The confidence is low, and it doesn't fit the log patterns I've seen on the compromised systems. Focus elsewhere.", tone: "skepticism" },
    { tags: ["timeline", "attack_sequence"], message: "The chronology makes sense from a log perspective. Each system's auth events line up with the proposed sequence. But I'd want CHRONO to cross-verify the timestamps.", tone: "nuance" },
    { tags: ["initial_access", "credential_chain"], message: "If WKS-03 is patient zero, the log evidence supports it — the same IP appears in both the USB event and the MAIL-01 brute-force. That's not coincidence.", tone: "agreement" },
  ],
  nexus: [
    { tags: ["lateral_movement", "smb"], message: "SMB traffic from a mail server to a database at 1 AM? That's not a scheduled backup. The 2.1GB transfer volume matches the subsequent database dump size. This connection is the pivot.", tone: "agreement" },
    { tags: ["exfiltration", "c2_server"], message: "11.1GB to a bulletproof hosting provider over HTTPS with a blank SNI — that's textbook exfiltration. Self-signed cert means they didn't bother with proper TLS. This is the exit point.", tone: "agreement" },
    { tags: ["data_staging"], message: "The data moved DB→BACKUP→GW in sequence. BACKUP-01 was used as a staging relay — the file was created at 01:29 and deleted at 01:45, just 5 seconds before egress started. Tight operational timing.", tone: "agreement" },
    { tags: ["red_herring", "cdn"], message: "EXT-01 is Cloudflare. One digit off from the exfil IP — that's just an unlucky coincidence. I'd drop this lead entirely.", tone: "contradiction" },
    { tags: ["pivot_node", "hub"], message: "MAIL-01 is the traffic hub. Inbound from WKS-03, outbound to both DB-02 and GW-01. Classic pivot architecture. The attacker used the mail server as their operating base.", tone: "agreement" },
  ],
  filer: [
    { tags: ["file_carving", "data_staging"], message: "The recovered auth.log lines show scp and rsync commands — that's actual lateral movement evidence. The attacker tried to destroy this, but the /tmp/.trash recovery pulled it back.", tone: "agreement" },
    { tags: ["steganography", "c2_config"], message: "LSB steganography in a company logo — clever. The decoded JSON has the C2 IP, beacon interval, and encryption key. This is how the implant was configured. It was pre-positioned.", tone: "agreement" },
    { tags: ["credential_dumping", "mimikatz"], message: "credential_tool.py with a Mimikatz variant hash — this is the initial weapon. Executed at 23:58 from USB, output to /tmp/.creds. Four minutes later, those creds hit MAIL-01.", tone: "agreement" },
    { tags: ["anti_forensics", "cleanup_commands"], message: "They ran history -c and shred, but shred doesn't work properly on SSDs. That's an amateur mistake in an otherwise professional operation. The .bash_history recovery proves they were cleaning up.", tone: "nuance" },
    { tags: ["staging_file", "source_code"], message: "47,823 source files in a tar.gz created at 01:29. That matches the prod_repo dump exactly. This is the exfiltrated data, staged here before egress.", tone: "agreement" },
  ],
  chrono: [
    { tags: ["timeline", "attack_sequence", "dwell_time"], message: "The sequence I'm seeing: 23:58 USB → 00:02 brute-force → 00:03 auth success → 01:01 lateral → 01:06 dump → 01:29 staging → 01:45 egress. Total attack time: ~4 hours. Dwell time on MAIL-01 alone was 103 minutes.", tone: "agreement" },
    { tags: ["correlation", "initial_vector"], message: "The USB mount at 23:58 and the brute-force at 00:02 are only 4 minutes apart from the same source IP. That's causal, not coincidental. WKS-03 is the entry vector.", tone: "agreement" },
    { tags: ["staging_relay", "cleanup"], message: "The cleanup at 04:15 — over 2 hours after the exfiltration completed — suggests the attacker returned to cover tracks. The operational tempo changed: fast during the attack, slow during cleanup.", tone: "nuance" },
    { tags: ["red_herring"], message: "The timeline doesn't support this node being involved. There's no temporal correlation with the incident window. I'd deprioritize.", tone: "skepticism" },
    { tags: ["firewall_evasion"], message: "The firewall rule was added at 01:44, one minute before egress. Deleted at 04:15, during the cleanup phase. The admin_temp account hadn't been used in 14 months — compromised credential reuse.", tone: "agreement" },
  ],
};

// Default response when no template matches
export const DEFAULT_CONSULT_RESPONSES: Record<AgentId, string> = {
  logis: "I'd need to see the actual log data from the relevant systems to give you a meaningful assessment. The evidence you've selected doesn't match my log analysis patterns.",
  nexus: "The network traffic patterns in your selection don't give me enough to work with. Try selecting evidence related to connections, traffic flows, or lateral movement.",
  filer: "I need file artifacts or recovery evidence to reason about. Select findings related to deleted files, payloads, or artifact analysis.",
  chrono: "I need timeline or sequence data to build a meaningful assessment. Select evidence with timestamps or event ordering to get my analysis.",
};

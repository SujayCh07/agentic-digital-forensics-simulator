/**
 * NIPS — Case: The Midnight Exfiltration
 *
 * A prebuilt, static forensics scenario. No procedural generation.
 * All evidence is pre-placed; findings are deterministic.
 */

import type { AgentDefinition, AgentResult, CaseNetworkEdge, CaseSystemNode, TaskType } from "@/types/investigation";
import type { BackendNPC, BackendRelationship } from "@/types/backend";

// ---------------------------------------------------------------------------
// Case metadata
// ---------------------------------------------------------------------------

export const CASE_META = {
  id: "midnight_exfil",
  name: "The Midnight Exfiltration",
  brief:
    "At 03:47 this morning, 47GB of classified source code left the perimeter. " +
    "The exfiltration window lasted 22 minutes. Six systems were active during the breach. " +
    "Find the origin, trace the path, identify the payload before evidence degrades.",
  objective: "Identify the origin node, full attack path, and exfiltration method.",
  incidentTime: "2024-01-15T03:47:00Z",
  windowEnd: "2024-01-15T04:09:00Z",
};

// ---------------------------------------------------------------------------
// System nodes (backend tile coords: 0-19 x 0-14)
// ---------------------------------------------------------------------------

export const CASE_NODES: CaseSystemNode[] = [
  {
    id: "MAIL-01",
    name: "Mail Server",
    type: "server",
    status: "compromised",
    threatLevel: 0.92,
    tileX: 5,
    tileY: 7,
    knownFindings: [],
  },
  {
    id: "DB-02",
    name: "Database Server",
    type: "database",
    status: "compromised",
    threatLevel: 0.78,
    tileX: 14,
    tileY: 8,
    knownFindings: [],
  },
  {
    id: "WKS-03",
    name: "Workstation Alpha",
    type: "workstation",
    status: "suspicious",
    threatLevel: 0.35,
    tileX: 3,
    tileY: 10,
    knownFindings: [],
  },
  {
    id: "GW-01",
    name: "Gateway Router",
    type: "router",
    status: "suspicious",
    threatLevel: 0.58,
    tileX: 10,
    tileY: 3,
    knownFindings: [],
  },
  {
    id: "BACKUP-01",
    name: "Backup Archive",
    type: "archive",
    status: "suspicious",
    threatLevel: 0.62,
    tileX: 10,
    tileY: 13,
    knownFindings: [],
  },
  {
    id: "EXT-01",
    name: "External Endpoint",
    type: "external",
    status: "clean",
    threatLevel: 0.0,
    tileX: 18,
    tileY: 6,
    knownFindings: [],
  },
];

// ---------------------------------------------------------------------------
// Network edges
// ---------------------------------------------------------------------------

export const CASE_EDGES: CaseNetworkEdge[] = [
  { source: "WKS-03",    target: "MAIL-01",   isSuspicious: false },
  { source: "MAIL-01",   target: "DB-02",     isSuspicious: true  },
  { source: "MAIL-01",   target: "GW-01",     isSuspicious: false },
  { source: "DB-02",     target: "BACKUP-01", isSuspicious: true  },
  { source: "GW-01",     target: "EXT-01",    isSuspicious: true  },
  { source: "GW-01",     target: "WKS-03",    isSuspicious: false },
];

// ---------------------------------------------------------------------------
// Agents as BackendNPC objects (reuses existing NPC/movement system)
// Starting positions away from action area
// ---------------------------------------------------------------------------

export const CASE_AGENTS_NPCS: BackendNPC[] = [
  {
    id: "logis",
    name: "LOGIS",
    category: "specialist",
    gender: "N/A",
    bio: "Log Analysis Intelligence System — reads system logs across all machines.",
    persona: "Methodical, precise. Never misses an anomaly.",
    mbti: "ISTJ",
    profession: "Log Analyst",
    role: "worker",
    income_level: "high",
    political_leaning: 0,
    reputation: 0.9,
    beliefs: ["Evidence-based analysis"],
    controversial_ideas: [],
    x: 2,
    y: 2,
    mood: "hopeful",
    perception: "Scanning system logs for anomalies.",
    current_plan: "Await assignment.",
  },
  {
    id: "nexus",
    name: "NEXUS",
    category: "specialist",
    gender: "N/A",
    bio: "Network Tracing Intelligence System — follows packet flows and lateral movement.",
    persona: "Fast, decisive. Follows every connection to its source.",
    mbti: "ENTP",
    profession: "Network Analyst",
    role: "worker",
    income_level: "high",
    political_leaning: 0,
    reputation: 0.88,
    beliefs: ["Every packet leaves a trace"],
    controversial_ideas: [],
    x: 5,
    y: 2,
    mood: "hopeful",
    perception: "Monitoring network topology.",
    current_plan: "Await assignment.",
  },
  {
    id: "filer",
    name: "FILER",
    category: "specialist",
    gender: "N/A",
    bio: "File Analysis Intelligence System — recovers deleted artifacts and detects steganography.",
    persona: "Patient, thorough. Finds what others overlook.",
    mbti: "INFJ",
    profession: "File Analyst",
    role: "worker",
    income_level: "high",
    political_leaning: 0,
    reputation: 0.85,
    beliefs: ["Nothing is truly deleted"],
    controversial_ideas: [],
    x: 8,
    y: 2,
    mood: "hopeful",
    perception: "Ready to recover artifacts.",
    current_plan: "Await assignment.",
  },
  {
    id: "chrono",
    name: "CHRONO",
    category: "specialist",
    gender: "N/A",
    bio: "Timeline Analysis Intelligence System — reconstructs event sequences and causal chains.",
    persona: "Systematic, big-picture. Builds the full story.",
    mbti: "INTJ",
    profession: "Timeline Analyst",
    role: "worker",
    income_level: "high",
    political_leaning: 0,
    reputation: 0.92,
    beliefs: ["Causality leaves fingerprints"],
    controversial_ideas: [],
    x: 11,
    y: 2,
    mood: "hopeful",
    perception: "Indexing timeline.",
    current_plan: "Await assignment.",
  },
];

// ---------------------------------------------------------------------------
// Agents as AgentDefinition objects (investigation game state)
// ---------------------------------------------------------------------------

export const INITIAL_AGENTS: AgentDefinition[] = [
  {
    id: "logis",
    name: "LOGIS",
    fullName: "Log Analysis Intelligence System",
    specialty: "Log Analysis",
    color: "#c9d8e8",
    capabilities: ["analyze_logs", "detect_anomalies"],
    status: "idle",
    tileX: 2,
    tileY: 2,
  },
  {
    id: "nexus",
    name: "NEXUS",
    fullName: "Network Tracing Intelligence System",
    specialty: "Network Tracing",
    color: "#00d4ff",
    capabilities: ["trace_connections", "trace_lateral_movement"],
    status: "idle",
    tileX: 5,
    tileY: 2,
  },
  {
    id: "filer",
    name: "FILER",
    fullName: "File Analysis Intelligence System",
    specialty: "File Recovery",
    color: "#f59e0b",
    capabilities: ["recover_files", "inspect_artifacts"],
    status: "idle",
    tileX: 8,
    tileY: 2,
  },
  {
    id: "chrono",
    name: "CHRONO",
    fullName: "Timeline Reconstruction System",
    specialty: "Timeline",
    color: "#b06fff",
    capabilities: ["reconstruct_timeline", "correlate_events"],
    status: "idle",
    tileX: 11,
    tileY: 2,
  },
];

// ---------------------------------------------------------------------------
// Network edges as BackendRelationship (for SocialGraph/AttackGraph reuse)
// isSuspicious → low trust, negative affinity
// ---------------------------------------------------------------------------

export const CASE_RELATIONSHIPS: BackendRelationship[] = CASE_EDGES.map((e) => ({
  source_id: e.source,
  target_id: e.target,
  rel_type: "colleague" as const,
  strength: e.isSuspicious ? 0.8 : 0.3,
  affinity: e.isSuspicious ? -0.8 : 0.3,
  trust: e.isSuspicious ? 0.15 : 0.7,
}));

// ---------------------------------------------------------------------------
// Pre-written task findings (deterministic results)
// Key: `${nodeId}:${taskType}`
// ---------------------------------------------------------------------------

type ResultTemplate = Omit<AgentResult, "agentId" | "agentName">;

export const TASK_RESULTS: Record<string, ResultTemplate> = {
  // ── MAIL-01 ───────────────────────────────────────────────────────────────
  "MAIL-01:analyze_logs": {
    nodeId: "MAIL-01", nodeName: "Mail Server",
    taskType: "analyze_logs",
    summary: "47 failed SSH attempts from 192.168.4.21 between 00:02–00:03, followed by successful auth.",
    details: "auth.log shows brute-force pattern: 47 attempts in 62 seconds from internal IP 192.168.4.21. Auth succeeded at 00:03:12 using credentials for svc_backup. This account had not authenticated in 94 days.",
    confidence: 0.96, severity: "critical",
    evidenceType: "log_entry",
    tags: ["brute_force", "credential_abuse", "initial_access"],
  },
  "MAIL-01:detect_anomalies": {
    nodeId: "MAIL-01", nodeName: "Mail Server",
    taskType: "detect_anomalies",
    summary: "auth.log has a 47-minute gap between 01:01 and 01:48 — logs were deleted during this window.",
    details: "Log continuity check reveals gap from 01:01:44 to 01:48:09. Inode timestamps confirm the log file was modified at 01:02:09, 87 seconds after the lateral move to DB-02 was initiated. Selective deletion to cover tracks.",
    confidence: 0.88, severity: "high",
    evidenceType: "log_entry",
    tags: ["log_tampering", "anti_forensics", "evidence_destruction"],
  },
  "MAIL-01:recover_files": {
    nodeId: "MAIL-01", nodeName: "Mail Server",
    taskType: "recover_files",
    summary: "Partial auth.log recovered from /tmp/.trash — 312 lines showing lateral move commands.",
    details: "File carving from /tmp/.trash recovered 312 lines of deleted auth.log. Lines 189–312 show scp and rsync commands targeting DB-02 (192.168.8.14) initiated by svc_backup. Data: 2.1GB transferred at 01:01:44.",
    confidence: 0.78, severity: "high",
    evidenceType: "deleted_file",
    tags: ["file_carving", "lateral_movement", "data_staging"],
  },
  "MAIL-01:inspect_artifacts": {
    nodeId: "MAIL-01", nodeName: "Mail Server",
    taskType: "inspect_artifacts",
    summary: "company-logo.png contains 4.2KB steganographic payload encoding C2 IP 185.220.101.47.",
    details: "LSB analysis of /var/www/assets/company-logo.png reveals 4.2KB payload in blue channel. Decoded content: JSON object with C2 server IP (185.220.101.47), beacon interval (300s), and AES-256 key. This is the implant config.",
    confidence: 0.71, severity: "critical",
    evidenceType: "steg_payload",
    tags: ["steganography", "c2_config", "implant"],
  },
  "MAIL-01:trace_connections": {
    nodeId: "MAIL-01", nodeName: "Mail Server",
    taskType: "trace_connections",
    summary: "Outbound connection to DB-02:445 at 01:01:44 — 2.1GB transferred over SMB.",
    details: "NetFlow records show MAIL-01 → DB-02:445 (SMB) starting 01:01:44. Total 2.1GB transferred in 4 minutes. SMB traffic from a mail server to a database over port 445 is anomalous. No legitimate business justification found.",
    confidence: 0.94, severity: "high",
    evidenceType: "network_packet",
    tags: ["lateral_movement", "smb", "data_staging"],
  },
  "MAIL-01:trace_lateral_movement": {
    nodeId: "MAIL-01", nodeName: "Mail Server",
    taskType: "trace_lateral_movement",
    summary: "MAIL-01 is the pivot point: inbound from WKS-03, outbound to DB-02 and GW-01.",
    details: "MAIL-01 received 47 auth attempts from WKS-03 (192.168.2.10) at 00:02. After successful auth, it initiated lateral movement to DB-02 at 01:01:44 and a second connection to GW-01 at 01:45:30. This is the hub node.",
    confidence: 0.97, severity: "critical",
    evidenceType: "network_packet",
    tags: ["pivot_node", "lateral_movement", "hub"],
  },
  "MAIL-01:reconstruct_timeline": {
    nodeId: "MAIL-01", nodeName: "Mail Server",
    taskType: "reconstruct_timeline",
    summary: "MAIL-01 timeline: 00:02 compromise → 01:01 pivot to DB-02 → 01:45 egress via GW-01.",
    details: "Reconstructed sequence: 00:02:00 brute-force begins | 00:03:12 auth success | 00:04–01:01 dwell/recon | 01:01:44 lateral move DB-02 | 01:02:09 log deletion | 01:45:30 connection to GW-01 for egress. Total dwell time on MAIL-01: 103 minutes.",
    confidence: 0.91, severity: "critical",
    evidenceType: "timeline_event",
    tags: ["timeline", "attack_sequence", "dwell_time"],
  },
  "MAIL-01:correlate_events": {
    nodeId: "MAIL-01", nodeName: "Mail Server",
    taskType: "correlate_events",
    summary: "MAIL-01 events correlate with WKS-03 USB mount at 23:58 — insider or compromised endpoint.",
    details: "Cross-correlating MAIL-01 auth events with all system logs: WKS-03 shows a USB device mounted at 23:58:02, 4 minutes before the brute-force originated. USB contained a Python script (hash matches known credential-stuffing tool). Connection: WKS-03 may be the initial compromise vector.",
    confidence: 0.73, severity: "high",
    evidenceType: "timeline_event",
    tags: ["correlation", "initial_vector", "usb", "credential_stuffing"],
  },

  // ── DB-02 ────────────────────────────────────────────────────────────────
  "DB-02:analyze_logs": {
    nodeId: "DB-02", nodeName: "Database Server",
    taskType: "analyze_logs",
    summary: "DB-02 access log shows svc_backup exported 44GB from prod_repo table at 01:06–01:28.",
    details: "db_access.log: user svc_backup ran SELECT * FROM prod_repo at 01:06:12. Export completed at 01:28:44. Total rows: 8.4M. Data size: 44.2GB (compressed: 11.1GB). This is a full dump of the source code repository. No scheduled job matches this window.",
    confidence: 0.98, severity: "critical",
    evidenceType: "log_entry",
    tags: ["data_exfiltration", "database_dump", "source_code"],
  },
  "DB-02:trace_connections": {
    nodeId: "DB-02", nodeName: "Database Server",
    taskType: "trace_connections",
    summary: "DB-02 → BACKUP-01: 11.1GB compressed archive transferred at 01:29 over rsync.",
    details: "After the database dump completed (01:28:44), rsync initiated from DB-02 to BACKUP-01:/mnt/offsite/. 11.1GB transferred in 3 minutes at 62MB/s. BACKUP-01 is meant for disaster recovery — this is a staging step before final exfiltration.",
    confidence: 0.95, severity: "critical",
    evidenceType: "network_packet",
    tags: ["staging", "rsync", "data_movement"],
  },
  "DB-02:recover_files": {
    nodeId: "DB-02", nodeName: "Database Server",
    taskType: "recover_files",
    summary: "Deleted .bash_history recovered — shows attacker ran clearance commands after dump.",
    details: "Recovery of deleted .bash_history for svc_backup reveals post-dump cleanup: history -c, shred -u export.sql.gz, rm -rf /tmp/stage. Commands executed 01:29:01–01:29:18 (17 seconds). Attacker attempted to destroy evidence but shred was incomplete on the SSD.",
    confidence: 0.82, severity: "high",
    evidenceType: "deleted_file",
    tags: ["anti_forensics", "cleanup_commands", "ssd_recovery"],
  },
  "DB-02:reconstruct_timeline": {
    nodeId: "DB-02", nodeName: "Database Server",
    taskType: "reconstruct_timeline",
    summary: "DB-02 was active for 28 minutes: dump started 01:06, staged to BACKUP-01 by 01:32, connection closed 01:34.",
    details: "Full DB-02 timeline: 01:01:44 SMB inbound from MAIL-01 | 01:05:58 svc_backup login | 01:06:12 dump starts | 01:28:44 dump complete (22:32 elapsed) | 01:29:01 rsync to BACKUP-01 | 01:29:01–18 cleanup | 01:32:00 rsync done | 01:34:22 all connections closed.",
    confidence: 0.93, severity: "critical",
    evidenceType: "timeline_event",
    tags: ["timeline", "database", "staging"],
  },

  // ── WKS-03 ───────────────────────────────────────────────────────────────
  "WKS-03:analyze_logs": {
    nodeId: "WKS-03", nodeName: "Workstation Alpha",
    taskType: "analyze_logs",
    summary: "WKS-03 shows a user session ending at 23:55 — 3 minutes before suspicious USB mount.",
    details: "Last interactive login on WKS-03: user jsmith, logout 23:55:14. USB device (VID:PID 0781:5575, SanDisk 64GB) mounted at 23:58:02 — 3 minutes after the user's session ended. Either jsmith returned briefly, or someone else used the unlocked workstation.",
    confidence: 0.67, severity: "medium",
    evidenceType: "log_entry",
    tags: ["usb", "after_hours", "insider_threat"],
  },
  "WKS-03:inspect_artifacts": {
    nodeId: "WKS-03", nodeName: "Workstation Alpha",
    taskType: "inspect_artifacts",
    summary: "USB contained credential_tool.py (SHA256: a4f2...) — known lateral-movement script.",
    details: "USB artifact analysis: /mount/usb/tools/credential_tool.py, SHA256: a4f2c91b...7d83. VirusTotal-equivalent match: 31/72 engines flag as Mimikatz variant. Script dumps NTLM hashes from memory. Executed at 23:58:44, output redirected to /tmp/.creds.",
    confidence: 0.88, severity: "high",
    evidenceType: "steg_payload",
    tags: ["credential_dumping", "mimikatz", "ntlm"],
  },
  "WKS-03:trace_lateral_movement": {
    nodeId: "WKS-03", nodeName: "Workstation Alpha",
    taskType: "trace_lateral_movement",
    summary: "WKS-03 is the origin: credential dump at 23:58 enabled MAIL-01 brute-force at 00:02.",
    details: "Causal chain confirmed: WKS-03 USB mount 23:58 → credential dump 23:58:44 → MAIL-01 brute-force 00:02:00 using harvested hash list. Same IP (192.168.2.10) appears in both the WKS-03 USB event and the MAIL-01 auth log. WKS-03 is patient zero.",
    confidence: 0.92, severity: "critical",
    evidenceType: "network_packet",
    tags: ["origin", "patient_zero", "credential_chain"],
  },

  // ── GW-01 ────────────────────────────────────────────────────────────────
  "GW-01:trace_connections": {
    nodeId: "GW-01", nodeName: "Gateway Router",
    taskType: "trace_connections",
    summary: "GW-01 routed 11.1GB to external IP 185.220.101.47 at 01:45:30 over HTTPS/443.",
    details: "Firewall logs: GW-01 egress 01:45:30 → 185.220.101.47:443. Transfer: 11.1GB over 22 minutes. Destination resolves to a bulletproof hosting provider in Eastern Europe. TLS SNI is blank — certificate is self-signed. This is the final exfiltration step.",
    confidence: 0.99, severity: "critical",
    evidenceType: "network_packet",
    tags: ["exfiltration", "c2_server", "bulletproof_hosting"],
  },
  "GW-01:analyze_logs": {
    nodeId: "GW-01", nodeName: "Gateway Router",
    taskType: "analyze_logs",
    summary: "GW-01 logs show no matching firewall rule for the egress — someone added a temporary allow rule.",
    details: "GW-01 firewall change log: at 01:44:12, rule added: ALLOW OUT 0.0.0.0/0:443 from 192.168.0.0/16. Rule creator: admin_temp (last used 14 months ago). Rule deleted at 04:15:30. Suggests the attacker had router access or used a compromised admin credential.",
    confidence: 0.85, severity: "critical",
    evidenceType: "log_entry",
    tags: ["firewall_evasion", "admin_access", "rule_manipulation"],
  },

  // ── BACKUP-01 ────────────────────────────────────────────────────────────
  "BACKUP-01:recover_files": {
    nodeId: "BACKUP-01", nodeName: "Backup Archive",
    taskType: "recover_files",
    summary: "Deleted staging file recovered: stage_20240115_0129.tar.gz (11.1GB, 47,823 source files).",
    details: "File carving on BACKUP-01:/mnt/offsite/ recovered partially deleted tar.gz. File header intact: created 2024-01-15T01:29:08Z, 11,094,237,184 bytes, 47,823 entries. Contents match prod_repo database dump. File was deleted at 01:45:25 (5 seconds before egress started).",
    confidence: 0.89, severity: "critical",
    evidenceType: "deleted_file",
    tags: ["staging_file", "source_code", "file_carving"],
  },
  "BACKUP-01:reconstruct_timeline": {
    nodeId: "BACKUP-01", nodeName: "Backup Archive",
    taskType: "reconstruct_timeline",
    summary: "BACKUP-01 used as staging relay: received data at 01:29, relayed to GW-01 at 01:45, cleaned at 04:15.",
    details: "BACKUP-01 timeline: 01:29:01 rsync inbound from DB-02 | 01:32:00 transfer complete | 01:45:25 staging file deleted | 01:45:30 GW-01 egress begins (data was streamed directly from BACKUP-01 → GW-01 → external). 04:15:30 remaining traces wiped. Cleanup nearly successful.",
    confidence: 0.87, severity: "critical",
    evidenceType: "timeline_event",
    tags: ["staging_relay", "cleanup", "timeline"],
  },

  // ── EXT-01 ───────────────────────────────────────────────────────────────
  "EXT-01:trace_connections": {
    nodeId: "EXT-01", nodeName: "External Endpoint",
    taskType: "trace_connections",
    summary: "[RED HERRING] EXT-01 is a legitimate CDN endpoint — no connection to the incident.",
    details: "185.220.101.48 (EXT-01) resolves to Cloudflare CDN, not the exfil destination (185.220.101.47). Single-digit difference in IP. All traffic to EXT-01 is standard web content delivery. This node is not involved in the attack.",
    confidence: 0.52, severity: "low",
    evidenceType: "network_packet",
    tags: ["red_herring", "cdn", "not_involved"],
    isRedHerring: true,
  },
  "EXT-01:analyze_logs": {
    nodeId: "EXT-01", nodeName: "External Endpoint",
    taskType: "analyze_logs",
    summary: "[RED HERRING] No matching logs — EXT-01 is outside the perimeter and unmonitored.",
    details: "EXT-01 (185.220.101.48) is an external CDN node. We have no log access. ECHO flagged this node based on IP proximity to the exfil destination, but confirmation shows it is a false lead. Recommend focusing on GW-01's egress destination instead.",
    confidence: 0.31, severity: "low",
    evidenceType: "log_entry",
    tags: ["red_herring", "external", "no_access"],
    isRedHerring: true,
  },
};

// Tasks that have no pre-written result return this fallback
export const FALLBACK_RESULT: ResultTemplate = {
  nodeId: "unknown", nodeName: "Unknown",
  taskType: "analyze_logs",
  summary: "No significant findings at this node for this task type.",
  details: "Analysis complete. No evidence matching the current incident signature found. Node may be clean or this task type is not applicable here.",
  confidence: 0.2, severity: "low",
  evidenceType: "log_entry",
  tags: ["no_finding"],
};

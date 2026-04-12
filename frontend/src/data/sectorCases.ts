import type { SectorCase } from "@/types/sectors";

/**
 * Pre-written sector cases — one per sector, covering the sector's primary
 * event type. A second case variant per sector is listed below the first.
 */
export const SECTOR_CASES: SectorCase[] = [
  // ── EDU-01 ──────────────────────────────────────────────────────────────────
  {
    id: "EDU-01-A",
    sectorId: "EDU-01",
    eventType: "malicious_code_commit",
    title: "Rogue Commit Detected",
    landmark: "Lunar Research University",
    description:
      "An unauthorized code commit was pushed to the University's AI research repository at 03:47 UTC. The commit includes obfuscated Python routines with outbound socket calls. The repository pipeline executed the payload before the CI gate triggered an alert. Affected: 4 research workstations and the build cache.",
    color: "#22d3ee",
    visualTheme: "code_breach",
    timeLimit: 480,
    status: "available",
    affectedNodes: ["WKS-03", "WKS-04", "MAIL-01"],
    initialClues: [
      "CI log shows a runner process spawning curl to 185.x.x.x:4444",
      "Commit authored by 'ghost@university.edu' — account does not exist in LDAP",
      "Three research VMs phoned home within 90 seconds of the build",
    ],
    agentPriority: ["filer", "logis"],
    difficulty: "medium",
  },
  {
    id: "EDU-01-B",
    sectorId: "EDU-01",
    eventType: "compromised_research_server",
    title: "Research Node Exfiltrating Data",
    landmark: "Lunar Research University",
    description:
      "The primary GPU research cluster shows sustained outbound traffic of 2.4 GB/hr to an unknown endpoint. Faculty accounts were used to authenticate after normal hours. Suspected credential stuffing from a prior dark web dump.",
    color: "#22d3ee",
    visualTheme: "data_leak",
    timeLimit: 600,
    status: "available",
    affectedNodes: ["WKS-03", "DB-02"],
    initialClues: [
      "Netflow shows egress on port 443 — but destination cert is self-signed",
      "Auth logs: faculty member 'chen_l' logged in from two continents simultaneously",
    ],
    agentPriority: ["nexus", "logis"],
    difficulty: "high",
  },

  // ── MED-02 ──────────────────────────────────────────────────────────────────
  {
    id: "MED-02-A",
    sectorId: "MED-02",
    eventType: "anomaly_detection",
    title: "Patient Monitoring Feed Spiking",
    landmark: "Lunar Medical Center",
    description:
      "The SOC dashboard for the medical monitoring system is showing a 600% spike in synthetic alarm events. The alert queue has been flooded, masking a concurrent privilege-escalation attempt on the diagnostics database. Classic noisy-neighbour attack.",
    color: "#34d399",
    visualTheme: "alert_flood",
    timeLimit: 360,
    status: "available",
    affectedNodes: ["DB-02", "GW-01"],
    initialClues: [
      "Alarm source IPs rotate every 30 seconds — suggests scripted flood",
      "During the flood, DB-02 received an ALTER USER command at 02:11 UTC",
      "One legitimate alert buried in the noise: memory dump on diag-host-7",
    ],
    agentPriority: ["logis", "chrono"],
    difficulty: "high",
  },
  {
    id: "MED-02-B",
    sectorId: "MED-02",
    eventType: "alert_flood",
    title: "SOC Blind Spot Exploitation",
    landmark: "Lunar Medical Center",
    description:
      "Medical device network is generating SNMP traps at 10,000/min. Monitoring systems are overwhelmed. Real-time threat detection is effectively offline. An analyst noticed a VPN tunnel to an unknown peer opened 4 minutes ago.",
    color: "#34d399",
    visualTheme: "sensor_overload",
    timeLimit: 300,
    status: "available",
    affectedNodes: ["GW-01", "EXT-01"],
    initialClues: [
      "SNMP flood originates from 12 IoT device IPs — all unpatched firmware",
      "VPN tunnel uses a decommissioned certificate (revoked 6 months ago)",
    ],
    agentPriority: ["nexus", "logis"],
    difficulty: "critical",
  },

  // ── FIN-03 ──────────────────────────────────────────────────────────────────
  {
    id: "FIN-03-A",
    sectorId: "FIN-03",
    eventType: "ransomware",
    title: "Ransomware Staging Detected",
    landmark: "Lunar Financial Tower",
    description:
      "Threat intel feed flagged a known ransomware C2 beacon originating from inside the transaction processing subnet. File enumeration activity was detected on the core banking file server. No encryption observed yet — this is the staging phase.",
    color: "#f59e0b",
    visualTheme: "financial_breach",
    timeLimit: 420,
    status: "available",
    affectedNodes: ["MAIL-01", "DB-02", "BACKUP-01"],
    initialClues: [
      "Process 'svchost.exe' calling home to Cobalt Strike watermark domain",
      "Shadow copy deletion attempt failed — VSS service running",
      "Lateral movement from MAIL-01 to DB-02 at 01:58 UTC",
    ],
    agentPriority: ["filer", "nexus"],
    difficulty: "critical",
  },
  {
    id: "FIN-03-B",
    sectorId: "FIN-03",
    eventType: "data_exfiltration",
    title: "Wire Transfer Records Extracted",
    landmark: "Lunar Financial Tower",
    description:
      "Compliance monitoring flagged an unusual query on the transaction database: 80,000 rows of wire transfer records downloaded by a service account that normally runs nightly reconciliation scripts — at noon.",
    color: "#f59e0b",
    visualTheme: "financial_breach",
    timeLimit: 540,
    status: "available",
    affectedNodes: ["DB-02", "EXT-01"],
    initialClues: [
      "Query ran via legitimate service account 'svc_reconcile'",
      "Output file written to a temp directory, then compressed with 7z",
      "Compressed archive transferred via HTTPS to an IP in a cloud provider range",
    ],
    agentPriority: ["filer", "nexus"],
    difficulty: "high",
  },

  // ── NET-04 ──────────────────────────────────────────────────────────────────
  {
    id: "NET-04-A",
    sectorId: "NET-04",
    eventType: "packet_anomalies",
    title: "BGP Route Hijack Attempt",
    landmark: "Telecom Signal Tower",
    description:
      "Network engineers noticed anomalous BGP announcements originating from a peer AS. Several /24 prefixes belonging to the financial sector are being re-advertised with lower AS path lengths, potentially redirecting traffic through a rogue network.",
    color: "#60a5fa",
    visualTheme: "network_anomaly",
    timeLimit: 480,
    status: "available",
    affectedNodes: ["GW-01", "EXT-01"],
    initialClues: [
      "AS_PATH for 203.0.113.0/24 now passes through AS64512 — unlisted peer",
      "Traffic to the financial tower dropped 40% over 8 minutes",
      "A BGP session was reset and re-established 3 times in 5 minutes",
    ],
    agentPriority: ["nexus", "logis"],
    difficulty: "high",
  },
  {
    id: "NET-04-B",
    sectorId: "NET-04",
    eventType: "traffic_spike",
    title: "DDoS Amplification In Progress",
    landmark: "Telecom Signal Tower",
    description:
      "The backbone router is ingesting 140 Gbps — 6× baseline. Traffic analysis reveals UDP packets hitting port 53 from thousands of source IPs with spoofed origins. Classic DNS amplification attack targeting downstream infrastructure.",
    color: "#60a5fa",
    visualTheme: "ddos",
    timeLimit: 300,
    status: "available",
    affectedNodes: ["GW-01"],
    initialClues: [
      "Resolver cache is being hit with ANY queries for large zones",
      "Attack bandwidth concentrated on 3 recursive resolvers",
    ],
    agentPriority: ["nexus"],
    difficulty: "critical",
  },

  // ── AUTH-05 ──────────────────────────────────────────────────────────────────
  {
    id: "AUTH-05-A",
    sectorId: "AUTH-05",
    eventType: "brute_force_login",
    title: "Credential Spray Campaign",
    landmark: "Cybersecurity Gateway",
    description:
      "The identity gateway is absorbing a slow-and-low credential spray against 2,400 employee accounts. Attackers are using 1 attempt per account per 30 minutes to stay under lockout thresholds. 14 accounts have already been compromised.",
    color: "#a78bfa",
    visualTheme: "auth_attack",
    timeLimit: 600,
    status: "available",
    affectedNodes: ["EXT-01", "AUTH-05"],
    initialClues: [
      "Failed logins from 312 distinct IPs — distributed across 18 countries",
      "14 accounts show a successful login followed immediately by MFA bypass",
      "Compromised accounts began forwarding emails within 2 minutes of access",
    ],
    agentPriority: ["logis", "chrono"],
    difficulty: "high",
  },
  {
    id: "AUTH-05-B",
    sectorId: "AUTH-05",
    eventType: "credential_theft",
    title: "LSASS Memory Dump Detected",
    landmark: "Cybersecurity Gateway",
    description:
      "EDR alerted on a process injecting into lsass.exe on the domain controller. Credential material for 1,800 domain accounts may be compromised. The attacker appears to be using Mimikatz-derivative tooling.",
    color: "#a78bfa",
    visualTheme: "auth_attack",
    timeLimit: 420,
    status: "available",
    affectedNodes: ["EXT-01", "WKS-03"],
    initialClues: [
      "Process tree: explorer.exe → cmd.exe → procdump64.exe targeting lsass",
      "A minidump file was created in C:\\Windows\\Temp before EDR quarantine",
      "Same host made an SMB connection to the backup server 40 seconds later",
    ],
    agentPriority: ["filer", "logis"],
    difficulty: "critical",
  },

  // ── PWR-06 ──────────────────────────────────────────────────────────────────
  {
    id: "PWR-06-A",
    sectorId: "PWR-06",
    eventType: "server_compromise",
    title: "Grid Control System Backdoor",
    landmark: "Grid Control Station",
    description:
      "An anomalous process on the SCADA historian server is listening on port 31337. The process has no entry in the software inventory, predates the last patching cycle by 6 months, and has write access to grid state tables. A ghost admin account was created last week.",
    color: "#fb923c",
    visualTheme: "industrial_breach",
    timeLimit: 600,
    status: "available",
    affectedNodes: ["BACKUP-01", "GW-01"],
    initialClues: [
      "Process 'wininit.exe' (lowercase 'i') running from C:\\Users\\Public",
      "Admin account 'svc_grid_admin2' created 6 days ago — no change ticket",
      "Historian DB shows 14 unauthorized writes to substation state records",
    ],
    agentPriority: ["filer", "logis"],
    difficulty: "critical",
  },
  {
    id: "PWR-06-B",
    sectorId: "PWR-06",
    eventType: "storage_breach",
    title: "Backup Tape Archive Accessed",
    landmark: "Grid Control Station",
    description:
      "The backup management system recorded a bulk restore request for grid configuration backups spanning 2 years. The request was authenticated but originates from an IP in the administrative LAN — not the backup operator subnet.",
    color: "#fb923c",
    visualTheme: "industrial_breach",
    timeLimit: 480,
    status: "available",
    affectedNodes: ["BACKUP-01"],
    initialClues: [
      "Restore job ID traces to a service account unused for 11 months",
      "Backup catalogue accessed 3 hours before the restore request",
    ],
    agentPriority: ["filer", "chrono"],
    difficulty: "medium",
  },

  // ── CLOUD-07 ──────────────────────────────────────────────────────────────────
  {
    id: "CLOUD-07-A",
    sectorId: "CLOUD-07",
    eventType: "server_compromise",
    title: "Container Escape to Host",
    landmark: "Lunar Data Center",
    description:
      "A workload pod in the cloud cluster attempted to mount the host filesystem. The admission controller blocked the mount, but not before the pod read /proc/1/environ — leaking host environment variables including an AWS IAM role token.",
    color: "#38bdf8",
    visualTheme: "cloud_breach",
    timeLimit: 540,
    status: "available",
    affectedNodes: ["CLOUD-07", "BACKUP-01"],
    initialClues: [
      "Pod 'analytics-worker-7f4d9' attempted privileged hostPath mount",
      "kubectl exec session from CI/CD runner 2 minutes before the escape attempt",
      "AWS CloudTrail: AssumeRole call from an unexpected source IP 6 minutes later",
    ],
    agentPriority: ["nexus", "filer"],
    difficulty: "high",
  },
  {
    id: "CLOUD-07-B",
    sectorId: "CLOUD-07",
    eventType: "storage_breach",
    title: "Object Storage Bucket Enumerated",
    landmark: "Lunar Data Center",
    description:
      "S3 access logs reveal a systematic enumeration of a private data bucket by an IAM principal that should have no access. 8,000 objects were listed and 340 were downloaded before the access was revoked.",
    color: "#38bdf8",
    visualTheme: "cloud_breach",
    timeLimit: 480,
    status: "available",
    affectedNodes: ["CLOUD-07"],
    initialClues: [
      "IAM role 'lambda-processor' assumed via web identity federation — unusual for batch jobs",
      "ListObjects + GetObject calls at 200/min — scripted access pattern",
    ],
    agentPriority: ["filer", "logis"],
    difficulty: "medium",
  },

  // ── CIV-08 (Artemis II Mission Control) ────────────────────────────────────
  {
    id: "CIV-08-A",
    sectorId: "CIV-08",
    eventType: "multi_sector_attack",
    title: "Coordinated Multi-Sector Intrusion",
    landmark: "Artemis II Mission Control",
    description:
      "Mission Control's telemetry aggregation layer is receiving anomalous feeds from EDU-01, FIN-03, and NET-04 simultaneously. IOC correlation across sectors reveals a single threat actor using common C2 infrastructure. This is a coordinated APT campaign.",
    color: "#f472b6",
    visualTheme: "multi_sector_breach",
    timeLimit: 720,
    status: "available",
    affectedNodes: ["EXT-01", "GW-01", "MAIL-01", "DB-02"],
    initialClues: [
      "C2 domain sha256 hash matches known APT29 tooling (public TI feed)",
      "Beaconing intervals of 4h ± 30s detected on 3 separate infected hosts across sectors",
      "Lateral movement pivot: EDU WKS-03 → FIN MAIL-01 via SMB relay",
      "Mission Control auth logs show read access from a non-operator IP range",
    ],
    agentPriority: ["logis", "nexus", "filer", "chrono"],
    difficulty: "critical",
  },
  {
    id: "CIV-08-B",
    sectorId: "CIV-08",
    eventType: "cascading_failure",
    title: "Cascading Process Overload",
    landmark: "Artemis II Mission Control",
    description:
      "A misconfigured message broker is redelivering failed messages in an exponential-retry loop. Downstream consumers are CPU-bound and begin dropping health check responses. 7 dependent services have entered degraded state. Suspected trigger: a malicious payload disguised as a routine config update.",
    color: "#f472b6",
    visualTheme: "cascade_failure",
    timeLimit: 600,
    status: "available",
    affectedNodes: ["GW-01", "BACKUP-01", "CIV-08"],
    initialClues: [
      "Message broker queue depth: 4.2M — baseline is <5K",
      "Config update deployed 11 minutes before first alert — unapproved change",
      "CPU on 7 consumer pods spiked to 100% within 90 seconds of update",
    ],
    agentPriority: ["chrono", "logis"],
    difficulty: "high",
  },
];

/** Get the primary (first) case for a given sector */
export function getPrimaryCase(sectorId: string): SectorCase | undefined {
  return SECTOR_CASES.find((c) => c.sectorId === sectorId);
}

/** Get all cases for a given sector */
export function getCasesForSector(sectorId: string): SectorCase[] {
  return SECTOR_CASES.filter((c) => c.sectorId === sectorId);
}

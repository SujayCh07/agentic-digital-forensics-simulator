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
    landmark: "Research Glass Labs",
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
    landmark: "Research Glass Labs",
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
    landmark: "Medical Sector Block",
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
    landmark: "Medical Sector Block",
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
    landmark: "Neon Finance Tower",
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
    landmark: "Neon Finance Tower",
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
    landmark: "Security Bastion",
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
    landmark: "Security Bastion",
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
    title: "Compute Hall Backdoor",
    landmark: "Data Core + Power Plant",
    description:
      "A rogue service is listening inside the lower compute hall that shares utilities with the cooling towers. The binary is absent from the software inventory, predates the last maintenance window by months, and can write to both plant telemetry and server orchestration tables.",
    color: "#fb923c",
    visualTheme: "industrial_breach",
    timeLimit: 600,
    status: "available",
    affectedNodes: ["BACKUP-01", "GW-01"],
    initialClues: [
      "Process 'cooling-syncd.exe' is running from an unsigned utilities share",
      "Shadow admin 'svc_plant_bridge' appeared six days ago with no approval trail",
      "Telemetry DB shows unauthorized writes touching both power and compute control tables",
    ],
    agentPriority: ["filer", "logis"],
    difficulty: "critical",
  },
  {
    id: "PWR-06-B",
    sectorId: "PWR-06",
    eventType: "storage_breach",
    title: "Cold Storage Restore Triggered",
    landmark: "Data Core + Power Plant",
    description:
      "The shared data-core archive recorded a bulk restore request for historical plant and compute snapshots spanning two years. The request is authenticated, but it originates from the service corridor network rather than the archive maintenance subnet.",
    color: "#fb923c",
    visualTheme: "industrial_breach",
    timeLimit: 480,
    status: "available",
    affectedNodes: ["BACKUP-01"],
    initialClues: [
      "Restore job traces back to a dormant archive service account",
      "Cold-storage catalogue was enumerated hours before the restore request landed",
    ],
    agentPriority: ["filer", "chrono"],
    difficulty: "medium",
  },

  // ── CLOUD-07 ──────────────────────────────────────────────────────────────────
  {
    id: "CLOUD-07-A",
    sectorId: "CLOUD-07",
    eventType: "server_compromise",
    title: "Telemetry Relay Breach",
    landmark: "Comms Relay + Rocket Square",
    description:
      "An uplink relay process in rocket square attempted to break out of its telemetry sandbox and read host-side credentials. The launch comms controller blocked part of the action, but not before environment tokens and route metadata were exposed.",
    color: "#38bdf8",
    visualTheme: "cloud_breach",
    timeLimit: 540,
    status: "available",
    affectedNodes: ["CLOUD-07", "BACKUP-01"],
    initialClues: [
      "Relay worker 'uplink-sync-7f4d9' attempted a privileged mount into host telemetry paths",
      "A remote maintenance shell was opened on the comms stack minutes before the breach",
      "Launch routing credentials were reused from an unexpected off-station IP",
    ],
    agentPriority: ["nexus", "filer"],
    difficulty: "high",
  },
  {
    id: "CLOUD-07-B",
    sectorId: "CLOUD-07",
    eventType: "storage_breach",
    title: "Launch Telemetry Archive Enumerated",
    landmark: "Comms Relay + Rocket Square",
    description:
      "Telemetry archive access logs show a systematic scrape of private uplink records by a principal that should never touch launch data. Thousands of objects were listed and hundreds were downloaded before the token was revoked.",
    color: "#38bdf8",
    visualTheme: "cloud_breach",
    timeLimit: 480,
    status: "available",
    affectedNodes: ["CLOUD-07"],
    initialClues: [
      "A launch-processing role was assumed through a stale web identity flow",
      "Telemetry archive reads peaked at 200 requests per minute with scripted cadence",
    ],
    agentPriority: ["filer", "logis"],
    difficulty: "medium",
  },

  // ── CIV-08 (Civic Transit Hub) ─────────────────────────────────────────────
  {
    id: "CIV-08-A",
    sectorId: "CIV-08",
    eventType: "multi_sector_attack",
    title: "Civic Router Correlation Breach",
    landmark: "Civic Transit Hub",
    description:
      "The civic transit hub is receiving malformed routing events from multiple districts at once. Correlating the queue metadata across research, security, and finance shows a shared intrusion pattern using common relay infrastructure. The lower hub is acting as the correlation point.",
    color: "#f472b6",
    visualTheme: "multi_sector_breach",
    timeLimit: 720,
    status: "available",
    affectedNodes: ["EXT-01", "GW-01", "MAIL-01", "DB-02"],
    initialClues: [
      "Three districts are emitting identical malformed routing signatures into the civic queue",
      "Beacon cadence lines up across research, auth, and finance infrastructure",
      "Transit process logs show cross-district correlation jobs triggered from an unauthorized relay",
      "Civic control logs show privileged reads from a non-operator service corridor",
    ],
    agentPriority: ["logis", "nexus", "filer", "chrono"],
    difficulty: "critical",
  },
  {
    id: "CIV-08-B",
    sectorId: "CIV-08",
    eventType: "cascading_failure",
    title: "Cascading Process Overload",
    landmark: "Civic Transit Hub",
    description:
      "A compromised civic process broker is redelivering failed routing jobs in an exponential retry loop. Transit controllers and civic approval workers are CPU-bound and dropping heartbeats. Seven dependent services have entered degraded state after a malicious config update.",
    color: "#f472b6",
    visualTheme: "cascade_failure",
    timeLimit: 600,
    status: "available",
    affectedNodes: ["GW-01", "BACKUP-01", "CIV-08"],
    initialClues: [
      "Civic message queue depth hit 4.2M where the normal baseline is below 5K",
      "Routing profile update landed 11 minutes before the first transit alert",
      "Seven downstream civic workers hit 100% CPU within ninety seconds of the update",
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

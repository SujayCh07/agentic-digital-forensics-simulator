"""Canonical NIPS case definitions."""

from __future__ import annotations

from nips.models import CaseBundle, CaseNode, FinalTruth, IssueDefinition

MIDNIGHT_EXFIL_SUMMARY = (
    "Case: The Midnight Exfiltration\n"
    "At 03:47 on January 15, 2024, 47 GB of classified source code left the "
    "perimeter. The exfiltration window lasted 22 minutes. The operator must "
    "identify the origin node, trace the full attack path, stabilize the live "
    "incident, and submit a final report before confidence decays."
)

MIDNIGHT_EXFIL_NODES: list[CaseNode] = [
    CaseNode(
        id="WKS-03",
        label="Dev Workstation",
        sector_id="EDU-01",
        node_type="workstation",
        threat_level=0.35,
        aliases=["WS-03", "workstation", "workstation alpha", "dev workstation"],
        tool_data={
            "logs": "03:30 RDP login from VPN; 03:35 mimikatz.exe executed; 03:38 credential harvest: 14 accounts; 00:02 outbound auth attempts to MAIL-01.",
            "network": "VPN ingress with lateral SSH to MAIL-01 and DB-02. No direct confirmed exfiltration from the workstation.",
            "files": "mimikatz.exe, credential_tool.py, /tmp/.creds, USB residue, and cleanup automation staged for 04:00.",
            "timeline": "23:58 USB mount -> 23:58 credential dump -> 00:02 MAIL-01 brute force -> 00:03 successful auth chain established.",
        },
    ),
    CaseNode(
        id="MAIL-01",
        label="Mail Gateway",
        sector_id="FIN-03",
        node_type="server",
        threat_level=0.92,
        aliases=["mail gateway", "mail server", "mail-01"],
        tool_data={
            "logs": "00:02 brute-force auth attempts from WKS-03; 00:03 svc_backup success; 01:01 lateral transfer to DB-02; 01:45 route priming toward GW-01.",
            "network": "Inbound from WKS-03; outbound to DB-02 and GW-01; suspicious role as hub node.",
            "files": "Recovered auth.log fragments, scp/rsync traces, and a steganographic logo payload with C2 configuration.",
            "timeline": "00:02 compromise -> 01:01 DB-02 pivot -> 01:45 GW-01 preparation.",
        },
    ),
    CaseNode(
        id="DB-02",
        label="Financial Database",
        sector_id="MED-02",
        node_type="database",
        threat_level=0.78,
        aliases=["database", "database server", "db-02"],
        tool_data={
            "logs": "01:06 prod_repo export begins under svc_backup; 01:28 dump complete; no scheduled job matches the activity.",
            "network": "Receives lateral access from MAIL-01, then stages an 11.1GB archive to BACKUP-01.",
            "files": "Partial dump fragments and anti-forensics commands recovered from deleted shell history.",
            "timeline": "01:01 inbound pivot -> 01:06 dump start -> 01:28 dump end -> 01:29 BACKUP-01 staging.",
        },
    ),
    CaseNode(
        id="BACKUP-01",
        label="Backup Server",
        sector_id="PWR-06",
        node_type="archive",
        threat_level=0.62,
        aliases=["backup", "backup server", "backup-01", "archive"],
        tool_data={
            "logs": "01:29 staging archive created from DB-02 dump; 01:45 deletion attempt; 04:15 anti-forensics sweep.",
            "network": "Receives archive from DB-02 and relays egress path toward GW-01. No legitimate offsite job matches the window.",
            "files": "stage_20240115_0129.tar.gz recovered; 47,823 source files remain attributable to prod_repo.",
            "timeline": "01:29 inbound stage -> 01:45 delete-and-stream handoff -> 04:15 cleanup.",
        },
    ),
    CaseNode(
        id="GW-01",
        label="API Gateway",
        sector_id="NET-04",
        node_type="router",
        threat_level=0.58,
        aliases=["gateway", "gateway router", "gw-01", "router"],
        tool_data={
            "logs": "01:44 temporary allow rule added for broad 443 egress; 01:45 transfer begins; 04:15 cleanup removes the rule.",
            "network": "Routes 11.1GB over TLS/443 to the observed external endpoint. This is the final network hop under defender control.",
            "files": "gw policy backup shows the temporary allow rule and anomalous admin_temp activity.",
            "timeline": "01:44 rule created -> 01:45 exfil starts -> 04:15 rule removed.",
        },
    ),
    CaseNode(
        id="EXT-01",
        label="External C2 Server",
        sector_id="AUTH-05",
        node_type="external",
        threat_level=0.14,
        aliases=["external endpoint", "external", "ext-01", "identity gateway"],
        tool_data={
            "logs": "External telemetry is incomplete. Nearby CDN infrastructure creates noisy lookalikes that can mislead investigators.",
            "network": "Observed outbound traffic terminates outside the perimeter. EXT-01 marks the endpoint the defenders can name in the current city graph, but direct host-level evidence remains partial.",
            "files": "No trusted file access from the internal perimeter.",
            "timeline": "01:45 external transfer observed; endpoint attribution remains weaker than the internal chain.",
        },
    ),
]

MIDNIGHT_EXFIL_CONNECTIONS = [
    {"source": "WKS-03", "target": "MAIL-01", "type": "credential abuse"},
    {"source": "MAIL-01", "target": "DB-02", "type": "lateral movement"},
    {"source": "DB-02", "target": "BACKUP-01", "type": "staging relay"},
    {"source": "BACKUP-01", "target": "GW-01", "type": "egress handoff"},
    {"source": "GW-01", "target": "EXT-01", "type": "external exfiltration"},
]

MIDNIGHT_EXFIL_ALIASES: dict[str, str] = {}
for node in MIDNIGHT_EXFIL_NODES:
    MIDNIGHT_EXFIL_ALIASES[node.id.lower()] = node.id
    MIDNIGHT_EXFIL_ALIASES[node.label.lower()] = node.id
    for alias in node.aliases:
        MIDNIGHT_EXFIL_ALIASES[alias.lower()] = node.id

MIDNIGHT_EXFIL_ISSUES = [
    IssueDefinition(
        id="wks03_credential_source",
        building_id="WKS-03",
        sector_id="EDU-01",
        type="credential_abuse",
        title="Confirm workstation credential source",
        description="Validate that the workstation seeded the credential chain before the mail pivot began.",
        required_evidence=["WKS-03:inspect_artifacts"],
        required_agent="FILER",
        unlocks_issue_ids=["mail01_pivot_containment"],
        spread_reduction=0.10,
        confidence_delta=0.10,
        reveals_evidence_keys=["WKS-03:trace_lateral_movement"],
        required_tags=["credential_dumping"],
    ),
    IssueDefinition(
        id="mail01_pivot_containment",
        building_id="MAIL-01",
        sector_id="FIN-03",
        type="lateral_movement",
        title="Contain the mail pivot",
        description="Prove that MAIL-01 acted as the hub between the workstation and the data systems, then stabilize it.",
        required_evidence=["MAIL-01:analyze_logs", "MAIL-01:trace_lateral_movement"],
        required_agent="NEXUS",
        unlocks_issue_ids=["db02_dump_window"],
        spread_reduction=0.15,
        confidence_delta=0.10,
        required_tags=["pivot_node"],
    ),
    IssueDefinition(
        id="db02_dump_window",
        building_id="DB-02",
        sector_id="MED-02",
        type="data_exfil",
        title="Validate the dump window",
        description="Tie the DB-02 export to the attack chain and pin down the timing of the source-code dump.",
        required_evidence=["DB-02:analyze_logs"],
        required_agent="CHRONO",
        unlocks_issue_ids=["backup01_staging_relay"],
        spread_reduction=0.05,
        confidence_delta=0.15,
        reveals_evidence_keys=["DB-02:reconstruct_timeline"],
        required_tags=["database_dump"],
    ),
    IssueDefinition(
        id="backup01_staging_relay",
        building_id="BACKUP-01",
        sector_id="PWR-06",
        type="staging_relay",
        title="Prove the staging relay",
        description="Show that BACKUP-01 held the staged archive before the final exfiltration handoff.",
        required_evidence=["DB-02:trace_connections"],
        required_agent="FILER",
        unlocks_issue_ids=["gw01_block_egress"],
        spread_reduction=0.10,
        confidence_delta=0.15,
        reveals_evidence_keys=["BACKUP-01:recover_files"],
        required_tags=["staging"],
    ),
    IssueDefinition(
        id="gw01_block_egress",
        building_id="GW-01",
        sector_id="NET-04",
        type="egress_control",
        title="Block the exfiltration path",
        description="Use the confirmed gateway telemetry to stabilize the final egress route and prepare the report phase.",
        required_evidence=["GW-01:trace_connections", "GW-01:analyze_logs"],
        required_agent="NEXUS",
        unlocks_issue_ids=[],
        spread_reduction=0.25,
        confidence_delta=0.20,
        required_tags=["exfiltration"],
    ),
]

MIDNIGHT_EXFIL_BUNDLE = CaseBundle(
    case_id="midnight_exfil",
    title="The Midnight Exfiltration",
    summary=MIDNIGHT_EXFIL_SUMMARY,
    nodes=MIDNIGHT_EXFIL_NODES,
    connections=MIDNIGHT_EXFIL_CONNECTIONS,
    aliases=MIDNIGHT_EXFIL_ALIASES,
    issues=MIDNIGHT_EXFIL_ISSUES,
    final_truth=FinalTruth(
        origin_node_id="WKS-03",
        attack_path=["WKS-03", "MAIL-01", "DB-02", "BACKUP-01", "GW-01", "EXT-01"],
        attack_type="data_exfil",
        required_mitigations=[
            "reset_credentials",
            "remove_persistence",
            "block_external_communication",
        ],
    ),
)

CASE_BUNDLES = {
    MIDNIGHT_EXFIL_BUNDLE.case_id: MIDNIGHT_EXFIL_BUNDLE,
}


def get_case_bundle(case_id: str) -> CaseBundle:
    return CASE_BUNDLES.get(case_id, MIDNIGHT_EXFIL_BUNDLE)


def resolve_case_node_id(raw: str, case_id: str = "midnight_exfil") -> str:
    bundle = get_case_bundle(case_id)
    if raw in {node.id for node in bundle.nodes}:
        return raw

    lowered = raw.lower().strip()
    if lowered in bundle.aliases:
        return bundle.aliases[lowered]

    for alias, node_id in bundle.aliases.items():
        if lowered in alias or alias in lowered:
            return node_id
    return raw

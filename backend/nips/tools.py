"""NIPS investigation tools — OpenAI tool definitions + Python execution.

Each tool has:
1. A ``declaration`` dict suitable for OpenAI tool definitions
2. An ``execute`` async function that takes scored context and returns raw text
"""

from __future__ import annotations

from typing import Any

# ---------------------------------------------------------------------------
# Case data (the Midnight Exfiltration) — kept server-side so the model
# can't peek beyond what the agent should know.
# ---------------------------------------------------------------------------

_NODE_DATA: dict[str, dict[str, Any]] = {
    "MAIL-01": {
        "name": "Mail Gateway",
        "logs": "03:42 — auth success admin@corp.local; 03:44 — forwarding rule created → ext-relay; 03:47 — bulk send 2,411 msgs",
        "network": "Inbound SMTP from EXT-01, outbound to BACKUP-01 port 993",
        "files": "rule_export.json (created 03:44, 12 KB), .pst spool 480 MB",
        "timeline": "03:42 login → 03:44 rule → 03:47 bulk send → 03:52 rule deleted",
    },
    "DB-02": {
        "name": "Financial Database",
        "logs": "03:45 — SELECT * FROM transactions WHERE amount > 10000; 03:46 — pg_dump initiated; 03:48 — 47 GB export completed",
        "network": "Lateral from WS-03 via SSH tunnel, egress to EXT-01 on port 443",
        "files": "dump_20240115.sql.gz (47 GB), .bash_history (cleared 03:50)",
        "timeline": "03:45 query → 03:46 dump start → 03:48 dump end → 03:49 SSH tunnel closed → 03:50 bash_history cleared",
    },
    "WS-03": {
        "name": "Dev Workstation",
        "logs": "03:30 — RDP login from VPN; 03:35 — mimikatz.exe executed; 03:38 — credential harvest: 14 accounts",
        "network": "VPN ingress, lateral SSH to DB-02 and MAIL-01, no direct egress",
        "files": "mimikatz.exe (SHA256: a1b2c3…), cred_dump.txt (14 entries), clean.bat (scheduled 04:00)",
        "timeline": "03:30 RDP → 03:35 mimikatz → 03:38 creds → 03:40 lateral to MAIL-01 → 03:43 lateral to DB-02",
    },
    "FW-01": {
        "name": "Perimeter Firewall",
        "logs": "03:47 — allow TCP 443 WS-03→EXT-01; 03:48 — allow TCP 443 DB-02→EXT-01; 03:49 — 47.2 GB transferred",
        "network": "NAT gateway, allow-list includes EXT-01 on 443 (added 03:30)",
        "files": "fw_config_backup.bin (modified 03:30 — rule added)",
        "timeline": "03:30 rule added → 03:47 traffic spike → 04:09 rule removed (auto-expire)",
    },
    "EXT-01": {
        "name": "External C2 Server",
        "logs": "Received 47.2 GB over TLS; beacon interval 60s from WS-03 since 03:28",
        "network": "Inbound from FW-01 NAT; IP 198.51.100.42, hosting on port 443",
        "files": "Staging directory /var/exfil/ — 47 GB; encrypted with AES-256-GCM",
        "timeline": "03:28 beacon start → 03:47 exfil start → 04:09 exfil end → 04:15 staging wiped",
    },
    "BACKUP-01": {
        "name": "Backup Server",
        "logs": "03:52 — shadow copy deletion; 03:53 — backup retention policy changed from 30d to 1d",
        "network": "IMAP sync from MAIL-01; no external connections",
        "files": "Backup manifests altered; VSS snapshots deleted (03:52)",
        "timeline": "03:52 VSS delete → 03:53 retention change → 03:55 anti-forensics sweep",
    },
    "GW-01": {
        "name": "API Gateway",
        "logs": "03:40 — API key rotation triggered; 03:41 — OAuth token bulk-revoked; 03:55 — rate limiter disabled",
        "network": "Exposes /api/v2 to internet; internal routes to DB-02 and MAIL-01",
        "files": "api_config.yaml modified 03:40; .env.bak created 03:41",
        "timeline": "03:40 key rotation → 03:41 token revoke → 03:55 rate-limit off → 04:00 config restored",
    },
}

_NODE_ALIASES: dict[str, str] = {}
for _nid, _nd in _NODE_DATA.items():
    _NODE_ALIASES[_nid.lower()] = _nid
    _NODE_ALIASES[_nd["name"].lower()] = _nid
    for _word in _nd["name"].lower().split():
        if len(_word) > 2:
            _NODE_ALIASES[_word] = _nid
# Frontend uses WKS-03 for the workstation, backend data uses WS-03
_NODE_ALIASES["wks-03"] = "WS-03"
_NODE_ALIASES["workstation alpha"] = "WS-03"


def resolve_node_id(raw: str) -> str:
    """Try to resolve a natural-language node reference to a real node ID."""
    if raw in _NODE_DATA:
        return raw
    lower = raw.lower().strip()
    if lower in _NODE_ALIASES:
        return _NODE_ALIASES[lower]
    for alias, nid in _NODE_ALIASES.items():
        if alias in lower or lower in alias:
            return nid
    return raw


_KNOWN_CONNECTIONS: list[dict[str, str]] = [
    {"source": "WS-03", "target": "MAIL-01", "type": "SSH lateral"},
    {"source": "WS-03", "target": "DB-02", "type": "SSH tunnel"},
    {"source": "DB-02", "target": "EXT-01", "type": "TLS exfiltration"},
    {"source": "MAIL-01", "target": "BACKUP-01", "type": "IMAP sync"},
    {"source": "WS-03", "target": "EXT-01", "type": "C2 beacon"},
    {"source": "FW-01", "target": "EXT-01", "type": "NAT gateway"},
    {"source": "GW-01", "target": "DB-02", "type": "API route"},
    {"source": "GW-01", "target": "MAIL-01", "type": "API route"},
]

# ---------------------------------------------------------------------------
# Tool declarations (for google.genai function calling)
# ---------------------------------------------------------------------------

TOOL_DECLARATIONS: list[dict[str, Any]] = [
    {
        "name": "inspect_logs",
        "description": "Inspect system/service/auth logs on a given node. Returns log entries filtered by optional scope and focus keywords. Node ID can be a formal ID like 'WS-03' or a natural name like 'workstation' or 'mail server'.",
        "parameters": {
            "type": "object",
            "properties": {
                "node_id": {"type": "string", "description": "ID or name of the system node to inspect (e.g. 'WS-03', 'workstation', 'mail server')"},
                "scope": {"type": "string", "description": "Scope: 'auth', 'service', 'system', 'all'", "enum": ["auth", "service", "system", "all"]},
                "focus": {"type": "string", "description": "Optional keyword to focus on (e.g. 'failed login', 'export')"},
            },
            "required": ["node_id"],
        },
    },
    {
        "name": "trace_network",
        "description": "Trace network connections from/to a given node. Identifies lateral movement, exfiltration paths, and connection types. Node ID can be a formal ID or natural name.",
        "parameters": {
            "type": "object",
            "properties": {
                "node_id": {"type": "string", "description": "ID or name of the system node to trace from"},
                "target": {"type": "string", "description": "Optional target node ID or name to trace path to"},
                "depth": {"type": "integer", "description": "Hop depth for path tracing (1-3)", "minimum": 1, "maximum": 3},
            },
            "required": ["node_id"],
        },
    },
    {
        "name": "analyze_file_artifacts",
        "description": "Analyze file artifacts, metadata, and suspicious files on a given node. Can recover deleted files and detect hidden payloads. Node ID can be a formal ID or natural name.",
        "parameters": {
            "type": "object",
            "properties": {
                "node_id": {"type": "string", "description": "ID or name of the system node to analyze"},
                "artifact_hint": {"type": "string", "description": "Optional hint about what to look for (e.g. 'deleted files', 'executables', 'config changes')"},
            },
            "required": ["node_id"],
        },
    },
    {
        "name": "reconstruct_timeline",
        "description": "Reconstruct a timeline of events on a specific node or across the entire case. Correlates timestamps and builds causal chains. If no node specified, returns case-wide timeline.",
        "parameters": {
            "type": "object",
            "properties": {
                "node_id": {"type": "string", "description": "Optional node ID or name for node-specific timeline. Omit for case-wide."},
                "start_time": {"type": "string", "description": "Optional start time filter (e.g. '03:40')"},
                "end_time": {"type": "string", "description": "Optional end time filter (e.g. '04:00')"},
            },
            "required": [],
        },
    },
    {
        "name": "review_known_evidence",
        "description": "Review all evidence and findings discovered so far in this investigation.",
        "parameters": {
            "type": "object",
            "properties": {
                "filter_severity": {"type": "string", "description": "Optional severity filter", "enum": ["low", "medium", "high", "critical"]},
                "filter_node": {"type": "string", "description": "Optional node ID filter"},
            },
            "required": [],
        },
    },
    {
        "name": "correlate_findings",
        "description": "Correlate two entities (nodes, evidence items, or events) to find connections and shared indicators.",
        "parameters": {
            "type": "object",
            "properties": {
                "entity_a": {"type": "string", "description": "First entity (node ID or evidence description)"},
                "entity_b": {"type": "string", "description": "Second entity (node ID or evidence description)"},
            },
            "required": ["entity_a", "entity_b"],
        },
    },
    {
        "name": "summarize_node_state",
        "description": "Get a summary of the current known state of a specific node including threat level, status, and findings. Node ID can be a formal ID or natural name.",
        "parameters": {
            "type": "object",
            "properties": {
                "node_id": {"type": "string", "description": "ID or name of the node to summarize (e.g. 'DB-02', 'database', 'firewall')"},
            },
            "required": ["node_id"],
        },
    },
    {
        "name": "list_accessible_nodes",
        "description": "List all system nodes accessible in the current investigation.",
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "list_current_findings",
        "description": "List all findings and evidence discovered so far.",
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "propose_next_best_action",
        "description": "Based on current evidence and investigation state, propose the most valuable next investigative action.",
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
]

# Map tool name → declaration for quick lookup
TOOL_DECLARATION_MAP: dict[str, dict[str, Any]] = {
    d["name"]: d for d in TOOL_DECLARATIONS
}

# ---------------------------------------------------------------------------
# Tool execution functions
# ---------------------------------------------------------------------------


async def execute_inspect_logs(
    node_id: str,
    scope: str = "all",
    focus: str = "",
    *,
    evidence: list[dict[str, Any]] | None = None,
) -> str:
    node_id = resolve_node_id(node_id)
    node = _NODE_DATA.get(node_id)
    if not node:
        return f"Node {node_id} not found in accessible systems. Available: {', '.join(_NODE_DATA.keys())}"
    logs = node.get("logs", "No log data available.")
    result = f"=== Log inspection: {node['name']} ({node_id}) ===\nScope: {scope}\n\n{logs}"
    if focus:
        result += f"\n\n[Focus filter applied: '{focus}']"
    return result


async def execute_trace_network(
    node_id: str,
    target: str = "",
    depth: int = 2,
    *,
    evidence: list[dict[str, Any]] | None = None,
) -> str:
    node_id = resolve_node_id(node_id)
    if target:
        target = resolve_node_id(target)
    node = _NODE_DATA.get(node_id)
    if not node:
        return f"Node {node_id} not found in accessible systems. Available: {', '.join(_NODE_DATA.keys())}"

    connections = [
        c for c in _KNOWN_CONNECTIONS
        if c["source"] == node_id or c["target"] == node_id
    ]
    if target:
        connections = [
            c for c in connections
            if c["source"] == target or c["target"] == target
        ]

    net_info = node.get("network", "No network data available.")
    conn_lines = "\n".join(
        f"  {c['source']} → {c['target']} ({c['type']})" for c in connections
    )
    return (
        f"=== Network trace: {node['name']} ({node_id}) ===\n"
        f"Depth: {depth}\n\n"
        f"Network info: {net_info}\n\n"
        f"Connections:\n{conn_lines or '  No connections found.'}"
    )


async def execute_analyze_file_artifacts(
    node_id: str,
    artifact_hint: str = "",
    *,
    evidence: list[dict[str, Any]] | None = None,
) -> str:
    node_id = resolve_node_id(node_id)
    node = _NODE_DATA.get(node_id)
    if not node:
        return f"Node {node_id} not found in accessible systems. Available: {', '.join(_NODE_DATA.keys())}"
    files = node.get("files", "No file artifacts found.")
    result = f"=== File artifact analysis: {node['name']} ({node_id}) ===\n\n{files}"
    if artifact_hint:
        result += f"\n\n[Artifact focus: '{artifact_hint}']"
    return result


async def execute_reconstruct_timeline(
    node_id: str = "",
    start_time: str = "",
    end_time: str = "",
    *,
    evidence: list[dict[str, Any]] | None = None,
) -> str:
    if node_id:
        node_id = resolve_node_id(node_id)
        node = _NODE_DATA.get(node_id)
        if not node:
            return f"Node {node_id} not found in accessible systems. Available: {', '.join(_NODE_DATA.keys())}"
        tl = node.get("timeline", "No timeline data.")
        return f"=== Timeline: {node['name']} ({node_id}) ===\n\n{tl}"

    lines = []
    for nid, nd in _NODE_DATA.items():
        tl = nd.get("timeline", "")
        if tl:
            lines.append(f"[{nid}] {nd['name']}: {tl}")
    result = "=== Case-wide timeline ===\n\n" + "\n\n".join(lines)
    if start_time or end_time:
        result += f"\n\n[Time filter: {start_time or '...'} – {end_time or '...'}]"
    return result


async def execute_review_known_evidence(
    filter_severity: str = "",
    filter_node: str = "",
    *,
    evidence: list[dict[str, Any]] | None = None,
) -> str:
    if not evidence:
        return "No evidence has been discovered yet."
    items = evidence
    if filter_severity:
        items = [e for e in items if e.get("severity") == filter_severity]
    if filter_node:
        items = [e for e in items if e.get("node_id") == filter_node]
    if not items:
        return "No evidence matches the given filters."
    lines = []
    for e in items:
        lines.append(
            f"- [{e.get('severity', '?').upper()}] {e.get('summary', 'N/A')} "
            f"(node: {e.get('node_id', '?')}, confidence: {e.get('confidence', '?')})"
        )
    return f"=== Known evidence ({len(items)} items) ===\n\n" + "\n".join(lines)


async def execute_correlate_findings(
    entity_a: str,
    entity_b: str,
    *,
    evidence: list[dict[str, Any]] | None = None,
) -> str:
    node_a = _NODE_DATA.get(entity_a)
    node_b = _NODE_DATA.get(entity_b)

    parts = [f"=== Correlation: {entity_a} ↔ {entity_b} ===\n"]

    direct = [
        c for c in _KNOWN_CONNECTIONS
        if (c["source"] == entity_a and c["target"] == entity_b)
        or (c["source"] == entity_b and c["target"] == entity_a)
    ]
    if direct:
        for c in direct:
            parts.append(f"Direct connection: {c['source']} → {c['target']} ({c['type']})")
    else:
        parts.append("No direct network connection found between these entities.")

    if node_a:
        parts.append(f"\n{entity_a} timeline: {node_a.get('timeline', 'N/A')}")
    if node_b:
        parts.append(f"\n{entity_b} timeline: {node_b.get('timeline', 'N/A')}")

    return "\n".join(parts)


async def execute_summarize_node_state(
    node_id: str,
    *,
    evidence: list[dict[str, Any]] | None = None,
) -> str:
    node_id = resolve_node_id(node_id)
    node = _NODE_DATA.get(node_id)
    if not node:
        return f"Node {node_id} not found. Available: {', '.join(_NODE_DATA.keys())}"
    node_evidence = [e for e in (evidence or []) if e.get("node_id") == node_id]
    return (
        f"=== Node state: {node['name']} ({node_id}) ===\n"
        f"Logs summary: {node.get('logs', 'N/A')[:120]}…\n"
        f"Network: {node.get('network', 'N/A')[:120]}…\n"
        f"Files: {node.get('files', 'N/A')[:120]}…\n"
        f"Evidence items found here: {len(node_evidence)}"
    )


async def execute_list_accessible_nodes(
    *,
    evidence: list[dict[str, Any]] | None = None,
) -> str:
    lines = [f"- {nid}: {nd['name']}" for nid, nd in _NODE_DATA.items()]
    return "=== Accessible nodes ===\n\n" + "\n".join(lines)


async def execute_list_current_findings(
    *,
    evidence: list[dict[str, Any]] | None = None,
) -> str:
    return await execute_review_known_evidence(evidence=evidence)


async def execute_propose_next_best_action(
    *,
    evidence: list[dict[str, Any]] | None = None,
) -> str:
    count = len(evidence or [])
    if count == 0:
        return (
            "No evidence collected yet. Recommend starting with log inspection "
            "on WS-03 (the dev workstation) — the most likely initial compromise point."
        )
    investigated_nodes = {e.get("node_id") for e in (evidence or [])}
    uninvestigated = [nid for nid in _NODE_DATA if nid not in investigated_nodes]
    if uninvestigated:
        node = uninvestigated[0]
        return (
            f"Recommend investigating {node} ({_NODE_DATA[node]['name']}) next — "
            f"it has not been examined yet and may contain critical evidence."
        )
    return (
        "All nodes have been investigated at least once. "
        "Recommend correlating findings across WS-03, DB-02, and EXT-01 "
        "to build the full exfiltration narrative."
    )


# Dispatcher: tool name → execution function
TOOL_EXECUTORS: dict[str, Any] = {
    "inspect_logs": execute_inspect_logs,
    "trace_network": execute_trace_network,
    "analyze_file_artifacts": execute_analyze_file_artifacts,
    "reconstruct_timeline": execute_reconstruct_timeline,
    "review_known_evidence": execute_review_known_evidence,
    "correlate_findings": execute_correlate_findings,
    "summarize_node_state": execute_summarize_node_state,
    "list_accessible_nodes": execute_list_accessible_nodes,
    "list_current_findings": execute_list_current_findings,
    "propose_next_best_action": execute_propose_next_best_action,
}

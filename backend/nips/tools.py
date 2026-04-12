"""NIPS investigation tools — OpenAI tool definitions + Python execution.

Each tool has:
1. A ``declaration`` dict suitable for OpenAI tool definitions
2. An ``execute`` async function that takes scored context and returns raw text
"""

from __future__ import annotations

from typing import Any

from nips.case_bundle import get_case_bundle, resolve_case_node_id

# ---------------------------------------------------------------------------
# Case data (the Midnight Exfiltration) — kept server-side so the model
# can't peek beyond what the agent should know.
# ---------------------------------------------------------------------------

_CASE_BUNDLE = get_case_bundle("midnight_exfil")
_NODE_DATA: dict[str, dict[str, Any]] = {
    node.id: {
        "name": node.label,
        "logs": node.tool_data.get("logs", "No log data available."),
        "network": node.tool_data.get("network", "No network data available."),
        "files": node.tool_data.get("files", "No file data available."),
        "timeline": node.tool_data.get("timeline", "No timeline data available."),
    }
    for node in _CASE_BUNDLE.nodes
}
_NODE_ALIASES: dict[str, str] = dict(_CASE_BUNDLE.aliases)
_DISPLAY_NODE_ID: dict[str, str] = {
    "WKS-03": "WKS-03 / WS-03",
}


def _display_node_id(node_id: str) -> str:
    return _DISPLAY_NODE_ID.get(node_id, node_id)


def resolve_node_id(raw: str) -> str:
    """Try to resolve a natural-language node reference to a real node ID."""
    return resolve_case_node_id(raw)


_KNOWN_CONNECTIONS: list[dict[str, str]] = list(_CASE_BUNDLE.connections)

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
    result = f"=== Log inspection: {node['name']} ({_display_node_id(node_id)}) ===\nScope: {scope}\n\n{logs}"
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
        f"=== Network trace: {node['name']} ({_display_node_id(node_id)}) ===\n"
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
    result = f"=== File artifact analysis: {node['name']} ({_display_node_id(node_id)}) ===\n\n{files}"
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
        return f"=== Timeline: {node['name']} ({_display_node_id(node_id)}) ===\n\n{tl}"

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
        f"=== Node state: {node['name']} ({_display_node_id(node_id)}) ===\n"
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
            "on WKS-03 / WS-03 (the workstation) — the most likely initial compromise point."
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
        "Recommend correlating findings across WKS-03, BACKUP-01, and GW-01 "
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

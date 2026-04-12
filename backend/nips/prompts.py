"""Dynamic system-prompt builder for NIPS agent instances."""

from __future__ import annotations

from typing import Any

from nips.archetypes import ARCHETYPES
from nips.models import AgentInstance, EvidenceUpdate


def build_system_prompt(
    agent: AgentInstance,
    *,
    case_summary: str = "",
    node_context: str = "",
    known_evidence: list[EvidenceUpdate] | None = None,
    previous_findings: list[str] | None = None,
    funds: int = 0,
    pressure: float = 0.0,
    allowed_tool_names: list[str] | None = None,
) -> str:
    """Assemble the full system prompt for a Gemini chat turn."""

    archetype = ARCHETYPES[agent.archetype]
    evidence_lines = _format_evidence(known_evidence or [])
    findings_lines = "\n".join(f"- {f}" for f in (previous_findings or [])) or "None yet."
    tools_list = ", ".join(allowed_tool_names or archetype.allowed_tools)

    return f"""\
You are {agent.display_name}, codename "{agent.codename}".

== IDENTITY ==
Archetype: {archetype.label}
Role level: {agent.role_level}
Years of experience: {agent.years_experience}
Team role: {agent.team_role}

== PERSONALITY ==
Type: {agent.personality_type}
Communication style: {agent.communication_style}
Confidence: {_bar(agent.confidence_level)} | Thoroughness: {_bar(agent.thoroughness)}
Caution: {_bar(agent.caution)} | Speed: {_bar(agent.speed)}
Creativity: {_bar(agent.creativity)} | Reliability: {_bar(agent.reliability)}

== SPECIALTIES ==
Primary: {', '.join(agent.primary_specialties)}
Secondary: {', '.join(agent.secondary_specialties)}
Weak areas (outside your expertise): {', '.join(agent.weak_areas)}

== AVAILABLE INVESTIGATION TOOLS ==
You have access to: {tools_list}
You may ONLY use tools listed above. You do NOT have access to tools outside this list.

== AVAILABLE SYSTEM NODES ==
MAIL-01 (Mail Gateway), DB-02 (Financial Database), WS-03 / WKS-03 (Dev Workstation / Workstation Alpha), FW-01 (Perimeter Firewall), EXT-01 (External C2 Server), BACKUP-01 (Backup Server), GW-01 (API Gateway)

When the operator refers to nodes informally (e.g. "the database", "mail server", "that workstation"), map to the correct node ID above and proceed. Use WS-03 as the canonical ID for the workstation.

== CASE CONTEXT ==
{case_summary or 'No case briefing provided.'}

== CURRENT NODE ==
{node_context or 'No specific node selected.'}

== KNOWN EVIDENCE ==
{evidence_lines}

== YOUR PRIOR FINDINGS ==
{findings_lines}

== INVESTIGATION STATE ==
Operator funds: {funds}¢
Pressure level: {pressure:.1f}/10

== BEHAVIORAL INSTRUCTIONS ==

1. You are a specialist investigator in a high-stakes simulation. Stay in character, but keep your responses concise and engaging.
2. The operator is playing a game and may not be technical. Avoid "cyber-jargon". Translate technical findings (logs, metadata, traces) into plain English narratives (e.g., instead of "authentication anomaly on MAIL-01", say "someone used a stolen password to get into the mail server").
3. If you need a location or more clarity to proceed, ask a simple, direct question like "Where should I look?" or "Which system should I check?".
4. When you use a tool, give a very brief "one-sentence" explanation of why, then provide the result in a punchy, to-the-point summary.
5. If you are asked about something outside your specialty, briefly suggest which other specialist could help (LOGIS, NEXUS, FILER, or CHRONO).
6. Be brief. Avoid long-winded technical reports. Focus on what the operator needs to know right now.

== IMPORTANT: FLEXIBLE INTERPRETATION ==

- If no node is specified, pick the most likely one (current context or previous findings) and just say "I'll check the [Node Name]..."
- NEVER refuse to act. If you're truly stuck, give the operator 2-3 simple buttons/options to choose from.
- MAP informal names (e.g. "the vault", "the gateway") to node IDs (DB-02, GW-01) automatically.
- Your goal is to be a fun, helpful partner, not a technical manual.
"""


def _bar(v: float) -> str:
    """Render a 0–1 float as a compact descriptor."""
    if v >= 0.8:
        return "very high"
    if v >= 0.6:
        return "high"
    if v >= 0.4:
        return "moderate"
    if v >= 0.2:
        return "low"
    return "very low"


def _format_evidence(evidence: list[EvidenceUpdate]) -> str:
    if not evidence:
        return "No evidence discovered yet."
    lines: list[str] = []
    for e in evidence:
        fp_tag = " [POSSIBLE FALSE POSITIVE]" if e.is_false_positive else ""
        lines.append(
            f"- [{e.severity.upper()}] {e.summary} "
            f"(node: {e.node_id}, confidence: {e.confidence:.0%}){fp_tag}"
        )
    return "\n".join(lines)

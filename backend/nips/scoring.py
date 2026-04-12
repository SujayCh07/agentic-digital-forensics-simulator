"""NIPS trait-based performance scoring.

Combines agent qualities with task context to produce evidence-yield
multipliers, quality scores, false-positive probabilities, and latency
modifiers.
"""

from __future__ import annotations

import random
from dataclasses import dataclass
from typing import Any

from nips.models import AgentInstance

# ---------------------------------------------------------------------------
# Primary tool → archetype specialty mapping
# ---------------------------------------------------------------------------

_TOOL_ARCHETYPE_MATCH: dict[str, str] = {
    "inspect_logs": "LOGIS",
    "trace_network": "NEXUS",
    "analyze_file_artifacts": "FILER",
    "reconstruct_timeline": "CHRONO",
    # Shared tools — any archetype
    "review_known_evidence": "*",
    "correlate_findings": "*",
    "summarize_node_state": "*",
    "list_accessible_nodes": "*",
    "list_current_findings": "*",
    "propose_next_best_action": "*",
}


@dataclass
class ScoredOutcome:
    """Result of running a tool through the scoring model."""

    raw_output: str
    evidence_yield: float        # 0–1 how much useful evidence was extracted
    quality: float               # 0–1 detail / accuracy of the findings
    is_false_positive: bool      # whether the finding is misleading
    severity: str                # low / medium / high / critical
    latency_seconds: float       # simulated response time
    tags: list[str]


def _clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, v))


def score_tool_execution(
    agent: AgentInstance,
    tool_name: str,
    raw_output: str,
    *,
    pressure: float = 0.0,
    node_threat_level: float = 0.5,
) -> ScoredOutcome:
    """Score a tool execution based on agent traits and context.

    Returns a ``ScoredOutcome`` with modified yield, quality, FP risk, etc.
    """
    rng = random.Random()

    # --- Specialty match bonus ---
    expected_arch = _TOOL_ARCHETYPE_MATCH.get(tool_name, "*")
    if expected_arch == "*":
        specialty_bonus = 0.1
    elif expected_arch == agent.archetype:
        specialty_bonus = 0.25
    else:
        specialty_bonus = -0.15

    # --- Tool proficiency ---
    proficiency = agent.tools_proficiency.get(tool_name, 0.5)

    # --- Experience factor (0–1 curve) ---
    exp_factor = min(agent.years_experience / 15.0, 1.0)

    # --- Evidence yield ---
    base_yield = 0.5
    yield_score = _clamp(
        base_yield
        + agent.evidence_yield_modifier * 0.2
        + specialty_bonus
        + proficiency * 0.15
        + exp_factor * 0.15
        + agent.thoroughness * 0.1
        - pressure * 0.08
        + rng.gauss(0, 0.05),
    )

    # --- Quality ---
    base_quality = 0.5
    quality_score = _clamp(
        base_quality
        + agent.evidence_quality_modifier * 0.2
        + specialty_bonus * 0.8
        + agent.reliability * 0.15
        + agent.thoroughness * 0.1
        + exp_factor * 0.1
        - pressure * 0.05
        + rng.gauss(0, 0.04),
    )

    # --- False positive ---
    fp_base = agent.false_positive_risk
    fp_probability = _clamp(
        fp_base
        - agent.caution * 0.05
        + (1.0 - agent.reliability) * 0.03
        + pressure * 0.04
        - specialty_bonus * 0.02
        + rng.gauss(0, 0.02),
        0.0, 0.5,
    )
    is_fp = rng.random() < fp_probability

    # --- Latency ---
    base_latency = 2.0
    latency = max(
        0.5,
        base_latency
        * agent.response_latency_modifier
        * (1.0 + (agent.thoroughness - 0.5) * 0.4)
        * (1.0 - (agent.speed - 0.5) * 0.3)
        + rng.gauss(0, 0.3),
    )

    # --- Severity heuristic ---
    if node_threat_level > 0.75:
        severity = "critical"
    elif node_threat_level > 0.5:
        severity = "high"
    elif node_threat_level > 0.25:
        severity = "medium"
    else:
        severity = "low"

    # --- Tags ---
    tags: list[str] = [tool_name, agent.archetype]
    if is_fp:
        tags.append("false_positive")
    if quality_score > 0.8:
        tags.append("high_confidence")
    if yield_score > 0.8:
        tags.append("rich_evidence")

    return ScoredOutcome(
        raw_output=raw_output,
        evidence_yield=round(yield_score, 3),
        quality=round(quality_score, 3),
        is_false_positive=is_fp,
        severity=severity,
        latency_seconds=round(latency, 2),
        tags=tags,
    )

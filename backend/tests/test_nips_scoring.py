"""Tests for NIPS trait-based performance scoring."""

from __future__ import annotations

import pytest

from nips.agent_generator import generate_agent
from nips.scoring import ScoredOutcome, score_tool_execution


def _make_agent(archetype: str = "LOGIS", **overrides):
    agent = generate_agent(archetype, seed=123)  # type: ignore[arg-type]
    for k, v in overrides.items():
        object.__setattr__(agent, k, v)
    return agent


def test_score_returns_scored_outcome():
    agent = _make_agent()
    result = score_tool_execution(agent, "inspect_logs", "some log output")
    assert isinstance(result, ScoredOutcome)
    assert 0.0 <= result.evidence_yield <= 1.0
    assert 0.0 <= result.quality <= 1.0
    assert isinstance(result.is_false_positive, bool)
    assert result.severity in ("low", "medium", "high", "critical")
    assert result.latency_seconds > 0


def test_specialty_match_boosts_yield():
    logis = _make_agent("LOGIS")
    filer = _make_agent("FILER")

    logis_score = score_tool_execution(logis, "inspect_logs", "log data")
    filer_score = score_tool_execution(filer, "inspect_logs", "log data")

    assert logis_score.evidence_yield >= filer_score.evidence_yield - 0.2


def test_shared_tools_work_for_any_archetype():
    for arch in ["LOGIS", "NEXUS", "FILER", "CHRONO"]:
        agent = _make_agent(arch)
        result = score_tool_execution(agent, "list_accessible_nodes", "node list")
        assert result.evidence_yield > 0


def test_pressure_reduces_quality():
    agent = _make_agent()
    low_pressure = score_tool_execution(
        agent, "inspect_logs", "output", pressure=0.0, node_threat_level=0.5,
    )
    high_pressure = score_tool_execution(
        agent, "inspect_logs", "output", pressure=10.0, node_threat_level=0.5,
    )
    assert low_pressure.quality >= high_pressure.quality - 0.3


def test_severity_matches_threat_level():
    agent = _make_agent()
    low_threat = score_tool_execution(agent, "inspect_logs", "out", node_threat_level=0.1)
    high_threat = score_tool_execution(agent, "inspect_logs", "out", node_threat_level=0.9)
    assert low_threat.severity in ("low", "medium")
    assert high_threat.severity in ("high", "critical")


def test_tags_include_archetype():
    agent = _make_agent("NEXUS")
    result = score_tool_execution(agent, "trace_network", "output")
    assert "NEXUS" in result.tags
    assert "trace_network" in result.tags

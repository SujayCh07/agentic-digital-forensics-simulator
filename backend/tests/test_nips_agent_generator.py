"""Tests for NIPS agent generation — uniqueness, role mapping, pricing."""

from __future__ import annotations

import pytest

from nips.agent_generator import generate_agent, generate_marketplace_batch
from nips.models import ROLE_LEVEL_ORDER, AgentInstance, ArchetypeId


def test_generate_agent_returns_valid_instance():
    agent = generate_agent("LOGIS")
    assert isinstance(agent, AgentInstance)
    assert agent.archetype == "LOGIS"
    assert agent.display_name
    assert agent.codename
    assert agent.instance_id


def test_two_agents_same_archetype_are_unique():
    a1 = generate_agent("LOGIS")
    a2 = generate_agent("LOGIS")
    assert a1.instance_id != a2.instance_id
    assert a1.display_name != a2.display_name or a1.codename != a2.codename


def test_seed_produces_deterministic_output():
    a1 = generate_agent("NEXUS", seed=42)
    a2 = generate_agent("NEXUS", seed=42)
    assert a1.display_name == a2.display_name
    assert a1.codename == a2.codename
    assert a1.years_experience == a2.years_experience
    assert a1.role_level == a2.role_level
    assert a1.cost == a2.cost


@pytest.mark.parametrize("archetype", ["LOGIS", "NEXUS", "FILER", "CHRONO"])
def test_all_archetypes_generate_successfully(archetype: str):
    agent = generate_agent(archetype)  # type: ignore[arg-type]
    assert agent.archetype == archetype
    assert len(agent.primary_specialties) >= 2
    assert len(agent.starter_prompts) >= 1


def test_role_level_matches_experience():
    for _ in range(50):
        agent = generate_agent("LOGIS")
        idx = ROLE_LEVEL_ORDER.index(agent.role_level)
        if agent.years_experience == 0:
            assert idx <= 1
        elif agent.years_experience >= 10:
            assert idx >= 4


def test_pricing_increases_with_experience():
    costs_by_exp: dict[int, list[int]] = {}
    for _ in range(100):
        agent = generate_agent("FILER")
        costs_by_exp.setdefault(agent.years_experience, []).append(agent.cost)

    avg_costs: dict[int, float] = {
        exp: sum(costs) / len(costs) for exp, costs in costs_by_exp.items()
    }
    sorted_exps = sorted(avg_costs.keys())
    if len(sorted_exps) >= 3:
        low_exp = sorted_exps[0]
        high_exp = sorted_exps[-1]
        assert avg_costs[high_exp] > avg_costs[low_exp]


def test_marketplace_batch_generates_correct_count():
    batch = generate_marketplace_batch(count=4)
    assert len(batch) == 4
    for agent in batch:
        assert isinstance(agent, AgentInstance)


def test_marketplace_batch_can_have_same_archetype():
    batch = generate_marketplace_batch(count=4, archetype_pool=["LOGIS"])
    assert all(a.archetype == "LOGIS" for a in batch)


def test_traits_within_bounds():
    for _ in range(20):
        agent = generate_agent("CHRONO")
        assert 0.0 <= agent.thoroughness <= 1.0
        assert 0.0 <= agent.speed <= 1.0
        assert 0.0 <= agent.reliability <= 1.0
        assert 0.0 <= agent.creativity <= 1.0
        assert 0.0 <= agent.caution <= 1.0
        assert 0.0 <= agent.confidence_level <= 1.0
        assert 0.0 <= agent.false_positive_risk <= 0.5
        assert agent.cost >= 200

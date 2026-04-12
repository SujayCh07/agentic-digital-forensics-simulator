"""Generate unique NIPS agent instances from archetype templates."""

from __future__ import annotations

import random
import time
import uuid
from typing import Sequence

from nips.archetypes import ARCHETYPES
from nips.models import AgentInstance, ArchetypeId, RoleLevel, ROLE_LEVEL_ORDER

# ---------------------------------------------------------------------------
# Name pools (per archetype flavour)
# ---------------------------------------------------------------------------

_FIRST_NAMES: list[str] = [
    "Kira", "Jax", "Noor", "Cole", "Sable", "Lev", "Zara", "Orin",
    "Mika", "Thane", "Voss", "Petra", "Idris", "Ren", "Calla", "Soren",
    "Yuki", "Dax", "Lira", "Kane", "Ember", "Tova", "Rune", "Arlen",
    "Sage", "Nyra", "Blaise", "Kael", "Rhea", "Quinn", "Cyrus", "Della",
    "Elio", "Maren", "Ash", "Briar", "Niko", "Zev", "Isolde", "Pax",
]

_LAST_NAMES: list[str] = [
    "Vance", "Okafor", "Reyes", "Tanaka", "Brask", "Moreau", "Kwon",
    "Devlin", "Shan", "Voss", "Halden", "Kato", "Saren", "Mercer",
    "Thorne", "Rajiv", "Nyx", "Frost", "Locke", "Arke", "Mori", "Crane",
    "Vex", "Song", "Draven", "Holt", "Pierce", "Wren", "Steele", "Cruz",
]

_CODENAME_PREFIXES: dict[ArchetypeId, list[str]] = {
    "LOGIS": ["Audit", "Syslog", "Trace", "Watch", "Sentinel", "Parse"],
    "NEXUS": ["Packet", "Route", "Link", "Mesh", "Tunnel", "Ping"],
    "FILER": ["Vault", "Shard", "Cache", "Byte", "Archive", "Relic"],
    "CHRONO": ["Epoch", "Tick", "Drift", "Phase", "Pulse", "Sync"],
}

_CODENAME_SUFFIXES: list[str] = [
    "7", "X", "9", "Zero", "Prime", "Null", "One", "Hex", "V", "K",
]

# ---------------------------------------------------------------------------
# Personality / style pools
# ---------------------------------------------------------------------------

_PERSONALITY_TYPES: list[str] = [
    "Analytical", "Methodical", "Intuitive", "Pragmatic",
    "Meticulous", "Aggressive", "Cautious", "Inventive",
    "Systematic", "Adaptive", "Stoic", "Relentless",
]

_COMMUNICATION_STYLES: list[str] = [
    "Concise and factual",
    "Verbose, likes to explain reasoning",
    "Terse, bullet-point style",
    "Narrative, storytelling approach",
    "Clinical and detached",
    "Encouraging and collaborative",
    "Blunt and no-nonsense",
    "Thoughtful, asks clarifying questions",
]

_TEAM_ROLES: dict[str, list[str]] = {
    "junior": ["Field Analyst", "Junior Forensics Tech", "Trainee Operator"],
    "mid": ["Incident Analyst", "Forensics Specialist", "SOC Analyst II"],
    "senior": ["Lead Forensics Analyst", "IR Team Lead", "Principal Analyst"],
}

# ---------------------------------------------------------------------------
# Experience → role-level mapping
# ---------------------------------------------------------------------------

_EXPERIENCE_BANDS: list[tuple[int, int, RoleLevel, str]] = [
    (0, 1, "Trainee Analyst", "entry"),
    (1, 3, "Junior Analyst", "junior"),
    (3, 5, "Analyst I", "mid"),
    (5, 7, "Analyst II", "mid"),
    (7, 10, "Senior Analyst", "senior"),
    (10, 15, "Lead Investigator", "senior"),
    (15, 30, "Principal Investigator", "senior"),
]


def _role_for_experience(years: int) -> tuple[RoleLevel, str]:
    for lo, hi, role, band in _EXPERIENCE_BANDS:
        if lo <= years < hi:
            return role, band
    return "Principal Investigator", "senior"


def _role_level_index(role: RoleLevel) -> int:
    return ROLE_LEVEL_ORDER.index(role)


# ---------------------------------------------------------------------------
# Trait generation helpers
# ---------------------------------------------------------------------------


def _clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, v))


def _gauss(rng: random.Random, mean: float, std: float) -> float:
    return _clamp(rng.gauss(mean, std))


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def generate_agent(
    archetype_id: ArchetypeId,
    *,
    seed: int | None = None,
) -> AgentInstance:
    """Create a unique agent instance from the given archetype."""
    if seed is None:
        seed = random.randint(0, 2**31)
    rng = random.Random(seed)

    archetype = ARCHETYPES[archetype_id]

    first = rng.choice(_FIRST_NAMES)
    last = rng.choice(_LAST_NAMES)
    display_name = f"{first} {last}"

    prefix = rng.choice(_CODENAME_PREFIXES[archetype_id])
    suffix = rng.choice(_CODENAME_SUFFIXES)
    codename = f"{prefix}-{suffix}"

    years = rng.choices(
        population=list(range(0, 20)),
        weights=[3, 5, 6, 7, 8, 8, 7, 6, 5, 4, 3, 3, 2, 2, 1, 1, 1, 1, 1, 1],
        k=1,
    )[0]
    role_level, seniority_band = _role_for_experience(years)

    experience_factor = min(years / 15.0, 1.0)

    personality_type = rng.choice(_PERSONALITY_TYPES)
    communication_style = rng.choice(_COMMUNICATION_STYLES)
    team_role = rng.choice(_TEAM_ROLES[seniority_band] if seniority_band in _TEAM_ROLES else _TEAM_ROLES["mid"])

    thoroughness = _gauss(rng, 0.4 + 0.3 * experience_factor, 0.15)
    speed = _gauss(rng, 0.6 - 0.1 * experience_factor, 0.15)
    creativity = _gauss(rng, 0.45, 0.2)
    caution = _gauss(rng, 0.35 + 0.25 * experience_factor, 0.15)
    reliability = _gauss(rng, 0.4 + 0.35 * experience_factor, 0.12)
    risk_tolerance = _gauss(rng, 0.55 - 0.15 * experience_factor, 0.15)
    confidence_level = _gauss(rng, 0.4 + 0.25 * experience_factor, 0.15)
    curiosity = _gauss(rng, 0.5, 0.2)
    collaboration = _gauss(rng, 0.5, 0.18)
    pressure_resilience = _gauss(rng, 0.35 + 0.3 * experience_factor, 0.15)

    base_yield = archetype.base_performance.get("evidence_yield_modifier", 1.0)
    base_quality = archetype.base_performance.get("evidence_quality_modifier", 1.0)
    base_fp = archetype.base_performance.get("false_positive_risk", 0.1)
    base_latency = archetype.base_performance.get("response_latency_modifier", 1.0)

    evidence_yield_modifier = _clamp(
        base_yield + (experience_factor * 0.3) + (thoroughness - 0.5) * 0.2 + rng.gauss(0, 0.05),
        0.4, 1.8,
    )
    evidence_quality_modifier = _clamp(
        base_quality + (experience_factor * 0.25) + (reliability - 0.5) * 0.2 + rng.gauss(0, 0.05),
        0.4, 1.8,
    )
    false_positive_risk = _clamp(
        base_fp - (experience_factor * 0.04) - (caution - 0.5) * 0.06 + rng.gauss(0, 0.02),
        0.01, 0.35,
    )
    response_latency_modifier = _clamp(
        base_latency - (speed - 0.5) * 0.3 + (thoroughness - 0.5) * 0.2 + rng.gauss(0, 0.05),
        0.5, 2.0,
    )

    all_specialties = list(archetype.core_specialties)
    rng.shuffle(all_specialties)
    n_primary = rng.randint(2, min(4, len(all_specialties)))
    primary_specialties = all_specialties[:n_primary]
    secondary_specialties = all_specialties[n_primary:]

    tools_proficiency: dict[str, float] = {}
    for tool in archetype.allowed_tools:
        tools_proficiency[tool] = _clamp(
            0.4 + experience_factor * 0.4 + rng.gauss(0, 0.1),
            0.2, 1.0,
        )

    weak_areas = list(archetype.weak_areas)
    rng.shuffle(weak_areas)

    preferred_evidence_types = rng.sample(
        ["log_entry", "network_packet", "deleted_file", "registry_key",
         "steg_payload", "process_record", "timeline_event"],
        k=rng.randint(2, 4),
    )

    cost = (
        archetype.base_cost
        + years * 80
        + _role_level_index(role_level) * 40
        + int(rng.gauss(0, 30))
    )
    cost = max(200, cost)

    value_tier = 1 + min(_role_level_index(role_level) // 2, 3)

    prompts = list(archetype.example_prompts)
    rng.shuffle(prompts)
    starter_prompts = prompts[:min(5, len(prompts))]

    spec_str = ", ".join(primary_specialties[:3])
    style_adj = personality_type.lower()
    bio = (
        f"{display_name} is a {style_adj} {role_level.lower()} with "
        f"{years} year{'s' if years != 1 else ''} of experience in {spec_str}. "
        f"Communication style: {communication_style.lower()}."
    )

    one_liner = f"{codename} — {role_level}, {archetype_id} specialist"

    profile_tags: list[str] = [archetype_id, role_level]
    if thoroughness > 0.7:
        profile_tags.append("Thorough")
    if speed > 0.7:
        profile_tags.append("Fast")
    if creativity > 0.7:
        profile_tags.append("Creative")
    if reliability > 0.8:
        profile_tags.append("Reliable")
    if caution > 0.7:
        profile_tags.append("Cautious")
    if false_positive_risk < 0.05:
        profile_tags.append("Precise")

    return AgentInstance(
        instance_id=str(uuid.uuid4()),
        archetype=archetype_id,
        display_name=display_name,
        codename=codename,
        avatar_seed=seed % 10000,
        role_level=role_level,
        years_experience=years,
        seniority_band=seniority_band,
        team_role=team_role,
        value_tier=value_tier,
        personality_type=personality_type,
        communication_style=communication_style,
        risk_tolerance=risk_tolerance,
        confidence_level=confidence_level,
        curiosity=curiosity,
        thoroughness=thoroughness,
        speed=speed,
        creativity=creativity,
        caution=caution,
        collaboration=collaboration,
        reliability=reliability,
        pressure_resilience=pressure_resilience,
        primary_specialties=primary_specialties,
        secondary_specialties=secondary_specialties,
        weak_areas=weak_areas,
        tools_proficiency=tools_proficiency,
        preferred_evidence_types=preferred_evidence_types,
        preferred_node_types=rng.sample(["server", "workstation", "router", "database"], k=2),
        evidence_yield_modifier=round(evidence_yield_modifier, 3),
        evidence_quality_modifier=round(evidence_quality_modifier, 3),
        false_positive_risk=round(false_positive_risk, 4),
        scope_breadth=_gauss(rng, 0.5 + experience_factor * 0.15, 0.12),
        response_latency_modifier=round(response_latency_modifier, 3),
        stamina=_gauss(rng, 0.5 + experience_factor * 0.2, 0.12),
        cost=cost,
        upkeep=max(0, cost // 10),
        bio=bio,
        one_liner=one_liner,
        starter_prompts=starter_prompts,
        profile_tags=profile_tags,
        created_at=time.time(),
        seed=seed,
    )


def generate_marketplace_batch(
    count: int = 4,
    archetype_pool: Sequence[ArchetypeId] | None = None,
) -> list[AgentInstance]:
    """Generate *count* unique agent offers for the marketplace."""
    pool: Sequence[ArchetypeId] = archetype_pool or list(ARCHETYPES.keys())
    agents: list[AgentInstance] = []
    for _ in range(count):
        arch = random.choice(list(pool))
        agents.append(generate_agent(arch))
    return agents

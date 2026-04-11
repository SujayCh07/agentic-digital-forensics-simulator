"""Pydantic models for the NIPS agent system."""

from __future__ import annotations

import time
from typing import Any, Literal

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Enums / literals
# ---------------------------------------------------------------------------

ArchetypeId = Literal["LOGIS", "NEXUS", "FILER", "CHRONO"]

RoleLevel = Literal[
    "Trainee Analyst",
    "Junior Analyst",
    "Analyst I",
    "Analyst II",
    "Senior Analyst",
    "Lead Investigator",
    "Principal Investigator",
]

ROLE_LEVEL_ORDER: list[RoleLevel] = [
    "Trainee Analyst",
    "Junior Analyst",
    "Analyst I",
    "Analyst II",
    "Senior Analyst",
    "Lead Investigator",
    "Principal Investigator",
]

# ---------------------------------------------------------------------------
# Archetype (static template, not an instance)
# ---------------------------------------------------------------------------


class AgentArchetype(BaseModel):
    id: ArchetypeId
    label: str
    description: str
    core_specialties: list[str]
    allowed_tools: list[str]
    personality_defaults: dict[str, str]
    strong_areas: list[str]
    weak_areas: list[str]
    example_prompts: list[str]
    base_cost: int
    base_performance: dict[str, float]


# ---------------------------------------------------------------------------
# Agent instance (unique, generated)
# ---------------------------------------------------------------------------


class AgentInstance(BaseModel):
    instance_id: str
    archetype: ArchetypeId
    display_name: str
    codename: str
    avatar_seed: int = 0

    role_level: RoleLevel = "Analyst I"
    years_experience: int = 2
    seniority_band: str = "mid"
    team_role: str = "Field Analyst"
    value_tier: int = 1

    personality_type: str = "Analytical"
    communication_style: str = "Concise and factual"
    risk_tolerance: float = 0.5
    confidence_level: float = 0.5
    curiosity: float = 0.5
    thoroughness: float = 0.5
    speed: float = 0.5
    creativity: float = 0.5
    caution: float = 0.5
    collaboration: float = 0.5
    reliability: float = 0.5
    pressure_resilience: float = 0.5

    primary_specialties: list[str] = Field(default_factory=list)
    secondary_specialties: list[str] = Field(default_factory=list)
    weak_areas: list[str] = Field(default_factory=list)
    tools_proficiency: dict[str, float] = Field(default_factory=dict)
    preferred_evidence_types: list[str] = Field(default_factory=list)
    preferred_node_types: list[str] = Field(default_factory=list)

    evidence_yield_modifier: float = 1.0
    evidence_quality_modifier: float = 1.0
    false_positive_risk: float = 0.1
    scope_breadth: float = 0.5
    response_latency_modifier: float = 1.0
    stamina: float = 0.7

    cost: int = 500
    upkeep: int = 0

    bio: str = ""
    one_liner: str = ""
    starter_prompts: list[str] = Field(default_factory=list)
    profile_tags: list[str] = Field(default_factory=list)

    created_at: float = Field(default_factory=time.time)
    seed: int = 0


# ---------------------------------------------------------------------------
# Marketplace
# ---------------------------------------------------------------------------


class MarketplaceOffer(BaseModel):
    offer_id: str
    agent: AgentInstance
    expires_at: float


# ---------------------------------------------------------------------------
# Chat / session
# ---------------------------------------------------------------------------


class ChatMessage(BaseModel):
    id: str
    role: Literal["user", "assistant", "system", "tool"]
    content: str
    created_at: float = Field(default_factory=time.time)
    tool_name: str | None = None
    tool_args: dict[str, Any] | None = None
    tool_result: str | None = None


class AgentChatSession(BaseModel):
    agent_instance_id: str
    messages: list[ChatMessage] = Field(default_factory=list)
    interaction_id: str = ""


# ---------------------------------------------------------------------------
# Tool results / evidence
# ---------------------------------------------------------------------------


class ToolResult(BaseModel):
    tool_name: str
    args: dict[str, Any] = Field(default_factory=dict)
    raw_output: str = ""
    scored_output: str = ""
    evidence_yield: float = 0.0
    quality: float = 0.0
    is_false_positive: bool = False
    severity: Literal["low", "medium", "high", "critical"] = "low"
    tags: list[str] = Field(default_factory=list)


class EvidenceUpdate(BaseModel):
    node_id: str
    summary: str
    details: str
    severity: Literal["low", "medium", "high", "critical"] = "low"
    evidence_type: str = "log_entry"
    confidence: float = 0.5
    tags: list[str] = Field(default_factory=list)
    agent_instance_id: str = ""
    agent_display_name: str = ""
    is_false_positive: bool = False


# ---------------------------------------------------------------------------
# Session state (per Socket.IO connection)
# ---------------------------------------------------------------------------


class NipsSession(BaseModel):
    sid: str
    case_id: str = "midnight_exfil"
    funds: int = 1500
    deployed_agents: list[AgentInstance] = Field(default_factory=list)
    marketplace_offers: list[MarketplaceOffer] = Field(default_factory=list)
    marketplace_next_refresh: float = 0.0
    chat_sessions: dict[str, AgentChatSession] = Field(default_factory=dict)
    discovered_evidence: list[EvidenceUpdate] = Field(default_factory=list)
    pressure: float = 0.0

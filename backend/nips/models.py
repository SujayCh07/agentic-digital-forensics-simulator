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
    tool_call_id: str | None = None


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
    agent_archetype: ArchetypeId | None = None
    finding_id: str | None = None
    evidence_key: str | None = None
    task_type: str | None = None


IssueStatus = Literal["locked", "available", "resolved", "failed_attempt"]
IssueFailureReason = Literal[
    "insufficient_evidence",
    "wrong_agent",
    "timeline_conflict",
    "contradicted_by_findings",
]
MitigationPlanOption = Literal[
    "reset_credentials",
    "patch_vulnerability",
    "isolate_system",
    "restore_backups",
    "remove_persistence",
    "block_external_communication",
]
AttackType = Literal["data_exfil", "credential_abuse", "malware", "intrusion"]


class SyncedFinding(BaseModel):
    finding_id: str
    evidence_key: str
    node_id: str
    task_type: str | None = None
    summary: str
    details: str = ""
    severity: Literal["low", "medium", "high", "critical"] = "low"
    evidence_type: str = "log_entry"
    confidence: float = 0.5
    tags: list[str] = Field(default_factory=list)
    agent_id: str = ""
    agent_name: str = ""


class CaseNode(BaseModel):
    id: str
    label: str
    sector_id: str
    node_type: str
    threat_level: float = 0.0
    tags: list[str] = Field(default_factory=list)
    aliases: list[str] = Field(default_factory=list)
    tool_data: dict[str, str] = Field(default_factory=dict)


class IssueDefinition(BaseModel):
    id: str
    building_id: str
    sector_id: str
    type: str
    title: str
    description: str
    required_evidence: list[str] = Field(default_factory=list)
    optional_evidence: list[str] = Field(default_factory=list)
    required_agent: ArchetypeId
    unlocks_issue_ids: list[str] = Field(default_factory=list)
    spread_reduction: float = 0.0
    confidence_delta: float = 0.0
    reveals_evidence_keys: list[str] = Field(default_factory=list)
    required_tags: list[str] = Field(default_factory=list)
    contradictory_tags: list[str] = Field(default_factory=list)


class IssueState(BaseModel):
    issue_id: str
    status: IssueStatus = "locked"
    available: bool = False
    attempts: int = 0
    missing_evidence: list[str] = Field(default_factory=list)
    last_failure_reason: IssueFailureReason | None = None
    feedback_message: str | None = None
    unlocked_at: float | None = None
    resolved_at: float | None = None
    resolved_by: ArchetypeId | None = None


class ThreatState(BaseModel):
    spread_level: float = 0.0
    case_confidence: float = 0.0
    node_threats: dict[str, float] = Field(default_factory=dict)
    stabilized_node_ids: list[str] = Field(default_factory=list)


class FinalTruth(BaseModel):
    origin_node_id: str
    attack_path: list[str]
    attack_type: AttackType
    required_mitigations: list[MitigationPlanOption]


class CaseBundle(BaseModel):
    case_id: str
    title: str
    summary: str
    nodes: list[CaseNode]
    connections: list[dict[str, str]] = Field(default_factory=list)
    aliases: dict[str, str] = Field(default_factory=dict)
    issues: list[IssueDefinition] = Field(default_factory=list)
    final_truth: FinalTruth


class IssueResolutionRequest(BaseModel):
    issue_id: str
    agent_archetype: ArchetypeId


class IssueResolutionResult(BaseModel):
    issue_id: str
    building_id: str
    sector_id: str
    success: bool
    status: IssueStatus
    message: str
    reason: IssueFailureReason | None = None
    unlocked_issue_ids: list[str] = Field(default_factory=list)
    revealed_evidence_keys: list[str] = Field(default_factory=list)
    threat_delta: float = 0.0
    case_confidence_delta: float = 0.0
    final_phase_ready: bool = False


class FinalReportSubmission(BaseModel):
    origin_node_id: str
    attack_path: list[str] = Field(default_factory=list)
    attack_type: AttackType
    mitigation_plan: list[MitigationPlanOption] = Field(default_factory=list)


class FinalEvaluation(BaseModel):
    origin_correct: bool
    path_accuracy: float
    attack_type_correct: bool
    fix_correct: bool
    score: float
    passed: bool
    mitigation_accuracy: float


class FinalFeedback(BaseModel):
    incorrect_assumptions: list[str] = Field(default_factory=list)
    misleading_evidence: list[str] = Field(default_factory=list)
    missing_connections: list[str] = Field(default_factory=list)
    suggested_recheck_targets: list[str] = Field(default_factory=list)


class FinalEvaluationEnvelope(BaseModel):
    evaluation: FinalEvaluation
    feedback: FinalFeedback


class CaseState(BaseModel):
    case_id: str
    funds: int = 0
    issues: list[dict[str, Any]] = Field(default_factory=list)
    resolved_issue_count: int = 0
    final_phase_ready: bool = False
    threat_state: ThreatState = Field(default_factory=ThreatState)
    synced_finding_ids: list[str] = Field(default_factory=list)
    synced_evidence_keys: list[str] = Field(default_factory=list)
    latest_feedback: FinalFeedback | None = None


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
    synced_findings: list[SyncedFinding] = Field(default_factory=list)
    issue_states: dict[str, IssueState] = Field(default_factory=dict)
    threat_state: ThreatState = Field(default_factory=ThreatState)
    case_confidence: float = 0.0
    final_phase_ready: bool = False
    final_reports: list[FinalReportSubmission] = Field(default_factory=list)
    evaluation_history: list[FinalEvaluationEnvelope] = Field(default_factory=list)

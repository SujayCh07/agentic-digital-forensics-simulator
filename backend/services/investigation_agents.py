from __future__ import annotations

import json
import logging
from functools import lru_cache
from pathlib import Path
from typing import Any

import aiohttp
from pydantic import BaseModel, Field, ValidationError

from config import (
    GEMINI_API_KEY,
    INVESTIGATION_AGENT_MODEL,
    INVESTIGATION_AGENT_THINKING_LEVEL,
)
from models.schemas import (
    InvestigationAgentChatRequest,
    InvestigationAgentChatResponse,
    InvestigationTaskCompletionRequest,
    InvestigationTaskCompletionResponse,
    InvestigationTaskDispatch,
    InvestigationTaskType,
)

logger = logging.getLogger(__name__)

INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions"
PROFILE_DIR = Path(__file__).resolve().parent.parent / "agents" / "profiles"

TASK_LABELS: dict[InvestigationTaskType, str] = {
    "analyze_logs": "Analyze Logs",
    "detect_anomalies": "Detect Anomalies",
    "trace_connections": "Trace Connections",
    "identify_lateral_movement": "Identify Lateral Movement",
    "recover_files": "Recover Files",
    "inspect_artifacts": "Inspect Artifacts",
    "reconstruct_timeline": "Reconstruct Timeline",
    "correlate_events": "Correlate Events",
}

TASK_DESCRIPTIONS: dict[InvestigationTaskType, str] = {
    "analyze_logs": "Review system and application logs for concrete evidence.",
    "detect_anomalies": "Hunt for suspicious deviations in behavior or telemetry.",
    "trace_connections": "Follow suspicious network paths, peers, and egress patterns.",
    "identify_lateral_movement": "Determine whether attacker movement is spreading across hosts.",
    "recover_files": "Recover deleted or staged files that may contain evidence.",
    "inspect_artifacts": "Inspect suspicious binaries, installers, or forensic artifacts.",
    "reconstruct_timeline": "Rebuild the chronology of the intrusion on the selected system.",
    "correlate_events": "Correlate findings across evidence sources into a coherent sequence.",
}


class InvestigationAgentProfile(BaseModel):
    id: str
    name: str
    title: str
    specialty: str
    years_experience: int = Field(ge=1, le=50)
    background: str
    personality: str
    communication_style: str
    helpfulness_style: str
    expertise_areas: list[str] = Field(default_factory=list)
    out_of_scope: list[str] = Field(default_factory=list)
    operating_principles: list[str] = Field(default_factory=list)
    starter_prompts: list[str] = Field(default_factory=list)
    capabilities: list[InvestigationTaskType] = Field(default_factory=list)
    system_prompt: str


@lru_cache(maxsize=16)
def load_agent_profile(agent_id: str) -> InvestigationAgentProfile:
    path = PROFILE_DIR / f"{agent_id}.json"
    if not path.exists():
        raise ValueError(f"Unknown investigation agent: {agent_id}")
    try:
        return InvestigationAgentProfile.model_validate_json(path.read_text())
    except ValidationError as exc:
        raise RuntimeError(f"Invalid agent profile for {agent_id}: {exc}") from exc


def _ensure_gemini_config() -> None:
    if not GEMINI_API_KEY:
        raise RuntimeError(
            "GEMINI_API_KEY (or GOOGLE_API_KEY) is missing in backend/.env."
        )
    if "gemini" not in INVESTIGATION_AGENT_MODEL.lower():
        raise RuntimeError(
            "INVESTIGATION_AGENT_MODEL must be a Gemini model identifier."
        )


def _format_findings_for_prompt(findings: list[Any]) -> str:
    if not findings:
        return "No completed findings yet."
    lines = []
    for finding in findings[-5:]:
        lines.append(
            (
                f"- {finding.node_id}: {finding.summary} "
                f"(severity={finding.severity}, confidence={finding.confidence:.0%}, "
                f"evidence={finding.evidence_type})"
            )
        )
    return "\n".join(lines)


def _format_recent_events_for_prompt(events: list[Any]) -> str:
    if not events:
        return "No recent evidence feed events."
    lines = []
    for event in events[-6:]:
        lines.append(f"- Round {event.round} · {event.agent_name}: {event.message}")
    return "\n".join(lines)


def _format_selected_node(node: Any | None) -> str:
    if node is None:
        return "No system is currently selected."
    known_findings = _format_findings_for_prompt(node.known_findings)
    return (
        f"Selected system: {node.name} ({node.type})\n"
        f"Threat level: {node.threat_level}\n"
        f"Known findings on this node:\n{known_findings}"
    )


def _build_chat_system_instruction(
    profile: InvestigationAgentProfile, request: InvestigationAgentChatRequest
) -> str:
    capabilities = "\n".join(
        f"- {TASK_LABELS[capability]} (`{capability}`): {TASK_DESCRIPTIONS[capability]}"
        for capability in profile.capabilities
    )
    expertise = "\n".join(f"- {item}" for item in profile.expertise_areas)
    out_of_scope = "\n".join(f"- {item}" for item in profile.out_of_scope)
    operating_principles = "\n".join(
        f"- {item}" for item in profile.operating_principles
    )

    return (
        f"You are {profile.name}, {profile.title}, embedded in the NIPS investigation console.\n"
        f"Specialty: {profile.specialty}\n"
        f"Professional experience: {profile.years_experience} years.\n"
        f"Background: {profile.background}\n"
        f"Personality: {profile.personality}\n"
        f"Communication style: {profile.communication_style}\n"
        f"Helpfulness profile: {profile.helpfulness_style}\n\n"
        f"Expertise areas:\n{expertise}\n\n"
        f"Out of scope:\n{out_of_scope}\n\n"
        f"Operating principles:\n{operating_principles}\n\n"
        f"Private instructions:\n{profile.system_prompt}\n\n"
        "Behavior rules:\n"
        "- Stay in character as a real incident-response specialist.\n"
        "- If the operator asks for hands-on work that matches your specialty, use the `dispatch_investigation_task` tool instead of only describing what you would do.\n"
        "- Only use the tool if the request is within your expertise and a system is selected.\n"
        "- If the request is advisory or conversational, answer normally without using the tool.\n"
        "- If the request is outside your expertise, refuse politely, explain why, and redirect to the proper specialist.\n"
        "- Never claim a task has already completed unless the tool result confirms it.\n\n"
        f"Current objective: {request.current_objective or 'No objective supplied.'}\n"
        f"Agent status: {request.agent_status}\n"
        f"{_format_selected_node(request.selected_node)}\n\n"
        f"Recent completed findings:\n{_format_findings_for_prompt(request.completed_findings)}\n\n"
        f"Recent evidence feed events:\n{_format_recent_events_for_prompt(request.recent_events)}\n\n"
        f"Tool-capable actions you are allowed to dispatch:\n{capabilities}"
    )


def _build_task_completion_instruction(
    profile: InvestigationAgentProfile, request: InvestigationTaskCompletionRequest
) -> str:
    return (
        f"You are {profile.name}, {profile.title}, reporting the outcome of a completed "
        f"{TASK_LABELS[request.task_type]} task.\n"
        f"Specialty: {profile.specialty}\n"
        f"Professional experience: {profile.years_experience} years.\n"
        f"Background: {profile.background}\n"
        f"Communication style: {profile.communication_style}\n"
        f"Helpfulness profile: {profile.helpfulness_style}\n"
        f"Private instructions: {profile.system_prompt}\n\n"
        "Generate realistic incident-response findings grounded in the selected system and the active case context.\n"
        "Do not mention being an AI, a language model, or a simulator.\n"
        "Keep the summary concrete, operational, and evidence-driven.\n"
        "Do not answer with prose or markdown.\n"
        "Use the `submit_investigation_finding` tool exactly once with valid arguments."
    )


def _build_task_tool(profile: InvestigationAgentProfile) -> dict[str, Any]:
    return {
        "type": "function",
        "name": "dispatch_investigation_task",
        "description": (
            "Dispatch a hands-on investigation task when the operator clearly wants "
            "this specialist to act on the currently selected system."
        ),
        "parameters": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "task_type": {
                    "type": "string",
                    "enum": profile.capabilities,
                    "description": "The best matching task within this specialist's capabilities.",
                },
                "objective": {
                    "type": "string",
                    "description": "A short operator-facing statement of what you will investigate.",
                },
                "rationale": {
                    "type": "string",
                    "description": "Why this task matches the user's request and this specialist's expertise.",
                },
                "confidence": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 1,
                    "description": "How confident you are that dispatching this task is appropriate.",
                },
            },
            "required": ["task_type", "objective", "rationale", "confidence"],
        },
    }


def _build_finding_tool(profile: InvestigationAgentProfile) -> dict[str, Any]:
    return {
        "type": "function",
        "name": "submit_investigation_finding",
        "description": (
            "Submit the concrete evidence finding for the completed investigation task. "
            "Use this to report the exact finding that should be inserted into the evidence feed."
        ),
        "parameters": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "summary": {
                    "type": "string",
                    "description": (
                        "Short operator-facing evidence summary written in the agent's voice."
                    ),
                },
                "confidence": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 1,
                    "description": "Confidence in the finding.",
                },
                "severity": {
                    "type": "string",
                    "enum": ["low", "medium", "high", "critical"],
                    "description": "Severity of the finding.",
                },
                "evidence_type": {
                    "type": "string",
                    "enum": ["log", "network", "artifact", "timeline"],
                    "description": (
                        "Evidence category of the finding. Match the task's natural evidence type."
                    ),
                },
            },
            "required": ["summary", "confidence", "severity", "evidence_type"],
        },
    }


def _build_generation_config(
    *, max_output_tokens: int, temperature: float
) -> dict[str, Any]:
    return {
        "temperature": temperature,
        "max_output_tokens": max_output_tokens,
        "thinking_level": INVESTIGATION_AGENT_THINKING_LEVEL,
        "thinking_summaries": "none",
    }


async def _call_gemini_interaction(payload: dict[str, Any]) -> dict[str, Any]:
    _ensure_gemini_config()
    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
    }
    timeout = aiohttp.ClientTimeout(total=45)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        async with session.post(
            INTERACTIONS_URL,
            headers=headers,
            json=payload,
        ) as response:
            raw_text = await response.text()
            if response.status >= 400:
                raise RuntimeError(_format_gemini_error(response.status, raw_text))
            return json.loads(raw_text)


def _format_gemini_error(status_code: int, raw_text: str) -> str:
    try:
        payload = json.loads(raw_text)
    except json.JSONDecodeError:
        payload = {}
    message = payload.get("error", {}).get("message") if isinstance(payload, dict) else None
    if message:
        return f"Gemini API error ({status_code}): {message}"
    return f"Gemini API error ({status_code})."


def _is_invalid_model_json_error(message: str) -> bool:
    lowered = message.lower()
    return (
        "model generated invalid json syntax" in lowered
        or "output could not be parsed" in lowered
    )


def _extract_text_output(interaction: dict[str, Any]) -> str:
    outputs = interaction.get("outputs", [])
    texts = [
        output.get("text", "").strip()
        for output in outputs
        if output.get("type") == "text" and output.get("text")
    ]
    return "\n\n".join(texts).strip()


def _normalize_json_text(raw_text: str) -> str:
    text = raw_text.strip()
    if text.startswith("```json"):
        text = text.removeprefix("```json").strip()
    if text.startswith("```"):
        text = text.removeprefix("```").strip()
    if text.endswith("```"):
        text = text.removesuffix("```").strip()
    return text


def _extract_function_call(interaction: dict[str, Any]) -> dict[str, Any] | None:
    outputs = interaction.get("outputs", [])
    for output in outputs:
        if output.get("type") == "function_call":
            return output
    return None


def _validate_dispatch_request(
    request: InvestigationAgentChatRequest,
    profile: InvestigationAgentProfile,
    function_call: dict[str, Any],
) -> tuple[InvestigationTaskDispatch | None, dict[str, Any]]:
    arguments = function_call.get("arguments", {})
    dispatch = InvestigationTaskDispatch.model_validate(arguments)

    if dispatch.task_type not in profile.capabilities:
        return None, {
            "accepted": False,
            "reason": (
                f"{profile.name} cannot dispatch `{dispatch.task_type}` because it is "
                "outside this agent's specialty."
            ),
        }

    if request.agent_status != "idle":
        return None, {
            "accepted": False,
            "reason": (
                f"{profile.name} is currently {request.agent_status.replace('_', ' ')} "
                "and cannot take on a new task yet."
            ),
        }

    if request.selected_node is None:
        return None, {
            "accepted": False,
            "reason": (
                "No system is selected. Ask the operator to click a target system before "
                "dispatching work."
            ),
        }

    return dispatch, {
        "accepted": True,
        "task_type": dispatch.task_type,
        "objective": dispatch.objective,
        "rationale": dispatch.rationale,
        "confidence": dispatch.confidence,
        "selected_node": {
            "id": request.selected_node.id,
            "name": request.selected_node.name,
            "type": request.selected_node.type,
            "threat_level": request.selected_node.threat_level,
        },
    }


async def chat_with_investigation_agent(
    request: InvestigationAgentChatRequest,
) -> InvestigationAgentChatResponse:
    profile = load_agent_profile(request.agent_id)
    base_payload: dict[str, Any] = {
        "model": INVESTIGATION_AGENT_MODEL,
        "system_instruction": _build_chat_system_instruction(profile, request),
        "tools": [_build_task_tool(profile)],
        "generation_config": _build_generation_config(
            max_output_tokens=700,
            temperature=0.45,
        ),
        "store": True,
    }

    first_payload = {**base_payload, "input": request.message}
    if request.previous_interaction_id:
        first_payload["previous_interaction_id"] = request.previous_interaction_id

    first_interaction = await _call_gemini_interaction(first_payload)
    function_call = _extract_function_call(first_interaction)

    if function_call is None:
        reply = _extract_text_output(first_interaction)
        if not reply:
            reply = (
                f"{profile.name}: I do not have enough signal to answer that cleanly yet."
            )
        return InvestigationAgentChatResponse(
            reply=reply,
            interaction_id=first_interaction.get("id"),
        )

    try:
        dispatched_task, tool_result = _validate_dispatch_request(
            request, profile, function_call
        )
    except ValidationError:
        logger.warning(
            "Invalid dispatch arguments from Gemini for agent %s: %s",
            profile.id,
            function_call.get("arguments"),
        )
        reply = _extract_text_output(first_interaction) or (
            f"{profile.name}: I could not safely turn that into an actionable task."
        )
        return InvestigationAgentChatResponse(
            reply=reply,
            interaction_id=first_interaction.get("id"),
        )

    follow_up_payload = {
        **base_payload,
        "previous_interaction_id": first_interaction.get("id"),
        "input": [
            {
                "type": "function_result",
                "name": function_call.get("name"),
                "call_id": function_call.get("id"),
                "is_error": dispatched_task is None,
                "result": tool_result,
            }
        ],
    }
    second_interaction = await _call_gemini_interaction(follow_up_payload)
    reply = _extract_text_output(second_interaction) or _extract_text_output(
        first_interaction
    )
    if not reply:
        reply = f"{profile.name}: Tasking status updated."

    return InvestigationAgentChatResponse(
        reply=reply,
        interaction_id=second_interaction.get("id") or first_interaction.get("id"),
        dispatched_task=dispatched_task,
        refusal_reason=None if dispatched_task else tool_result.get("reason"),
    )


async def complete_investigation_task(
    request: InvestigationTaskCompletionRequest,
) -> InvestigationTaskCompletionResponse:
    profile = load_agent_profile(request.agent_id)
    if request.task_type not in profile.capabilities:
        raise ValueError(
            f"Agent {profile.name} cannot complete `{request.task_type}`."
        )

    prompt = (
        f"Task: {TASK_LABELS[request.task_type]} (`{request.task_type}`)\n"
        f"Task objective: {request.task_objective or 'No additional operator guidance.'}\n"
        f"Case objective: {request.current_objective or 'No case objective supplied.'}\n"
        f"Selected system: {request.selected_node.name} ({request.selected_node.type})\n"
        f"Threat level: {request.selected_node.threat_level}\n"
        f"Known findings on this node:\n"
        f"{_format_findings_for_prompt(request.selected_node.known_findings)}\n\n"
        f"Recent completed findings across the case:\n"
        f"{_format_findings_for_prompt(request.completed_findings)}\n\n"
        f"Recent evidence feed events:\n"
        f"{_format_recent_events_for_prompt(request.recent_events)}\n\n"
        "Generate a realistic completion report for this specialist. "
        "Use the finding tool to submit summary, confidence, severity, and evidence_type."
    )

    def build_payload(
        *,
        completion_prompt: str,
        temperature: float,
        extra_instruction: str = "",
    ) -> dict[str, Any]:
        return {
            "model": INVESTIGATION_AGENT_MODEL,
            "input": completion_prompt,
            "system_instruction": _build_task_completion_instruction(profile, request)
            + (f"\n\n{extra_instruction}" if extra_instruction else ""),
            "tools": [_build_finding_tool(profile)],
            "generation_config": _build_generation_config(
                max_output_tokens=400,
                temperature=temperature,
            ),
            "store": False,
        }

    try:
        interaction = await _call_gemini_interaction(
            build_payload(
                completion_prompt=prompt,
                temperature=0.2,
            )
        )
    except RuntimeError as exc:
        if not _is_invalid_model_json_error(str(exc)):
            raise
        logger.warning(
            "Retrying investigation task completion for %s after Gemini JSON parse failure",
            profile.id,
        )
        interaction = await _call_gemini_interaction(
            build_payload(
                completion_prompt=(
                    f"{prompt}\n\n"
                    "Important: do not emit freeform JSON, markdown, or explanatory text. "
                    "Call `submit_investigation_finding` once with compact string fields "
                    "and a numeric confidence between 0 and 1."
                ),
                temperature=0,
                extra_instruction=(
                    "This retry is only valid if you respond by calling "
                    "`submit_investigation_finding` exactly once."
                ),
            )
        )

    function_call = _extract_function_call(interaction)
    if function_call is not None:
        arguments = function_call.get("arguments", {})
        return InvestigationTaskCompletionResponse.model_validate(arguments)

    response_text = _extract_text_output(interaction)
    if not response_text:
        raise RuntimeError("Gemini returned an empty task completion response.")
    return InvestigationTaskCompletionResponse.model_validate_json(
        _normalize_json_text(response_text)
    )

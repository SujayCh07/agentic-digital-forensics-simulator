"""Tests for NIPS chat system — session init, tools, prompts.

These tests do NOT call Gemini. They verify the mockable boundary and
supporting infrastructure.
"""

from __future__ import annotations

import pytest

from nips.agent_generator import generate_agent
from nips.archetypes import ARCHETYPES
from nips.models import AgentInstance, ChatMessage, EvidenceUpdate
from nips.prompts import build_system_prompt
from nips.session import (
    append_assistant_message,
    append_user_message,
    create_session,
    destroy_session,
    get_or_create_chat,
)
from nips.tools import TOOL_DECLARATION_MAP, TOOL_EXECUTORS


def test_system_prompt_includes_agent_identity():
    agent = generate_agent("LOGIS", seed=7)
    prompt = build_system_prompt(agent, case_summary="Test case")
    assert agent.display_name in prompt
    assert agent.codename in prompt
    assert "LOGIS" in prompt
    assert agent.role_level in prompt
    assert "Test case" in prompt


def test_system_prompt_includes_tools():
    agent = generate_agent("NEXUS", seed=8)
    archetype = ARCHETYPES["NEXUS"]
    prompt = build_system_prompt(
        agent, allowed_tool_names=archetype.allowed_tools,
    )
    assert "trace_network" in prompt
    assert "inspect_logs" not in prompt


def test_system_prompt_includes_evidence():
    agent = generate_agent("FILER", seed=9)
    evidence = [
        EvidenceUpdate(
            node_id="WS-03",
            summary="Mimikatz found",
            details="Mimikatz.exe detected in process list",
            severity="critical",
            confidence=0.95,
        ),
    ]
    prompt = build_system_prompt(agent, known_evidence=evidence)
    assert "Mimikatz" in prompt
    assert "CRITICAL" in prompt


def test_all_archetype_tools_have_executors():
    for arch_id, arch in ARCHETYPES.items():
        for tool_name in arch.allowed_tools:
            assert tool_name in TOOL_EXECUTORS, (
                f"Archetype {arch_id} declares tool {tool_name} "
                f"but no executor exists"
            )


def test_all_archetype_tools_have_declarations():
    for arch_id, arch in ARCHETYPES.items():
        for tool_name in arch.allowed_tools:
            assert tool_name in TOOL_DECLARATION_MAP, (
                f"Archetype {arch_id} declares tool {tool_name} "
                f"but no Gemini declaration exists"
            )


@pytest.mark.asyncio
async def test_tool_executor_inspect_logs():
    result = await TOOL_EXECUTORS["inspect_logs"](
        node_id="WS-03", scope="all", evidence=[],
    )
    assert "WS-03" in result
    assert "Dev Workstation" in result


@pytest.mark.asyncio
async def test_tool_executor_trace_network():
    result = await TOOL_EXECUTORS["trace_network"](
        node_id="DB-02", evidence=[],
    )
    assert "DB-02" in result
    assert "Financial Database" in result


@pytest.mark.asyncio
async def test_tool_executor_analyze_file_artifacts():
    result = await TOOL_EXECUTORS["analyze_file_artifacts"](
        node_id="WS-03", evidence=[],
    )
    assert "mimikatz" in result.lower()


@pytest.mark.asyncio
async def test_tool_executor_reconstruct_timeline():
    result = await TOOL_EXECUTORS["reconstruct_timeline"](evidence=[])
    assert "Case-wide timeline" in result


@pytest.mark.asyncio
async def test_tool_executor_unknown_node():
    result = await TOOL_EXECUTORS["inspect_logs"](
        node_id="UNKNOWN-99", evidence=[],
    )
    assert "not found" in result.lower()


@pytest.mark.asyncio
async def test_tool_executor_list_accessible_nodes():
    result = await TOOL_EXECUTORS["list_accessible_nodes"](evidence=[])
    assert "MAIL-01" in result
    assert "DB-02" in result


@pytest.mark.asyncio
async def test_tool_executor_propose_next_action_empty():
    result = await TOOL_EXECUTORS["propose_next_best_action"](evidence=[])
    assert "WS-03" in result


def test_chat_history_does_not_store_thoughts():
    """Verify that only user/assistant messages are in the stored session."""
    session = create_session("test-thoughts")
    session.funds = 50000
    from nips.session import buy_agent

    offer = session.marketplace_offers[0]
    bought = buy_agent(session, offer.offer_id)
    assert bought is not None

    chat = get_or_create_chat(session, bought.instance_id)
    append_user_message(chat, "Check logs on WS-03")
    append_assistant_message(chat, "I found mimikatz traces.")

    for msg in chat.messages:
        assert msg.role in ("user", "assistant", "tool", "system")
        assert "thought" not in msg.role

    destroy_session("test-thoughts")

"""Tests for NIPS session management — marketplace, purchase, funds."""

from __future__ import annotations

import time

import pytest

from nips.models import AgentInstance, NipsSession
from nips.session import (
    MARKETPLACE_REFRESH_SECONDS,
    add_evidence,
    append_assistant_message,
    append_user_message,
    buy_agent,
    create_session,
    destroy_session,
    get_agent_instance,
    get_or_create_chat,
    get_session,
    maybe_refresh_marketplace,
    refresh_marketplace,
)
from nips.models import EvidenceUpdate


def test_create_session():
    session = create_session("test-sid-1")
    assert session.sid == "test-sid-1"
    assert session.funds == 1500
    assert len(session.marketplace_offers) == 4
    assert len(session.deployed_agents) == 0
    destroy_session("test-sid-1")


def test_get_session():
    create_session("test-sid-2")
    assert get_session("test-sid-2") is not None
    assert get_session("nonexistent") is None
    destroy_session("test-sid-2")


def test_buy_agent_deducts_funds():
    session = create_session("test-sid-buy")
    session.funds = 50000
    offer = session.marketplace_offers[0]
    initial_funds = session.funds
    agent_cost = offer.agent.cost

    result = buy_agent(session, offer.offer_id)
    assert result is not None
    assert session.funds == initial_funds - agent_cost
    assert len(session.deployed_agents) == 1
    assert session.deployed_agents[0].instance_id == result.instance_id
    assert len(session.marketplace_offers) == 3
    destroy_session("test-sid-buy")


def test_buy_agent_insufficient_funds():
    session = create_session("test-sid-broke")
    session.funds = 0
    offer = session.marketplace_offers[0]
    result = buy_agent(session, offer.offer_id)
    assert result is None
    assert len(session.deployed_agents) == 0
    destroy_session("test-sid-broke")


def test_buy_agent_invalid_offer():
    session = create_session("test-sid-invalid")
    result = buy_agent(session, "nonexistent-offer-id")
    assert result is None
    destroy_session("test-sid-invalid")


def test_refresh_marketplace():
    session = create_session("test-sid-refresh")
    old_ids = {o.offer_id for o in session.marketplace_offers}
    refresh_marketplace(session)
    new_ids = {o.offer_id for o in session.marketplace_offers}
    assert len(session.marketplace_offers) == 4
    assert old_ids != new_ids
    destroy_session("test-sid-refresh")


def test_maybe_refresh_respects_timer():
    session = create_session("test-sid-timer")
    session.marketplace_next_refresh = time.time() + 9999
    refreshed = maybe_refresh_marketplace(session)
    assert refreshed is False

    session.marketplace_next_refresh = time.time() - 1
    refreshed = maybe_refresh_marketplace(session)
    assert refreshed is True
    destroy_session("test-sid-timer")


def test_chat_session_management():
    session = create_session("test-sid-chat")
    session.funds = 50000
    offer = session.marketplace_offers[0]
    buy_agent(session, offer.offer_id)
    agent = session.deployed_agents[0]

    chat = get_or_create_chat(session, agent.instance_id)
    assert chat.agent_instance_id == agent.instance_id
    assert len(chat.messages) == 0

    append_user_message(chat, "Check the logs")
    assert len(chat.messages) == 1
    assert chat.messages[0].role == "user"

    append_assistant_message(chat, "Checking now...")
    assert len(chat.messages) == 2
    assert chat.messages[1].role == "assistant"

    same_chat = get_or_create_chat(session, agent.instance_id)
    assert len(same_chat.messages) == 2
    destroy_session("test-sid-chat")


def test_add_evidence():
    session = create_session("test-sid-evidence")
    assert len(session.discovered_evidence) == 0

    ev = EvidenceUpdate(
        node_id="WS-03",
        summary="Mimikatz found",
        details="Full details here",
        severity="critical",
        confidence=0.95,
    )
    add_evidence(session, ev)
    assert len(session.discovered_evidence) == 1
    assert session.discovered_evidence[0].node_id == "WS-03"
    destroy_session("test-sid-evidence")


def test_get_agent_instance():
    session = create_session("test-sid-getinst")
    session.funds = 50000
    offer = session.marketplace_offers[0]
    bought = buy_agent(session, offer.offer_id)
    assert bought is not None

    found = get_agent_instance(session, bought.instance_id)
    assert found is not None
    assert found.instance_id == bought.instance_id

    not_found = get_agent_instance(session, "nonexistent")
    assert not_found is None
    destroy_session("test-sid-getinst")


def test_purchased_agents_persist_across_refresh():
    session = create_session("test-sid-persist")
    session.funds = 50000
    offer = session.marketplace_offers[0]
    bought = buy_agent(session, offer.offer_id)
    assert bought is not None

    refresh_marketplace(session)
    assert len(session.deployed_agents) == 1
    assert session.deployed_agents[0].instance_id == bought.instance_id
    destroy_session("test-sid-persist")

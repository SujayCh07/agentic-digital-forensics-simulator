"""In-memory session manager for NIPS investigations.

Stores per-Socket.IO-sid state: deployed agents, marketplace, funds, chat
histories, and evidence. Marketplace auto-refreshes every 3 minutes.
"""

from __future__ import annotations

import logging
import random
import time
import uuid
from typing import Any

from nips.agent_generator import generate_agent
from nips.models import (
    AgentChatSession,
    AgentInstance,
    ChatMessage,
    EvidenceUpdate,
    MarketplaceOffer,
    NipsSession,
)

logger = logging.getLogger(__name__)

MARKETPLACE_REFRESH_SECONDS = 180  # 3 minutes
INITIAL_FUNDS = 1500
CHAT_TURN_COST = 100
ARCHETYPE_ORDER = ("LOGIS", "NEXUS", "FILER", "CHRONO")

# In-memory store keyed by Socket.IO sid
_sessions: dict[str, NipsSession] = {}

# ---------------------------------------------------------------------------
# Case data (kept here so chat/router can reference it)
# ---------------------------------------------------------------------------

CASE_SUMMARY = (
    "Case: The Midnight Exfiltration\n"
    "At 03:47 this morning, 47 GB of classified source code left the perimeter. "
    "The exfiltration window lasted 22 minutes. Six internal systems and one "
    "external C2 server were active during the breach.\n"
    "Objective: Identify the origin node, trace the full attack path, and "
    "determine the exfiltration method before evidence degrades."
)


# ---------------------------------------------------------------------------
# Session lifecycle
# ---------------------------------------------------------------------------


def _normalize_archetype(archetype: str | None) -> str:
    if not archetype:
        return "LOGIS"
    upper = archetype.upper()
    return upper if upper in ARCHETYPE_ORDER else "LOGIS"


def _generate_starter_agents(starter_archetype: str) -> list[AgentInstance]:
    """Generate only the chosen starter specialist for the session."""
    return [generate_agent(_normalize_archetype(starter_archetype))]


def create_session(
    sid: str,
    case_id: str = "midnight_exfil",
    starter_archetype: str = "LOGIS",
) -> NipsSession:
    """Create a fresh NIPS session with starter agents and marketplace offers."""
    now = time.time()
    starters = _generate_starter_agents(starter_archetype)
    offers = _generate_offers(
        now,
        excluded_archetypes={agent.archetype for agent in starters},
    )

    session = NipsSession(
        sid=sid,
        case_id=case_id,
        funds=INITIAL_FUNDS,
        deployed_agents=starters,
        marketplace_offers=offers,
        marketplace_next_refresh=now + MARKETPLACE_REFRESH_SECONDS,
        chat_sessions={},
        discovered_evidence=[],
        pressure=0.0,
    )
    _sessions[sid] = session
    logger.info("NIPS session created: sid=%s, case=%s, starters=%d", sid, case_id, len(starters))
    return session


def get_session(sid: str) -> NipsSession | None:
    return _sessions.get(sid)


def destroy_session(sid: str) -> None:
    _sessions.pop(sid, None)
    logger.info("NIPS session destroyed: sid=%s", sid)


# ---------------------------------------------------------------------------
# Marketplace
# ---------------------------------------------------------------------------


def _generate_offers(
    now: float,
    excluded_archetypes: set[str] | None = None,
) -> list[MarketplaceOffer]:
    excluded = excluded_archetypes or set()
    available = [arch for arch in ARCHETYPE_ORDER if arch not in excluded]
    random.shuffle(available)
    agents = [generate_agent(arch) for arch in available]
    return [
        MarketplaceOffer(
            offer_id=str(uuid.uuid4()),
            agent=a,
            expires_at=now + MARKETPLACE_REFRESH_SECONDS,
        )
        for a in agents
    ]


def refresh_marketplace(session: NipsSession) -> list[MarketplaceOffer]:
    """Force-refresh marketplace offers. Returns the new offers."""
    now = time.time()
    session.marketplace_offers = _generate_offers(
        now,
        excluded_archetypes={agent.archetype for agent in session.deployed_agents},
    )
    session.marketplace_next_refresh = now + MARKETPLACE_REFRESH_SECONDS
    logger.info("Marketplace refreshed for sid=%s", session.sid)
    return session.marketplace_offers


def maybe_refresh_marketplace(session: NipsSession) -> bool:
    """Refresh if timer has expired. Returns True if refreshed."""
    if time.time() >= session.marketplace_next_refresh:
        refresh_marketplace(session)
        return True
    return False


def buy_agent(session: NipsSession, offer_id: str) -> AgentInstance | None:
    """Purchase an agent from the marketplace.

    Returns the purchased ``AgentInstance`` or ``None`` if the purchase
    failed (offer not found or insufficient funds).
    """
    offer = next(
        (o for o in session.marketplace_offers if o.offer_id == offer_id),
        None,
    )
    if offer is None:
        return None
    if session.funds < offer.agent.cost:
        return None
    if any(agent.archetype == offer.agent.archetype for agent in session.deployed_agents):
        return None
    if len(session.deployed_agents) >= len(ARCHETYPE_ORDER):
        return None

    session.funds -= offer.agent.cost
    agent = offer.agent
    session.deployed_agents.append(agent)
    session.marketplace_offers = [
        o for o in session.marketplace_offers if o.offer_id != offer_id
    ]
    logger.info(
        "Agent purchased: %s (%s) for %d¢, sid=%s",
        agent.display_name,
        agent.archetype,
        agent.cost,
        session.sid,
    )
    return agent


def charge_chat_turn(session: NipsSession, cost: int = CHAT_TURN_COST) -> bool:
    """Deduct the flat consult cost before a chat turn begins."""
    if session.funds < cost:
        return False
    session.funds -= cost
    return True


# ---------------------------------------------------------------------------
# Chat sessions
# ---------------------------------------------------------------------------


def get_or_create_chat(
    session: NipsSession,
    agent_instance_id: str,
) -> AgentChatSession:
    """Get or create a chat session for a deployed agent."""
    if agent_instance_id not in session.chat_sessions:
        session.chat_sessions[agent_instance_id] = AgentChatSession(
            agent_instance_id=agent_instance_id,
            messages=[],
            interaction_id=str(uuid.uuid4()),
        )
    return session.chat_sessions[agent_instance_id]


def append_user_message(chat: AgentChatSession, content: str) -> ChatMessage:
    msg = ChatMessage(
        id=str(uuid.uuid4()),
        role="user",
        content=content,
    )
    chat.messages.append(msg)
    return msg


def append_assistant_message(
    chat: AgentChatSession,
    content: str | None,
    tool_calls: list[dict[str, Any]] | None = None,
) -> ChatMessage:
    msg = ChatMessage(
        id=str(uuid.uuid4()),
        role="assistant",
        content=content,
        tool_calls=tool_calls,
    )
    chat.messages.append(msg)
    chat.interaction_id = str(uuid.uuid4())
    return msg


def append_tool_message(
    chat: AgentChatSession,
    tool_name: str,
    result: str,
    tool_call_id: str | None = None,
) -> ChatMessage:
    msg = ChatMessage(
        id=str(uuid.uuid4()),
        role="tool",
        content=result,
        tool_name=tool_name,
        tool_call_id=tool_call_id,
    )
    chat.messages.append(msg)
    return msg


def add_evidence(session: NipsSession, evidence: EvidenceUpdate) -> None:
    session.discovered_evidence.append(evidence)


def get_agent_instance(
    session: NipsSession,
    instance_id: str,
) -> AgentInstance | None:
    return next(
        (a for a in session.deployed_agents if a.instance_id == instance_id),
        None,
    )

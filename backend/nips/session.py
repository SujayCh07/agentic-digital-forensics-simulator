"""In-memory session manager for NIPS investigations.

Stores per-Socket.IO-sid state: deployed agents, marketplace, funds, chat
histories, and evidence. Marketplace auto-refreshes every 3 minutes.
"""

from __future__ import annotations

import logging
import time
import uuid
from typing import Any

from nips.agent_generator import generate_agent, generate_marketplace_batch
from nips.case_bundle import MIDNIGHT_EXFIL_SUMMARY, get_case_bundle
from nips.models import (
    AgentChatSession,
    AgentInstance,
    ArchetypeId,
    ChatMessage,
    EvidenceUpdate,
    MarketplaceOffer,
    NipsSession,
)
from nips.progression import initial_threat_state, initialize_issue_states, refresh_issue_states

logger = logging.getLogger(__name__)

MARKETPLACE_REFRESH_SECONDS = 180  # 3 minutes
INITIAL_FUNDS = 1500
TUTORIAL_INITIAL_FUNDS = 250

# In-memory store keyed by Socket.IO sid
_sessions: dict[str, NipsSession] = {}

# ---------------------------------------------------------------------------
# Case data (kept here so chat/router can reference it)
# ---------------------------------------------------------------------------

CASE_SUMMARY = (
    MIDNIGHT_EXFIL_SUMMARY
)


# ---------------------------------------------------------------------------
# Session lifecycle
# ---------------------------------------------------------------------------


def _generate_starter_agents() -> list[AgentInstance]:
    """Generate one starter agent per archetype so the player can chat immediately."""
    from nips.models import ArchetypeId
    starters: list[AgentInstance] = []
    for arch in ("LOGIS", "NEXUS", "FILER", "CHRONO"):
        agent = generate_agent(arch)  # type: ignore[arg-type]
        starters.append(agent)
    return starters


_TUTORIAL_OFFER_SPECS: list[tuple[ArchetypeId, int, int]] = [
    ("LOGIS", 450, 1101),
    ("NEXUS", 550, 1102),
    ("CHRONO", 700, 1103),
]
_TUTORIAL_STARTER_SEEDS: dict[ArchetypeId, int] = {
    "LOGIS": 2101,
    "NEXUS": 2102,
    "FILER": 2103,
    "CHRONO": 2104,
}


def _generate_tutorial_starter(starter_archetype: ArchetypeId) -> list[AgentInstance]:
    return [
        generate_agent(
            starter_archetype,
            seed=_TUTORIAL_STARTER_SEEDS[starter_archetype],
        )
    ]


def _generate_tutorial_offers(
    now: float,
    starter_archetype: ArchetypeId,
    deployed_archetypes: set[ArchetypeId] | None = None,
) -> list[MarketplaceOffer]:
    offers: list[MarketplaceOffer] = []
    deployed = deployed_archetypes or {starter_archetype}
    for archetype, cost, seed in _TUTORIAL_OFFER_SPECS:
        if archetype in deployed:
            continue
        agent = generate_agent(archetype, seed=seed)
        agent.cost = cost
        offers.append(
            MarketplaceOffer(
                offer_id=str(uuid.uuid4()),
                agent=agent,
                expires_at=now + MARKETPLACE_REFRESH_SECONDS,
            )
        )
    return offers


def create_session(
    sid: str,
    case_id: str = "midnight_exfil",
    starter_archetype: ArchetypeId | None = None,
) -> NipsSession:
    """Create a fresh NIPS session with starter agents and marketplace offers."""
    now = time.time()
    bundle = get_case_bundle(case_id)

    if bundle.case_id == "guided_tutorial":
        starter = starter_archetype or "FILER"
        starters = _generate_tutorial_starter(starter)
        offers = _generate_tutorial_offers(
            now,
            starter,
            {agent.archetype for agent in starters},
        )
        initial_funds = TUTORIAL_INITIAL_FUNDS
    else:
        offers = _generate_offers(now)
        starters = _generate_starter_agents()
        initial_funds = INITIAL_FUNDS

    session = NipsSession(
        sid=sid,
        case_id=bundle.case_id,
        funds=initial_funds,
        deployed_agents=starters,
        marketplace_offers=offers,
        marketplace_next_refresh=now + MARKETPLACE_REFRESH_SECONDS,
        chat_sessions={},
        discovered_evidence=[],
        pressure=0.0,
        synced_findings=[],
        issue_states=initialize_issue_states(bundle.case_id),
        threat_state=initial_threat_state(bundle.case_id),
        case_confidence=0.0,
        final_phase_ready=False,
        final_reports=[],
        evaluation_history=[],
    )
    refresh_issue_states(session)
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


def _generate_offers(now: float) -> list[MarketplaceOffer]:
    agents = generate_marketplace_batch(count=4)
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
    if session.case_id == "guided_tutorial" and session.deployed_agents:
        session.marketplace_offers = _generate_tutorial_offers(
            now,
            session.deployed_agents[0].archetype,
            {agent.archetype for agent in session.deployed_agents},
        )
    else:
        session.marketplace_offers = _generate_offers(now)
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


def append_assistant_message(chat: AgentChatSession, content: str) -> ChatMessage:
    msg = ChatMessage(
        id=str(uuid.uuid4()),
        role="assistant",
        content=content,
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

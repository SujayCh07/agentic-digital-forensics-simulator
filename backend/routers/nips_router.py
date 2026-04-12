"""Socket.IO event handlers for the NIPS agent system.

All events use the ``nips_`` prefix to avoid collisions with the existing
policy-sim ``start_sim`` / ``chat_with_npc`` handlers.

Events emitted TO the client are named with the same prefix so the frontend
can subscribe cleanly.
"""

from __future__ import annotations

import logging
from typing import Any

from nips.chat import stream_agent_chat
from nips.models import (
    EvidenceUpdate,
    FinalReportSubmission,
    IssueResolutionRequest,
    SyncedFinding,
)
from nips.progression import (
    build_case_state,
    evaluate_final_report,
    resolve_issue,
    sync_finding,
)
from nips.session import (
    CASE_SUMMARY,
    add_evidence,
    append_assistant_message,
    append_tool_message,
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

logger = logging.getLogger(__name__)


async def _emit_case_state(sio: Any, sid: str) -> None:
    session = get_session(sid)
    if not session:
        return
    await sio.emit("nips_case_state", build_case_state(session).model_dump(), to=sid)


def register_nips_events(sio: Any) -> None:
    """Register all NIPS Socket.IO event handlers on *sio*."""

    # ------------------------------------------------------------------
    # Session init
    # ------------------------------------------------------------------

    @sio.on("nips_init_session")
    async def on_init_session(sid: str, data: dict[str, Any] | None = None) -> None:
        data = data or {}
        case_id = data.get("case_id", "midnight_exfil")
        session = create_session(sid, case_id)

        await sio.emit(
            "nips_session_ready",
            {
                "funds": session.funds,
                "agents": [a.model_dump() for a in session.deployed_agents],
                "marketplace": [
                    {
                        "offer_id": o.offer_id,
                        "agent": o.agent.model_dump(),
                        "expires_at": o.expires_at,
                    }
                    for o in session.marketplace_offers
                ],
                "next_refresh": session.marketplace_next_refresh,
            },
            to=sid,
        )
        await _emit_case_state(sio, sid)

    # ------------------------------------------------------------------
    # Chat
    # ------------------------------------------------------------------

    @sio.on("nips_chat")
    async def on_chat(sid: str, data: dict[str, Any]) -> None:
        session = get_session(sid)
        if not session:
            await sio.emit("nips_error", {"message": "No active NIPS session."}, to=sid)
            return

        agent_id = data.get("agent_instance_id", "")
        message = data.get("message", "").strip()
        node_context = data.get("node_context", "")

        if not agent_id or not message:
            await sio.emit("nips_error", {"message": "Missing agent_instance_id or message."}, to=sid)
            return

        agent = get_agent_instance(session, agent_id)
        if not agent:
            await sio.emit("nips_error", {"message": f"Agent {agent_id} not found in roster."}, to=sid)
            return

        chat = get_or_create_chat(session, agent_id)
        append_user_message(chat, message)

        previous_findings = [
            e.summary for e in session.discovered_evidence
            if e.agent_instance_id == agent_id
        ]

        try:
            async for event in stream_agent_chat(
                agent,
                message,
                history=chat.messages,
                case_summary=CASE_SUMMARY,
                node_context=node_context,
                known_evidence=session.discovered_evidence,
                previous_findings=previous_findings,
                funds=session.funds,
                pressure=session.pressure,
            ):
                event_type = event.pop("type", "unknown")

                if event_type == "thought_chunk":
                    await sio.emit("nips_thought_chunk", event, to=sid)

                elif event_type == "tool_call_start":
                    await sio.emit("nips_tool_activity", {"status": "started", **event}, to=sid)

                elif event_type == "tool_call_result":
                    await sio.emit("nips_tool_activity", {"status": "completed", **event}, to=sid)
                    append_tool_message(
                        chat,
                        event.get("tool", ""),
                        event.get("preview", ""),
                        tool_call_id=event.get("tool_call_id")
                    )

                elif event_type == "assistant_chunk":
                    await sio.emit("nips_assistant_chunk", event, to=sid)

                elif event_type == "evidence_update":
                    eu = EvidenceUpdate(**{
                        k: v for k, v in event.items()
                        if k in EvidenceUpdate.model_fields
                    })
                    eu.agent_archetype = agent.archetype
                    add_evidence(session, eu)
                    await sio.emit("nips_evidence_update", event, to=sid)

                elif event_type == "done":
                    full_answer = event.get("full_answer", "")
                    if full_answer:
                        append_assistant_message(chat, full_answer)
                    await sio.emit("nips_chat_done", {
                        "agent_instance_id": agent_id,
                        "interaction_id": event.get("interaction_id", ""),
                        "full_answer": full_answer,
                        "evidence_updates": event.get("evidence_updates", []),
                    }, to=sid)

                elif event_type == "error":
                    await sio.emit("nips_error", event, to=sid)

        except Exception as exc:
            logger.exception("nips_chat handler error: sid=%s agent=%s", sid, agent_id)
            await sio.emit("nips_error", {
                "message": f"Chat failed: {type(exc).__name__}: {str(exc)[:200]}",
            }, to=sid)

    # ------------------------------------------------------------------
    # Marketplace
    # ------------------------------------------------------------------

    @sio.on("nips_buy_agent")
    async def on_buy(sid: str, data: dict[str, Any]) -> None:
        session = get_session(sid)
        if not session:
            await sio.emit("nips_error", {"message": "No active NIPS session."}, to=sid)
            return

        offer_id = data.get("offer_id", "")
        agent = buy_agent(session, offer_id)
        if agent is None:
            await sio.emit("nips_error", {
                "message": "Purchase failed — offer not found or insufficient funds.",
            }, to=sid)
            return

        await sio.emit("nips_agent_purchased", {
            "agent": agent.model_dump(),
            "funds": session.funds,
        }, to=sid)

    @sio.on("nips_refresh_marketplace")
    async def on_refresh(sid: str, data: dict[str, Any] | None = None) -> None:
        session = get_session(sid)
        if not session:
            await sio.emit("nips_error", {"message": "No active NIPS session."}, to=sid)
            return

        offers = refresh_marketplace(session)
        await sio.emit("nips_marketplace_refreshed", {
            "marketplace": [
                {
                    "offer_id": o.offer_id,
                    "agent": o.agent.model_dump(),
                    "expires_at": o.expires_at,
                }
                for o in offers
            ],
            "next_refresh": session.marketplace_next_refresh,
        }, to=sid)

    # ------------------------------------------------------------------
    # Agent queries
    # ------------------------------------------------------------------

    @sio.on("nips_list_agents")
    async def on_list_agents(sid: str, data: dict[str, Any] | None = None) -> None:
        session = get_session(sid)
        if not session:
            await sio.emit("nips_error", {"message": "No active NIPS session."}, to=sid)
            return

        maybe_refresh_marketplace(session)

        await sio.emit("nips_agents_list", {
            "agents": [a.model_dump() for a in session.deployed_agents],
            "funds": session.funds,
        }, to=sid)

    @sio.on("nips_get_agent")
    async def on_get_agent(sid: str, data: dict[str, Any]) -> None:
        session = get_session(sid)
        if not session:
            await sio.emit("nips_error", {"message": "No active NIPS session."}, to=sid)
            return

        instance_id = data.get("instance_id", "")
        agent = get_agent_instance(session, instance_id)
        if not agent:
            await sio.emit("nips_error", {"message": f"Agent {instance_id} not found."}, to=sid)
            return

        await sio.emit("nips_agent_detail", {"agent": agent.model_dump()}, to=sid)

    # ------------------------------------------------------------------
    # Deterministic progression
    # ------------------------------------------------------------------

    @sio.on("nips_sync_finding")
    async def on_sync_finding(sid: str, data: dict[str, Any]) -> None:
        session = get_session(sid)
        if not session:
            await sio.emit("nips_error", {"message": "No active NIPS session."}, to=sid)
            return

        finding = SyncedFinding(**data)
        synced, newly_available = sync_finding(session, finding)

        if synced:
            await sio.emit(
                "nips_threat_updated",
                session.threat_state.model_dump(),
                to=sid,
            )

        case_state = build_case_state(session)
        for issue_id in newly_available:
            payload = next((issue for issue in case_state.issues if issue["id"] == issue_id), None)
            if payload:
                await sio.emit("nips_issue_available", payload, to=sid)

        if session.final_phase_ready:
            await sio.emit(
                "nips_final_phase_ready",
                {"case_id": session.case_id, "ready": True},
                to=sid,
            )

        await sio.emit("nips_case_state", case_state.model_dump(), to=sid)

    @sio.on("nips_resolve_issue")
    async def on_resolve_issue(sid: str, data: dict[str, Any]) -> None:
        session = get_session(sid)
        if not session:
            await sio.emit("nips_error", {"message": "No active NIPS session."}, to=sid)
            return

        request = IssueResolutionRequest(**data)
        result = resolve_issue(session, request)

        event_name = "nips_issue_resolved" if result.success else "nips_issue_failed"
        await sio.emit(event_name, result.model_dump(), to=sid)
        await sio.emit("nips_threat_updated", session.threat_state.model_dump(), to=sid)
        await sio.emit("nips_case_state", build_case_state(session).model_dump(), to=sid)

        if result.final_phase_ready:
            await sio.emit(
                "nips_final_phase_ready",
                {"case_id": session.case_id, "ready": True},
                to=sid,
            )

    @sio.on("nips_submit_final_report")
    async def on_submit_final_report(sid: str, data: dict[str, Any]) -> None:
        session = get_session(sid)
        if not session:
            await sio.emit("nips_error", {"message": "No active NIPS session."}, to=sid)
            return

        submission = FinalReportSubmission(**data)
        envelope = evaluate_final_report(session, submission)
        await sio.emit(
            "nips_final_evaluation",
            {
                "result": "pass" if envelope.evaluation.passed else "fail",
                "evaluation": envelope.evaluation.model_dump(),
                "feedback": envelope.feedback.model_dump(),
            },
            to=sid,
        )
        await sio.emit("nips_case_state", build_case_state(session).model_dump(), to=sid)

    # ------------------------------------------------------------------
    # Cleanup on disconnect
    # ------------------------------------------------------------------

    @sio.on("disconnect")
    async def on_disconnect_nips(sid: str) -> None:
        if get_session(sid):
            destroy_session(sid)

import asyncio
import json
import logging
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal

import socketio
from fastapi import APIRouter, HTTPException

from graph.builder import build_graph
from graph.chat import generate_npc_chat_response
from models.schemas import EconomicReportResponse, PolicyInput
from models.state import SimState
from services.context_store import get_source
from services.economic_report import generate_economic_report

logger = logging.getLogger(__name__)

router = APIRouter()

# Socket.IO server (async mode for FastAPI/uvicorn).
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
_RUNTIME_DIR = Path(__file__).resolve().parent.parent / ".runtime"
_SIMULATION_STORE_PATH = _RUNTIME_DIR / "simulations.json"

SimulationStatus = Literal["pending", "running", "complete", "error"]


@dataclass
class SimulationRecord:
    policy: PolicyInput
    status: SimulationStatus = "pending"
    policy_text: str = ""
    entities: list[dict[str, Any]] = field(default_factory=list)
    final_npcs: list[dict[str, Any]] = field(default_factory=list)
    relationships: list[dict[str, Any]] = field(default_factory=list)
    events: list[dict[str, Any]] = field(default_factory=list)
    current_round: int = 0
    error_message: str | None = None
    economic_report: EconomicReportResponse | None = None
    memory_streams: dict[str, list[dict[str, Any]]] = field(default_factory=dict)


def _serialize_record(record: SimulationRecord) -> dict[str, Any]:
    return {
        "policy": record.policy.model_dump(),
        "status": record.status,
        "policy_text": record.policy_text,
        "entities": record.entities,
        "final_npcs": record.final_npcs,
        "relationships": record.relationships,
        "events": record.events,
        "current_round": record.current_round,
        "error_message": record.error_message,
        "economic_report": (
            record.economic_report.model_dump() if record.economic_report else None
        ),
        "memory_streams": record.memory_streams,
    }


def _load_simulations_from_disk() -> dict[str, SimulationRecord]:
    if not _SIMULATION_STORE_PATH.exists():
        return {}

    try:
        raw = json.loads(_SIMULATION_STORE_PATH.read_text())
    except (OSError, json.JSONDecodeError):
        logger.warning("Could not read persisted simulations from %s", _SIMULATION_STORE_PATH)
        return {}

    if not isinstance(raw, dict):
        return {}

    restored: dict[str, SimulationRecord] = {}
    for simulation_id, payload in raw.items():
        if not isinstance(payload, dict):
            continue

        try:
            economic_report_payload = payload.get("economic_report")
            restored[str(simulation_id)] = SimulationRecord(
                policy=PolicyInput.model_validate(payload.get("policy", {})),
                status=payload.get("status", "pending"),
                policy_text=payload.get("policy_text", ""),
                entities=payload.get("entities", []),
                final_npcs=payload.get("final_npcs", []),
                relationships=payload.get("relationships", []),
                events=payload.get("events", []),
                current_round=int(payload.get("current_round", 0) or 0),
                error_message=payload.get("error_message"),
                economic_report=(
                    EconomicReportResponse.model_validate(economic_report_payload)
                    if economic_report_payload
                    else None
                ),
                memory_streams=payload.get("memory_streams", {}),
            )
        except Exception:
            logger.exception(
                "Failed to restore persisted simulation %s",
                simulation_id,
            )

    return restored


def _persist_simulations() -> None:
    _RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    data = {
        simulation_id: _serialize_record(record)
        for simulation_id, record in simulations.items()
    }
    _SIMULATION_STORE_PATH.write_text(json.dumps(data, indent=2, sort_keys=True))


def _get_simulation_record(simulation_id: str) -> SimulationRecord | None:
    record = simulations.get(simulation_id)
    if record is not None:
        return record

    restored = _load_simulations_from_disk()
    if restored:
        simulations.update({sid: rec for sid, rec in restored.items() if sid not in simulations})
    return simulations.get(simulation_id)


def reset_simulations() -> None:
    simulations.clear()
    _persist_simulations()


simulations: dict[str, SimulationRecord] = _load_simulations_from_disk()
simulation_tasks: dict[str, asyncio.Task[None]] = {}
simulation_subscribers: dict[str, set[str]] = {}


def _simulation_task_is_active(simulation_id: str) -> bool:
    task = simulation_tasks.get(simulation_id)
    return task is not None and not task.done()


def _subscribe_to_simulation(simulation_id: str, sid: str) -> None:
    simulation_subscribers.setdefault(simulation_id, set()).add(sid)


def _unsubscribe_sid(sid: str) -> None:
    empty_simulations: list[str] = []
    for simulation_id, subscribers in simulation_subscribers.items():
        subscribers.discard(sid)
        if not subscribers:
            empty_simulations.append(simulation_id)

    for simulation_id in empty_simulations:
        simulation_subscribers.pop(simulation_id, None)


async def _emit_to_simulation_subscribers(
    simulation_id: str,
    event: str,
    payload: dict[str, Any],
) -> None:
    for subscriber_sid in tuple(simulation_subscribers.get(simulation_id, ())):
        try:
            await sio.emit(event, payload, to=subscriber_sid)
        except Exception:
            logger.exception(
                "Failed to emit %s for simulation %s to sid=%s",
                event,
                simulation_id,
                subscriber_sid,
            )


async def _emit_current_state_to_sid(
    simulation_id: str,
    sid: str,
    record: SimulationRecord,
) -> None:
    if record.entities:
        await sio.emit("policy_analysis", {"entities": record.entities}, to=sid)

    if record.final_npcs:
        await sio.emit(
            "init",
            {
                "npcs": record.final_npcs,
                "relationships": record.relationships,
                "max_rounds": record.policy.num_rounds,
            },
            to=sid,
        )

    if record.status == "complete":
        await sio.emit("done", {}, to=sid)
        if record.economic_report is not None:
            await sio.emit("economic_report", record.economic_report.model_dump(), to=sid)
    elif record.status == "error" and record.error_message:
        await sio.emit(
            "sim_error",
            {"message": f"Simulation failed: {record.error_message}"},
            to=sid,
        )


def _resolved_policy_source_ids(policy: PolicyInput) -> list[str]:
    if policy.policy_source_ids:
        return list(policy.policy_source_ids)
    if policy.primary_policy_source_id:
        return [policy.primary_policy_source_id]
    return []


@router.post("/simulate")
async def start_simulation(policy: PolicyInput):
    policy_ids = _resolved_policy_source_ids(policy)
    for source_id in policy_ids:
        src = get_source(source_id)
        if src is None or src.get("kind") != "pdf":
            raise HTTPException(
                status_code=404,
                detail="Policy source not found or is not a PDF.",
            )

    simulation_id = str(uuid.uuid4())
    simulations[simulation_id] = SimulationRecord(policy=policy)
    _persist_simulations()
    logger.info(
        "POST /simulate → id=%s  rounds=%d  policy_sources=%d",
        simulation_id,
        policy.num_rounds,
        len(policy_ids),
    )
    return {"simulation_id": simulation_id}


async def _run_simulation(simulation_id: str) -> None:
    record = _get_simulation_record(simulation_id)
    if record is None:
        logger.warning("Simulation %s disappeared before it could start", simulation_id)
        return

    policy = record.policy
    record.status = "running"
    record.error_message = None
    record.economic_report = None
    record.current_round = 0
    record.events = []
    record.entities = []
    record.final_npcs = []
    record.relationships = []
    record.policy_text = ""
    record.memory_streams = {}
    _persist_simulations()

    graph = build_graph()

    async def stream_npc_events(events: list) -> None:
        await _emit_to_simulation_subscribers(
            simulation_id,
            "npc_events",
            {"events": events},
        )

    async def stream_npc_added(npc: dict) -> None:
        await _emit_to_simulation_subscribers(
            simulation_id,
            "npc_added",
            {"npc": npc},
        )

    initial_state: SimState = {
        "policy_text": "",
        "notes_text": policy.notes_text,
        "trend_summary": "",
        "context_summary": "",
        "indicator_snapshots": [],
        "source_summaries": [],
        "policy_sources": _resolved_policy_source_ids(policy),
        "trend_sources": [],
        "objective": policy.objective,
        "max_rounds": policy.num_rounds,
        "num_npcs": policy.num_npcs,
        "map_id": policy.map_id,
        "entities": [],
        "npcs": [],
        "relationships": [],
        "events": [],
        "current_round": 0,
        "economic_indicators": {},
        "memory_streams": {},
        "npc_stream_callback": stream_npc_events,
        "npc_added_callback": stream_npc_added,
    }

    try:
        async for chunk in graph.astream(initial_state):
            if "build_context" in chunk:
                update = chunk["build_context"]
                record.policy_text = update.get("policy_text", "")
                _persist_simulations()

            elif "parse_policy" in chunk:
                update = chunk["parse_policy"]
                record.entities = update.get("entities", [])
                _persist_simulations()
                logger.info(
                    "sim=%s  parse_policy  entities=%d",
                    simulation_id,
                    len(update["entities"]),
                )
                await _emit_to_simulation_subscribers(
                    simulation_id,
                    "policy_analysis",
                    {"entities": update["entities"]},
                )

            elif "generate_npcs" in chunk:
                update = chunk["generate_npcs"]
                record.final_npcs = update.get("npcs", [])
                record.relationships = update.get("relationships", [])
                _persist_simulations()
                logger.info(
                    "sim=%s  generate_npcs  npcs=%d  rels=%d",
                    simulation_id,
                    len(update["npcs"]),
                    len(update["relationships"]),
                )
                await _emit_to_simulation_subscribers(
                    simulation_id,
                    "init",
                    {
                        "npcs": update["npcs"],
                        "relationships": update["relationships"],
                        "max_rounds": policy.num_rounds,
                    },
                )

            elif "run_round" in chunk:
                update = chunk["run_round"]
                record.current_round = update.get("current_round", record.current_round)
                record.final_npcs = update.get("npcs", record.final_npcs)
                record.events.extend(update.get("events", []))
                record.memory_streams = update.get(
                    "memory_streams", record.memory_streams
                )
                record.relationships = update.get(
                    "relationships", record.relationships
                )
                _persist_simulations()
                round_num = update["current_round"] - 1
                logger.info(
                    "sim=%s  round %d  events=%d",
                    simulation_id,
                    round_num,
                    len(update["events"]),
                )
                await _emit_to_simulation_subscribers(
                    simulation_id,
                    "round",
                    {
                        "round": round_num,
                        "events": update["events"],
                        "npcs": update["npcs"],
                        "influence_events": update.get("influence_events", []),
                        "economic_indicators": update.get("economic_indicators", {}),
                        "relationships": update.get("relationships", []),
                        "max_rounds": policy.num_rounds,
                    },
                )

        record.status = "complete"
        _persist_simulations()
        logger.info("sim=%s  done", simulation_id)
        await _emit_to_simulation_subscribers(simulation_id, "done", {})

        try:
            report = await generate_economic_report(
                policy_text=record.policy_text,
                objective=record.policy.objective,
                entities=record.entities,
                source_summaries=[],
                indicator_snapshots=[],
                final_npcs=record.final_npcs,
                events=record.events,
                completed_rounds=record.current_round,
                max_rounds=record.policy.num_rounds,
            )
            record.economic_report = report
            _persist_simulations()
            await _emit_to_simulation_subscribers(
                simulation_id,
                "economic_report",
                report.model_dump(),
            )
            logger.info("sim=%s  economic_report emitted", simulation_id)
        except Exception:
            logger.exception("sim=%s  economic_report generation failed", simulation_id)

    except Exception as exc:
        record.status = "error"
        record.error_message = str(exc)
        _persist_simulations()
        logger.exception("Simulation %s failed", simulation_id)
        await _emit_to_simulation_subscribers(
            simulation_id,
            "sim_error",
            {"message": f"Simulation failed: {exc}"},
        )
    finally:
        simulation_tasks.pop(simulation_id, None)


@sio.event
async def start_sim(sid: str, data: dict) -> None:
    """Client emits 'start_sim' with {simulation_id} to begin streaming."""
    simulation_id = data.get("simulation_id", "")
    logger.info("sio start_sim  sid=%s  sim=%s", sid, simulation_id)

    record = _get_simulation_record(simulation_id)
    if record is None:
        await sio.emit("sim_error", {"message": "Simulation not found"}, to=sid)
        return

    _subscribe_to_simulation(simulation_id, sid)

    should_start = (
        not _simulation_task_is_active(simulation_id)
        and record.status in {"pending", "running"}
    )
    if should_start:
        simulation_tasks[simulation_id] = asyncio.create_task(
            _run_simulation(simulation_id)
        )

    await _emit_current_state_to_sid(simulation_id, sid, record)


@sio.event
async def disconnect(sid: str) -> None:
    _unsubscribe_sid(sid)


@router.get(
    "/simulate/{simulation_id}/economic-report", response_model=EconomicReportResponse
)
async def get_economic_report(simulation_id: str):
    record = _get_simulation_record(simulation_id)
    if record is None or record.status != "complete":
        raise HTTPException(status_code=404, detail="Completed simulation not found.")

    if record.economic_report is not None:
        return record.economic_report

    record.economic_report = await generate_economic_report(
        policy_text=record.policy_text,
        objective=record.policy.objective,
        entities=record.entities,
        source_summaries=[],
        indicator_snapshots=[],
        final_npcs=record.final_npcs,
        events=record.events,
        completed_rounds=record.current_round,
        max_rounds=record.policy.num_rounds,
    )
    _persist_simulations()
    return record.economic_report


@sio.event
async def chat_with_npc(sid: str, data: dict) -> None:
    """Handle user chatting with an NPC (ephemeral, doesn't affect sim state).

    The conversation is "forked" from the current simulation state - the NPC
    has access to all its memories and context, but the chat itself is
    ephemeral and maintained on the frontend.
    """
    simulation_id = data.get("simulation_id", "")
    npc_id = data.get("npc_id", "")
    user_message = data.get("message", "")
    conversation_history = data.get("history", [])

    logger.info(
        "sio chat_with_npc  sid=%s  sim=%s  npc=%s  msg='%s...'",
        sid,
        simulation_id,
        npc_id,
        user_message[:30] if user_message else "",
    )

    record = _get_simulation_record(simulation_id)
    if not record:
        await sio.emit(
            "npc_chat_error",
            {"npc_id": npc_id, "message": "Simulation not found"},
            to=sid,
        )
        return

    # Find the NPC in the current state
    npc = next((n for n in record.final_npcs if n.get("id") == npc_id), None)
    if not npc:
        await sio.emit(
            "npc_chat_error",
            {"npc_id": npc_id, "message": "NPC not found"},
            to=sid,
        )
        return

    try:
        response = await generate_npc_chat_response(
            npc=npc,
            user_message=user_message,
            conversation_history=conversation_history,
            memory_stream=record.memory_streams.get(npc_id, []),
            policy_context=record.policy_text,
        )

        await sio.emit(
            "npc_chat_response",
            {"npc_id": npc_id, "response": response},
            to=sid,
        )
    except Exception as e:
        logger.exception("Chat with NPC %s failed: %s", npc_id, e)
        await sio.emit(
            "npc_chat_error",
            {"npc_id": npc_id, "message": f"Chat failed: {e}"},
            to=sid,
        )

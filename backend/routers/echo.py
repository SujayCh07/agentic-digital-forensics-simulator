from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from backend.echo_scenarios import build_echo_scenario

router = APIRouter(prefix="/echo", tags=["echo"])


@router.get("/scenario")
async def get_scenario() -> JSONResponse:
    return JSONResponse(build_echo_scenario())

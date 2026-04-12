# Agent Instructions

## Product Focus

The active product is EchoLocate: a moon-city cyber forensics and incident-response game.

When working in this repository, prioritize the active investigate flow over archived replay or policy-simulation modules.

## Package Managers
- Frontend: Bun
- Backend: uv

## Common Commands
| Task | Command |
|------|---------|
| Frontend dev | `cd frontend && bun dev` |
| Frontend build | `cd frontend && bun run build` |
| Backend dev | `cd backend && uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000` |
| Backend tests | `cd backend && uv run pytest` |

## Active Frontend Files
- `frontend/src/app/page.tsx`
- `frontend/src/app/simulate/page.tsx`
- `frontend/src/components/GameCanvas.tsx`
- `frontend/src/game/scenes/BootScene.ts`
- `frontend/src/game/scenes/WorldScene.ts`
- `frontend/src/hooks/useInvestigation.ts`

## Active Backend Files
- `backend/main.py`
- `backend/routers/nips_router.py`
- `backend/nips/session.py`
- `backend/nips/chat.py`
- `backend/nips/tools.py`

## Legacy Note

Policy-simulation and replay modules remain in the repo for compatibility and archived recordings. Treat them as secondary unless a task explicitly targets them.

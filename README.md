# EchoLocate

EchoLocate is a moon-city cyber forensics and incident-response game.

The active product combines:
- a Phaser-rendered lunar infrastructure map
- React/Next investigation UI panels
- specialist investigator agents
- evidence collection and case-board analysis
- tactical agent visibility and marketplace progression
- streamed AI-assisted investigation workflows

## Active Product Path

The active user flow is:
1. Open the landing screen
2. Enter the EchoLocate investigation flow
3. Select a starter specialist
4. Investigate incidents across the moon-city map
5. Use the case board, building panel, agent roster, and recruiting flow

The active map is the custom moon-city tilemap in:
- `frontend/public/assets/maps/moon-city-map.json`
- `frontend/public/assets/maps/moon-city-tileset.png`

## Quick Start

```bash
# frontend
cd frontend
bun install
bun dev

# backend
cd backend
uv sync
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Open [http://localhost:3000](http://localhost:3000).

## Repo Layout

```text
frontend/
  src/app/                 # landing + simulate routes
  src/components/          # UI panels, board, marketplace, overlays
  src/game/                # Phaser scenes, entities, systems, effects
  src/hooks/               # investigate state, replay state, radio, board state
  src/lib/                 # agent client, state helpers, progress, audio, adapters
  src/data/                # moon-city sectors, case data, helpers
  public/assets/           # active tilemap, tileset, sprites

backend/
  routers/                 # investigation sockets, radio, legacy replay router
  nips/                    # investigator session + chat orchestration layer (legacy internal package name)
  models/                  # shared backend schemas
  services/                # report generation and support code
```

## Legacy Notes

This repository still contains archived policy-simulation and replay modules for compatibility with old recordings and experiments. They are not the primary EchoLocate user experience.

If you are working on the current product, start with:
- `frontend/src/app/page.tsx`
- `frontend/src/app/simulate/page.tsx`
- `frontend/src/game/scenes/BootScene.ts`
- `frontend/src/game/scenes/WorldScene.ts`
- `frontend/src/hooks/useInvestigation.ts`
- `backend/routers/nips_router.py`
- `backend/nips/session.py`

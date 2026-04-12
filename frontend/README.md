# EchoLocate Frontend

The active frontend is a Next.js + Phaser investigation interface for EchoLocate.

## Active Responsibilities

- landing and start flow
- moon-city map rendering
- investigator roster and recruiting UI
- building/sector selection
- evidence feed and case board
- tactical overlays and agent labels
- pause flow and investigation shell

## Main Entry Points

- `src/app/page.tsx` — landing screen
- `src/app/simulate/page.tsx` — investigate mode + legacy replay mode router
- `src/components/GameCanvas.tsx` — Phaser mount
- `src/game/scenes/BootScene.ts` — active asset preload
- `src/game/scenes/WorldScene.ts` — active moon-city scene

## Active Assets

- `public/assets/maps/moon-city-map.json`
- `public/assets/maps/moon-city-tileset.png`
- `public/assets/agents/lunar_agents.png`

## Important State Files

- `src/hooks/useInvestigation.ts`
- `src/lib/agentState.ts`
- `src/lib/playerProgress.ts`
- `src/hooks/useBoardState.ts`

## Legacy Note

The repo still contains archived replay / policy-simulation components for compatibility. They should not be treated as the primary product path.

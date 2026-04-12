# EchoLocate Frontend Reference

This document covers the active frontend path only.

## Active Runtime Flow

1. `src/app/page.tsx` opens the EchoLocate landing screen
2. `/simulate?mode=investigate&map=moonCity` starts the active investigation flow
3. `HelperSelectionPanel` selects the starting specialist
4. `GameCanvas` mounts Phaser
5. `BootScene` loads the moon-city map and agent sprites
6. `WorldScene` renders the map, NPCs, and sector highlights
7. React overlays provide labels, tactical markers, board access, building selection, and agent chat

## Active UI Surfaces

- Evidence feed
- Building locations panel
- Systems status panel
- Agent status bar
- Agent marketplace
- Agent directory
- Case board
- Pause overlay

## State Ownership

Active investigation state is primarily driven by:
- `src/hooks/useInvestigation.ts`
- `src/lib/agentState.ts`
- `src/hooks/useBoardState.ts`

## Legacy Note

Archived replay and policy-simulation modules still exist in the repository for compatibility. They are intentionally outside the primary EchoLocate product path.

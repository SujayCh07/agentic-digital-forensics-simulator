# ECHO Product Brief

ECHO is a noir digital-forensics city simulator. The city is not a backdrop; it is the evidence surface.

## Core pillars

- Buildings are machines.
- Roads are network traffic.
- Citizens are processes.
- Specialist investigators reconstruct incidents in real time.
- The player gathers clues, asks ECHO for synthesis, and submits a verdict.

## Visual direction

- Dark, rainy, high-contrast palette.
- Neon cyan and amber highlights with subtle red corruption.
- Familiar retro city-sim readability, but twisted toward a forensic HUD.
- The interface should feel like the old simulation, but with a sharper, investigative edge.

## MVP loop

1. Load a scenario.
2. Inspect buildings and follow clues.
3. Watch LOGIS, NEXUS, FILER, and CHRONO report findings.
4. Build a hypothesis.
5. Submit a verdict.

## Implementation note

This repository still contains the previous policy-simulation architecture. ECHO layers on top of it first, then progressively replaces legacy screens and copy.

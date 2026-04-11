# ECHO Hackathon Plan

This repository currently implements a policy-simulation game (`SIMULACRA`). The hackathon specs in `~/ .openclaw/workspace/input` describe a different concept: **ECHO**, a digital-forensics city simulator.

This plan records how to evolve the current codebase toward that concept without losing the existing architecture patterns that already work.

## Product Summary

ECHO is a noir isometric city where:
- buildings represent machines,
- roads represent network traffic,
- citizens represent processes,
- and AI specialist NPCs reconstruct an incident in real time.

The player investigates a scenario, gathers clues, asks ECHO questions, and submits a verdict.

## Milestone 1 — Spec Alignment and Foundation

Goal: make the project structurally ready for ECHO.

Deliverables:
- document the new product vision inside the repo
- introduce ECHO domain types and constants
- define the backend/frontend seam for scenario loading and evidence streaming
- keep existing simulation code intact while preparing the new entry points

## Milestone 2 — Scenario Core

Goal: load a forensics scenario and render its evidence graph.

Deliverables:
- scenario parser / loader
- evidence node + clue schemas
- backend endpoint for scenario bootstrapping
- frontend types for the city map, clues, and agent roster

## Milestone 3 — Investigation Loop

Goal: enable the basic gameplay loop.

Deliverables:
- inspect building interactions
- timeline scrubber
- evidence feed
- agent hypothesis panel
- initial accusation / scoring flow

## Milestone 4 — Specialist Agents

Goal: make the four analysts visible and useful.

Deliverables:
- LOGIS / NEXUS / FILER / CHRONO state models
- agent movement / reporting events
- ECHO aggregation panel
- red herring support

## Milestone 5 — Polish and Demo Readiness

Goal: make the hackathon build feel complete.

Deliverables:
- visual corruption / glow states
- courtroom verdict sequence
- scenario tuning
- bug fixes and copy polish

## Files likely to change

- `design.md` or a new `echo-design.md` for the product brief
- backend scenario and state models
- frontend ECHO types and simulation UI
- bridge/event contracts between backend and Phaser
- the main simulation page entrypoints

## Current status

The repository still uses the older policy-sim data model. Milestone 1 should not fully replace it; it should establish the ECHO vocabulary and integration points so we can progressively swap behavior in later milestones.

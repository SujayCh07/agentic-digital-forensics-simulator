# NIPS — Neural Investigative Procedure Simulator

> Every cyberattack leaves behind an echo. Find it before it fades.

[![NIPS](https://img.shields.io/badge/NIPS-Bitcamp_2026-blueviolet?style=flat-square)](https://bitcamp.umd.edu)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-latest-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![LangGraph](https://img.shields.io/badge/LangGraph-multi--agent-FF6B35?style=flat-square)](https://langchain-ai.github.io/langgraph/)
[![Phaser](https://img.shields.io/badge/Phaser-3-8e44ad?style=flat-square)](https://phaser.io)
[![Featherless](https://img.shields.io/badge/Featherless.ai-LLM-00BFFF?style=flat-square)](https://featherless.ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

> **A noir isometric city where every building is a machine, every road is a network, and something has gone very wrong.**
> You are the investigator. Find what happened.

**NIPS** — Neural Investigative Procedure Simulator

---

## What It Is

NIPS is a digital forensics investigation game. You inherit a city that already exists — and something happened last night. Buildings are machines. Roads are network connections. Citizens are running processes. Abandoned buildings are deleted files. Graffiti is malware.

Your job is not to build the city. It is to figure out what broke it.

A swarm of four AI specialist agents — **LOGIS**, **NEXUS**, **FILER**, and **CHRONO** — walk the city alongside you, each investigating a different evidence channel. Their findings feed into **ECHO**, a central AI intelligence you can query in natural language. Together, you reconstruct the attack before the evidence degrades.

---

## The City

| City Element | What It Really Is |
|---|---|
| Buildings | Individual machines / servers |
| Roads | Network connections |
| Power grid | System dependencies |
| Citizens | Running processes |
| Abandoned buildings | Deleted / corrupted files |
| Graffiti | Malware signatures |
| Security cameras | System logs |
| City archives | Registry artifacts |
| Underground tunnels | Hidden / encrypted partitions |
| Delivery trucks at 3AM | Suspicious network traffic |
| Blackouts | Denial-of-service events |

---

## Quick Start

**Prerequisites:** Python 3.12+ · [uv](https://docs.astral.sh/uv/) · Node.js 22+ · [Bun](https://bun.sh/) · [Featherless.ai](https://featherless.ai) API key

```bash
# 1. Clone
git clone <repo-url> && cd echo

# 2. Backend
cd backend
cp .env.example .env     # add your Featherless API key (see below)
uv sync
cd ..

# 3. Frontend
cd frontend && bun install && cd ..

# 4. Run (two terminals)
cd backend && uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
cd frontend && bun dev
```

Open **http://localhost:3000** and begin your investigation.

### Environment Variables (`backend/.env`)

```env
FEATHERLESS_API_KEY=fl-...
MODEL_NAME=meta-llama/Llama-3.3-70B-Instruct
```

Get a free API key at [featherless.ai](https://featherless.ai).

---

## How to Play

### 1. Read the Incident Report
When the game loads, the mayor briefs you on what happened. A building burned down. Data went missing. A citizen vanished. You have **10 in-game hours** before evidence degrades.

### 2. Explore the City
Click any building to enter and inspect it:
- **Visitor logs** — who accessed this machine, and when
- **Abandoned rooms** — deleted files you can partially recover (file carving)
- **Graffiti on walls** — steganographic messages hidden inside images
- **City hall records** — registry artifacts showing what ran on this machine

### 3. Follow the Roads
Roads glow with network traffic. Suspicious connections pulse brighter. Follow glowing roads between buildings to trace lateral movement — a machine that received a flood of traffic at 3AM is a lead. Infected roads bleed red corruption into adjacent streets.

### 4. Watch the Specialists Work
Four AI investigators walk the city alongside you:

| Agent | What They Do |
|---|---|
| **LOGIS** | Moves between security cameras; flags off-hours access and failed authentications |
| **NEXUS** | Walks the roads; identifies unusual traffic volumes and beaconing patterns |
| **FILER** | Enters dark, abandoned buildings; recovers deleted files and hidden data |
| **CHRONO** | Works from the city archive; sequences all events into a causal timeline |

Watch their thought bubbles. When they find something significant, a clue marker appears on the map.

### 5. Ask ECHO
**ECHO** is your AI partner — she lives in the side panel and aggregates everything the specialists find. Ask her anything:

- *"Which buildings had activity after midnight?"*
- *"Where did NEXUS find the most suspicious traffic?"*
- *"What's your current theory?"*

Her **confidence meter** rises as evidence accumulates. When she flags something she can't explain, that's your job to investigate. She occasionally gives wrong leads — real AI tools need human verification.

### 6. Scrub the Timeline
The timeline bar at the bottom of the screen lets you scrub through the city's past. Watch buildings light up as events happened. Spot the exact moment the attack jumped from machine to machine. Find the anomaly that doesn't fit.

### 7. Make Your Case
When you're ready, open the accusation panel and submit:
- Which building was **patient zero**
- The **attack path** it took through the network
- The **type of payload** (ransomware, exfiltration, insider threat, etc.)

A courtroom scene renders your verdict. You're scored on accuracy, completeness, and speed.

---

## Scoring

| Criterion | Points |
|---|---|
| Correct origin building | 40 |
| Correct attack path | 30 (partial credit per correct edge) |
| Correct payload type | 15 |
| Time to solve | 15 (faster = more) |
| Avoided red herrings | +10 bonus |
| Over-relied on ECHO | −10 |

**Maximum: 110 points**

---

## The AI Layer

ECHO runs a multi-agent investigation system powered by open-source LLMs via [Featherless.ai](https://featherless.ai). Each specialist runs a different model optimized for their task:

| Agent | Model | Why |
|---|---|---|
| LOGIS | `mistralai/Mistral-7B-Instruct-v0.3` | Fast; handles high log volume |
| NEXUS | `meta-llama/Llama-3.3-70B-Instruct` | Strong graph and network reasoning |
| FILER | `deepseek-ai/DeepSeek-R1-Distill-Llama-70B` | Deep artifact pattern analysis |
| CHRONO | `deepseek-ai/DeepSeek-R1-Distill-Llama-70B` | Temporal causal chain reasoning |
| ECHO | `meta-llama/Llama-3.3-70B-Instruct` | Dialogue quality, hypothesis synthesis |

Agents run in parallel LangGraph subgraphs, stream findings to the frontend over WebSocket, and feed a shared evidence pool that ECHO synthesizes into an evolving hypothesis.

---

## Architecture

```
  ┌──────────────────────────────────────────────────────────┐
  │                        PLAYER                            │
  │         explores city, queries ECHO, submits accusation  │
  └─────────────────────────┬────────────────────────────────┘
                            │ WebSocket
                            ▼
  ┌──────────────── FastAPI + LangGraph ────────────────────┐
  │                                                          │
  │   ┌──────────────────┐     ┌────────────────────────┐   │
  │   │  Load Scenario   │────▶│  Orchestrate Agents    │   │
  │   │  (evidence graph)│     │  (task assignment)     │   │
  │   └──────────────────┘     └──────────┬─────────────┘   │
  │                                       ▼                  │
  │   ┌────────┬──────────┬──────────┬──────────┐           │
  │   │ LOGIS  │  NEXUS   │  FILER   │  CHRONO  │ (parallel)│
  │   │  logs  │ traffic  │  files   │ timeline │           │
  │   └───┬────┴────┬─────┴────┬─────┴────┬─────┘           │
  │       └─────────┴──────────┴──────────┘                 │
  │                         ↓                               │
  │              ┌─────────────────────┐                    │
  │              │  Evidence Aggregator │                    │
  │              │  + ECHO Hypothesis  │                    │
  │              │  + Red Herring Node │                    │
  │              └──────────┬──────────┘                    │
  └─────────────────────────┼────────────────────────────────┘
                            │ WebSocket stream
                            ▼
  ┌──────────────── Next.js + Phaser 3 ─────────────────────┐
  │                                                          │
  │   React ──EventBridge──▶ Phaser canvas (isometric noir) │
  │   ECHO panel · Timeline · Clue markers · NPC movement   │
  └──────────────────────────────────────────────────────────┘
```

---

## Forensics Mechanics

| Mechanic | In-Game | Real Skill |
|---|---|---|
| **File carving** | Recover data from dark abandoned buildings | Recovering deleted files from disk images |
| **Steganography** | Decode graffiti to reveal hidden messages | LSB steganography, image analysis |
| **Traffic analysis** | Follow suspicious delivery trucks on roads | Network packet analysis, lateral movement |
| **Log correlation** | Cross-reference security camera timestamps | SIEM log correlation |
| **Registry forensics** | Read city hall ownership records | Windows registry artifact analysis |
| **Timeline reconstruction** | Scrub events to find patient zero | Digital timeline construction |

---

## Project Structure

```
echo/
├── frontend/                   # Next.js 16 + Phaser 3
│   ├── src/app/                # Pages and layouts
│   ├── src/components/         # GameCanvas, EchoPanel, TimelineScrubber,
│   │                           # ClueInspector, BuildingModal, VerdictScene
│   ├── src/game/
│   │   ├── bridge/             # EventBridge (React ↔ Phaser)
│   │   ├── effects/            # CorruptionSpread, EvidenceLight, ClueMarker
│   │   ├── entities/           # SpecialistNPC, DeliveryTruck, Building
│   │   ├── map/                # CityGenerator, IsometricGrid
│   │   ├── scenes/             # BootScene, CityScene, CourtroomScene
│   │   └── systems/            # MovementSystem, NPCManager, TimelineSystem
│   ├── src/hooks/              # useInvestigation (WebSocket hook)
│   └── src/types/              # Frontend + backend type definitions
│
└── backend/                    # FastAPI + LangGraph
    ├── main.py                 # App entry point
    ├── config.py               # Settings, model assignments
    ├── models/                 # Pydantic schemas, LangGraph state
    ├── graph/                  # Agent nodes, orchestrator, hypothesis engine
    ├── scenarios/              # JSON scenario definitions
    ├── routers/                # HTTP + WebSocket endpoints
    └── tests/                  # pytest
```

---

## Scenarios

| Scenario | Premise | Mechanics Used |
|---|---|---|
| **The Midnight Exfiltration** | 40GB of source code left the city at 3AM. Six machines. One traitor. | Traffic analysis, log correlation, timeline |
| **Ghost in the Grid** | An insider covered their tracks by deleting logs and altering timestamps. | File carving, registry forensics, steganography |

---

## Development Commands

| Task | Command |
|---|---|
| Frontend dev | `cd frontend && bun dev` |
| Backend dev | `cd backend && uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000` |
| Lint | `cd frontend && bun lint` |
| Format | `cd frontend && bun format` |
| Backend tests | `cd backend && uv run pytest` |

---

*NIPS — Built at Bitcamp 2026.*

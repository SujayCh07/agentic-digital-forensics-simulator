# NIPS — Neural Investigative Procedure Simulator

> Every cyberattack leaves behind an echo. Find it before it fades.

---

## Concept

You inherit a city that already exists — and something has gone wrong. Every building is a machine, every road is a network connection, every citizen is a running process. Your job isn't to build the city. It's to figure out what happened to it.

NIPS is an interactive investigation game where a noir isometric city represents a living digital system. Players act as forensic investigators: exploring buildings (machines), following glowing roads (network traffic), and recovering hidden artifacts to reconstruct how an attack spread. A swarm of AI specialist agents — each embodied as an NPC in the city — collaboratively reconstruct the past in real time.

**Target Prizes:**
- Best Game Jam Track — fully playable, complete loop
- Best Digital Forensics (Cipher Tech) — teaches 4+ real forensics concepts
- Best Gamification — turns forensics into a game loop
- Best UI/UX — noir isometric city is visually stunning
- Best Moonshot — nobody has built this before
- Best Use of AI (Featherless.ai) — all specialist agents powered by open-source LLMs via Featherless
- Best Data Visualization (Peraton) — the city IS the data visualization

---

## The Mapping

| City Element | Forensics Equivalent |
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
| Blackouts | Denial-of-service events |
| Delivery trucks (odd hours) | Suspicious network traffic |
| City timeline scrubber | Event log reconstruction |

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Phaser 3, Next.js, Bun |
| Backend | FastAPI, LangGraph, Python |
| LLM | Featherless.ai (OpenAI-compatible) — open-source models |
| Assets | Kenney RPG Urban Pack (CC0, 16×16 px) |
| Map Tool | Tiled Map Editor → JSON → Phaser Tilemap |

**LLM Provider:** [Featherless.ai](https://featherless.ai) — drop-in OpenAI-compatible API serving hundreds of open-source models. Configured via `FEATHERLESS_API_KEY` + `MODEL_NAME` in backend `.env`.

**Recommended models:**
| Use Case | Model |
|---|---|
| Analyst reasoning | `meta-llama/Llama-3.3-70B-Instruct` |
| Fast inference | `mistralai/Mistral-7B-Instruct-v0.3` |
| Evidence synthesis | `deepseek-ai/DeepSeek-R1-Distill-Llama-70B` |

---

## Gameplay Loop

### 1. The Incident Report
You arrive as a newly appointed digital forensics investigator. The mayor (your client) tells you something happened last night — a building burned down, money is missing, a citizen vanished. You have 10 in-game hours to solve it before evidence degrades.

### 2. Explore the City
Click any building to enter and inspect:
- **Visitor records** — file access logs with entry/exit timestamps
- **Abandoned rooms** — recoverable deleted files (file carving)
- **Graffiti on walls** — steganographic messages hidden in images
- **City hall archives** — registry artifacts showing ownership chains

### 3. Follow the Network Roads
Trace suspicious traffic between buildings. Glowing roads pulse with activity; delivery trucks moving at 3AM are leads. Infected roads bleed red corruption into adjacent streets.

### 4. Reconstruct the Timeline
A timeline bar at the bottom lets you scrub through the city's past. Watch buildings light up as events happened, spot anomalies, and find the exact moment the attack propagated from node to node.

### 5. Make Your Case
Gather evidence, identify the origin building, trace the attack path, name the responsible process. Submit to the judge (courtroom scene) and get scored on accuracy, speed, and completeness.

---

## The AI Layer — Specialist Agents

Four specialist NPCs walk the city, independently investigating. They share findings with ECHO, the central intelligence, who builds an evolving hypothesis the player can query.

| Agent | Role | City Behavior |
|---|---|---|
| **LOGIS** | Log Analyst | Moves between security cameras, reads timestamps, flags anomalies |
| **NEXUS** | Network Analyst | Walks the roads, tracks traffic patterns, identifies lateral movement |
| **FILER** | File Analyst | Enters abandoned buildings, recovers deleted files, detects tampering |
| **CHRONO** | Timeline Analyst | Stationed at the archive, sequences events into causal chains |

**ECHO** (central AI) aggregates findings into a hypothesis panel. The player can ask natural language questions:
- *"Which buildings had activity after midnight?"*
- *"Where did the corruption first appear?"*
- *"What does FILER think about the warehouse?"*

ECHO occasionally flags anomalies she can't explain — the player must investigate why. She sometimes gives wrong leads (red herrings), mirroring how real AI tools need human verification. Her **confidence meter** updates in real time as evidence accumulates.

---

## LangGraph Architecture

```
Incident Scenario Load
        ↓
[Scenario Parser] → structured evidence graph + hidden ground truth
        ↓
[ECHO Orchestrator] — distributes investigation tasks to agents
        ↓
┌──────────────────────────────────────────┐
│  Specialist Agent Subgraphs (parallel)   │
│  LOGIS → NEXUS → FILER → CHRONO         │
└──────────────────────────────────────────┘
        ↓
[Evidence Aggregator] — merges findings, scores confidence
        ↓
[Hypothesis Node] — builds / updates current theory
        ↓
[Red Herring Node] — occasionally injects plausible false leads
        ↓
[Player Query Handler] — natural language Q&A via ECHO
        ↓
[Frontend WebSocket Stream] — city animations + agent NPC movement
```

---

## Frontend: Noir Isometric City

**Engine:** Phaser 3
**Tileset:** Kenney RPG Urban Pack (CC0) — roads, buildings, sidewalks, vehicles, NPCs
**Map:** Built in Tiled, exported as JSON, rendered isometric

| Entity | Visual | Behavior |
|---|---|---|
| Machines | Dark office buildings | Pulse with data activity; glow red when infected |
| Specialist NPCs | Walking investigators | Move to points of interest; emit thought bubbles |
| Network roads | Glowing streets | Pulse with traffic; red bleed when corrupted |
| Logs | Security camera overlays | Timestamp feeds visible on building inspect |
| Deleted files | Abandoned, dark buildings | Partially lit when file carving recovers data |
| Malware signatures | Graffiti overlays | Spray-paint style; reveals on building inspect |
| Timeline | Bottom scrubber bar | Scrub past; buildings light up on event timestamps |
| ECHO panel | Side HUD | Chat interface + confidence meter + hypothesis feed |

**Visual language:**
- Healthy systems: cool blue glow, steady pulse
- Infected systems: red bleed, flickering, screen-tear effect
- Recovered evidence: buildings light up clean and whole
- Attack propagation: red corruption animation spreading road to road

---

## Forensics Mechanics

| Mechanic | Description | Real Skill Taught |
|---|---|---|
| **File carving** | Recover data from abandoned buildings | Recovering deleted files from disk images |
| **Steganography** | Decode graffiti to find hidden messages | LSB steganography, image analysis |
| **Traffic analysis** | Follow suspicious delivery trucks | Network packet analysis, lateral movement |
| **Log correlation** | Cross-reference camera timestamps | SIEM log correlation, timeline reconstruction |
| **Registry forensics** | Read city hall ownership records | Windows registry artifact analysis |
| **Timeline reconstruction** | Scrub events to find patient zero | Digital timeline construction, event ordering |

---

## Scenario Structure

Each scenario is a self-contained mystery. The backend generates (or loads) a structured evidence graph:

```python
scenario: {
  name:          str          # "The Midnight Exfiltration"
  incident:      str          # Mayor's briefing text
  ground_truth:  dict         # hidden: origin_node, attack_path, payload_type
  evidence_nodes: list[Node]  # buildings with embedded clues
  network_graph:  list[Edge]  # road connections + traffic metadata
  timeline:       list[Event] # timestamped events (real + decoy)
  red_herrings:   list[Clue]  # plausible but false leads
}
```

**Included scenarios (MVP):**
1. *The Midnight Exfiltration* — ransomware lateral movement, 6-node network
2. *Ghost in the Grid* — insider threat covering tracks via log deletion

---

## Featherless.ai Integration

```python
# backend/services/llm.py
from langchain_openai import ChatOpenAI

def get_llm(model: str = None) -> ChatOpenAI:
    return ChatOpenAI(
        model=model or settings.MODEL_NAME,
        openai_api_key=settings.FEATHERLESS_API_KEY,
        openai_api_base="https://api.featherless.ai/v1",
        temperature=0.3,
    )
```

```env
# backend/.env
FEATHERLESS_API_KEY=fl-...
MODEL_NAME=meta-llama/Llama-3.3-70B-Instruct
```

Each specialist agent can run a different model — CHRONO (timeline) uses a reasoning-heavy model; LOGIS (log scan) uses a faster one for throughput.

---

## 36-Hour Milestones

| Hour Range | Milestone |
|---|---|
| 0–4 | Isometric grid renders, 5–6 building types, click to inspect |
| 4–10 | Log system, timeline scrubber, network road connections |
| 10–16 | 3 forensics mechanics: file carving, steganography, traffic analysis |
| 16–22 | ECHO AI integration + specialist NPC agents, Scenario 1 playable end-to-end |
| 22–30 | Corruption spread animation, sound design, courtroom verdict scene |
| 30–36 | Bug fixes, demo prep, Scenario 2 if time allows |

---

## LangGraph Node Map

```
[load_scenario]
      ↓
[orchestrate_agents]  ←──────────────────────────────────┐
      ↓                                                   │
┌─────────────┬──────────────┬────────────┬────────────┐  │
│ logis_node  │ nexus_node   │ filer_node │ chrono_node│  │
│ (log scan)  │ (net traffic)│ (file carve│ (timeline) │  │
└──────┬──────┴──────┬───────┴─────┬──────┴─────┬──────┘  │
       └─────────────┴─────────────┴────────────┘         │
                         ↓                                │
               [aggregate_evidence]                       │
                         ↓                                │
               [update_hypothesis]                        │
                         ↓                                │
               [inject_red_herrings]  (probabilistic)     │
                         ↓                                │
               [stream_to_frontend]                       │
                         ↓                                │
               [await_player_action] ──── new clue found──┘
                         ↓
               [handle_player_query]  (ECHO Q&A)
                         ↓
               [evaluate_accusation]  (final verdict)
```

---

## Demo Script (90 seconds for judges)

1. **Show the city** — noir, rainy, neon-lit. Buildings pulse with data. One district glows red and "bleeding."
2. **Read the incident** — *"Last night, 40GB of source code left this city. Find where it started."*
3. **Click a building** — inspect logs, see suspicious 3AM access entry, visitor ID flagged.
4. **Follow a road** — delivery truck crosses three dark blocks at odd hours; truck trail glows red.
5. **Open an abandoned building** — file carving recovers a partial document; FILER pings ECHO.
6. **Ask ECHO** — *"Where did the attack originate?"* — confidence meter jumps to 74%, ECHO names a suspect building.
7. **Submit accusation** — courtroom scene, verdict, accuracy score appears.

---

## Prize Positioning

| Prize | Argument |
|---|---|
| **Best Game Jam** | Fully playable mystery loop — investigate, deduce, accuse, score |
| **Cipher Tech Forensics** | 6 real forensics mechanics implemented: file carving, steg, traffic analysis, log correlation, registry, timeline |
| **Best Gamification** | Turns invisible technical process into spatial, interactive narrative |
| **Best UI/UX** | Noir isometric city with corruption spread and evidence lighting is visually arresting |
| **Best Moonshot** | No one has built a forensics investigation city sim before |
| **Featherless.ai** | Entire multi-agent intelligence layer (4 specialists + ECHO) runs on open-source models via Featherless |
| **Peraton Data Viz** | The city IS the data visualization — every pixel encodes real forensics state |

# NIPS — Agent Roster

> Four specialist investigators walk the city. One central intelligence ties it together.

---

## Agent Overview

NIPS's investigation layer is a swarm of four specialist AI agents, each embodied as a named NPC in the city. They operate in parallel, investigating different evidence channels, and report findings to **ECHO** — the central intelligence the player interacts with. Players observe the agents moving through the environment and can read their in-flight reasoning.

---

## Specialist Agents

### LOGIS — Log Analyst

| Attribute | Value |
|---|---|
| **Role** | Analyze system logs across all machines |
| **City behavior** | Moves between security cameras; pauses at each to read timestamps |
| **Data sources** | Access logs, auth logs, process execution records, error logs |
| **Output** | Flagged anomalies: off-hours access, privilege escalation, repeated failures |
| **Phaser sprite** | NPC in trench coat with clipboard; emits magnifying-glass bubble on find |
| **LLM model** | `mistralai/Mistral-7B-Instruct-v0.3` (fast; high log volume) |

**Reasoning focus:**
```
Given these log entries, identify:
1. Off-hours access (outside 09:00–18:00)
2. Repeated failed authentications (>5 in 10 min)
3. Privilege escalation events
4. Unusual process spawns
Flag each with severity: LOW / MEDIUM / HIGH
```

**Attributes:**
```python
id:                "logis"
name:              "LOGIS"
specialization:    "log_analysis"
buildings_visited: list[str]   # building IDs inspected
anomalies_found:   list[Clue]  # structured findings
confidence:        float        # 0.0 → 1.0, rises with more logs read
fatigue:           float        # 0.0 → 1.0; high = may miss subtle anomalies
```

---

### NEXUS — Network Analyst

| Attribute | Value |
|---|---|
| **Role** | Trace network traffic between machines, identify lateral movement |
| **City behavior** | Walks roads between buildings; highlights suspicious connections |
| **Data sources** | Network flow records, firewall logs, DNS queries, port scan artifacts |
| **Output** | Suspicious connections: unusual ports, data exfiltration volume, C2 beaconing patterns |
| **Phaser sprite** | NPC with glowing tablet; roads pulse brighter when NEXUS walks them |
| **LLM model** | `meta-llama/Llama-3.3-70B-Instruct` (best at graph reasoning) |

**Reasoning focus:**
```
Given these network connections, identify:
1. Connections to external IPs at unusual hours
2. Unusually large data transfers (>100MB)
3. Port-scanning behavior (many ports, one source)
4. Beaconing patterns (regular interval callbacks)
5. Lateral movement chains (A→B→C sequence)
```

**Attributes:**
```python
id:                "nexus"
name:              "NEXUS"
specialization:    "network_analysis"
edges_traversed:   list[str]   # road (edge) IDs walked
connections_flagged: list[Clue]
lateral_chains:    list[list[str]]  # candidate attack paths
confidence:        float
```

---

### FILER — File Analyst

| Attribute | Value |
|---|---|
| **Role** | Recover deleted files, detect tampering, find hidden data |
| **City behavior** | Enters abandoned (dark) buildings; rooms re-light as files are recovered |
| **Data sources** | File metadata, MFT records, unallocated disk space, image EXIF data |
| **Output** | Recovered files, steganographic content, tampered timestamps, hidden partitions |
| **Phaser sprite** | NPC with hard hat and flashlight; flashlight beam sweeps dark buildings |
| **LLM model** | `deepseek-ai/DeepSeek-R1-Distill-Llama-70B` (reasoning; complex artifact patterns) |

**Reasoning focus:**
```
Given these file system artifacts, identify:
1. Files deleted within the incident window
2. Timestamp anomalies (modified < created)
3. Hidden data in image files (check LSB patterns)
4. Encrypted archives created during the window
5. Partial file carving candidates
```

**Attributes:**
```python
id:                   "filer"
name:                 "FILER"
specialization:       "file_analysis"
buildings_excavated:  list[str]
recovered_artifacts:  list[Artifact]  # {type, content, confidence, building_id}
steg_findings:        list[Clue]
confidence:           float
```

---

### CHRONO — Timeline Analyst

| Attribute | Value |
|---|---|
| **Role** | Sequence events into a causal timeline; identify patient zero and propagation path |
| **City behavior** | Stationed at the city archive; updates the timeline bar as evidence arrives |
| **Data sources** | All findings from LOGIS, NEXUS, FILER + raw timestamps from scenario |
| **Output** | Ordered event sequence, causal links, estimated attack start time, propagation map |
| **Phaser sprite** | NPC at desk with wall of clocks; clock hands animate as timeline updates |
| **LLM model** | `deepseek-ai/DeepSeek-R1-Distill-Llama-70B` (reasoning; temporal ordering) |

**Reasoning focus:**
```
Given findings from all analysts, construct a timeline:
1. Assign each event a precise or estimated timestamp
2. Identify the earliest suspicious event (patient zero candidate)
3. Link events causally: A enabled B because [reason]
4. Flag temporal impossibilities (event B before A caused it)
5. Output: ordered sequence + confidence per link
```

**Attributes:**
```python
id:               "chrono"
name:             "CHRONO"
specialization:   "timeline_reconstruction"
events_ordered:   list[TimelineEvent]   # {timestamp, building_id, event_type, confidence}
causal_links:     list[CausalLink]      # {from_event, to_event, reason, confidence}
patient_zero:     str | None            # building_id of suspected origin
propagation_path: list[str]             # ordered building IDs
confidence:       float
```

---

## Central Intelligence — ECHO

ECHO is the player-facing AI. She aggregates specialist findings into a unified hypothesis and answers natural language questions. She does not investigate directly — she synthesizes.

| Attribute | Value |
|---|---|
| **Role** | Aggregate findings, maintain hypothesis, handle player Q&A |
| **City behavior** | Lives in the player's HUD (earpiece); voice lines + text panel |
| **Data sources** | All specialist outputs, player-collected evidence, scenario metadata |
| **LLM model** | `meta-llama/Llama-3.3-70B-Instruct` (primary reasoning, dialogue quality) |

**ECHO's hypothesis structure:**
```python
hypothesis: {
  origin_building:  str | None    # suspected patient zero
  attack_path:      list[str]     # suspected propagation chain
  payload_type:     str | None    # "ransomware" | "exfiltration" | "insider" | ...
  responsible_pid:  str | None    # process / citizen agent ID
  confidence:       float         # 0.0 → 1.0
  supporting_clues: list[Clue]
  contradicting:    list[Clue]    # evidence that doesn't fit
  open_questions:   list[str]     # things she flags but can't explain
}
```

**Red herring injection:**
ECHO occasionally promotes a false lead as plausible (probability scales with scenario difficulty). The player must verify. This mirrors how real AI tools hallucinate or over-weight circumstantial evidence.

```python
red_herring_probability: float  # 0.0 → 0.4 depending on scenario difficulty
red_herrings_active:     list[Clue]
```

**ECHO system prompt (summarized):**
```
You are ECHO, a forensics AI assistant. You have access to findings from four 
specialist agents. Maintain a running hypothesis. Answer player questions honestly 
including uncertainty. When confidence is below 0.5, say so. Occasionally flag 
things you notice but cannot explain — let the player investigate. If a red herring 
clue is marked active, treat it as plausible until contradicted.
```

---

## Agent Attributes (Base — all agents)

```python
id:             str       # unique slug
name:           str       # display name
specialization: str       # "log_analysis" | "network_analysis" | "file_analysis" | "timeline_reconstruction"
confidence:     float     # 0.0 → 1.0; rises as more evidence found
findings:       list[Clue]
memory:         list[str] # ring buffer, last 10 reasoning steps
sprite_position: tuple[int, int]  # current tile in Phaser scene
state:          str       # "idle" | "investigating" | "reporting" | "waiting"
```

---

## Clue Schema

```python
clue: {
  id:           str
  type:         str     # "log_anomaly" | "network_flag" | "recovered_file" | "steg_content" | "timeline_event"
  building_id:  str     # which machine this clue is from
  timestamp:    str     # ISO 8601, when this event happened in-scenario
  description:  str     # human-readable summary
  raw_evidence: str     # the actual data (log line, packet summary, file content)
  confidence:   float   # agent's confidence in this clue
  agent_id:     str     # which specialist found it
  is_red_herring: bool  # hidden from player; used by ECHO red herring logic
}
```

---

## Agent Lifecycle (per investigation round)

```
[Round Start]
      ↓
[Orchestrator assigns tasks]
  → LOGIS: inspect buildings {A, B, C}
  → NEXUS: traverse edges {A→B, B→D}
  → FILER: excavate buildings {E, F}
  → CHRONO: sequence all current clues
      ↓
[Agents run in parallel — LangGraph async subgraphs]
      ↓
[Each agent outputs list[Clue]]
      ↓
[Aggregator merges clue pool]
      ↓
[CHRONO updates timeline]
      ↓
[ECHO updates hypothesis]
      ↓
[Red herring node: maybe inject false lead]
      ↓
[Stream updates to frontend]
  → NPC movement commands
  → New clue markers on map
  → ECHO hypothesis panel update
  → Timeline scrubber events
      ↓
[Await player action — click / query / accusation]
      ↓
[If player submits accusation → evaluate_accusation]
[Else → next round]
```

---

## Featherless.ai — Model Assignment

```python
AGENT_MODELS = {
    "logis":  "mistralai/Mistral-7B-Instruct-v0.3",         # fast; high throughput
    "nexus":  "meta-llama/Llama-3.3-70B-Instruct",          # graph reasoning
    "filer":  "deepseek-ai/DeepSeek-R1-Distill-Llama-70B",  # artifact pattern reasoning
    "chrono": "deepseek-ai/DeepSeek-R1-Distill-Llama-70B",  # temporal causal reasoning
    "echo":   "meta-llama/Llama-3.3-70B-Instruct",          # dialogue quality
}
```

All models are served via the Featherless.ai OpenAI-compatible endpoint:

```python
# backend/services/llm.py
from langchain_openai import ChatOpenAI
from backend.config import settings

def get_agent_llm(agent_id: str) -> ChatOpenAI:
    model = settings.AGENT_MODELS.get(agent_id, settings.DEFAULT_MODEL)
    return ChatOpenAI(
        model=model,
        openai_api_key=settings.FEATHERLESS_API_KEY,
        openai_api_base="https://api.featherless.ai/v1",
        temperature=0.2,
        max_tokens=1024,
    )
```

---

## Scoring

When the player submits their accusation, the verdict is computed against the hidden `ground_truth`:

| Criterion | Points | How scored |
|---|---|---|
| Correct origin building | 40 | Exact match |
| Correct attack path | 30 | Partial credit per correct edge |
| Correct payload type | 15 | Exact match |
| Time to solve | 15 | Faster = more points; < 5 min = full |
| Red herring avoided | +10 bonus | Did not include any false leads in accusation |
| ECHO over-relied on | −10 | If player never found a clue themselves |

**Total: 100 base + up to 10 bonus**

# NIPS Playthrough Guide

## What You Are Trying To Do

In NIPS, you are not a lone investigator walking from building to building. You are the coordinator of a forensic response team inside a live cyber incident.

Your job is to:

1. spot suspicious systems
2. dispatch the right specialist
3. collect and compare evidence
4. stabilize the attack as you understand it
5. prove the real attack chain
6. submit a final accusation and mitigation plan

The city is the network.

- buildings are hosts, servers, or infrastructure
- roads represent paths an attacker can move across
- anomalies are the first visible signs that something is wrong
- the attack graph is the real story you are trying to reconstruct

The core loop is:

Observe -> Assign -> Investigate -> Correlate -> Hypothesize -> Verify -> Conclude

## Your Agents

You command four specialist agents. Think of them as tools with personalities, not generic action buttons.

### LOGIS

Best at:

- auth anomalies
- suspicious login windows
- deleted or tampered logs
- abnormal service-account behavior

Use LOGIS when you need to answer:

- who logged in
- when they logged in
- whether the logs were altered
- whether a normal account is behaving abnormally

### NEXUS

Best at:

- network paths
- lateral movement
- pivot points
- exfiltration routes
- outbound communications

Use NEXUS when you need to answer:

- where data moved
- which host acted as the hub
- whether traffic supports an exfil theory
- how the attacker crossed the environment

### FILER

Best at:

- artifacts
- deleted files
- persistence traces
- malware/tool recovery
- staging evidence

Use FILER when you need to answer:

- what was executed
- what was deleted
- whether a payload or tool existed
- whether a host was used as a stash or staging box

### CHRONO

Best at:

- sequencing
- timing contradictions
- causal reconstruction
- multi-host timeline validation

Use CHRONO when you need to answer:

- what happened first
- whether two clues can both be true
- whether a theory fits the timeline
- whether a dump, pivot, and exfil chain lines up

## How To Approach The Early Game

Your first goal is not to solve the whole attack. Your first goal is to create a clean evidence base.

### Step 1: Look for suspicious nodes

Start with hosts that are already under visible pressure or look compromised. If you see multiple suspicious buildings, do not guess which one is the origin yet.

### Step 2: Pull broad evidence first

A strong opening pattern is:

1. LOGIS on a suspicious server
2. NEXUS on a network-facing host
3. FILER on a workstation or archive node with artifact potential

This gives you one log clue, one movement clue, and one artifact clue quickly.

### Step 3: Pin what matters

When a finding feels structurally important, pin it to the board. Especially important:

- origin clues
- pivot clues
- staging clues
- exfil clues
- timeline anchors

### Step 4: Avoid over-committing too early

A single weird login is not always the breach. A single external IP is not always the true destination. Early confidence should come from multiple evidence categories supporting the same story.

## How To Gather And Interpret Evidence

Every finding should answer at least one of these questions:

- Did this help the attacker get in?
- Did this help them move?
- Did this help them collect data?
- Did this help them hide?
- Did this help them get data out?

Use evidence categories together:

- Logs tell you whether an event happened.
- Network traces tell you where it moved.
- Files and artifacts tell you what actually existed.
- Timelines tell you whether the theory is coherent.

The best theories in NIPS usually have support from at least two categories before you act on them.

## Using The Midgame Issue Resolution System

Once enough evidence exists, buildings begin exposing actionable issues. These are not extra flavor tasks. They are the midgame.

Each issue represents a concrete incident response action that only makes sense if your evidence supports it.

Examples:

- confirming the credential source on a workstation
- containing a pivot host
- validating the dump window on a database
- proving a backup relay was used for staging
- blocking the final egress path

### How To Resolve An Issue

1. Click an issue marker on the map or select the building.
2. Open the system inspector.
3. Review:
   - issue description
   - required evidence
   - evidence you already have
   - required agent
4. Assign the correct agent to resolve the issue.
5. Read the feedback carefully.

If you are correct:

- the node stabilizes
- threat pressure drops
- the issue chain progresses
- follow-up issues or evidence may unlock

If you are premature or incorrect:

- the game tells you why
- your evidence is preserved
- you are pushed back toward better verification

### What Failure Messages Mean

`insufficient_evidence`

- You are acting before your evidence base is strong enough.
- Gather the required clue first.

`wrong_agent`

- Your theory may be right, but you used the wrong specialist.
- Reassign based on the task domain.

`timeline_conflict`

- Your conclusion contradicts the current sequence of events.
- Ask CHRONO for a cleaner chronology.

`contradicted_by_findings`

- Existing evidence actively weakens your chosen action.
- Recheck which clue you over-weighted.

## How To Decide Which Agent To Assign

Use the question-first method:

- If the problem is about credentials, auth abuse, or log windows, use LOGIS.
- If the problem is about traffic, pivots, routes, or egress, use NEXUS.
- If the problem is about deleted files, tooling, payloads, or staging artifacts, use FILER.
- If the problem is about sequence, causal order, or timing contradictions, use CHRONO.

When in doubt, ask yourself:

"What kind of proof would make this action trustworthy?"

That usually points to the right agent.

## Using The Attack Graph, Timeline, And Evidence Together

You should never treat these as separate minigames.

### The graph

The graph helps you answer:

- where the attacker traveled
- which node acted as the bridge
- which connection matters most

### The timeline

The timeline helps you answer:

- whether the story makes sense in order
- whether a clue supports initial access, staging, or exfil
- whether you are skipping a necessary step in the chain

### The board and evidence

The board helps you answer:

- which clues truly support the same theory
- which nodes are connected by evidence instead of guesswork
- which claims are still weak

Good players move constantly between all three.

## When To Enter The Final Accusation Phase

Do not rush the final report because you recognize a suspicious host. Enter the final phase when you can confidently answer all four of these:

1. Which building was patient zero?
2. What was the ordered attack path?
3. What kind of attack was this?
4. What fix plan actually stops this chain?

Practically, you are usually ready when:

- the core issue chain is resolved
- your board has clear origin, pivot, staging, and exfil support
- your timeline no longer has major contradictions
- the final report button becomes available

## How The Final Report Works

The final report asks for:

- origin node
- ordered attack path
- attack type
- mitigation plan

This is an evaluation of your reasoning, not just your memory.

The system scores:

- whether you identified patient zero
- how accurate your path ordering is
- whether your attack type is correct
- whether your mitigation plan actually addresses the incident

You can still earn partial credit on parts of the report, but a passing result requires the origin and a meaningful portion of the attack path to be correct.

## What Happens If You Are Wrong

You are not hard-reset back to the beginning.

When you fail a final accusation:

- your evidence stays
- resolved issues stay resolved
- the game returns you to investigation mode
- you receive structured feedback
- the feedback points at weak assumptions and missed links

Treat failed accusations as guided recalibration, not punishment.

## Three Useful Play Styles

### Beginner-friendly strategy

Move slowly and confirm each stage of the incident before acting.

Recommended pattern:

1. gather one clue from each major evidence category
2. pin the strongest clues
3. resolve only the issue whose requirements are fully visible
4. keep using the board before each new commitment

Why it works:

- lower chance of chasing red herrings
- easier to understand why an issue unlocks
- cleaner final report

### Careful evidence-heavy strategy

Prioritize over-confirmation.

Recommended pattern:

1. collect multiple findings on the same host before resolving its issue
2. use CHRONO to validate every suspected jump in the path
3. do not commit to origin or exfil until the board supports both independently

Why it works:

- very strong final-report accuracy
- better protection against misleading evidence
- best for learning case structure

### Speed-focused triage strategy

Prioritize containment and route confirmation.

Recommended pattern:

1. use NEXUS early on likely network chokepoints
2. stabilize the biggest spread risks first
3. let artifact and timeline work confirm the theory after the path is mostly known

Why it works:

- lowers pressure quickly
- good for players who think in infrastructure paths
- riskier if you over-trust one route clue

## Concrete Example Walkthrough: Midnight Exfiltration

This is a beginner-friendly example of how one successful case might unfold.

### Opening suspicion

You notice multiple suspicious hosts, but the gateway alone is not enough to tell the story. Instead of assuming the gateway is the origin, you spread your first tasks:

- FILER inspects `WKS-03`
- LOGIS analyzes `MAIL-01`
- NEXUS traces `GW-01`

### First major clues

FILER on `WKS-03` finds a credential dumping tool on a USB-mounted artifact. That suggests origin preparation.

LOGIS on `MAIL-01` finds a burst of failed SSH attempts followed by success. That suggests credential abuse.

NEXUS on `GW-01` finds outbound transfer to an external host. That proves egress, but not origin.

At this point your best working theory is:

- the gateway is the exit
- the mail server may be a pivot
- the workstation may be patient zero

### Confirming origin

You gather one more supporting clue tying `WKS-03` to the mail server activity. Once you have the credential-artifact evidence, the issue on `WKS-03` becomes actionable.

You assign FILER to resolve the workstation credential-source issue.

Outcome:

- `WKS-03` stabilizes
- origin confidence increases
- the next issue in the chain unlocks

### Confirming the pivot

Now you focus on `MAIL-01`.

You combine:

- the suspicious login evidence
- the lateral movement trace through the mail server

The inspector shows the pivot issue is ready. You assign NEXUS.

Outcome:

- `MAIL-01` is confirmed as the hub
- threat pressure drops again
- the database issue unlocks

### Proving the data theft window

On `DB-02`, LOGIS and CHRONO evidence show when the dump happened and why it matters.

You resolve the dump-window issue with CHRONO.

Outcome:

- the incident timeline becomes cleaner
- case confidence rises
- the staging relay issue becomes available

### Finding the staging relay

At `BACKUP-01`, FILER recovers staging evidence that ties the database dump to the final outbound route.

This step is easy to miss if you focus only on the gateway, but it is what turns an incomplete theory into a correct path.

You resolve the relay issue with FILER.

Outcome:

- the backup node is confirmed as staging
- the final egress-control issue unlocks

### Blocking the path

With gateway logs and traffic both in hand, you assign NEXUS to resolve the gateway issue.

Outcome:

- the exfil route is stabilized
- the final report phase becomes available

### Final accusation

You submit:

- Origin: `WKS-03`
- Path: `WKS-03 -> MAIL-01 -> DB-02 -> BACKUP-01 -> GW-01 -> EXT-01`
- Attack type: `data_exfil`
- Mitigations:
  - `reset_credentials`
  - `remove_persistence`
  - `block_external_communication`

If your evidence supported the chain properly, you pass.

## Common Mistakes To Avoid

- Treating the noisiest external connection as the origin
- Ignoring a staging relay because the gateway already looks suspicious
- Using the wrong agent on an otherwise valid issue
- Treating deleted-file recovery as proof of initial access when it actually proves staging or cleanup
- Entering the final report phase before your timeline supports the full ordered path

## Final Advice

The cleanest way to win is to think like an incident commander:

- gather enough proof to act
- act in the correct order
- reduce uncertainty as you stabilize the network

You are not trying to click every building.
You are trying to command the right response team, at the right time, for the right reason.

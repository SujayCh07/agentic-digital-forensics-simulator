# Tutorial Mode Changes

## Summary

This change adds a fully separate, fully guided tutorial mode for NIPS.

The tutorial is not a detached mini-app. It reuses the live investigation shell, the same map region, the same inspection surfaces, the same issue-resolution flow, and the same final report UI as the main simulation. The difference is that tutorial mode runs a simplified case with a scripted overlay and strict click gating so the player is always guided toward a successful win.

The latest tutorial pass also moves the tutorial closer to the real game loop:

- the player now goes through the live starter-selection flow
- tutorial prompts load into the real dispatch box instead of auto-running tasks
- finding rewards now fund real backend recruiting for the tutorial case
- the tutorial uses deterministic starter/marketplace backend state
- a field-coach panel and browser narration explain what the current step and active agent phase mean

## What Was Added

- Home-page tutorial entry button that routes players into the guided mode
- Dedicated tutorial route at `/tutorial`
- Tutorial mode branch inside the existing simulation page
- Simplified tutorial case data for a fast start-to-victory incident
- Guided tutorial step engine
- Overlay/highlight system with spotlight, blockers, and step popovers
- Guided prompt-loading actions inside the existing inspector
- Field-coach panel with optional browser speech narration for step briefings
- Tutorial victory modal
- Static selector-contract tests for tutorial steps and guided actions

## Routing And Entry Flow

- The home page now exposes a clear tutorial CTA.
- `/tutorial` is a dedicated route that redirects to `/simulate?mode=tutorial&map=moonCity`.
- `frontend/src/app/simulate/page.tsx` now branches on `mode=tutorial` and loads the standard investigation shell with:
  - `GUIDED_TUTORIAL_CASE`
  - `tutorialMode={true}`
  - the same helper-pick flow as the real investigation mode

- Tutorial mode now gates the starter flow toward `FILER` because the tutorial script is built around artifact recovery proving the origin node first.

This keeps routing simple while ensuring the tutorial uses the same core layout as the main investigation page.

## Files Added

- `frontend/src/app/tutorial/page.tsx`
- `frontend/src/data/investigationCaseTypes.ts`
- `frontend/src/data/case_guided_tutorial.ts`
- `frontend/src/data/investigationCases.ts`
- `frontend/src/tutorial/tutorialTypes.ts`
- `frontend/src/tutorial/tutorialScript.ts`
- `frontend/src/tutorial/useTutorialController.ts`
- `frontend/src/tutorial/useTutorialController.test.ts`
- `frontend/src/tutorial/tutorialScript.test.ts`
- `frontend/src/components/tutorial/TutorialOverlay.tsx`
- `frontend/src/components/tutorial/TutorialVictoryModal.tsx`
- `frontend/src/tutorial/useTutorialNarration.ts`
- `docs/TUTORIAL_MODE_CHANGES.md`

## Files Modified

- `frontend/src/app/page.tsx`
- `frontend/src/app/simulate/page.tsx`
- `frontend/src/components/EventFeed.tsx`
- `frontend/src/components/FloatingSystemInspector.tsx`
- `frontend/src/components/AgentMarketplace.tsx`
- `frontend/src/components/HelperSelectionPanel.tsx`
- `frontend/src/components/NodeListPanel.tsx`
- `frontend/src/hooks/useInvestigation.ts`
- `frontend/src/lib/investigationAgentClient.ts`
- `frontend/src/types/investigation.ts`
- `backend/nips/models.py`
- `backend/nips/progression.py`
- `backend/nips/session.py`
- `backend/nips/case_bundle.py`
- `backend/routers/nips_router.py`
- `backend/tests/test_nips_progression.py`

## Tutorial Case Configuration

The tutorial case is intentionally smaller and clearer than the main Midnight Exfiltration case.

It currently teaches the player through this chain:

- `WKS-03` as the origin workstation
- `MAIL-01` as the relay / pivot node
- `BACKUP-01` as the staging relay
- `GW-01` as the final internal exfiltration gateway
- `EXT-01` as the external drop

The tutorial uses a reduced evidence script, a shorter issue chain, and the same backend final-report truth model so that the player still learns the real flow:

1. gather evidence
2. earn credits from findings
3. recruit the right specialists through the live market
4. resolve midgame issues
5. unlock final phase
6. submit the correct accusation
7. reach victory

## Overlay And Highlight System

The overlay lives in `frontend/src/components/tutorial/TutorialOverlay.tsx`.

It works by:

- locating the current target via `data-tutorial-id`
- polling target layout with `requestAnimationFrame`
- drawing four blocker regions around the target
- leaving the target itself clickable
- rendering a spotlight ring and “Click Here” cue
- showing a tutorial card with:
  - title
  - instruction copy
  - why-this-matters explanation
  - step progress
  - narration controls
  - restart control
  - continue control for manual/info-only steps
- auto-advancing targeted manual steps when the real highlighted control is clicked
- rendering a field-coach panel that explains:
  - what the current step teaches
  - what the currently active agent is doing while the player waits
  - why the next action matters

If the player clicks a blocked region, the overlay shows a gentle reminder instead of letting the flow drift.

## Step Engine

The step engine lives in `frontend/src/tutorial/useTutorialController.ts` and is configured by `frontend/src/tutorial/tutorialScript.ts`.

Each step is data-driven and can define:

- `id`
- `title`
- `body`
- `why`
- `targetId`
- `placement`
- `highlightPadding`
- `completion`
- `continueLabel`

Supported completion conditions include:

- manual acknowledgment
- selected node
- finding unlocked
- issue resolved
- final phase ready
- final report opened
- final report origin selected
- attack-path prefix built correctly
- attack type selected
- mitigation selected
- final evaluation passed

## Strict Gating

Tutorial mode is intentionally constrained.

- The overlay blocks unrelated clicks outside the highlighted target.
- Progress only advances when the expected condition becomes true.
- Tutorial guided actions only preload the real dispatch box; they no longer auto-run tasks.
- Tutorial recruiting happens through the real market flow instead of a fake unlock menu.
- Final report submission is guided field-by-field in the correct order.
- Tutorial rewards do not use the normal post-case reward modal; tutorial mode ends with a dedicated victory modal instead.

This keeps the tutorial on a guaranteed-success path when the player follows the instructions.

## Backend Integration

Tutorial mode uses a dedicated backend case bundle in `backend/nips/case_bundle.py`.

That bundle provides:

- tutorial summary text
- tutorial nodes and aliases
- simplified issue chain
- final-report truth

The existing NIPS progression system is reused. No special tutorial-only backend evaluator was introduced.

The main backend tutorial additions are:

- tutorial sessions can start with the chosen starter archetype only
- tutorial marketplace offers are deterministic and low-cost
- finding sync now updates backend funds so tutorial recruiting follows the same source of truth as the rest of NIPS
- case-state payloads now include funds so the frontend tutorial stays aligned with backend recruiting state

## Authoring And Maintenance

### To update tutorial step copy or order

Edit:

- `frontend/src/tutorial/tutorialScript.ts`

### To add or change completion rules

Edit:

- `frontend/src/tutorial/tutorialTypes.ts`
- `frontend/src/tutorial/useTutorialController.ts`

### To add or change guided action buttons

Edit:

- `frontend/src/tutorial/tutorialScript.ts`
- `frontend/src/components/FloatingSystemInspector.tsx`

Important:

- guided tutorial actions now prepare the real input instead of dispatching it automatically
- if you change a guided action id, keep the matching `tutorial-guided-action-*` target in sync

### To add or change highlighted UI hooks

Add or update `data-tutorial-id` values in the relevant component.

Important rule:

- keep the step target ids aligned with real component hooks
- prefer dynamic patterns already used in the repo, such as:
  - `tutorial-node-${node.id}`
  - `tutorial-guided-action-${action.id}`
  - `tutorial-issue-resolve-${issue.id}`

### To change the tutorial scenario itself

Edit:

- `frontend/src/data/case_guided_tutorial.ts`
- `backend/nips/case_bundle.py`

The frontend case controls the local scripted findings and shell behavior. The backend case bundle controls tutorial issues, readiness, and final evaluation truth.

## Testing Performed

Frontend:

- `cd frontend && ./node_modules/.bin/biome check src/app/simulate/page.tsx src/components/tutorial/TutorialOverlay.tsx src/components/FloatingSystemInspector.tsx src/components/HelperSelectionPanel.tsx src/components/AgentMarketplace.tsx src/components/tutorial/TutorialVictoryModal.tsx src/tutorial/tutorialScript.ts src/tutorial/tutorialScript.test.ts src/tutorial/useTutorialController.test.ts src/tutorial/useTutorialNarration.ts src/lib/investigationAgentClient.ts src/hooks/useInvestigation.ts`
- `cd frontend && ./node_modules/.bin/tsc --noEmit --pretty false`
- `cd frontend && npx vitest run src/tutorial/useTutorialController.test.ts src/tutorial/tutorialScript.test.ts`

Backend:

- `cd backend && uv run pytest tests/test_nips_progression.py -q`

## Known Limitations

- The tutorial selector coverage is validated with static contract tests, not browser automation.
- Tutorial mode currently uses a route redirect into the shared simulation page instead of a completely standalone runtime.
- The overlay follows DOM targets only; if a future tutorial step needs raw Phaser-world targeting, it should expose a DOM anchor or overlay proxy first.
- Step narration currently uses browser speech synthesis for low-latency setup. If you want richer voice acting later, the existing `/api/radio/tts` path is the cleanest upgrade target.

## Follow-Up Ideas

- Add browser-driven tutorial smoke tests for route load, highlight placement, and full victory flow.
- Add optional “skip tutorial” and “replay tutorial” CTA placement on the home page and post-victory screen.
- Add authored support for optional explanatory side notes that do not affect strict progression.

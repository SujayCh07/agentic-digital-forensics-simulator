# NIPS Midgame + Endgame Changes

## Summary

This update adds the missing hybrid midgame and endgame progression for NIPS while preserving the existing repo structure:

- Phaser city rendering and NPC roaming remain in the frontend game layer.
- React remains responsible for investigation UI, overlays, and inspector panels.
- The backend now owns progression-critical case truth, issue validation, threat updates, and final report scoring.
- Socket.IO remains the realtime transport with `nips_*` events.
- LangGraph is unchanged and is not used for deterministic issue or final-report logic.

The result is a hybrid flow:

- Early game still feels local and responsive through `useInvestigation.ts`.
- Midgame issue progression is now backend-authoritative.
- Endgame accusation scoring and feedback are backend-authoritative.

## Systems Added

### Backend progression

- Canonical typed case bundle for Midnight Exfiltration
- Issue chain and dependency unlock rules
- Synced finding ingestion
- Threat spread and stabilization state
- Final phase readiness calculation
- Final report scoring and structured failure feedback

### Frontend progression

- Stable `findingId` and `evidenceKey` handling
- Exact evidence linking on the board instead of summary substring matching
- Selected-node issue inspector
- DOM-based issue markers above the map
- Final report modal with retry-friendly feedback
- Progression-aware board hint strip

### Testing

- Focused backend tests for deterministic progression
- Focused frontend tests for finding/evidence identity behavior
- Existing frontend and backend suites rerun to guard regressions

## Files Created

- `backend/nips/case_bundle.py`
- `backend/nips/progression.py`
- `backend/tests/test_nips_progression.py`
- `frontend/src/lib/investigationProgression.ts`
- `frontend/src/lib/investigationProgression.test.ts`
- `docs/MIDGAME_ENDGAME_CHANGES.md`
- `PLAYTHROUGH.md`

## Files Modified

- `backend/nips/models.py`
- `backend/nips/session.py`
- `backend/nips/tools.py`
- `backend/routers/nips_router.py`
- `frontend/src/app/simulate/page.tsx`
- `frontend/src/components/FloatingSystemInspector.tsx`
- `frontend/src/components/NodeCanvas/IncidentNode.tsx`
- `frontend/src/components/NodeCanvas/PolicyNode.tsx`
- `frontend/src/components/UserBoard/AgentConsultPanel.tsx`
- `frontend/src/components/UserBoard/UserBoard.tsx`
- `frontend/src/data/case_midnight_exfil.ts`
- `frontend/src/hooks/useBoardState.ts`
- `frontend/src/hooks/useInvestigation.ts`
- `frontend/src/lib/investigationAgentClient.ts`
- `frontend/src/types/investigation.ts`

## Architecture Decisions

### Backend owns progression-critical truth

The backend now stores:

- canonical case bundle
- synced findings
- issue state
- threat state
- case confidence
- final phase readiness
- final report history
- final evaluation history

This keeps issue resolution and final scoring deterministic and replayable.

### Frontend keeps pacing and presentation

`useInvestigation.ts` still drives:

- task timers
- live feed updates
- node selection
- map/overlay interactions
- board updates

It now mirrors deterministic findings to the backend and consumes backend progression state as authoritative.

### NPC system left intact

Issue interaction is handled through React overlays and the selected-node inspector. Phaser NPC movement and NPC click behavior were not repurposed for issue resolution.

### Exact identity over fuzzy matching

The board and event feed now prefer:

- `findingId`
- `evidenceKey`

This replaced fragile summary-based linking for progression-critical paths while keeping a backward-compatible event-feed fallback for legacy entries.

## State Flow Changes

### Early game

1. Player dispatches an agent task.
2. Local investigation loop resolves the task result.
3. Result is assigned a deterministic `findingId` and `evidenceKey`.
4. The finding is mirrored to the backend through `nips_sync_finding`.

### Midgame

1. Backend ingests synced findings.
2. Backend recomputes issue availability and threat state.
3. Frontend receives `nips_case_state` and issue/threat events.
4. Player opens a node inspector or clicks an issue marker.
5. Player assigns a resolving agent.
6. Backend validates evidence requirements and required agent capability.
7. Success or failure is emitted back to the frontend with contextual feedback.

### Endgame

1. Backend marks final phase ready when issue chain and required finding tags are satisfied.
2. Frontend exposes the final report entry point.
3. Player submits origin, path, attack type, and mitigation plan.
4. Backend scores the report and returns structured evaluation plus feedback.
5. Success gates the rewards flow; failure returns the player to investigation with preserved evidence and resolved issues.

## WebSocket / Event Changes

### Client to server

- `nips_sync_finding`
- `nips_resolve_issue`
- `nips_submit_final_report`

### Server to client

- `nips_case_state`
- `nips_issue_available`
- `nips_issue_resolved`
- `nips_issue_failed`
- `nips_threat_updated`
- `nips_final_phase_ready`
- `nips_final_evaluation`

### Event conventions

- lowercase `nips_*` event names
- targeted emits with `to=sid`
- snake_case payloads
- no generic `{ type: ... }` envelope

## Backend / API Changes

### New models

Added backend models for:

- `CaseBundle`
- `IssueDefinition`
- `IssueState`
- `ThreatState`
- `IssueResolutionRequest`
- `IssueResolutionResult`
- `FinalReportSubmission`
- `FinalEvaluation`
- `FinalFeedback`
- `CaseState`

### New deterministic logic

`backend/nips/progression.py` now handles:

- issue unlock recomputation
- evidence requirement validation
- required-agent validation
- threat deltas
- case confidence deltas
- final readiness
- final report scoring
- structured failure feedback

### Router additions

`backend/routers/nips_router.py` now:

- emits initial case state after session init
- ingests synced findings
- resolves issues
- evaluates final reports
- emits case/threat/final progression updates

## Midnight Exfiltration Rules Implemented

### Issue chain

1. `wks03_credential_source`
2. `mail01_pivot_containment`
3. `db02_dump_window`
4. `backup01_staging_relay`
5. `gw01_block_egress`

### Final report truth

- Origin: `WKS-03`
- Path: `WKS-03 -> MAIL-01 -> DB-02 -> BACKUP-01 -> GW-01 -> EXT-01`
- Attack type: `data_exfil`
- Core mitigations:
  - `reset_credentials`
  - `remove_persistence`
  - `block_external_communication`

### Scoring

- `25` points for origin correctness
- `35 * pathAccuracy`
- `15` points for attack type correctness
- `25 * mitigationAccuracy`

Pass requires:

- score `>= 70`
- correct origin
- path accuracy `>= 0.6`

## Testing Performed

### Frontend

- `cd frontend && npx tsc --noEmit -p tsconfig.json`
- `cd frontend && npx vitest run`
- `cd frontend && npm run lint`

### Backend

- `cd backend && uv run --group dev python -m pytest tests/test_nips_session.py tests/test_nips_chat.py tests/test_nips_scoring.py`
- `cd backend && uv run --group dev python -m pytest tests/test_nips_progression.py`
- `cd backend && uv run --group dev python -m pytest tests/test_nips_session.py tests/test_nips_chat.py tests/test_nips_scoring.py tests/test_nips_progression.py`
- `cd backend && uv run basedpyright nips/models.py nips/case_bundle.py nips/progression.py nips/session.py nips/tools.py routers/nips_router.py tests/test_nips_progression.py`

### Results

- frontend typecheck passed
- frontend Vitest suite passed
- backend NIPS pytest suite passed
- targeted basedpyright found `0 errors` on the touched backend files after fixes, but still returned warnings
- frontend lint still fails due pre-existing repo-wide asset/script issues outside this feature slice

## Known Limitations

- WebSocket emission/handling is verified through code-path tests and live wiring inspection, but there is not yet a dedicated socket integration test harness.
- The final report flow is implemented for the Midnight Exfiltration case only, although the backend structure is data-driven for future cases.
- The stricter backend static analysis baseline is still noisy because older router/tool modules rely heavily on dynamic `Any` usage.
- Frontend project lint is blocked by unrelated repository files such as oversized JSON, malformed XML-in-TSX assets, and existing script formatting issues.

## Follow-up Work

- Add dedicated socket integration tests for the new `nips_*` progression events.
- Move final report and issue overlay components into dedicated files once the interaction model stabilizes.
- Extend `CaseBundle` data for additional cases and case-specific issue templates.
- Add graph/timeline visual reactions for issue resolution beyond the current inspector/board state updates.
- Consider exposing final evaluation analytics in a post-case summary screen.

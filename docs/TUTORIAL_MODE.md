# Tutorial Mode — EchoLocate

## Overview

Tutorial mode is a fully guided, step-by-step playthrough that runs inside the real game UI.
It teaches the complete investigation loop from start to win using the same simulation page,
same components, same agent chat, and same scoring backend as the normal game.

---

## Files Added / Modified

### New Files

| File | Purpose |
|------|---------|
| `frontend/src/lib/tutorialSteps.ts` | All 12 tutorial step definitions (data-driven) |
| `frontend/src/lib/tutorialTTS.ts` | Web Speech API wrapper with music ducking |
| `frontend/src/hooks/useTutorial.ts` | Step engine — tracks progress, plays TTS, handles auto-advance |
| `frontend/src/components/TutorialOverlay.tsx` | Fixed callout card + element highlight ring |
| `frontend/src/app/tutorial/page.tsx` | `/tutorial` route that redirects to `/simulate?tutorial=1` |

### Modified Files

| File | Change |
|------|--------|
| `frontend/src/app/page.tsx` | Added TUTORIAL button between INVESTIGATE and LOAD CASE |
| `frontend/src/app/simulate/page.tsx` | Added `isTutorial` flag, `useTutorial` hook, `data-tutorial-id` attrs, `TutorialOverlay` render |
| `frontend/src/lib/audioManager.ts` | Added `setMusicVolume(fraction)` and `restoreMusicVolume()` |
| `frontend/src/app/globals.css` | Added `@keyframes tutorial-ring-pulse` and `tutorial-callout-in` animations |

---

## How Tutorial Routing Works

1. Home page has a **TUTORIAL** button that calls `router.push("/tutorial")`
2. `/app/tutorial/page.tsx` immediately redirects to `/simulate?tutorial=1&mode=investigate&map=moonCity`
3. Inside `InvestigateGame`, `useSearchParams().get("tutorial") === "1"` is read as `isTutorial`
4. When `isTutorial` is true, the `useTutorial` hook is called with live game state
5. `TutorialOverlay` is rendered at the bottom of the JSX (above all other modals via z-index 96)

---

## Tutorial Step Configuration

Steps live in `src/lib/tutorialSteps.ts` as the `TUTORIAL_STEPS` array.

### TutorialStep Fields

```typescript
interface TutorialStep {
  id: string;                           // unique identifier
  title: string;                        // shown in callout header
  body: string;                         // shown in callout body
  tts: string;                          // spoken via Web Speech API
  targetId?: string;                    // data-tutorial-id of element to highlight
  highlightStyle?: 'ring' | 'pulse' | 'glow'; // ring=static cyan, pulse=pulsing cyan, glow=green
  completionKey?: TutorialCompletionKey; // game state key that completes this step
  waitingText?: string;                 // shown while waiting for completionKey
  manualAdvance?: boolean;              // requires "Next →" click (no auto-advance)
  autoAdvanceMs?: number;               // auto-advance after N milliseconds
}
```

### Completion Keys (TutorialCompletionKey)

| Key | Condition |
|-----|-----------|
| `sectorActive` | `activeSectorId !== null` |
| `agentOpen` | `chatAgent !== null` |
| `hasEvidence` | `evidenceDelta > 0` |
| `reportSubmitted` | `proposalSubmitted === true` |
| `hasRemediation` | `remediationHistory.length > 0` |
| `at75` | `recoveryProgress >= 75` |
| `finalizing` | `showFinalClaimModal === true` |
| `won` | `endgameOutcome === "win"` |

### Adding/Editing Steps

To add a new step, append an object to `TUTORIAL_STEPS` in `tutorialSteps.ts`.
To change order, reorder the array. Step numbering is automatic (index-based).

To add a new `completionKey`, add it to:
1. `TutorialCompletionKey` type in `tutorialSteps.ts`
2. `TutorialGameState` interface in `useTutorial.ts`
3. The game state object passed to `useTutorial()` in `simulate/page.tsx`

---

## Highlight Targeting

Elements are targeted via `data-tutorial-id` HTML attributes.

### Current data-tutorial-id Targets

| data-tutorial-id | Element |
|-----------------|---------|
| `recovery-progress` | RecoveryProgress bar wrapper in top bar |
| `submit-report-btn` | Submit Report button |
| `finalize-btn` | ◈ Finalize Investigation button |
| `event-feed-panel` | Left evidence feed panel |
| `game-canvas-area` | Center game canvas container |
| `sector-panel` | Right sector status panel |

### Adding New Targets

Add `data-tutorial-id="your-id"` to any element in the JSX, then reference it in a step's `targetId` field.

The `TutorialOverlay` uses `document.querySelector('[data-tutorial-id="X"]')` + `getBoundingClientRect()` to position the highlight ring. It re-measures every 600ms and on window resize, so layout changes are handled automatically.

---

## TTS Integration

**File**: `src/lib/tutorialTTS.ts`

### How It Works

1. On each step change, `useTutorial` calls `tutorialSpeak(step.tts)`
2. `tutorialSpeak` cancels any current speech, then calls `audioManager.setMusicVolume(0.15)` to duck music to 15%
3. Speech starts 300ms later (to let the step render first)
4. When speech ends (or errors), `audioManager.restoreMusicVolume()` restores music to default volume
5. `stopTutorialSpeech()` is called when the tutorial is dismissed or the component unmounts

### Browser Compatibility

Web Speech API (`window.speechSynthesis`) works in Chrome, Edge, Safari, and most modern browsers.
Firefox support varies by OS. The code gracefully no-ops if the API is unavailable.

---

## Music Ducking

**Added to `src/lib/audioManager.ts`**:

```typescript
setMusicVolume(fraction: number)  // 0–1, multiplied by MUSIC_VOLUME (0.3)
restoreMusicVolume()              // restores to MUSIC_VOLUME
```

During TTS: music plays at `0.15 × 0.3 = 0.045` (very quiet).
After TTS ends: music restored to `0.3`.

---

## Step Engine (useTutorial)

**File**: `src/hooks/useTutorial.ts`

Advance logic (in priority order):
1. If `completionKey` is set and the condition becomes true → advance after 900ms delay
2. If `autoAdvanceMs` is set → advance after that many ms
3. If `manualAdvance` is true → wait for user to click "Next →"

Steps never go backward. Once a condition fires, the step advances permanently.

---

## Tutorial Step Sequence

| # | Step ID | What Player Does | How it Advances |
|---|---------|-----------------|-----------------|
| 1 | welcome | Read intro | Click Next |
| 2 | recovery_bar | See recovery bar explained | Click Next |
| 3 | start_sector | Click building → Start Investigation | `sectorActive` |
| 4 | sector_active | See sector panel highlighted | Auto (3.5s) |
| 5 | open_agent | Click agent label on map | `agentOpen` |
| 6 | send_task | Type task to agent, wait for evidence | `hasEvidence` |
| 7 | evidence_found | Read evidence explanation | Click Next |
| 8 | submit_report | Fill and submit first report | `reportSubmitted` |
| 9 | remediation | Open remediations, apply Block Egress | `hasRemediation` |
| 10 | reach_75 | Keep investigating to 75% | `at75` |
| 11 | finalize | Click Finalize, submit final claim | `finalizing` |
| 12 | complete | Read completion message | Click Next |

---

## Win Path Taught by Tutorial

The tutorial explicitly teaches this win sequence:
1. Click building → start sector investigation (enables Submit Report)
2. Click agent label → open command interface
3. Ask agent about MAIL-01, DB-02, GW-01 to gather evidence
4. Evidence increases Recovery Progress (up to 45% from evidence alone)
5. Submit report: "MAIL-01 entry point, DB-02 database exfiltration, GW-01 egress gateway"
6. Report accuracy adds ExternalDelta to Recovery Progress
7. Apply Block Egress on GW-01 to add remediation progress
8. Keep submitting reports and applying remediations until 75%
9. Click "◈ Finalize Investigation" → write comprehensive final claim
10. If final claim scores ≥75% accuracy → WIN

---

## Known Limitations

- **Agent label targeting**: The tutorial highlights the game canvas area rather than a specific agent label because labels are dynamically positioned and depend on Phaser state. The player must visually find the agent on the map.
- **Speech synthesis voices**: Voice quality varies by OS/browser. On macOS, the default voice is high-quality. On Windows, quality depends on installed voices.
- **Network required**: The tutorial uses the real NIPS backend. If the backend is unavailable, agent chat won't return evidence and `hasEvidence` will never trigger. Steps can still be manually skipped via "Skip Tutorial".
- **Tutorial state resets on page refresh**: No tutorial progress is persisted. A refresh starts from step 1.

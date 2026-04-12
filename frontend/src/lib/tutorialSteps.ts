/**
 * Tutorial step definitions for EchoLocate.
 *
 * Each step describes one beat of the guided experience:
 *  - what the player sees (title + body)
 *  - what is spoken aloud (tts)
 *  - which DOM element to highlight (targetId → data-tutorial-id attr)
 *  - how the step completes (completionKey checked by useTutorial)
 *  - whether the player must click "Next" or it auto-advances
 */

export type TutorialHighlightStyle = "ring" | "pulse" | "glow";

export type TutorialCompletionKey =
  | "sectorActive"
  | "agentOpen"
  | "hasEvidence"
  | "reportSubmitted"
  | "hasRemediation"
  | "at75"
  | "finalizing"
  | "won";

export interface TutorialStep {
  id: string;
  title: string;
  body: string;
  tts: string;
  /** data-tutorial-id of the element to highlight. */
  targetId?: string;
  highlightStyle?: TutorialHighlightStyle;
  /** When set, the step automatically advances once this condition is true. */
  completionKey?: TutorialCompletionKey;
  /** Text shown while waiting for the condition. */
  waitingText?: string;
  /** When true, player must click "Next →" to advance (no auto-advance). */
  manualAdvance?: boolean;
  /** Auto-advance after N ms (even if completionKey not met). */
  autoAdvanceMs?: number;
}

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

export const TUTORIAL_STEPS: TutorialStep[] = [
  // ── 0. Welcome ─────────────────────────────────────────────────────────────
  {
    id: "welcome",
    title: "Welcome to EchoLocate",
    body: "You are a cyber-forensics investigator. A security breach is spreading through a corporate network. Command AI agents to investigate systems, gather evidence, submit reports, and contain the threat.",
    tts: "Welcome to EchoLocate. You are a cyber-forensics investigator. A security breach is spreading through a corporate network. Your job is to command AI agents to investigate systems, gather evidence, submit reports, and ultimately contain the threat. This tutorial will walk you through every step of the way.",
    manualAdvance: true,
  },

  // ── 1. Recovery Bar ────────────────────────────────────────────────────────
  {
    id: "recovery_bar",
    title: "Your Goal: Reach 75%",
    body: "The Recovery Progress bar at the top tracks how close you are to containing the breach. Reach 75% — by gathering evidence and submitting accurate reports — then submit your Final Claim to win.",
    tts: "See this recovery progress bar at the top of the screen. Your goal is to push it to at least seventy-five percent. You do that by gathering evidence from agents, submitting accurate reports about the breach, and applying remediations to fix compromised systems. Once you hit seventy-five percent, the Finalize Investigation button appears and you can try to win.",
    targetId: "recovery-progress",
    highlightStyle: "glow",
    manualAdvance: true,
  },

  // ── 2. Start a Sector Investigation ────────────────────────────────────────
  {
    id: "start_sector",
    title: "Start an Investigation",
    body: 'Click on a building or landmark in the city map to open a sector briefing. Then click "Start Investigation" to activate the case and unlock report submission.',
    tts: "Look at the city map in the center of the screen. Each building represents a server or system in the compromised network. Click on any building or landmark in the city to open a sector case briefing. Read the details, then click Start Investigation to activate the case. This is required before you can submit reports.",
    targetId: "game-canvas-area",
    highlightStyle: "ring",
    completionKey: "sectorActive",
    waitingText: "Click a building in the map, then click Start Investigation…",
  },

  // ── 3. Sector is Active ─────────────────────────────────────────────────────
  {
    id: "sector_active",
    title: "Investigation Active!",
    body: "The sector is now active. The right panel shows the compromised nodes. Now find your agent in the city — their label floats above their character — and click it to open the command interface.",
    tts: "The sector investigation is now active. Look at the right panel to see which systems are compromised. Now look at the city map and find your agent. They appear as a small floating label above a character on the map. Click that label to open the agent command interface so you can give them tasks.",
    targetId: "sector-panel",
    highlightStyle: "ring",
    autoAdvanceMs: 3500,
  },

  // ── 4. Open an Agent ───────────────────────────────────────────────────────
  {
    id: "open_agent",
    title: "Command Your Agent",
    body: "Find the floating agent label above a character in the city map and click it. This opens the chat interface where you give direct investigation tasks.",
    tts: "Find your agent in the city. Look for a small pill-shaped label floating just above a character in the map. Click that label to open the command interface. This is how you direct your agent to investigate specific systems and gather evidence.",
    targetId: "game-canvas-area",
    highlightStyle: "pulse",
    completionKey: "agentOpen",
    waitingText: "Click your agent's label in the city map…",
  },

  // ── 5. Give Agent a Task ────────────────────────────────────────────────────
  {
    id: "send_task",
    title: "Give an Investigation Task",
    body: 'Type a command for your agent. Try: "Check MAIL-01 for suspicious activity and analyze the logs for unauthorized access signs." Press Enter or Send. Your agent will investigate and return findings.',
    tts: "You are now in direct contact with your agent. Type a command telling them where to investigate. A great first task is: Check MAIL-01 for suspicious activity and analyze the logs for unauthorized access signs. Your agent will use their specialized tools to investigate and return findings. Each finding increases your recovery score.",
    completionKey: "hasEvidence",
    waitingText: "Waiting for your agent to return evidence…",
  },

  // ── 6. Evidence Found ──────────────────────────────────────────────────────
  {
    id: "evidence_found",
    title: "Evidence Collected!",
    body: "Your agent found something. Check the Evidence Feed on the left — each finding increases your Recovery Progress score. Ask your agent more questions about DB-02, GW-01, and WS-03 to gather more evidence.",
    tts: "Excellent! Your agent has returned with evidence. You can see the findings appearing in the Evidence Feed on the left side of the screen. Each finding pushes your recovery bar higher. Keep the conversation going — ask your agent about D-B-02, G-W-01, and W-S-03 to build a more complete picture of the breach.",
    targetId: "event-feed-panel",
    highlightStyle: "glow",
    manualAdvance: true,
  },

  // ── 7. Submit First Report ─────────────────────────────────────────────────
  {
    id: "submit_report",
    title: "Submit Your First Report",
    body: 'Click "Submit Report" in the top bar. Describe what you found. A strong first report: Root cause: "Attacker breached MAIL-01, moved laterally to DB-02, exfiltrated data via GW-01". Systems: "MAIL-01, DB-02, GW-01".',
    tts: "Now it is time to submit your first report. Click the Submit Report button in the top bar. In the root cause field, describe the attack path you have uncovered. In the systems field, list the compromised nodes. A good answer covers MAIL-01 as the entry point, DB-02 as the data target, and G-W-01 as the exfiltration gateway. The more accurate your report, the more progress points you earn and the more funds are released for operations.",
    targetId: "submit-report-btn",
    highlightStyle: "pulse",
    completionKey: "reportSubmitted",
    waitingText: "Click Submit Report and fill in your analysis…",
  },

  // ── 8. Remediations ────────────────────────────────────────────────────────
  {
    id: "remediation",
    title: "Apply a Remediation",
    body: 'In the right Sector Status panel, click "Open Remediations". Then select action "Block Egress", assign your LOGIS agent (best fit), target node "GW-01", and execute. This stops the data exfiltration.',
    tts: "Now apply a remediation to directly fix a compromised system. Look at the Sector Status panel on the right. Click the Open Remediations button. In the panel that appears, select Block Egress as the action, assign your L-O-G-I-S agent since they are the best fit for network actions, and target node G-W-01 to cut off the attacker's data exfiltration channel. Then click Execute Action.",
    targetId: "sector-panel",
    highlightStyle: "pulse",
    completionKey: "hasRemediation",
    waitingText: "Open Remediations and apply a fix…",
  },

  // ── 9. Push to 75% ─────────────────────────────────────────────────────────
  {
    id: "reach_75",
    title: "Keep Investigating to 75%",
    body: 'Keep gathering evidence, submitting more reports, and applying remediations. Ask your agent about DB-02 and WS-03. Each accurate report and remediation pushes the bar higher. Watch for "◈ Finalize Investigation" to appear.',
    tts: "Keep going. Talk to your agent again and ask about D-B-02 and W-S-03. Submit another report with your expanded findings — more accurate reports give bigger progress boosts. Apply more remediations to fix the compromised systems. Your goal is to reach seventy-five percent recovery. When you do, the Finalize Investigation button will appear in the top bar and you will be ready to finish the case.",
    targetId: "recovery-progress",
    highlightStyle: "glow",
    completionKey: "at75",
    waitingText:
      "Keep investigating — reach 75% recovery to unlock Final Claim…",
  },

  // ── 10. Final Claim ────────────────────────────────────────────────────────
  {
    id: "finalize",
    title: "Submit Your Final Claim",
    body: 'Click "◈ Finalize Investigation". Write a comprehensive report covering the full attack chain, every system involved, and how the breach occurred. A score ≥ 75% accuracy wins the game.',
    tts: "You have reached seventy-five percent. The Finalize Investigation button is now active in the top bar. Click it to open the Final Claim form. Write a comprehensive report that covers the entire attack: how the attacker got in through M-A-I-L-01, how they moved laterally to D-B-02 to steal data, how they used G-W-01 as the exfiltration gateway, and any other systems involved. If your final report scores seventy-five percent or higher accuracy, you win the game. Good luck, investigator.",
    targetId: "finalize-btn",
    highlightStyle: "pulse",
    completionKey: "finalizing",
    waitingText:
      'Click "◈ Finalize Investigation" and submit your final report…',
  },

  // ── 11. Tutorial Complete ──────────────────────────────────────────────────
  {
    id: "complete",
    title: "Tutorial Complete!",
    body: "You now know the full EchoLocate investigation loop. In the real game, incidents are more complex — more systems, harder-to-find evidence, tighter timers. Return to the home screen and click INVESTIGATE to start a real case. Good luck.",
    tts: "Tutorial complete. You now know the full investigation loop: gather evidence from agents, submit reports, apply remediations, and close the case with a comprehensive final claim. In the real game, you will face more complex incidents requiring deeper investigation and sharper analysis. Return to the home screen and click Investigate to start a real case. Good luck, investigator.",
    manualAdvance: true,
  },
];

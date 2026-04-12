import { describe, expect, it } from "vitest";
import {
  GUIDED_TUTORIAL_ACTIONS,
  GUIDED_TUTORIAL_STEPS,
} from "./tutorialScript";

const STATIC_TARGET_IDS = new Set([
  "tutorial-map-shell",
  "tutorial-node-inspector",
  "tutorial-open-final-report",
  "tutorial-final-origin",
  "tutorial-final-submit",
  "tutorial-market-close",
  "tutorial-dispatch-button",
  "tutorial-topbar-market",
]);

const DYNAMIC_TARGET_PREFIXES = [
  "tutorial-node-",
  "tutorial-guided-action-",
  "tutorial-issue-resolve-",
  "tutorial-market-buy-",
  "tutorial-agent-select-",
  "tutorial-final-origin-",
  "tutorial-final-path-",
  "tutorial-final-attack-",
  "tutorial-final-mitigation-",
];

function isSupportedTargetId(targetId: string) {
  return (
    STATIC_TARGET_IDS.has(targetId) ||
    DYNAMIC_TARGET_PREFIXES.some((prefix) => targetId.startsWith(prefix))
  );
}

describe("guided tutorial script", () => {
  it("uses unique step ids", () => {
    const stepIds = GUIDED_TUTORIAL_STEPS.map((step) => step.id);
    expect(new Set(stepIds).size).toBe(stepIds.length);
  });

  it("only references supported tutorial target selectors", () => {
    const targetIds = GUIDED_TUTORIAL_STEPS.flatMap((step) =>
      step.targetId ? [step.targetId] : [],
    );

    expect(targetIds.length).toBeGreaterThan(0);
    for (const targetId of targetIds) {
      expect(isSupportedTargetId(targetId)).toBe(true);
    }
  });

  it("provides a scripted step for every guided action button", () => {
    const scriptedActionTargets = new Set(
      GUIDED_TUTORIAL_STEPS.flatMap((step) =>
        step.targetId?.startsWith("tutorial-guided-action-")
          ? [step.targetId]
          : [],
      ),
    );

    for (const action of GUIDED_TUTORIAL_ACTIONS) {
      expect(scriptedActionTargets).toContain(
        `tutorial-guided-action-${action.id}`,
      );
    }
  });

  it("walks through the full endgame before submission", () => {
    const stepIds = GUIDED_TUTORIAL_STEPS.map((step) => step.id);

    expect(stepIds).toContain("open-market-logis");
    expect(stepIds).toContain("recruit-logis");
    expect(stepIds).toContain("open-market-nexus");
    expect(stepIds).toContain("recruit-nexus");
    expect(stepIds).toContain("open-final-report");
    expect(stepIds).toContain("choose-origin");
    expect(stepIds).toContain("choose-attack-type");
    expect(stepIds).toContain("choose-mitigation-reset");
    expect(stepIds).toContain("choose-mitigation-persistence");
    expect(stepIds).toContain("choose-mitigation-egress");
    expect(stepIds).toContain("submit-final-report");

    expect(stepIds.indexOf("open-final-report")).toBeLessThan(
      stepIds.indexOf("submit-final-report"),
    );
    expect(stepIds.indexOf("choose-origin")).toBeLessThan(
      stepIds.indexOf("submit-final-report"),
    );
    expect(stepIds.indexOf("recruit-logis")).toBeLessThan(
      stepIds.indexOf("submit-final-report"),
    );
  });
});

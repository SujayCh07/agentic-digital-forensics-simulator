import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TutorialRuntimeState } from "./tutorialTypes";
import { useTutorialController } from "./useTutorialController";

function createRuntime(
  overrides: Partial<TutorialRuntimeState> = {},
): TutorialRuntimeState {
  return {
    selectedNodeId: null,
    findingKeys: new Set<string>(),
    issueStatusById: {},
    finalPhaseReady: false,
    finalReportOpen: false,
    finalEvaluationPassed: false,
    finalReportDraft: {
      originNodeId: "",
      attackPath: [],
      attackType: null,
      mitigationPlan: [],
    },
    ...overrides,
  };
}

describe("useTutorialController", () => {
  it("advances through the opening tutorial steps using real runtime state", () => {
    let runtime = createRuntime();

    const { result, rerender } = renderHook(
      ({ enabled, state }: { enabled: boolean; state: TutorialRuntimeState }) =>
        useTutorialController(enabled, state),
      {
        initialProps: {
          enabled: true,
          state: runtime,
        },
      },
    );

    expect(result.current.currentStep.id).toBe("welcome");

    act(() => {
      result.current.completeCurrentManualStep();
    });
    expect(result.current.currentStep.id).toBe("map-overview");

    act(() => {
      result.current.completeCurrentManualStep();
    });
    expect(result.current.currentStep.id).toBe("select-origin-node");

    runtime = createRuntime({
      selectedNodeId: "WKS-03",
    });
    rerender({ enabled: true, state: runtime });
    expect(result.current.currentStep.id).toBe("load-origin-prompt");

    act(() => {
      result.current.completeCurrentManualStep();
    });
    expect(result.current.currentStep.id).toBe("inspect-origin-artifacts");

    runtime = createRuntime({
      selectedNodeId: "WKS-03",
      findingKeys: new Set(["WKS-03:inspect_artifacts"]),
    });
    rerender({ enabled: true, state: runtime });
    expect(result.current.currentStep.id).toBe("review-origin-evidence");

    act(() => {
      result.current.completeCurrentManualStep();
    });
    expect(result.current.currentStep.id).toBe("resolve-origin-issue");
  });

  it("can restart cleanly after progress has been made", () => {
    let runtime = createRuntime();
    const { result, rerender } = renderHook(
      ({ enabled, state }: { enabled: boolean; state: TutorialRuntimeState }) =>
        useTutorialController(enabled, state),
      {
        initialProps: {
          enabled: true,
          state: runtime,
        },
      },
    );

    act(() => {
      result.current.completeCurrentManualStep();
    });
    act(() => {
      result.current.completeCurrentManualStep();
    });

    runtime = createRuntime({ selectedNodeId: "WKS-03" });
    rerender({ enabled: true, state: runtime });
    expect(result.current.currentStep.id).toBe("load-origin-prompt");

    act(() => {
      result.current.completeCurrentManualStep();
    });
    expect(result.current.currentStep.id).toBe("inspect-origin-artifacts");

    act(() => {
      result.current.restartTutorial();
    });

    expect(result.current.currentStep.id).toBe("welcome");
  });
});

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GUIDED_TUTORIAL_STEPS } from "./tutorialScript";
import type { TutorialRuntimeState, TutorialStep } from "./tutorialTypes";

function isManualStepComplete(
  step: TutorialStep,
  completedIds: Set<string>,
): boolean {
  return step.completion.type === "manual" && completedIds.has(step.id);
}

function isCompletionSatisfied(
  step: TutorialStep,
  runtime: TutorialRuntimeState,
  manualIds: Set<string>,
): boolean {
  if (isManualStepComplete(step, manualIds)) return true;

  switch (step.completion.type) {
    case "manual":
      return false;
    case "selected_node":
      return runtime.selectedNodeId === step.completion.nodeId;
    case "finding":
      return runtime.findingKeys.has(step.completion.evidenceKey);
    case "issue_resolved":
      return runtime.issueStatusById[step.completion.issueId] === "resolved";
    case "final_report_open":
      return runtime.finalReportOpen;
    case "final_phase_ready":
      return runtime.finalPhaseReady;
    case "final_report_origin":
      return runtime.finalReportDraft.originNodeId === step.completion.nodeId;
    case "attack_path_prefix":
      return step.completion.path.every(
        (nodeId, index) =>
          runtime.finalReportDraft.attackPath[index] === nodeId,
      );
    case "attack_type":
      return runtime.finalReportDraft.attackType === step.completion.attackType;
    case "mitigation_selected":
      return runtime.finalReportDraft.mitigationPlan.includes(
        step.completion.mitigation,
      );
    case "evaluation_passed":
      return runtime.finalEvaluationPassed;
    default:
      return false;
  }
}

export function useTutorialController(
  enabled: boolean,
  runtime: TutorialRuntimeState,
) {
  const [stepIndex, setStepIndex] = useState(0);
  const [completedManualSteps, setCompletedManualSteps] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    if (!enabled) {
      setStepIndex(0);
      setCompletedManualSteps(new Set());
    }
  }, [enabled]);

  const steps = GUIDED_TUTORIAL_STEPS;
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];

  useEffect(() => {
    if (!enabled) return;
    if (stepIndex >= steps.length - 1) return;
    if (!isCompletionSatisfied(currentStep, runtime, completedManualSteps))
      return;
    setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
  }, [completedManualSteps, currentStep, enabled, runtime, stepIndex, steps]);

  const completeCurrentManualStep = useCallback(() => {
    if (!enabled) return;
    if (currentStep.completion.type !== "manual") return;
    setCompletedManualSteps((prev) => {
      const next = new Set(prev);
      next.add(currentStep.id);
      return next;
    });
  }, [currentStep, enabled]);

  const restartTutorial = useCallback(() => {
    setStepIndex(0);
    setCompletedManualSteps(new Set());
  }, []);

  const progress = useMemo(
    () => ({
      current: Math.min(stepIndex + 1, steps.length),
      total: steps.length,
    }),
    [stepIndex, steps.length],
  );

  return {
    enabled,
    currentStep,
    stepIndex,
    progress,
    completeCurrentManualStep,
    restartTutorial,
  };
}

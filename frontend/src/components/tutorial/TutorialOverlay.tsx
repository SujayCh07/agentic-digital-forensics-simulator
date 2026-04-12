"use client";

import { type CSSProperties, useEffect, useMemo, useState } from "react";
import type { TutorialStep } from "@/tutorial/tutorialTypes";
import { useTutorialNarration } from "@/tutorial/useTutorialNarration";

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface PositionedRect extends TargetRect {
  right: number;
  bottom: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function isRectEqual(a: TargetRect | null, b: TargetRect | null): boolean {
  if (!a || !b) return a === b;
  return (
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  );
}

function toPositionedRect(rect: TargetRect): PositionedRect {
  return {
    ...rect,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
  };
}

function intersects(a: PositionedRect, b: PositionedRect, buffer = 0): boolean {
  return !(
    a.right <= b.left - buffer ||
    a.left >= b.right + buffer ||
    a.bottom <= b.top - buffer ||
    a.top >= b.bottom + buffer
  );
}

function overlapArea(a: PositionedRect, b: PositionedRect): number {
  const overlapWidth = Math.max(
    0,
    Math.min(a.right, b.right) - Math.max(a.left, b.left),
  );
  const overlapHeight = Math.max(
    0,
    Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top),
  );
  return overlapWidth * overlapHeight;
}

function distanceBetween(a: PositionedRect, b: PositionedRect): number {
  const centerAX = a.left + a.width / 2;
  const centerAY = a.top + a.height / 2;
  const centerBX = b.left + b.width / 2;
  const centerBY = b.top + b.height / 2;
  return Math.hypot(centerAX - centerBX, centerAY - centerBY);
}

type TutorialTargetStatus = "ready" | "missing" | "disabled";

interface TutorialTargetState {
  rect: TargetRect | null;
  status: TutorialTargetStatus;
}

function isTargetStateEqual(
  a: TutorialTargetState,
  b: TutorialTargetState,
): boolean {
  return a.status === b.status && isRectEqual(a.rect, b.rect);
}

function useTutorialTargetState(step: TutorialStep) {
  const [targetState, setTargetState] = useState<TutorialTargetState>({
    rect: null,
    status: step.targetId ? "missing" : "ready",
  });

  useEffect(() => {
    if (!step.targetId) {
      setTargetState({ rect: null, status: "ready" });
      return;
    }

    let frame = 0;
    let scrolledToTarget = false;
    const update = () => {
      const element = document.querySelector<HTMLElement>(
        `[data-tutorial-id="${step.targetId}"]`,
      );
      if (!element) {
        setTargetState((prev) => {
          const next = { rect: null, status: "missing" as const };
          return isTargetStateEqual(prev, next) ? prev : next;
        });
        frame = window.requestAnimationFrame(update);
        return;
      }

      if (!scrolledToTarget) {
        element.scrollIntoView({
          block: "nearest",
          inline: "nearest",
          behavior: "smooth",
        });
        scrolledToTarget = true;
      }

      const raw = element.getBoundingClientRect();
      const padding = step.highlightPadding ?? 14;
      const next: TargetRect = {
        top: Math.max(0, raw.top - padding),
        left: Math.max(0, raw.left - padding),
        width: Math.min(window.innerWidth, raw.width + padding * 2),
        height: Math.min(window.innerHeight, raw.height + padding * 2),
      };
      const status = element.matches(":disabled, [aria-disabled='true']")
        ? "disabled"
        : "ready";
      setTargetState((prev) => {
        const nextState = { rect: next, status } satisfies TutorialTargetState;
        return isTargetStateEqual(prev, nextState) ? prev : nextState;
      });
      frame = window.requestAnimationFrame(update);
    };

    frame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frame);
  }, [step.highlightPadding, step.targetId]);

  return targetState;
}

function TutorialBlocker({
  style,
  onBlockedClick,
}: {
  style: CSSProperties;
  onBlockedClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label="Tutorial blocker"
      onClick={onBlockedClick}
      className="fixed z-[130] border-0 p-0"
      style={{
        ...style,
        background:
          "linear-gradient(180deg, rgba(4, 8, 13, 0.4), rgba(6, 12, 19, 0.52))",
      }}
    />
  );
}

export function TutorialOverlay({
  step,
  progress,
  onContinue,
  onRestart,
  coachTitle,
  coachBody,
}: {
  step: TutorialStep;
  progress: { current: number; total: number };
  onContinue: () => void;
  onRestart: () => void;
  coachTitle?: string;
  coachBody?: string;
}) {
  const { rect, status: targetStatus } = useTutorialTargetState(step);
  const [nudgeVisible, setNudgeVisible] = useState(false);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const narration = useTutorialNarration(
    true,
    step.id,
    [step.title, step.body, coachBody].filter(Boolean).join(". "),
  );

  useEffect(() => {
    const updateViewport = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    if (!nudgeVisible) return;
    const timeout = window.setTimeout(() => setNudgeVisible(false), 1400);
    return () => window.clearTimeout(timeout);
  }, [nudgeVisible]);

  useEffect(() => {
    if (step.completion.type !== "manual") return;
    if (!step.targetId || step.continueLabel) return;
    if (targetStatus !== "ready") return;

    const element = document.querySelector<HTMLElement>(
      `[data-tutorial-id="${step.targetId}"]`,
    );
    if (!element) return;

    let completed = false;
    const handleTargetClick = () => {
      if (completed) return;
      completed = true;
      window.setTimeout(() => onContinue(), 0);
    };

    element.addEventListener("click", handleTargetClick);
    return () => {
      element.removeEventListener("click", handleTargetClick);
    };
  }, [
    onContinue,
    step.completion.type,
    step.continueLabel,
    step.targetId,
    targetStatus,
  ]);

  const blockers = useMemo(() => {
    const width = viewport.width;
    const height = viewport.height;
    if (width === 0 || height === 0) return [];

    if (!rect) {
      return [
        {
          top: 0,
          left: 0,
          width,
          height,
        },
      ];
    }

    const right = rect.left + rect.width;
    const bottom = rect.top + rect.height;
    return [
      { top: 0, left: 0, width, height: rect.top },
      { top: rect.top, left: 0, width: rect.left, height: rect.height },
      {
        top: rect.top,
        left: right,
        width: Math.max(0, width - right),
        height: rect.height,
      },
      { top: bottom, left: 0, width, height: Math.max(0, height - bottom) },
    ].filter((blocker) => blocker.width > 0 && blocker.height > 0);
  }, [rect, viewport.height, viewport.width]);

  const margin = 20;
  const cardGap = 20;
  const topBarPosition = { left: 20, top: 16 };
  const cardWidth = useMemo(
    () =>
      viewport.width > 0
        ? Math.min(388, Math.max(320, viewport.width - margin * 2))
        : 388,
    [viewport.width],
  );
  const cardHeight = 252;
  const statusCopy =
    !step.targetId || step.completion.type === "manual"
      ? {
          label: "Briefing",
          tone: "#35f7cf",
          body: "Read the instruction card, then continue when you are ready.",
        }
      : targetStatus === "missing"
        ? {
            label: "Preparing next step",
            tone: "#ffcf70",
            body: "The tutorial is locating the next control. If it does not appear in a moment, reopen the highlighted surface or restart the tutorial.",
          }
        : targetStatus === "disabled"
          ? {
              label: "Waiting on the control",
              tone: "#ffb347",
              body: "The highlighted button is visible but not ready yet. This usually means the previous action is still finishing.",
            }
          : {
              label: "Action ready",
              tone: "#35f7cf",
              body: "Only the highlighted control is active for this step, so you can stay on the guaranteed win path.",
            };
  const requiresExplicitContinue =
    step.completion.type === "manual" &&
    (!step.targetId || Boolean(step.continueLabel));

  const cardPosition = useMemo(() => {
    const width = viewport.width;
    const height = viewport.height;
    if (width === 0 || height === 0) {
      return { left: margin, top: margin };
    }

    if (!rect || step.placement === "center") {
      return {
        left: clamp(
          (width - cardWidth) / 2,
          margin,
          width - cardWidth - margin,
        ),
        top: clamp(
          (height - cardHeight) / 2,
          margin,
          height - cardHeight - margin,
        ),
      };
    }

    const targetRect = toPositionedRect(rect);
    const placementOrder = [
      step.placement,
      "right",
      "left",
      "bottom",
      "top",
      "center",
    ].filter(
      (placement, index, array) => array.indexOf(placement) === index,
    ) as Array<TutorialStep["placement"]>;

    const candidateFor = (placement: TutorialStep["placement"]) => {
      switch (placement) {
        case "top":
          return {
            left: clamp(
              rect.left + rect.width / 2 - cardWidth / 2,
              margin,
              width - cardWidth - margin,
            ),
            top: clamp(
              rect.top - cardHeight - cardGap,
              margin,
              height - cardHeight - margin,
            ),
          };
        case "bottom":
          return {
            left: clamp(
              rect.left + rect.width / 2 - cardWidth / 2,
              margin,
              width - cardWidth - margin,
            ),
            top: clamp(
              rect.top + rect.height + cardGap,
              margin,
              height - cardHeight - margin,
            ),
          };
        case "left":
          return {
            left: clamp(
              rect.left - cardWidth - cardGap,
              margin,
              width - cardWidth - margin,
            ),
            top: clamp(
              rect.top + rect.height / 2 - cardHeight / 2,
              margin,
              height - cardHeight - margin,
            ),
          };
        case "right":
          return {
            left: clamp(
              rect.left + rect.width + cardGap,
              margin,
              width - cardWidth - margin,
            ),
            top: clamp(
              rect.top + rect.height / 2 - cardHeight / 2,
              margin,
              height - cardHeight - margin,
            ),
          };
        default:
          return {
            left: clamp(
              (width - cardWidth) / 2,
              margin,
              width - cardWidth - margin,
            ),
            top: clamp(
              (height - cardHeight) / 2,
              margin,
              height - cardHeight - margin,
            ),
          };
      }
    };

    const candidates = placementOrder.map((placement) => {
      const positioned = candidateFor(placement);
      const cardRect = toPositionedRect({
        ...positioned,
        width: cardWidth,
        height: cardHeight,
      });
      return {
        placement,
        position: positioned,
        cardRect,
        intersects: intersects(cardRect, targetRect, 12),
        overlap: overlapArea(cardRect, targetRect),
        distance: distanceBetween(cardRect, targetRect),
      };
    });

    const nonOverlapping = candidates.find(
      (candidate) => !candidate.intersects,
    );
    if (nonOverlapping) {
      return nonOverlapping.position;
    }

    const fallback = [...candidates].sort((a, b) => {
      if (a.overlap !== b.overlap) return a.overlap - b.overlap;
      return b.distance - a.distance;
    })[0];

    return fallback.position;
  }, [cardWidth, rect, step.placement, viewport.height, viewport.width]);

  return (
    <>
      {blockers.map((blocker, index) => (
        <TutorialBlocker
          key={`${step.id}-${index}`}
          style={blocker}
          onBlockedClick={() => setNudgeVisible(true)}
        />
      ))}

      <div
        className="fixed z-[131] pointer-events-none rounded-[24px] border bg-transparent"
        style={
          rect
            ? {
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                boxShadow:
                  "0 0 0 1px rgba(255,207,112,0.68), 0 0 0 6px rgba(255,207,112,0.08), 0 0 22px rgba(255,207,112,0.14)",
                borderColor: "rgba(255,207,112,0.88)",
                backdropFilter: "none",
              }
            : { display: "none" }
        }
      />

      {rect && targetStatus === "ready" && (
        <div
          className="fixed z-[132] pointer-events-none rounded-full border px-3 py-1 text-[9px] font-mono uppercase tracking-[0.14em]"
          style={{
            top: Math.max(16, rect.top - 34),
            left: clamp(
              rect.left + rect.width / 2 - 56,
              16,
              Math.max(112, viewport.width - 112),
            ),
            color: "#ffcf70",
            borderColor: "rgba(255,207,112,0.58)",
            background: "rgba(8,12,18,0.76)",
            boxShadow: "0 10px 28px rgba(0,0,0,0.28)",
          }}
        >
          Next Action
        </div>
      )}

      <div
        className="fixed z-[132] rounded-full border px-3 py-2"
        style={{
          left: topBarPosition.left,
          top: topBarPosition.top,
          background: "rgba(7, 14, 22, 0.72)",
          borderColor: "rgba(108, 164, 196, 0.26)",
          boxShadow: "0 12px 32px rgba(0,0,0,0.28)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="rounded-full px-2 py-1 text-[8px] font-mono uppercase tracking-[0.18em]"
            style={{
              color: "#ffcf70",
              background: "rgba(255,207,112,0.12)",
            }}
          >
            Guided Tutorial
          </div>
          <div className="text-[8px] font-mono" style={{ color: "#7aa5c6" }}>
            Step {progress.current} of {progress.total}
          </div>
        </div>
      </div>

      <div
        className="fixed z-[132] w-[388px] rounded-[28px] border p-5"
        style={{
          left: cardPosition.left,
          top: cardPosition.top,
          background:
            "linear-gradient(180deg, rgba(9,16,26,0.86), rgba(7,12,18,0.94))",
          borderColor: "rgba(108,164,196,0.22)",
          boxShadow:
            "0 20px 52px rgba(0,0,0,0.38), 0 0 22px rgba(255,207,112,0.06)",
        }}
      >
        <div
          className="mb-4 h-px w-full"
          style={{
            background:
              "linear-gradient(90deg, rgba(255,207,112,0.72), rgba(108,164,196,0.08))",
          }}
        />
        <div className="flex items-start justify-between gap-4">
          <div>
            <div
              className="text-[8px] font-mono uppercase tracking-[0.18em]"
              style={{ color: "#6ca4c4" }}
            >
              Guided Step
            </div>
            <div
              className="mt-1 text-[13px] font-mono uppercase tracking-[0.12em]"
              style={{ color: "#f1f7ff" }}
            >
              {step.title}
            </div>
          </div>
          <div
            className="rounded-full px-2.5 py-1 text-[8px] font-mono uppercase tracking-[0.14em]"
            style={{
              color: statusCopy.tone,
              background: `${statusCopy.tone}14`,
              border: `1px solid ${statusCopy.tone}40`,
            }}
          >
            {statusCopy.label}
          </div>
        </div>
        <p
          className="mt-3 text-[12px] font-mono leading-6"
          style={{ color: "#d8ecff" }}
        >
          {step.body}
        </p>
        <p
          className="mt-3 text-[9px] font-mono leading-5"
          style={{ color: "#7aa5c6" }}
        >
          {step.why}
        </p>

        <div
          className="mt-4 rounded-2xl border px-3 py-3 text-[8px] font-mono leading-5"
          style={{
            background: "rgba(12, 22, 34, 0.9)",
            borderColor: "rgba(108, 164, 196, 0.2)",
            color: "#8db4d0",
          }}
        >
          <div
            className="mb-1 text-[7px] font-mono uppercase tracking-[0.18em]"
            style={{ color: statusCopy.tone }}
          >
            Why this step is safe
          </div>
          <div>{statusCopy.body}</div>
          <div className="mt-2">
            {step.blockerHint ??
              "Other controls stay blocked for this step so the tutorial remains clear and unwinnable detours stay closed off."}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRestart}
              className="rounded-md border px-3 py-2 text-[9px] font-mono uppercase tracking-[0.14em] transition-opacity hover:opacity-80"
              style={{
                color: "#7aa5c6",
                borderColor: "rgba(108, 164, 196, 0.24)",
                background: "rgba(10,19,32,0.72)",
              }}
            >
              Restart Tutorial
            </button>
            {narration.supported && (
              <>
                <button
                  type="button"
                  onClick={() => narration.setMuted(!narration.muted)}
                  className="rounded-md border px-3 py-2 text-[9px] font-mono uppercase tracking-[0.14em] transition-opacity hover:opacity-80"
                  style={{
                    color: narration.muted ? "#6f87a1" : "#ffcf70",
                    borderColor: narration.muted
                      ? "rgba(108, 164, 196, 0.18)"
                      : "rgba(255, 207, 112, 0.3)",
                    background: "rgba(10,19,32,0.72)",
                  }}
                >
                  {narration.muted ? "Voice Off" : "Voice On"}
                </button>
                <button
                  type="button"
                  onClick={narration.replay}
                  disabled={narration.muted || !narration.unlocked}
                  className="rounded-md border px-3 py-2 text-[9px] font-mono uppercase tracking-[0.14em] transition-opacity hover:opacity-80 disabled:opacity-40"
                  style={{
                    color: "#d8ecff",
                    borderColor: "rgba(108, 164, 196, 0.24)",
                    background: "rgba(10,19,32,0.72)",
                  }}
                >
                  Replay Brief
                </button>
              </>
            )}
          </div>
          {requiresExplicitContinue ? (
            <button
              type="button"
              onClick={onContinue}
              className="rounded-md border px-4 py-2 text-[9px] font-mono uppercase tracking-[0.16em]"
              style={{
                color: "#35f7cf",
                borderColor: "rgba(53,247,207,0.5)",
                background:
                  "linear-gradient(180deg, rgba(53,247,207,0.14), rgba(53,247,207,0.08))",
                boxShadow: "0 10px 24px rgba(0,0,0,0.18)",
              }}
            >
              {step.continueLabel ?? "Continue"}
            </button>
          ) : (
            <div className="text-[8px] font-mono" style={{ color: "#6f87a1" }}>
              {step.completion.type === "manual"
                ? "Click the highlighted control and the tutorial will advance automatically."
                : targetStatus === "disabled"
                  ? "Wait for the highlighted control to unlock, then click it to continue."
                  : targetStatus === "missing"
                    ? "The tutorial is still locating this control."
                    : "Complete the highlighted action to continue."}
            </div>
          )}
        </div>
      </div>

      {(coachBody || coachTitle) && (
        <div
          className="fixed z-[132] max-w-[360px] rounded-[24px] border px-4 py-4"
          style={{
            left: 20,
            bottom: 20,
            background:
              "linear-gradient(180deg, rgba(8,15,24,0.82), rgba(7,12,18,0.92))",
            borderColor: "rgba(53,247,207,0.18)",
            boxShadow: "0 18px 40px rgba(0,0,0,0.3)",
          }}
        >
          <div
            className="text-[8px] font-mono uppercase tracking-[0.18em]"
            style={{ color: "#35f7cf" }}
          >
            {coachTitle ?? "Field Coach"}
          </div>
          <div
            className="mt-2 text-[10px] font-mono leading-6"
            style={{ color: "#cfe9ff" }}
          >
            {coachBody}
          </div>
        </div>
      )}

      {nudgeVisible && (
        <div
          className="fixed bottom-6 left-1/2 z-[133] -translate-x-1/2 rounded-full border px-4 py-2 text-[9px] font-mono uppercase tracking-[0.14em]"
          style={{
            color: "#ffcf70",
            borderColor: "rgba(255,207,112,0.4)",
            background: "rgba(8,12,18,0.88)",
            boxShadow: "0 10px 24px rgba(0,0,0,0.24)",
          }}
        >
          Stay with the highlighted control for this step.
        </div>
      )}
    </>
  );
}

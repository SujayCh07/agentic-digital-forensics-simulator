"use client";

/**
 * TutorialOverlay — guided tutorial callout + element highlight.
 *
 * Renders:
 *   1. A highlight ring around the element with data-tutorial-id matching
 *      the current step's targetId (tracked via getBoundingClientRect).
 *   2. A fixed callout card in the bottom-right corner with step title,
 *      body text, optional waiting indicator, and optional Next button.
 *
 * Does NOT blackout the screen. The game remains fully visible.
 * The highlight ring is pointer-events:none so it never blocks interaction.
 */

import { useEffect, useRef, useState } from "react";
import type { TutorialStep } from "@/lib/tutorialSteps";
import { TUTORIAL_STEPS } from "@/lib/tutorialSteps";

interface HighlightRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface TutorialOverlayProps {
  step: TutorialStep;
  stepIndex: number;
  isWaiting: boolean;
  onNext: () => void;
  onSkip: () => void;
}

export function TutorialOverlay({
  step,
  stepIndex,
  isWaiting,
  onNext,
  onSkip,
}: TutorialOverlayProps) {
  const [rect, setRect] = useState<HighlightRect | null>(null);
  const rafRef = useRef<number | null>(null);
  const totalSteps = TUTORIAL_STEPS.length;

  // ── Track target element position ──────────────────────────────────────────
  useEffect(() => {
    if (!step.targetId) {
      setRect(null);
      return;
    }

    const measure = () => {
      const el = document.querySelector<HTMLElement>(
        `[data-tutorial-id="${step.targetId}"]`,
      );
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ x: r.left - 4, y: r.top - 4, w: r.width + 8, h: r.height + 8 });
    };

    measure();

    // Re-measure periodically (layout can shift as game loads)
    const interval = window.setInterval(measure, 600);
    window.addEventListener("resize", measure);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("resize", measure);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [step.targetId]);

  // ── Compute callout arrow direction (point toward highlight) ───────────────
  const viewH = typeof window !== "undefined" ? window.innerHeight : 900;
  const highlightCenterY = rect ? rect.y + rect.h / 2 : 0;
  // Callout is fixed at bottom-right; arrow points up if target is below center
  const showArrow = !!rect && highlightCenterY < viewH * 0.65;

  const canAdvance = step.manualAdvance && !isWaiting;

  // ── Ring style ─────────────────────────────────────────────────────────────
  const ringStyle: string =
    step.highlightStyle === "pulse"
      ? "tutorial-ring-pulse"
      : step.highlightStyle === "glow"
        ? ""
        : "";

  return (
    <>
      {/* ── Highlight ring ─────────────────────────────────────────────────── */}
      {rect && (
        <div
          aria-hidden="true"
          className={`pointer-events-none fixed z-[95] rounded ${ringStyle}`}
          style={{
            left: rect.x,
            top: rect.y,
            width: rect.w,
            height: rect.h,
            border:
              step.highlightStyle === "glow"
                ? "2px solid #34d399"
                : "2px solid #00d4ff",
            boxShadow:
              step.highlightStyle === "glow"
                ? "0 0 0 1px #34d39944, 0 0 20px rgba(52,211,153,0.5)"
                : "0 0 0 1px #00d4ff44, 0 0 20px rgba(0,212,255,0.45)",
            transition:
              "left 0.2s ease, top 0.2s ease, width 0.2s ease, height 0.2s ease",
          }}
        />
      )}

      {/* ── Callout card ───────────────────────────────────────────────────── */}
      <div
        className="tutorial-callout-in fixed z-[96] flex flex-col"
        style={{
          bottom: 20,
          right: 20,
          width: 316,
          background: "#070e1a",
          border: "1px solid #1e3d5a",
          borderRadius: 6,
          boxShadow:
            "0 12px 40px rgba(0,0,0,0.85), 0 0 0 1px rgba(0,212,255,0.07)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          className="flex shrink-0 items-center justify-between px-4 py-2"
          style={{
            borderBottom: "1px solid #1e3d5a",
            background: "rgba(0,212,255,0.04)",
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="text-[8px] font-mono font-bold uppercase tracking-widest"
              style={{ color: "#00d4ff" }}
            >
              Tutorial
            </span>
            <span
              className="text-[8px] font-mono tabular-nums"
              style={{ color: "#2a5070" }}
            >
              {stepIndex + 1}/{totalSteps}
            </span>
          </div>
          <button
            type="button"
            onClick={onSkip}
            className="text-[8px] font-mono uppercase tracking-wider transition-opacity hover:opacity-80"
            style={{ color: "#2a5070" }}
          >
            Skip Tutorial
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ height: 2, background: "#0f1927" }}>
          <div
            style={{
              height: "100%",
              width: `${((stepIndex + 1) / totalSteps) * 100}%`,
              background: "#00d4ff",
              transition: "width 0.5s ease",
            }}
          />
        </div>

        {/* Body */}
        <div className="flex flex-col gap-2.5 px-4 py-3">
          <div
            className="text-[11px] font-mono font-bold leading-tight"
            style={{ color: "#c9d8e8" }}
          >
            {step.title}
          </div>

          <p
            className="text-[9.5px] font-mono leading-[1.65]"
            style={{ color: "#6f87a1" }}
          >
            {step.body}
          </p>

          {/* Waiting indicator */}
          {isWaiting && step.waitingText && (
            <div
              className="flex items-center gap-2 rounded px-2.5 py-1.5"
              style={{
                background: "rgba(0,212,255,0.05)",
                border: "1px solid #1e3d5a33",
              }}
            >
              <span
                className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full"
                style={{ background: "#00d4ff" }}
              />
              <span
                className="text-[8px] font-mono leading-snug"
                style={{ color: "#4a6580" }}
              >
                {step.waitingText}
              </span>
            </div>
          )}

          {/* Next button */}
          {canAdvance && (
            <button
              type="button"
              onClick={onNext}
              className="w-full rounded py-2 text-[10px] font-mono uppercase tracking-widest transition-opacity hover:opacity-80"
              style={{
                background: "rgba(0,212,255,0.1)",
                border: "1px solid #00d4ff55",
                color: "#00d4ff",
              }}
            >
              Next →
            </button>
          )}
        </div>

        {/* Arrow pointing up toward target (when target is above the callout) */}
        {showArrow && rect && (
          <div
            aria-hidden="true"
            className="pointer-events-none fixed"
            style={{
              // Vertical line from callout top to approx target bottom
              left: Math.min(
                Math.max(rect.x + rect.w / 2, 20),
                typeof window !== "undefined" ? window.innerWidth - 20 : 1000,
              ),
              top: rect.y + rect.h + 2,
              width: 1,
              height: Math.max(0, viewH - 68 - (rect.y + rect.h + 2)),
              background:
                "linear-gradient(to bottom, rgba(0,212,255,0.3), transparent)",
            }}
          />
        )}
      </div>
    </>
  );
}

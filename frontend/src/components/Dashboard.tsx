"use client";

import {
  PixelStatBar,
} from "@/components/dashboard/PixelStatBar";
import type { SimMetrics } from "@/types";

interface DashboardProps {
  metrics: SimMetrics;
  metricsHistory: SimMetrics[];
  phase: number;
  round: number;
  maxRounds: number;
  embedded?: boolean;
}

/* ─── Severity helpers ─── */

function highBadSeverity(v: number) {
  if (v < 0.3) return "good" as const;
  if (v < 0.6) return "warn" as const;
  return "bad" as const;
}

function highGoodSeverity(v: number) {
  if (v > 0.7) return "good" as const;
  if (v > 0.4) return "warn" as const;
  return "bad" as const;
}

function networkSeverity(v: number) {
  if (v < 0.3) return "neutral" as const;
  if (v < 0.65) return "warn" as const;
  return "bad" as const;
}

/* ─── Fill ratio normalization ─── */

function normalizeUnemployment(v: number): number {
  return Math.max(0, Math.min(1, (v - 3) / 7));
}

function normalizeInterestRate(v: number): number {
  return Math.max(0, Math.min(1, (v - 3) / 5));
}

function normalizeEggIndex(v: number): number {
  return Math.max(0, Math.min(1, (v - 0.5) / 4.5));
}

function normalizePrices(v: number): number {
  return Math.min(1, Math.abs(v) / 10);
}

/* ─── Trend computation ─── */

function computeTrend(
  history: SimMetrics[],
  getter: (m: SimMetrics) => number,
): "up" | "down" | null {
  if (history.length < 2) return null;
  const prev = getter(history[history.length - 2]);
  const curr = getter(history[history.length - 1]);
  const diff = curr - prev;
  if (Math.abs(diff) < 0.001) return null;
  return diff > 0 ? "up" : "down";
}

/* ─── Terminal-style text icons for noir theme ─── */
function TextIcon({ ch, color }: { ch: string; color: string }) {
  return (
    <span
      className="shrink-0 text-[10px] font-mono w-4 text-center leading-none"
      style={{ color }}
    >
      {ch}
    </span>
  );
}

export function Dashboard({
  metrics,
  metricsHistory,
  phase,
  round,
  maxRounds,
  embedded = false,
}: DashboardProps) {
  const content = (
    <>
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid #1e3d5a" }}
      >
        <span
          className="text-[10px] font-mono uppercase tracking-[0.16em]"
          style={{ color: "#00d4ff" }}
        >
          Stage {phase || "-"}
        </span>
        <span
          className="text-[11px] font-mono tabular-nums uppercase tracking-[0.14em]"
          style={{ color: "#4a6580" }}
        >
          Cycle {round}/{maxRounds}
        </span>
      </div>

      <div className="flex flex-col py-1">
        <PixelStatBar
          icon={<TextIcon ch="!" color="#ff3a3a" />}
          label="Corruption"
          value={metrics.eggIndex}
          formatValue={(v) => `${Math.min(99, Math.round(((v - 0.5) / 4.5) * 100))}%`}
          severity={highBadSeverity(normalizeEggIndex(metrics.eggIndex))}
          fillRatio={normalizeEggIndex(metrics.eggIndex)}
          trend={computeTrend(metricsHistory, (m) => m.eggIndex)}
        />
        <PixelStatBar
          icon={<TextIcon ch="◈" color="#00d4ff" />}
          label="Evidence Integrity"
          value={metrics.priceIndex}
          formatValue={(v) => `${Math.max(0, Math.round(100 - normalizePrices(v) * 100))}%`}
          severity={highGoodSeverity(1 - normalizePrices(metrics.priceIndex))}
          fillRatio={1 - normalizePrices(metrics.priceIndex)}
          trend={computeTrend(metricsHistory, (m) => -m.priceIndex)}
        />
        <PixelStatBar
          icon={<TextIcon ch="▣" color="#ff3a3a" />}
          label="Compromised"
          value={metrics.unemploymentRate}
          formatValue={(v) => `${v.toFixed(1)}%`}
          severity={highBadSeverity(normalizeUnemployment(metrics.unemploymentRate))}
          fillRatio={normalizeUnemployment(metrics.unemploymentRate)}
          trend={computeTrend(metricsHistory, (m) => m.unemploymentRate)}
        />
        <PixelStatBar
          icon={<TextIcon ch="~" color="#00d4ff" />}
          label="Network Activity"
          value={metrics.interestRate}
          formatValue={(v) => `${v.toFixed(1)}%`}
          severity={networkSeverity(normalizeInterestRate(metrics.interestRate))}
          fillRatio={normalizeInterestRate(metrics.interestRate)}
          trend={computeTrend(metricsHistory, (m) => m.interestRate)}
        />
        <PixelStatBar
          icon={<TextIcon ch="⚠" color="#f59e0b" />}
          label="Threat Level"
          value={metrics.socialUnrest}
          formatValue={(v) => `${(v * 100).toFixed(0)}%`}
          severity={highBadSeverity(metrics.socialUnrest)}
          fillRatio={metrics.socialUnrest}
          trend={computeTrend(metricsHistory, (m) => m.socialUnrest)}
        />
        <PixelStatBar
          icon={<TextIcon ch="■" color="#00ff88" />}
          label="Systems Online"
          value={metrics.businessSurvival}
          formatValue={(v) => `${(v * 100).toFixed(0)}%`}
          severity={highGoodSeverity(metrics.businessSurvival)}
          fillRatio={metrics.businessSurvival}
          trend={computeTrend(metricsHistory, (m) => m.businessSurvival)}
        />
        <PixelStatBar
          icon={<TextIcon ch="◆" color="#b06fff" />}
          label="Confidence"
          value={metrics.govApproval}
          formatValue={(v) => `${(v * 100).toFixed(0)}%`}
          severity={highGoodSeverity(metrics.govApproval)}
          fillRatio={metrics.govApproval}
          trend={computeTrend(metricsHistory, (m) => m.govApproval)}
        />
      </div>
    </>
  );

  if (embedded) {
    return <div data-testid="dashboard">{content}</div>;
  }

  return (
    <div
      className="rpg-panel flex w-full flex-col"
      data-testid="dashboard"
    >
      {content}
    </div>
  );
}

"use client";

/**
 * NIPS — Helper Selection Panel
 *
 * Shown before each case. Player picks ONE starter agent to deploy immediately.
 * The other three are locked and can be unlocked mid-case with credits.
 */

import { useState } from "react";
import {
  getHelperRoster,
  type PlayerProgress,
  purchaseHelper,
  saveProgress,
} from "@/lib/playerProgress";
import type { ActiveHelpers, AgentId, Helper } from "@/types/investigation";

interface HelperSelectionPanelProps {
  progress: PlayerProgress;
  onProgressChange: (p: PlayerProgress) => void;
  onConfirm: (helpers: ActiveHelpers) => void;
}

const ROLE_ORDER: AgentId[] = ["logis", "nexus", "filer", "chrono"];

const ROLE_COLOR: Record<AgentId, string> = {
  logis: "#c9d8e8",
  nexus: "#00d4ff",
  filer: "#f59e0b",
  chrono: "#b06fff",
};

const ROLE_LABEL: Record<AgentId, string> = {
  logis: "LOG ANALYSIS",
  nexus: "NET TRACING",
  filer: "FILE RECOVERY",
  chrono: "TIMELINE",
};

const ROLE_DESCRIPTION: Record<AgentId, string> = {
  logis: "Reads auth logs, detects anomalies, and traces credential abuse.",
  nexus: "Traces network connections, lateral movement, and traffic flows.",
  filer: "Recovers deleted files, inspects binaries, and finds hidden payloads.",
  chrono: "Reconstructs event timelines and cross-references system events.",
};

function StatBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="text-[7px] font-mono w-16 shrink-0 uppercase tracking-widest"
        style={{ color: "#2a5070" }}
      >
        {label}
      </span>
      <div
        className="flex-1 h-1 rounded-sm overflow-hidden"
        style={{ background: "#1e3d5a" }}
      >
        <div
          className="h-full rounded-sm transition-all duration-300"
          style={{ width: `${value * 100}%`, background: color }}
        />
      </div>
      <span
        className="text-[7px] font-mono tabular-nums w-6 text-right"
        style={{ color: "#4a6580" }}
      >
        {Math.round(value * 100)}
      </span>
    </div>
  );
}

function StarterAgentCard({
  role,
  helper,
  isSelected,
  onSelect,
  onUpgrade,
  credits,
  canUpgrade,
  upgradedHelper,
}: {
  role: AgentId;
  helper: Helper;
  isSelected: boolean;
  onSelect: () => void;
  onUpgrade: () => void;
  credits: number;
  canUpgrade: boolean;
  upgradedHelper: Helper | undefined;
}) {
  const roleColor = ROLE_COLOR[role];
  const displayHelper = canUpgrade && upgradedHelper ? upgradedHelper : helper;
  const canAffordUpgrade = upgradedHelper ? credits >= upgradedHelper.cost : false;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left flex flex-col gap-2 p-4 rounded transition-all"
      style={{
        background: isSelected ? `${roleColor}10` : "#080c12",
        border: `1px solid ${isSelected ? roleColor : "#1e3d5a"}`,
        cursor: "pointer",
        boxShadow: isSelected ? `0 0 16px ${roleColor}20, 0 0 1px ${roleColor}` : undefined,
      }}
    >
      {/* Role header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-6 rounded-sm"
            style={{ background: isSelected ? roleColor : "#1e3d5a" }}
          />
          <div>
            <div className="text-[11px] font-mono font-bold" style={{ color: isSelected ? roleColor : "#c9d8e8" }}>
              {displayHelper.name}
            </div>
            <div className="text-[7px] font-mono uppercase tracking-widest" style={{ color: "#2a5070" }}>
              {ROLE_LABEL[role]}
            </div>
          </div>
        </div>
        {isSelected && (
          <div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded"
            style={{ background: `${roleColor}15`, border: `1px solid ${roleColor}50` }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: roleColor, boxShadow: `0 0 4px ${roleColor}80` }} />
            <span className="text-[7px] font-mono uppercase" style={{ color: roleColor }}>STARTER</span>
          </div>
        )}
      </div>

      {/* Role description */}
      <p className="text-[7px] font-mono leading-relaxed" style={{ color: "#4a6580" }}>
        {ROLE_DESCRIPTION[role]}
      </p>

      {/* Specific helper description */}
      <p className="text-[7px] font-mono leading-relaxed" style={{ color: isSelected ? "#c9d8e8" : "#2a5070" }}>
        {displayHelper.description}
      </p>

      {/* Stats */}
      <div className="flex flex-col gap-1">
        <StatBar label="Speed"    value={displayHelper.efficiency} color={isSelected ? roleColor : "#2a5070"} />
        <StatBar label="Accuracy" value={displayHelper.accuracy}   color={isSelected ? roleColor : "#2a5070"} />
      </div>

      {/* Pre-case upgrade button */}
      {!canUpgrade && upgradedHelper && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onUpgrade(); }}
          disabled={!canAffordUpgrade}
          className="mt-0.5 w-full text-[7px] font-mono py-1 rounded transition-opacity"
          style={{
            background: canAffordUpgrade ? `${roleColor}18` : "#1e3d5a",
            border: `1px solid ${canAffordUpgrade ? `${roleColor}50` : "#2a5070"}`,
            color: canAffordUpgrade ? roleColor : "#2a5070",
            cursor: canAffordUpgrade ? "pointer" : "not-allowed",
          }}
        >
          {canAffordUpgrade
            ? `↑ UPGRADE TO ${upgradedHelper.name} — ${upgradedHelper.cost.toLocaleString()}₡`
            : `${upgradedHelper.cost.toLocaleString()}₡ to upgrade`}
        </button>
      )}
      {canUpgrade && (
        <div
          className="text-[7px] font-mono text-center py-0.5 rounded"
          style={{ background: `${roleColor}10`, color: roleColor, border: `1px solid ${roleColor}30` }}
        >
          ✓ UPGRADED
        </div>
      )}
    </button>
  );
}

export function HelperSelectionPanel({
  progress,
  onProgressChange,
  onConfirm,
}: HelperSelectionPanelProps) {
  // Default starter = logis, but player can switch before confirming
  const [starterRole, setStarterRole] = useState<AgentId>("logis");

  const handleUpgrade = (helperId: string) => {
    const updated = purchaseHelper(progress, helperId);
    if (!updated) return;
    saveProgress(updated);
    onProgressChange(updated);
  };

  const handleConfirm = () => {
    const freshRoster = getHelperRoster(progress);
    // Build ActiveHelpers with best available helper per role
    const helpers = Object.fromEntries(
      ROLE_ORDER.map((role) => {
        const lv2 = freshRoster.find((h) => h.role === role && h.level === 2 && h.unlocked);
        const lv1 = freshRoster.find((h) => h.role === role && h.level === 1) as Helper;
        return [role, lv2 ?? lv1];
      }),
    ) as ActiveHelpers;
    // Embed chosen starter so useInvestigation can derive which agents are locked
    onConfirm({ ...helpers, _starter: starterRole } as unknown as ActiveHelpers);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(4,8,14,0.97)" }}
    >
      <div
        className="rpg-panel flex flex-col"
        style={{ width: 820, maxHeight: "92vh" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid #1e3d5a" }}
        >
          <div>
            <div className="text-[11px] font-mono font-bold" style={{ color: "#00d4ff" }}>
              CHOOSE YOUR STARTER
            </div>
            <div className="text-[7px] font-mono uppercase tracking-widest mt-0.5" style={{ color: "#2a5070" }}>
              One specialist deploys immediately — unlock others mid-case with credits
            </div>
          </div>
          <div className="flex items-center gap-3">
            {progress.reputation > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[7px] font-mono uppercase tracking-widest" style={{ color: "#2a5070" }}>REP</span>
                <span className="text-[9px] font-mono tabular-nums" style={{ color: "#b06fff" }}>{progress.reputation}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 rpg-panel px-2 py-1">
              <span className="text-[8px] font-mono" style={{ color: "#2a5070" }}>₡</span>
              <span className="text-[10px] font-mono tabular-nums" style={{ color: "#00ff88" }}>
                {progress.credits.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Agent grid — 2x2 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-3">
            {ROLE_ORDER.map((role) => {
              const freshRoster = getHelperRoster(progress);
              const lv1 = freshRoster.find((h) => h.role === role && h.level === 1) as Helper;
              const lv2 = freshRoster.find((h) => h.role === role && h.level === 2);
              const lv2Unlocked = lv2?.unlocked ?? false;

              return (
                <StarterAgentCard
                  key={role}
                  role={role}
                  helper={lv1}
                  isSelected={starterRole === role}
                  onSelect={() => setStarterRole(role)}
                  onUpgrade={() => lv2 && handleUpgrade(lv2.id)}
                  credits={progress.credits}
                  canUpgrade={lv2Unlocked}
                  upgradedHelper={lv2}
                />
              );
            })}
          </div>

          {/* Info blurb */}
          <div
            className="mt-4 px-4 py-3 rounded"
            style={{ background: "#080c1280", border: "1px solid #1e3d5a" }}
          >
            <div className="text-[7px] font-mono uppercase tracking-widest mb-1" style={{ color: "#2a5070" }}>
              HOW IT WORKS
            </div>
            <p className="text-[7px] font-mono leading-relaxed" style={{ color: "#4a6580" }}>
              Your starter is the only agent available at case start. The other three specialists remain
              locked and can be deployed mid-investigation by spending credits earned from findings.
              {" "}Sending the wrong agent to a task wastes time and costs funds — choose wisely.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-5 py-3 shrink-0"
          style={{ borderTop: "1px solid #1e3d5a" }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: ROLE_COLOR[starterRole], boxShadow: `0 0 6px ${ROLE_COLOR[starterRole]}` }}
            />
            <span className="text-[8px] font-mono" style={{ color: ROLE_COLOR[starterRole] }}>
              Starting with {starterRole.toUpperCase()}
            </span>
            <span className="text-[8px] font-mono" style={{ color: "#2a5070" }}>
              — {ROLE_LABEL[starterRole]}
            </span>
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2 text-[9px] font-mono rounded transition-all"
            style={{
              background: "rgba(0,212,255,0.12)",
              border: "1px solid #00d4ff",
              color: "#00d4ff",
              cursor: "pointer",
              boxShadow: "0 0 12px rgba(0,212,255,0.15)",
            }}
          >
            DEPLOY {starterRole.toUpperCase()} →
          </button>
        </div>
      </div>
    </div>
  );
}

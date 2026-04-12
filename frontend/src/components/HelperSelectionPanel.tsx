"use client";

/**
 * EchoLocate — Helper Selection Panel
 *
 * Shown before each case. Player picks ONE starter agent to deploy immediately.
 * The other three are locked and can be unlocked mid-case with credits.
 */

import { useEffect, useState } from "react";
import {
  getHelperRoster,
  type PlayerProgress,
  purchaseHelper,
  saveProgress,
} from "@/lib/playerProgress";
import { audioManager } from "@/lib/audioManager";
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
  logis: "Reads logs and finds anomalies.",
  nexus: "Tracks connections and attack paths.",
  filer: "Recovers files and hidden payloads.",
  chrono: "Builds the timeline.",
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
        className="w-24 shrink-0 text-[9px] font-mono uppercase tracking-[0.14em]"
        style={{ color: "#2a5070" }}
      >
        {label}
      </span>
      <div
        className="h-2 flex-1 overflow-hidden rounded-sm"
        style={{ background: "#1e3d5a" }}
      >
        <div
          className="h-full rounded-sm transition-all duration-300"
          style={{ width: `${value * 100}%`, background: color }}
        />
      </div>
      <span
        className="w-10 text-right text-[9px] font-mono tabular-nums"
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
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(); } }}
      className="w-full min-h-[250px] text-left flex flex-col gap-4 p-6 rounded transition-all"
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
            <div className="text-[18px] font-mono font-bold" style={{ color: isSelected ? roleColor : "#c9d8e8" }}>
              {displayHelper.name}
            </div>
            <div className="text-[10px] font-mono uppercase tracking-[0.18em]" style={{ color: "#2a5070" }}>
              {ROLE_LABEL[role]}
            </div>
          </div>
        </div>
        {isSelected && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded"
            style={{ background: `${roleColor}15`, border: `1px solid ${roleColor}50` }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: roleColor, boxShadow: `0 0 4px ${roleColor}80` }} />
            <span className="text-[8px] font-mono uppercase tracking-[0.18em]" style={{ color: roleColor }}>Starter</span>
          </div>
        )}
      </div>

      <p className="text-[12px] font-mono leading-7" style={{ color: isSelected ? "#c9d8e8" : "#6e89a4" }}>
        {displayHelper.description}
      </p>

      <div className="text-[11px] font-mono uppercase tracking-[0.16em]" style={{ color: "#4a6580" }}>
        {ROLE_DESCRIPTION[role]}
      </div>

      {/* Stats */}
      <div className="mt-auto flex flex-col gap-1.5">
        <StatBar label="Speed"    value={displayHelper.efficiency} color={isSelected ? roleColor : "#2a5070"} />
        <StatBar label="Accuracy" value={displayHelper.accuracy}   color={isSelected ? roleColor : "#2a5070"} />
      </div>

      {/* Pre-case upgrade button */}
      {!canUpgrade && upgradedHelper && (
        <div
          onClick={(e) => { e.stopPropagation(); onUpgrade(); }}
          className="mt-1 w-full rounded py-2 text-center text-[10px] font-mono transition-opacity"
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
        </div>
      )}
      {canUpgrade && (
        <div
          className="rounded py-2 text-center text-[10px] font-mono"
          style={{ background: `${roleColor}10`, color: roleColor, border: `1px solid ${roleColor}30` }}
        >
          ✓ UPGRADED
        </div>
      )}
    </div>
  );
}

export function HelperSelectionPanel({
  progress,
  onProgressChange,
  onConfirm,
}: HelperSelectionPanelProps) {
  // Default starter = logis, but player can switch before confirming
  const [starterRole, setStarterRole] = useState<AgentId>("logis");

  // Start selection music and unlock audio on first interaction
  useEffect(() => {
    const unlock = () => audioManager.unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    audioManager.startSelectionMusic();
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const handleUpgrade = (helperId: string, canAfford: boolean) => {
    if (!canAfford) { audioManager.playLockedClick(); return; }
    audioManager.playButtonClick();
    const updated = purchaseHelper(progress, helperId);
    if (!updated) return;
    saveProgress(updated);
    onProgressChange(updated);
  };

  const handleConfirm = () => {
    audioManager.startGameplayMusic();
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
        style={{ width: 1180, maxWidth: "95vw", maxHeight: "95vh" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-7 py-6 shrink-0"
          style={{ borderBottom: "1px solid #1e3d5a" }}
        >
          <div>
            <div className="text-[11px] font-mono uppercase tracking-[0.16em]" style={{ color: "#00d4ff" }}>
              EchoLocate
            </div>
            <div className="text-[18px] font-mono font-bold tracking-[0.12em]" style={{ color: "#00d4ff" }}>
              CHOOSE YOUR STARTER
            </div>
            <div className="mt-1 text-[12px] font-mono uppercase tracking-[0.14em]" style={{ color: "#4a6580" }}>
              Pick one specialist to deploy first
            </div>
          </div>
          <div className="flex items-center gap-3">
            {progress.reputation > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase tracking-[0.14em]" style={{ color: "#2a5070" }}>REP</span>
                <span className="text-[13px] font-mono tabular-nums" style={{ color: "#b06fff" }}>{progress.reputation}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 rpg-panel px-3 py-1.5">
              <span className="text-[11px] font-mono" style={{ color: "#2a5070" }}>₡</span>
              <span className="text-[14px] font-mono tabular-nums" style={{ color: "#00ff88" }}>
                {progress.credits.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Agent grid — 2x2 */}
        <div className="flex-1 overflow-y-auto p-7">
          <div className="grid grid-cols-2 gap-5">
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
                  onSelect={() => { audioManager.playButtonClick(); setStarterRole(role); }}
                  onUpgrade={() => lv2 && handleUpgrade(lv2.id, progress.credits >= lv2.cost)}
                  credits={progress.credits}
                  canUpgrade={lv2Unlocked}
                  upgradedHelper={lv2}
                />
              );
            })}
          </div>

          <div className="mt-5 text-[11px] font-mono uppercase tracking-[0.18em]" style={{ color: "#4a6580" }}>
            The other specialists can be unlocked later with credits.
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-7 py-5 shrink-0"
          style={{ borderTop: "1px solid #1e3d5a" }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: ROLE_COLOR[starterRole], boxShadow: `0 0 6px ${ROLE_COLOR[starterRole]}` }}
            />
            <span className="text-[11px] font-mono" style={{ color: ROLE_COLOR[starterRole] }}>
              Starting with {starterRole.toUpperCase()}
            </span>
            <span className="text-[10px] font-mono uppercase tracking-[0.16em]" style={{ color: "#2a5070" }}>
              — {ROLE_LABEL[starterRole]}
            </span>
          </div>
          <button
            type="button"
            onClick={() => { audioManager.playButtonClick(); handleConfirm(); }}
            className="px-6 py-3 text-[11px] font-mono rounded transition-all"
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

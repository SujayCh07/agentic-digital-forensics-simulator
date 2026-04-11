"use client";

/**
 * NIPS — Helper Selection Panel
 *
 * Shown before each case. Player picks one helper per role,
 * can spend credits to unlock better helpers, then deploys.
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

function HelperCard({
  helper,
  isSelected,
  onSelect,
  onUnlock,
  credits,
  roleColor,
}: {
  helper: Helper;
  isSelected: boolean;
  onSelect: () => void;
  onUnlock: () => void;
  credits: number;
  roleColor: string;
}) {
  const canAfford = credits >= helper.cost;
  const isAvailable = helper.unlocked;

  return (
    <button
      type="button"
      onClick={isAvailable ? onSelect : undefined}
      className="w-full text-left flex flex-col gap-1.5 p-2.5 rounded transition-all"
      style={{
        background: isSelected ? `${roleColor}12` : "#080c12",
        border: `1px solid ${isSelected ? `${roleColor}60` : isAvailable ? "#1e3d5a" : "#111820"}`,
        cursor: isAvailable ? "pointer" : "default",
        opacity: !isAvailable && !canAfford ? 0.45 : 1,
        boxShadow: isSelected ? `0 0 10px ${roleColor}20` : undefined,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span
            className="text-[10px] font-mono font-bold"
            style={{ color: isAvailable ? roleColor : "#2a5070" }}
          >
            {helper.name}
          </span>
          <span
            className="text-[7px] font-mono px-1 rounded"
            style={{
              color: helper.level === 2 ? "#f59e0b" : "#2a5070",
              background: helper.level === 2 ? "#f59e0b15" : "#1e3d5a20",
              border: `1px solid ${helper.level === 2 ? "#f59e0b30" : "#1e3d5a"}`,
            }}
          >
            LV{helper.level}
          </span>
        </div>
        {isSelected && (
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: roleColor,
              boxShadow: `0 0 4px ${roleColor}80`,
            }}
          />
        )}
      </div>

      {/* Description */}
      <p
        className="text-[7px] font-mono leading-relaxed"
        style={{ color: "#4a6580" }}
      >
        {helper.description}
      </p>

      {/* Stats */}
      <div className="flex flex-col gap-1 mt-0.5">
        <StatBar
          label="Speed"
          value={helper.efficiency}
          color={isSelected ? roleColor : "#2a5070"}
        />
        <StatBar
          label="Accuracy"
          value={helper.accuracy}
          color={isSelected ? roleColor : "#2a5070"}
        />
      </div>

      {/* Locked state */}
      {!isAvailable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUnlock();
          }}
          disabled={!canAfford}
          className="mt-1 w-full text-[7px] font-mono py-0.5 rounded transition-opacity"
          style={{
            background: canAfford ? `${roleColor}18` : "#1e3d5a",
            border: `1px solid ${canAfford ? `${roleColor}50` : "#2a5070"}`,
            color: canAfford ? roleColor : "#2a5070",
            cursor: canAfford ? "pointer" : "not-allowed",
          }}
        >
          {canAfford
            ? `UNLOCK — ${helper.cost.toLocaleString()}₡`
            : `${helper.cost.toLocaleString()}₡ required`}
        </button>
      )}
    </button>
  );
}

export function HelperSelectionPanel({
  progress,
  onProgressChange,
  onConfirm,
}: HelperSelectionPanelProps) {
  const roster = getHelperRoster(progress);

  // Default selection: first unlocked helper per role
  const [selected, setSelected] = useState<Partial<Record<AgentId, string>>>(
    () =>
      Object.fromEntries(
        ROLE_ORDER.map((role) => {
          const first = roster.find((h) => h.role === role && h.unlocked);
          return [role, first?.id ?? null];
        }).filter(([, v]) => v !== null),
      ),
  );

  const handleUnlock = (helperId: string) => {
    const updated = purchaseHelper(progress, helperId);
    if (!updated) return;
    saveProgress(updated);
    onProgressChange(updated);
    // Auto-select newly unlocked helper
    const helper = roster.find((h) => h.id === helperId);
    if (helper) setSelected((prev) => ({ ...prev, [helper.role]: helperId }));
  };

  const allRolesSelected = ROLE_ORDER.every((role) => selected[role]);

  const handleConfirm = () => {
    if (!allRolesSelected) return;
    const freshRoster = getHelperRoster(progress);
    const helpers = Object.fromEntries(
      ROLE_ORDER.map((role) => {
        const h = freshRoster.find(
          (helper) => helper.id === selected[role],
        ) as Helper;
        return [role, h];
      }),
    ) as ActiveHelpers;
    onConfirm(helpers);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(4,8,14,0.97)" }}
    >
      <div
        className="rpg-panel flex flex-col"
        style={{ width: 760, maxHeight: "90vh" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 shrink-0"
          style={{ borderBottom: "1px solid #1e3d5a" }}
        >
          <div>
            <span
              className="text-[11px] font-mono font-bold"
              style={{ color: "#00d4ff" }}
            >
              ASSEMBLE TEAM
            </span>
            <span
              className="ml-3 text-[8px] font-mono uppercase tracking-widest"
              style={{ color: "#2a5070" }}
            >
              Select one specialist per role
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 rpg-panel px-2 py-1">
              <span
                className="text-[8px] font-mono"
                style={{ color: "#2a5070" }}
              >
                ₡
              </span>
              <span
                className="text-[10px] font-mono tabular-nums"
                style={{ color: "#00ff88" }}
              >
                {progress.credits.toLocaleString()}
              </span>
            </div>
            {progress.reputation > 0 && (
              <div className="flex items-center gap-1.5">
                <span
                  className="text-[7px] font-mono uppercase tracking-widest"
                  style={{ color: "#2a5070" }}
                >
                  REP
                </span>
                <span
                  className="text-[9px] font-mono tabular-nums"
                  style={{ color: "#b06fff" }}
                >
                  {progress.reputation}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Role columns */}
        <div className="flex-1 overflow-y-auto">
          <div
            className="grid grid-cols-4 gap-0"
            style={{ borderBottom: "1px solid #1e3d5a" }}
          >
            {ROLE_ORDER.map((role) => {
              const roleHelpers = getHelperRoster(progress).filter(
                (h) => h.role === role,
              );
              const roleColor = ROLE_COLOR[role];
              return (
                <div
                  key={role}
                  className="flex flex-col p-3 gap-2"
                  style={{ borderRight: "1px solid #1e3d5a" }}
                >
                  {/* Role label */}
                  <div
                    className="text-[8px] font-mono font-bold uppercase tracking-widest pb-2"
                    style={{
                      color: roleColor,
                      borderBottom: `1px solid ${roleColor}20`,
                    }}
                  >
                    {ROLE_LABEL[role]}
                  </div>

                  {/* Helper cards */}
                  {roleHelpers.map((helper) => (
                    <HelperCard
                      key={helper.id}
                      helper={helper}
                      isSelected={selected[role] === helper.id}
                      onSelect={() =>
                        setSelected((prev) => ({ ...prev, [role]: helper.id }))
                      }
                      onUnlock={() => handleUnlock(helper.id)}
                      credits={progress.credits}
                      roleColor={roleColor}
                    />
                  ))}
                </div>
              );
            })}
          </div>

          {/* Team summary */}
          <div className="px-5 py-3 flex items-center gap-4">
            <span
              className="text-[8px] font-mono uppercase tracking-widest shrink-0"
              style={{ color: "#2a5070" }}
            >
              Active team
            </span>
            {ROLE_ORDER.map((role) => {
              const helperId = selected[role];
              const helper = getHelperRoster(progress).find(
                (h) => h.id === helperId,
              );
              const roleColor = ROLE_COLOR[role];
              return (
                <div
                  key={role}
                  className="flex items-center gap-1.5 rpg-panel px-2 py-1"
                  style={{
                    border: `1px solid ${helper ? `${roleColor}40` : "#1e3d5a"}`,
                  }}
                >
                  <span
                    className="text-[8px] font-mono"
                    style={{ color: helper ? roleColor : "#2a5070" }}
                  >
                    {helper ? helper.name : "—"}
                  </span>
                  {helper && (
                    <span
                      className="text-[6px] font-mono"
                      style={{ color: "#2a5070" }}
                    >
                      E{Math.round(helper.efficiency * 100)} A
                      {Math.round(helper.accuracy * 100)}
                    </span>
                  )}
                </div>
              );
            })}
            <div className="flex-1" />
            <span className="text-[7px] font-mono" style={{ color: "#1e3d5a" }}>
              Higher stats = faster execution, more precise findings
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-5 py-3 shrink-0"
          style={{ borderTop: "1px solid #1e3d5a" }}
        >
          <p className="text-[7px] font-mono" style={{ color: "#1e3d5a" }}>
            Earn credits by completing cases — upgrade before your next
            deployment.
          </p>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!allRolesSelected}
            className="px-5 py-2 text-[9px] font-mono rounded transition-all"
            style={{
              background: allRolesSelected ? "rgba(0,212,255,0.12)" : "#0d1520",
              border: `1px solid ${allRolesSelected ? "#00d4ff" : "#1e3d5a"}`,
              color: allRolesSelected ? "#00d4ff" : "#2a5070",
              cursor: allRolesSelected ? "pointer" : "not-allowed",
              boxShadow: allRolesSelected
                ? "0 0 12px rgba(0,212,255,0.15)"
                : undefined,
            }}
          >
            DEPLOY TEAM →
          </button>
        </div>
      </div>
    </div>
  );
}

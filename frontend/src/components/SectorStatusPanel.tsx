"use client";

import { useState } from "react";
import {
  PRIMARY_CYBER_CITY_SECTOR_SEEDS,
  computeSectorThreatStatuses,
  DOMAIN_LABEL_BY_SECTOR,
} from "@/data/cyberCitySectors";
import { getPrimaryCase } from "@/data/sectorCases";
import { audioManager } from "@/lib/audioManager";
import type { SectorId } from "@/types/investigation";
import { SECTOR_COLORS } from "@/types/sectors";

interface SectorStatusPanelProps {
  activeSectorId: SectorId | null;
  pressureLevel: number; // 0–10 from investigation hook
  onSectorClick: (sectorId: SectorId) => void;
}

/** Short status blurbs shown in the hover tooltip, keyed by threat tier */
const THREAT_BLURBS: Record<
  SectorId,
  { secure: string; suspicious: string; alert: string; breached: string }
> = {
  "EDU-01": {
    secure: "Research lab sensors are quiet. Build runners and glass-lab terminals are stable.",
    suspicious: "Late-night lab access and unusual package pulls are showing up inside the research wing.",
    alert: "The glass-lab build stack is leaking artifacts toward the security perimeter.",
    breached: "Research workstations inside the glass lab are staging code and model data for theft.",
  },
  "AUTH-05": {
    secure: "Badge readers, identity brokers, and gate access are enforcing cleanly.",
    suspicious: "Access failures are rising at the security bastion with unusual token reuse patterns.",
    alert: "Credential replay is hitting the fortress gateway and forcing emergency policy checks.",
    breached: "Security gateway trust has been broken. Admin credentials can move laterally across districts.",
  },
  "FIN-03": {
    secure: "Finance tower transaction lanes are validating cleanly.",
    suspicious: "Settlement queries and ledger reads are drifting above baseline inside the tower core.",
    alert: "The neon tower is servicing unauthorized treasury queries and off-hours bulk exports.",
    breached: "Transaction systems in the finance tower are compromised and preparing destructive actions.",
  },
  "CIV-08": {
    secure: "Transit and civic orchestration queues are flowing normally through the central hub.",
    suspicious: "Civic routing jobs are stalling and transit control messages are arriving out of order.",
    alert: "The civic hub is misrouting approvals and dispatch traffic across the lower district.",
    breached: "Core civic and transit processes are compromised inside the lower central hub.",
  },
  "MED-02": {
    secure: "Clinical monitoring and diagnostics remain stable inside the medical block.",
    suspicious: "After-hours access is appearing in diagnostics consoles and patient relay panels.",
    alert: "Synthetic alarms are masking real events throughout the medical sector.",
    breached: "Medical monitoring and diagnostics have been compromised across the hospital footprint.",
  },
  "PWR-06": {
    secure: "Cooling towers and compute racks are balanced. Power draw is nominal.",
    suspicious: "Cooling telemetry and compute hall loads are diverging in the shared infra yard.",
    alert: "The power-plant/data-core zone is showing malicious process activity across servers and controls.",
    breached: "Compute and plant control systems are compromised across the shared infrastructure block.",
  },
  "CLOUD-07": {
    secure: "Telemetry dishes, uplink relays, and launch systems are synchronized.",
    suspicious: "Launch telemetry and external relay packets are drifting at the comms square.",
    alert: "The comms relay is forwarding anomalous uplink data toward the launch pad systems.",
    breached: "Rocket square communications are compromised and leaking external telemetry.",
  },
  "NET-04": {
    secure: "Peripheral habitat traffic remains low and non-operational.",
    suspicious: "Minor utility chatter detected in the inactive top-right block.",
    alert: "Unexpected relay activity spotted in the inactive perimeter block.",
    breached: "Inactive top-right structures are being used as a staging relay.",
  },
};

function threatTier(
  threat: number,
): "secure" | "suspicious" | "alert" | "breached" {
  if (threat >= 70) return "breached";
  if (threat >= 40) return "alert";
  if (threat >= 20) return "suspicious";
  return "secure";
}

function statusLabel(threat: number): { text: string; color: string } {
  if (threat >= 70) return { text: "BREACHED", color: "#ef4444" };
  if (threat >= 40) return { text: "ALERT", color: "#f59e0b" };
  if (threat >= 20) return { text: "SUSPICIOUS", color: "#facc15" };
  return { text: "SECURE", color: "#34d399" };
}

function barColor(threat: number, accent: string) {
  if (threat >= 70) return "#ef4444";
  if (threat >= 40) return "#f59e0b";
  if (threat >= 20) return "#facc15";
  return accent;
}

// ── Sub-components ──────────────────────────────────────────────────────────

function ThreatBar({ threat, color }: { threat: number; color: string }) {
  const fill = barColor(threat, color);
  return (
    <div
      className="relative h-1.5 w-full rounded-full overflow-hidden"
      style={{ background: "#0f1927" }}
    >
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${threat}%`,
          background: fill,
          boxShadow: threat >= 40 ? `0 0 6px ${fill}88` : "none",
        }}
      />
    </div>
  );
}

interface HoverTooltipProps {
  sectorId: SectorId;
  threat: number;
  isActive: boolean;
}

function HoverTooltip({ sectorId, threat, isActive }: HoverTooltipProps) {
  const color = SECTOR_COLORS[sectorId] ?? "#00d4ff";
  const status = statusLabel(threat);
  const tier = threatTier(threat);
  const blurb = THREAT_BLURBS[sectorId]?.[tier] ?? "";
  const fill = barColor(threat, color);

  // Use case title if sector has an active investigation
  const caseData = getPrimaryCase(sectorId);
  const title = caseData?.title ?? status.text;

  return (
    <div
      className="absolute right-full top-0 mr-2 z-50 w-52 rounded-lg overflow-hidden pointer-events-none"
      style={{
        background: "#07111e",
        border: `1px solid ${color}44`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.7), 0 0 16px ${color}18`,
      }}
    >
      {/* Tooltip header */}
      <div
        className="px-3 py-2"
        style={{
          borderBottom: `1px solid ${color}22`,
          background: `${color}0a`,
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-[9px] font-mono tracking-widest"
            style={{ color }}
          >
            {sectorId}
          </span>
          <span
            className="text-[8px] font-mono tracking-wider"
            style={{ color: status.color }}
          >
            {status.text}
          </span>
        </div>
        <div className="text-[10px] font-mono font-semibold text-white mt-0.5 leading-tight">
          {title}
        </div>
      </div>

      {/* Threat bar */}
      <div
        className="px-3 py-2"
        style={{ borderBottom: `1px solid ${color}11` }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[8px] font-mono" style={{ color: "#4a6580" }}>
            THREAT LEVEL
          </span>
          <span
            className="ml-auto text-[8px] font-mono tabular-nums"
            style={{ color: fill }}
          >
            {threat}%
          </span>
        </div>
        <div
          className="h-2 w-full rounded-full overflow-hidden"
          style={{ background: "#0f1927" }}
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${threat}%`,
              background: fill,
              boxShadow: threat >= 40 ? `0 0 8px ${fill}99` : "none",
            }}
          />
        </div>
      </div>

      {/* Blurb */}
      <div className="px-3 py-2">
        <p
          className="text-[9px] font-mono leading-[1.55]"
          style={{ color: "#6f87a1" }}
        >
          {blurb}
        </p>
        {isActive && caseData && (
          <div
            className="mt-2 text-[8px] font-mono tracking-wider"
            style={{ color }}
          >
            › INVESTIGATION ACTIVE
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export function SectorStatusPanel({
  activeSectorId,
  pressureLevel,
  onSectorClick,
}: SectorStatusPanelProps) {
  const statuses = computeSectorThreatStatuses(activeSectorId, pressureLevel);
  const [hoveredSector, setHoveredSector] = useState<SectorId | null>(null);

  return (
    <div
      className="rpg-panel panel-slide-right flex h-full flex-col"
      style={{ width: 224 }}
    >
      {/* Header */}
      <div
        className="shrink-0 px-4 py-3"
        style={{ borderBottom: "1px solid #1e3d5a" }}
      >
        <h2
          className="text-[10px] font-mono uppercase tracking-[0.16em]"
          style={{ color: "#00d4ff" }}
        >
          Mapped Systems
        </h2>
        <p
          className="mt-1 text-[9px] font-mono leading-4"
          style={{ color: "#2a5070" }}
        >
          Hover to inspect · Click to investigate
        </p>
      </div>

      {/* Sector list */}
      <div className="flex-1 overflow-y-auto">
        {statuses.map(({ sectorId, threat }) => {
          const color = SECTOR_COLORS[sectorId] ?? "#00d4ff";
          const isActive = sectorId === activeSectorId;
          const isHovered = sectorId === hoveredSector;
          const status = statusLabel(threat);
          const seed = PRIMARY_CYBER_CITY_SECTOR_SEEDS.find((entry) => entry.id === sectorId);
          if (!seed) return null;

          return (
            <div key={sectorId} className="relative">
              {/* Hover tooltip — floats to the left */}
              {isHovered && (
                <HoverTooltip
                  sectorId={sectorId}
                  threat={threat}
                  isActive={isActive}
                />
              )}

              <button
                type="button"
                onClick={() => {
                  audioManager.playButtonClick();
                  onSectorClick(sectorId);
                }}
                onMouseEnter={() => setHoveredSector(sectorId)}
                onMouseLeave={() => setHoveredSector(null)}
                className="w-full text-left px-4 py-3 transition-all duration-150"
                style={{
                  borderBottom: "1px solid #0e1824",
                  background: isActive
                    ? `${color}18`
                    : isHovered
                      ? `${color}0d`
                      : "transparent",
                  cursor: "pointer",
                }}
              >
                {/* Row 1: ID + status badge */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{
                        background: color,
                        boxShadow:
                          isActive || isHovered ? `0 0 6px ${color}` : "none",
                      }}
                    />
                    <span
                      className="text-[10px] font-mono font-bold"
                      style={{
                        color: isActive
                          ? color
                          : isHovered
                            ? "#e2eaf2"
                            : "#c9d8e8",
                      }}
                    >
                      {sectorId}
                    </span>
                  </div>
                  <span
                    className="text-[8px] font-mono tracking-wider"
                    style={{ color: status.color }}
                  >
                    {status.text}
                  </span>
                </div>

                {/* Domain name */}
                <div
                  className="text-[8px] font-mono mb-2 truncate"
                  style={{ color: "#4a6580" }}
                >
                  {seed.locationName}
                </div>

                <div
                  className="text-[8px] font-mono mb-2 truncate"
                  style={{ color: "#2a5070" }}
                >
                  {DOMAIN_LABEL_BY_SECTOR[sectorId]}
                </div>

                {/* Threat bar + percentage */}
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <ThreatBar threat={threat} color={color} />
                  </div>
                  <span
                    className="text-[8px] font-mono tabular-nums w-8 text-right flex-shrink-0"
                    style={{ color: status.color }}
                  >
                    {threat}%
                  </span>
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer: overall network health */}
      <div
        className="shrink-0 px-4 py-3"
        style={{ borderTop: "1px solid #1e3d5a" }}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] font-mono" style={{ color: "#2a5070" }}>
            NETWORK INTEGRITY
          </span>
          <span
            className="text-[9px] font-mono tabular-nums"
            style={{
              color:
                pressureLevel >= 7
                  ? "#ef4444"
                  : pressureLevel >= 4
                    ? "#f59e0b"
                    : "#34d399",
            }}
          >
            {Math.max(0, 100 - Math.round(pressureLevel * 9))}%
          </span>
        </div>
        <div
          className="h-1 w-full rounded-full overflow-hidden"
          style={{ background: "#0f1927" }}
        >
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${Math.max(0, 100 - pressureLevel * 9)}%`,
              background:
                pressureLevel >= 7
                  ? "#ef4444"
                  : pressureLevel >= 4
                    ? "#f59e0b"
                    : "#34d399",
            }}
          />
        </div>
        <div
          className="mt-2 text-[8px] font-mono leading-4"
          style={{ color: "#2a5070" }}
        >
          Top-right habitat block is intentionally inactive and excluded from major-system routing.
        </div>
      </div>
    </div>
  );
}

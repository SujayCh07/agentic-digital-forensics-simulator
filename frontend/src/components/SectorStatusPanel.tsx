"use client";

import { useState } from "react";
import {
  CYBER_CITY_LINKS,
  DOMAIN_LABEL_BY_SECTOR,
} from "@/data/cyberCitySectors";
import { getPrimaryCase } from "@/data/sectorCases";
import { audioManager } from "@/lib/audioManager";
import type { SectorId } from "@/types/investigation";
import { SECTOR_COLORS } from "@/types/sectors";

interface SectorStatus {
  sectorId: SectorId;
  threat: number; // 0–100
}

interface SectorStatusPanelProps {
  activeSectorId: SectorId | null;
  pressureLevel: number; // 0–10 from investigation hook
  onSectorClick: (sectorId: SectorId) => void;
}

const SECTOR_SEED: Record<SectorId, number> = {
  "EDU-01": 0.17,
  "MED-02": 0.43,
  "FIN-03": 0.61,
  "NET-04": 0.29,
  "AUTH-05": 0.72,
  "PWR-06": 0.38,
  "CLOUD-07": 0.54,
  "CIV-08": 0.11,
};

/** Short status blurbs shown in the hover tooltip, keyed by threat tier */
const THREAT_BLURBS: Record<
  SectorId,
  { secure: string; suspicious: string; alert: string; breached: string }
> = {
  "EDU-01": {
    secure: "All research systems nominal. No anomalous traffic detected.",
    suspicious: "Unusual late-night access patterns on faculty VPN endpoints.",
    alert:
      "Outbound data spikes from the AI research cluster. CI pipeline flagged.",
    breached:
      "Unauthorized commit deployed. Build runner phoning home to external C2.",
  },
  "NET-04": {
    secure: "ISP backbone routing cleanly. No packet anomalies.",
    suspicious: "Minor BGP route fluctuations on upstream peers.",
    alert:
      "Abnormal traffic volumes on core switching fabric. Spoofed packets detected.",
    breached:
      "DNS poisoning confirmed. Backbone redirecting traffic to rogue endpoints.",
  },
  "AUTH-05": {
    secure:
      "Identity gateway fully operational. MFA enforced across all users.",
    suspicious: "Elevated failed login attempts from off-campus IPs.",
    alert:
      "Credential stuffing underway. Multiple accounts temporarily suspended.",
    breached:
      "Admin tokens exfiltrated. Threat actor has lateral movement capability.",
  },
  "FIN-03": {
    secure: "Core banking systems stable. All transactions validated.",
    suspicious: "High-frequency micro-transactions flagged by fraud detection.",
    alert:
      "SWIFT bridge logs show unauthorized query patterns. Audit mode enabled.",
    breached:
      "Ransomware payload executing. Financial records being encrypted.",
  },
  "PWR-06": {
    secure: "Grid control systems nominal. All substations responding.",
    suspicious:
      "HMI interface accessed from unrecognised maintenance terminal.",
    alert: "SCADA commands being replayed from spoofed controller address.",
    breached: "Cascading shutdowns initiated by malicious PLC instruction set.",
  },
  "CIV-08": {
    secure: "Transit and civic operations running on schedule.",
    suspicious:
      "Civic database returning unexpected NULL fields on audit queries.",
    alert: "Emergency dispatch routing compromised. Calls being redirected.",
    breached:
      "Mission control uplink severed. Manual override protocols engaged.",
  },
  "CLOUD-07": {
    secure: "Cloud archive fully replicated. All backups verified.",
    suspicious: "Storage bucket ACL drift detected on three archive nodes.",
    alert:
      "Large-scale data reads on cold storage. Exfiltration risk elevated.",
    breached:
      "Backup encryption keys exposed. Archive integrity cannot be guaranteed.",
  },
  "MED-02": {
    secure: "Patient systems and diagnostics operating normally.",
    suspicious: "After-hours access to diagnostics DB from staff credentials.",
    alert:
      "Alert queue flooded with synthetic alarms masking privilege escalation.",
    breached:
      "Patient monitoring feeds compromised. Real alerts being suppressed.",
  },
};

const SECTOR_ORDER: SectorId[] = [
  "EDU-01",
  "NET-04",
  "AUTH-05",
  "FIN-03",
  "PWR-06",
  "CIV-08",
  "CLOUD-07",
  "MED-02",
];

function computeThreats(
  activeSectorId: SectorId | null,
  pressureLevel: number,
): SectorStatus[] {
  const suspiciousNeighbors = new Set<SectorId>();
  if (activeSectorId) {
    for (const link of CYBER_CITY_LINKS) {
      if (!link.suspicious) continue;
      if (link.sourceId === activeSectorId)
        suspiciousNeighbors.add(link.targetId);
      if (link.targetId === activeSectorId)
        suspiciousNeighbors.add(link.sourceId);
    }
  }

  return SECTOR_ORDER.map((sectorId) => {
    const seed = SECTOR_SEED[sectorId] ?? 0.5;
    const p = Math.min(pressureLevel / 10, 1);

    let threat: number;
    if (sectorId === activeSectorId) {
      threat = 70 + p * 25;
    } else if (suspiciousNeighbors.has(sectorId)) {
      threat = 30 + seed * 15 + p * 20;
    } else {
      threat = 3 + seed * 12 + p * 15;
    }

    return { sectorId, threat: Math.min(Math.round(threat), 100) };
  });
}

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
  const caseData = isActive ? getPrimaryCase(sectorId) : null;
  const title = caseData ? caseData.title : status.text;

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
  const statuses = computeThreats(activeSectorId, pressureLevel);
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
          Sector Integrity
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
      </div>
    </div>
  );
}

"use client";

import {
  CYBER_CITY_LINKS,
  DOMAIN_LABEL_BY_SECTOR,
} from "@/data/cyberCitySectors";
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

/** Deterministic per-sector seed so each sector has a unique baseline variance */
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

const SECTOR_ORDER: SectorId[] = [
  "EDU-01",
  "NET-04",
  "AUTH-05",
  "FIN-03",
  "MED-02",
  "CIV-08",
  "PWR-06",
  "CLOUD-07",
];

function computeThreats(
  activeSectorId: SectorId | null,
  pressureLevel: number,
): SectorStatus[] {
  // Sectors connected to the active sector via suspicious links are elevated
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
    const p = Math.min(pressureLevel / 10, 1); // 0–1

    let threat: number;
    if (sectorId === activeSectorId) {
      // Active investigation: 70–95% based on pressure
      threat = 70 + p * 25;
    } else if (suspiciousNeighbors.has(sectorId)) {
      // Suspicious neighbor: 30–65%
      threat = 30 + seed * 15 + p * 20;
    } else {
      // Background noise: 3–30% based on seed + pressure
      threat = 3 + seed * 12 + p * 15;
    }

    return { sectorId, threat: Math.min(Math.round(threat), 100) };
  });
}

function ThreatBar({ threat, color }: { threat: number; color: string }) {
  const barColor =
    threat >= 70
      ? "#ef4444"
      : threat >= 40
        ? "#f59e0b"
        : threat >= 20
          ? "#facc15"
          : color;

  return (
    <div
      className="relative h-1.5 w-full rounded-full overflow-hidden"
      style={{ background: "#0f1927" }}
    >
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${threat}%`,
          background: barColor,
          boxShadow: threat >= 40 ? `0 0 6px ${barColor}88` : "none",
        }}
      />
    </div>
  );
}

function statusLabel(threat: number): { text: string; color: string } {
  if (threat >= 70) return { text: "BREACHED", color: "#ef4444" };
  if (threat >= 40) return { text: "ALERT", color: "#f59e0b" };
  if (threat >= 20) return { text: "SUSPICIOUS", color: "#facc15" };
  return { text: "SECURE", color: "#34d399" };
}

export function SectorStatusPanel({
  activeSectorId,
  pressureLevel,
  onSectorClick,
}: SectorStatusPanelProps) {
  const statuses = computeThreats(activeSectorId, pressureLevel);

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
          Click a sector to investigate
        </p>
      </div>

      {/* Sector list */}
      <div className="flex-1 overflow-y-auto">
        {statuses.map(({ sectorId, threat }) => {
          const color = SECTOR_COLORS[sectorId] ?? "#00d4ff";
          const isActive = sectorId === activeSectorId;
          const status = statusLabel(threat);

          return (
            <button
              key={sectorId}
              type="button"
              onClick={() => {
                audioManager.playButtonClick();
                onSectorClick(sectorId);
              }}
              className="w-full text-left px-4 py-3 transition-colors"
              style={{
                borderBottom: "1px solid #0e1824",
                background: isActive ? `${color}12` : "transparent",
                cursor: "pointer",
              }}
            >
              {/* Row 1: ID + status */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{
                      background: color,
                      boxShadow: isActive ? `0 0 6px ${color}` : "none",
                    }}
                  />
                  <span
                    className="text-[10px] font-mono font-bold"
                    style={{ color: isActive ? color : "#c9d8e8" }}
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
          );
        })}
      </div>

      {/* Footer: overall health */}
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

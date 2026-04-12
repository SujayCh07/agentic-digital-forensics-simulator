"use client";

import type { MouseEvent } from "react";
import { getPrimaryCase } from "@/data/sectorCases";
import { audioManager } from "@/lib/audioManager";
import type { SectorId } from "@/types/investigation";
import type { SectorCase } from "@/types/sectors";
import { SECTOR_COLORS, SECTOR_NAMES } from "@/types/sectors";

interface CaseModalProps {
  sectorId: SectorId;
  onStartInvestigation: (sectorCase: SectorCase) => void;
  onClose: () => void;
}

const DIFFICULTY_LABEL: Record<SectorCase["difficulty"], string> = {
  low: "LOW",
  medium: "MEDIUM",
  high: "HIGH",
  critical: "CRITICAL",
};

const DIFFICULTY_COLOR: Record<SectorCase["difficulty"], string> = {
  low: "#34d399",
  medium: "#f59e0b",
  high: "#fb923c",
  critical: "#ef4444",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  malicious_code_commit: "Malicious Code Commit",
  compromised_research_server: "Compromised Server",
  anomaly_detection: "Anomaly Detection",
  alert_flood: "Alert Flood",
  ransomware: "Ransomware",
  data_exfiltration: "Data Exfiltration",
  packet_anomalies: "Packet Anomalies",
  traffic_spike: "Traffic Spike",
  brute_force_login: "Brute Force Login",
  credential_theft: "Credential Theft",
  server_compromise: "Server Compromise",
  storage_breach: "Storage Breach",
  process_overload: "Process Overload",
  messaging_anomalies: "Messaging Anomalies",
  multi_sector_attack: "Multi-Sector Attack",
  cascading_failure: "Cascading Failure",
};

export function CaseModal({
  sectorId,
  onStartInvestigation,
  onClose,
}: CaseModalProps) {
  const sectorCase = getPrimaryCase(sectorId);
  const accentColor = SECTOR_COLORS[sectorId] ?? "#00d4ff";
  const sectorName = SECTOR_NAMES[sectorId] ?? sectorId;

  if (!sectorCase) return null;

  const difficultyColor = DIFFICULTY_COLOR[sectorCase.difficulty];

  function handleStart() {
    if (!sectorCase) return;
    audioManager.playButtonClick();
    onStartInvestigation(sectorCase);
  }

  function handleClose() {
    audioManager.playPauseMenu();
    onClose();
  }

  function handleCloseClick(
    event:
      | MouseEvent<HTMLButtonElement>
      | MouseEvent<HTMLDivElement>,
  ) {
    event.preventDefault();
    event.stopPropagation();
    handleClose();
  }

  function handleStartClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    handleStart();
  }

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop dismiss is supplemental to close button
    // biome-ignore lint/a11y/noStaticElementInteractions: intentional backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.72)" }}
      onClick={handleCloseClick}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: stop propagation only */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: intentional */}
      <div
        className="relative w-full max-w-lg mx-4 rounded-lg border overflow-hidden"
        style={{
          background: "#0a0f1a",
          borderColor: accentColor,
          boxShadow: `0 0 32px ${accentColor}33`,
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{
            borderBottom: `1px solid ${accentColor}44`,
            background: `${accentColor}0f`,
          }}
        >
          <div>
            <div
              className="text-xs font-mono tracking-widest mb-0.5"
              style={{ color: accentColor }}
            >
              {sectorId} · {sectorName}
            </div>
            <div className="text-white font-bold text-lg leading-tight">
              {sectorCase.title}
            </div>
          </div>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleCloseClick}
            className="text-slate-400 hover:text-white text-xl leading-none ml-4 flex-shrink-0"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Meta row */}
          <div className="flex items-center gap-3 text-xs font-mono">
            <span
              className="px-2 py-0.5 rounded border"
              style={{
                color: difficultyColor,
                borderColor: difficultyColor,
                background: `${difficultyColor}18`,
              }}
            >
              {DIFFICULTY_LABEL[sectorCase.difficulty]}
            </span>
            <span className="text-slate-400">
              {EVENT_TYPE_LABELS[sectorCase.eventType] ?? sectorCase.eventType}
            </span>
            <span className="ml-auto text-slate-500">
              {Math.floor(sectorCase.timeLimit / 60)}m limit
            </span>
          </div>

          {/* Description */}
          <p className="text-sm text-slate-300 leading-relaxed">
            {sectorCase.description}
          </p>

          {/* Initial clues */}
          <div>
            <div className="text-xs font-mono tracking-widest text-slate-500 mb-2">
              INITIAL CLUES
            </div>
            <ul className="space-y-1.5">
              {sectorCase.initialClues.map((clue) => (
                <li key={clue} className="flex gap-2 text-xs text-slate-300">
                  <span
                    style={{ color: accentColor }}
                    className="flex-shrink-0"
                  >
                    ›
                  </span>
                  <span>{clue}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Affected nodes */}
          <div>
            <div className="text-xs font-mono tracking-widest text-slate-500 mb-2">
              AFFECTED NODES
            </div>
            <div className="flex flex-wrap gap-1.5">
              {sectorCase.affectedNodes.map((node) => (
                <span
                  key={node}
                  className="text-xs font-mono px-2 py-0.5 rounded"
                  style={{ background: "#1e293b", color: "#94a3b8" }}
                >
                  {node}
                </span>
              ))}
            </div>
          </div>

          {/* Agent priority */}
          <div>
            <div className="text-xs font-mono tracking-widest text-slate-500 mb-2">
              RECOMMENDED AGENTS
            </div>
            <div className="flex gap-2">
              {sectorCase.agentPriority.map((agent) => (
                <span
                  key={agent}
                  className="text-xs font-mono px-2 py-0.5 rounded border uppercase"
                  style={{
                    color: accentColor,
                    borderColor: `${accentColor}55`,
                    background: `${accentColor}10`,
                  }}
                >
                  {agent}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3 flex justify-end gap-3"
          style={{ borderTop: `1px solid ${accentColor}22` }}
        >
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleCloseClick}
            className="px-4 py-1.5 text-sm font-mono text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 rounded transition-colors"
          >
            CANCEL
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleStartClick}
            className="px-5 py-1.5 text-sm font-mono font-bold rounded transition-all"
            style={{
              background: accentColor,
              color: "#000",
              boxShadow: `0 0 12px ${accentColor}55`,
            }}
          >
            START INVESTIGATION
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

// TODO: Wire to real ForensicEvent[] timeline once backend is migrated.
// Currently renders a static mock timeline with a draggable scrubber.

import { useCallback, useRef, useState } from "react";
import type { ForensicEvent } from "@/types/investigation";

interface TimelineEvent {
  id: string;
  timestamp: string;   // ISO 8601
  label: string;
  nodeId?: string;
  severity: "low" | "medium" | "high";
  agentId: string;
}

interface TimelineScrubberProps {
  events?: TimelineEvent[];
  /** ISO 8601 string — window start */
  windowStart?: string;
  /** ISO 8601 string — window end */
  windowEnd?: string;
  /** Called when the scrubber position changes (0–1) */
  onScrub?: (position: number) => void;
  currentPosition?: number;
}

const SEVERITY_COLOR: Record<TimelineEvent["severity"], string> = {
  low: "#2a5070",
  medium: "#f59e0b",
  high: "#ff3a3a",
};

const AGENT_SYMBOL: Record<string, string> = {
  logis: "L",
  nexus: "N",
  filer: "F",
  chrono: "C",
  echo: "E",
  player: "P",
};

// Mock events used until backend provides real forensic timeline
const MOCK_EVENTS: TimelineEvent[] = [
  { id: "e1", timestamp: "2024-01-15T00:03:12Z", label: "First suspicious login", nodeId: "MAIL-01", severity: "medium", agentId: "logis" },
  { id: "e2", timestamp: "2024-01-15T00:18:44Z", label: "Lateral move to DB-02", nodeId: "DB-02", severity: "high", agentId: "nexus" },
  { id: "e3", timestamp: "2024-01-15T01:02:09Z", label: "Log file deleted", nodeId: "MAIL-01", severity: "high", agentId: "filer" },
  { id: "e4", timestamp: "2024-01-15T01:45:30Z", label: "Large data transfer", nodeId: "GW-01", severity: "high", agentId: "nexus" },
  { id: "e5", timestamp: "2024-01-15T02:11:00Z", label: "Malware signature found", nodeId: "DB-02", severity: "high", agentId: "filer" },
  { id: "e6", timestamp: "2024-01-15T02:55:18Z", label: "C2 beacon detected", nodeId: "GW-01", severity: "high", agentId: "nexus" },
  { id: "e7", timestamp: "2024-01-15T03:30:00Z", label: "System backup corrupted", nodeId: "BACKUP-01", severity: "medium", agentId: "filer" },
];

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return iso.slice(11, 16);
  }
}

export function TimelineScrubber({
  events = MOCK_EVENTS,
  windowStart,
  windowEnd,
  onScrub,
  currentPosition = 0,
}: TimelineScrubberProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [scrubPos, setScrubPos] = useState(currentPosition);
  const [hoveredEvent, setHoveredEvent] = useState<TimelineEvent | null>(null);

  const getPositionFromEvent = useCallback(
    (clientX: number): number => {
      const track = trackRef.current;
      if (!track) return 0;
      const rect = track.getBoundingClientRect();
      return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    },
    [],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      const pos = getPositionFromEvent(e.clientX);
      setScrubPos(pos);
      onScrub?.(pos);
    },
    [getPositionFromEvent, onScrub],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (e.buttons !== 1) return;
      const pos = getPositionFromEvent(e.clientX);
      setScrubPos(pos);
      onScrub?.(pos);
    },
    [getPositionFromEvent, onScrub],
  );

  // Normalize events to 0–1 positions along the track
  const timestamps = events.map((e) => new Date(e.timestamp).getTime());
  const tMin = Math.min(...timestamps);
  const tMax = Math.max(...timestamps);
  const tRange = tMax - tMin || 1;

  const normalizedEvents = events.map((e) => ({
    ...e,
    position: (new Date(e.timestamp).getTime() - tMin) / tRange,
  }));

  return (
    <div
      className="rpg-panel flex flex-col px-3 py-2"
      data-testid="timeline-scrubber"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[8px] font-mono uppercase tracking-widest"
          style={{ color: "#00d4ff" }}
        >
          ◈ Timeline
        </span>
        <span
          className="text-[8px] font-mono"
          style={{ color: "#2a5070" }}
        >
          {/* TODO: replace with real incident window */}
          00:00 — 06:00
        </span>
      </div>

      {/* Event dots + hover tooltip */}
      <div className="relative h-5 mb-1">
        {normalizedEvents.map((e) => (
          <div
            key={e.id}
            className="absolute -translate-x-1/2 flex flex-col items-center cursor-pointer"
            style={{ left: `${e.position * 100}%`, top: 0 }}
            onMouseEnter={() => setHoveredEvent(e)}
            onMouseLeave={() => setHoveredEvent(null)}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: SEVERITY_COLOR[e.severity],
                boxShadow: `0 0 4px ${SEVERITY_COLOR[e.severity]}`,
              }}
            />
            <span
              className="text-[6px] font-mono"
              style={{ color: SEVERITY_COLOR[e.severity] }}
            >
              {AGENT_SYMBOL[e.agentId] ?? "?"}
            </span>
          </div>
        ))}

        {/* Hover tooltip */}
        {hoveredEvent && (
          <div
            className="absolute bottom-6 z-10 pointer-events-none px-2 py-1 rounded text-[8px] font-mono"
            style={{
              left: `${normalizedEvents.find((e) => e.id === hoveredEvent.id)?.position ?? 0 * 100}%`,
              transform: "translateX(-50%)",
              background: "#0f1927",
              border: "1px solid #1e3d5a",
              color: "#c9d8e8",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ color: "#4a6580" }}>{formatTime(hoveredEvent.timestamp)} </span>
            {hoveredEvent.label}
            {hoveredEvent.nodeId && (
              <span style={{ color: "#00d4ff" }}> [{hoveredEvent.nodeId}]</span>
            )}
          </div>
        )}
      </div>

      {/* Scrub track */}
      <div
        ref={trackRef}
        className="relative h-2 rounded-sm cursor-crosshair select-none"
        style={{
          background: "#1e3d5a",
          border: "1px solid #2a5070",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      >
        {/* Elapsed fill */}
        <div
          className="absolute left-0 top-0 h-full rounded-sm transition-none"
          style={{
            width: `${scrubPos * 100}%`,
            background: "linear-gradient(90deg, #0a4060, #00d4ff40)",
          }}
        />
        {/* Playhead */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-4 rounded-sm"
          style={{
            left: `${scrubPos * 100}%`,
            background: "#00d4ff",
            boxShadow: "0 0 6px rgba(0,212,255,0.6)",
          }}
        />
      </div>

      {/* Time labels */}
      <div className="flex justify-between mt-1">
        <span className="text-[7px] font-mono" style={{ color: "#2a5070" }}>
          {windowStart ? formatTime(windowStart) : "T+0:00"}
        </span>
        <span className="text-[7px] font-mono" style={{ color: "#2a5070" }}>
          {windowEnd ? formatTime(windowEnd) : "T+6:00"}
        </span>
      </div>

      {/* TODO: connect to real ForensicEvent[] from investigation state */}
      <p className="mt-1 text-[7px] font-mono" style={{ color: "#1e3d5a" }}>
        [Mock data — real timeline pending backend migration]
      </p>
    </div>
  );
}

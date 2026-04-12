"use client";

import { useEffect, useRef } from "react";
import type { SimEvent } from "@/types";
import { audioManager } from "@/lib/audioManager";

interface EventFeedProps {
  events: SimEvent[];
  onEventClick?: (event: SimEvent) => void;
  onPinEvent?: (event: SimEvent) => void;
  onOpenBoard?: (event: SimEvent) => void;
}

function eventIcon(type: SimEvent["type"]): string {
  switch (type) {
    case "reaction":
      return "▷";
    case "price_change":
      return "◈";
    case "layoff":
      return "▣";
    case "protest":
      return "!";
    case "closure":
      return "✕";
    case "strike":
      return "⚠";
    case "policy_response":
    case "system_response":
      return "◆";
    case "phase_change":
      return "◉";
    default:
      return "○";
  }
}

function eventColor(type: SimEvent["type"]): string {
  switch (type) {
    case "reaction":
      return "#4a6580";
    case "price_change":
      return "#00d4ff";
    case "layoff":
      return "#ff3a3a";
    case "protest":
      return "#f59e0b";
    case "closure":
      return "#ff3a3a";
    case "strike":
      return "#f59e0b";
    case "policy_response":
    case "system_response":
      return "#00ff88";
    case "phase_change":
      return "#b06fff";
    default:
      return "#4a6580";
  }
}

export function EventFeed({ events, onEventClick, onPinEvent, onOpenBoard }: EventFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events.length]);

  return (
    <div className="flex h-full flex-col" data-testid="event-feed">
      <div className="flex-1 overflow-y-auto px-2 py-1 scrollbar-thin">
        {events.length === 0 && (
          <div
            className="flex h-full items-center justify-center px-4 text-center text-[11px] font-mono uppercase tracking-[0.18em]"
            style={{ color: "#1e3d5a" }}
          >
            Awaiting evidence...
          </div>
        )}

        {events.map((event) => {
          if (event.type === "phase_change") {
            return (
              <div
                key={event.id}
                className="my-3 py-2 text-center text-[10px] font-pixel"
                style={{
                  color: "#b06fff",
                  borderTop: "1px solid #1e3d5a",
                  borderBottom: "1px solid #1e3d5a",
                  textShadow: "0 0 8px rgba(176,111,255,0.5)",
                }}
                data-testid="phase-marker"
              >
                {event.message}
              </div>
            );
          }

          const color = eventColor(event.type);
          const icon = eventIcon(event.type);

          return (
            <div
              key={event.id}
              className={`mb-2 rounded px-3 py-2 ${onEventClick ? "cursor-pointer transition-colors" : ""}`}
              onMouseEnter={
                onEventClick
                  ? (e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        "rgba(0,212,255,0.05)";
                    }
                  : undefined
              }
              onMouseLeave={
                onEventClick
                  ? (e) => {
                      (e.currentTarget as HTMLElement).style.background = "";
                    }
                  : undefined
              }
              data-testid="event-item"
              onClick={onEventClick ? () => onEventClick(event) : undefined}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-mono" style={{ color }}>
                  {icon}
                </span>
                <span
                  className="text-[12px] font-mono font-bold"
                  style={{ color: "#c9d8e8" }}
                >
                  {event.agentName}
                </span>
                {event.agentCategory && (
                  <span
                    className="text-[10px] font-mono"
                    style={{ color: "#2a5070" }}
                  >
                    {event.agentCategory}
                  </span>
                )}
                <span
                  className="ml-auto text-[10px] font-mono tabular-nums"
                  style={{ color: "#2a5070" }}
                >
                  C{event.round}
                </span>
              </div>
              <p
                className="mt-1 text-[12px] font-mono leading-6"
                style={{ color: "#4a6580" }}
              >
                {event.message}
              </p>
              <div className="mt-1 flex gap-2">
                {onPinEvent && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      audioManager.playButtonClick();
                      onPinEvent(event);
                    }}
                    className="text-[9px] font-mono uppercase tracking-[0.14em] transition-opacity hover:opacity-60"
                    style={{ color: "#b06fff" }}
                  >
                    📌 PIN TO BOARD
                  </button>
                )}
                {onOpenBoard && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      audioManager.playButtonClick();
                      onOpenBoard(event);
                    }}
                    className="text-[9px] font-mono uppercase tracking-[0.14em] transition-opacity hover:opacity-100"
                    style={{ color: "#00ff88", opacity: 0.6 }}
                  >
                    □ OPEN IN BOARD
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

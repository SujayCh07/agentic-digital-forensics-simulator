"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sendNipsChat, setChatCallbacks } from "@/lib/investigationAgentClient";
import { audioManager } from "@/lib/audioManager";
import type {
  NipsAgentInstance,
  NipsChatMessage,
  NipsEvidenceUpdate,
  NipsToolActivity,
} from "@/types/investigation";

const ARCHETYPE_COLORS: Record<string, string> = {
  LOGIS: "#22d3ee",
  NEXUS: "#a78bfa",
  FILER: "#f59e0b",
  CHRONO: "#34d399",
};

interface MessageEntry {
  msg: NipsChatMessage;
  thoughtText?: string;
  toolActivities?: NipsToolActivity[];
}

interface AgentCommandModalProps {
  agent: NipsAgentInstance;
  nodeContext: string;
  initialMessages?: MessageEntry[];
  onClose: (messages: MessageEntry[]) => void;
  onEvidenceUpdate?: (ev: NipsEvidenceUpdate) => void;
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export type { MessageEntry };

export function AgentCommandModal({
  agent,
  nodeContext,
  initialMessages,
  onClose,
  onEvidenceUpdate,
}: AgentCommandModalProps) {
  const [history, setHistory] = useState<MessageEntry[]>(initialMessages ?? []);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [thoughtText, setThoughtText] = useState("");
  const [pendingText, setPendingText] = useState("");
  const [toolActivities, setToolActivities] = useState<NipsToolActivity[]>([]);
  const [showThoughtsMap, setShowThoughtsMap] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef(history);
  historyRef.current = history;

  const accentColor = ARCHETYPE_COLORS[agent.archetype] ?? "#22d3ee";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, pendingText]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Disable Phaser keyboard capture while modal is open so spacebar etc. work in textarea
  useEffect(() => {
    const game = (globalThis as Record<string, unknown>).__PHASER_GAME__ as
      | { input?: { keyboard?: { enabled: boolean } }; scene?: { scenes?: { input?: { keyboard?: { enabled: boolean } } }[] } }
      | undefined;

    const kbManager = game?.input?.keyboard;
    const wasEnabled = kbManager?.enabled;
    if (kbManager) kbManager.enabled = false;

    const scenes = game?.scene?.scenes ?? [];
    const sceneKbs: { kb: { enabled: boolean }; was: boolean }[] = [];
    for (const s of scenes) {
      const kb = s.input?.keyboard;
      if (kb) {
        sceneKbs.push({ kb, was: kb.enabled });
        kb.enabled = false;
      }
    }

    // Also intercept at capture phase to prevent Phaser's window-level listeners from eating keys
    const blockForPhaser = (e: KeyboardEvent) => {
      if (e.key === "Escape") return;
      e.stopPropagation();
    };
    window.addEventListener("keydown", blockForPhaser, true);
    window.addEventListener("keyup", blockForPhaser, true);

    return () => {
      window.removeEventListener("keydown", blockForPhaser, true);
      window.removeEventListener("keyup", blockForPhaser, true);
      if (kbManager && wasEnabled !== undefined) kbManager.enabled = wasEnabled;
      for (const { kb, was } of sceneKbs) kb.enabled = was;
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(historyRef.current);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    setChatCallbacks({
      onThoughtChunk: (text) => {
        setThoughtText((prev) => prev + text);
      },
      onToolActivity: (activity) => {
        setToolActivities((prev) => [...prev, activity]);
      },
      onAssistantChunk: (text) => {
        setPendingText((prev) => prev + text);
      },
      onEvidenceUpdate: (ev) => {
        onEvidenceUpdate?.(ev);
      },
      onChatDone: (data) => {
        audioManager.playAgentResponse();
        const finalText = data.full_answer || "";
        setHistory((prev) => [
          ...prev,
          {
            msg: {
              id: uid(),
              role: "assistant",
              content: finalText,
              createdAt: Date.now(),
            },
            thoughtText: undefined,
            toolActivities: undefined,
          },
        ]);
        setIsStreaming(false);
        // Snapshot the thinking/tools into the last assistant entry
        setHistory((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.msg.role === "assistant") {
            copy[copy.length - 1] = {
              ...last,
              thoughtText: thoughtTextRef.current || undefined,
              toolActivities: toolActivitiesRef.current.length > 0 ? [...toolActivitiesRef.current] : undefined,
            };
          }
          return copy;
        });
        setThoughtText("");
        setPendingText("");
        setToolActivities([]);
      },
      onError: (msg) => {
        setError(msg);
        setIsStreaming(false);
        setThoughtText("");
        setPendingText("");
        setToolActivities([]);
      },
    });
  }, [onEvidenceUpdate]);

  const thoughtTextRef = useRef("");
  thoughtTextRef.current = thoughtText;
  const toolActivitiesRef = useRef<NipsToolActivity[]>([]);
  toolActivitiesRef.current = toolActivities;

  const send = useCallback(() => {
    const value = input.trim();
    if (!value || isStreaming) return;

    audioManager.playPlayerChat();
    setHistory((prev) => [
      ...prev,
      { msg: { id: uid(), role: "user", content: value, createdAt: Date.now() } },
    ]);
    setInput("");
    setIsStreaming(true);
    setError(null);
    setThoughtText("");
    setPendingText("");
    setToolActivities([]);

    sendNipsChat(agent.instance_id, value, nodeContext);
  }, [input, isStreaming, agent.instance_id, nodeContext]);

  const toggleThought = (id: string) =>
    setShowThoughtsMap((prev) => ({ ...prev, [id]: !prev[id] }));

  const statBar = (label: string, value: number) => {
    const pct = Math.round(value * 100);
    return (
      <div className="flex items-center gap-2">
        <span className="w-24 text-[9px] font-mono uppercase tracking-wider text-[var(--muted)]">
          {label}
        </span>
        <div className="h-1.5 flex-1 rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              backgroundColor: accentColor,
              opacity: 0.5 + value * 0.5,
            }}
          />
        </div>
        <span className="w-8 text-right text-[9px] font-mono text-[var(--muted)]">
          {pct}
        </span>
      </div>
    );
  };

  const renderThinkingBlock = (text: string, msgId: string, streaming: boolean) => {
    const expanded = showThoughtsMap[msgId] ?? true;
    return (
      <div className="mt-1.5 rounded border border-purple-400/20 bg-purple-400/5 px-3 py-2">
        <button
          type="button"
          className="mb-1 flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-[0.18em] text-purple-300"
          onClick={() => toggleThought(msgId)}
        >
          {streaming && (
            <span className="inline-block animate-pulse">&#x25CF;</span>
          )}
          {streaming ? "Thinking..." : "Thought process"}
          <span className="text-[8px] text-purple-300/60">
            {expanded ? "▼" : "▶"}
          </span>
        </button>
        {expanded && (
          <p className="whitespace-pre-wrap text-[10px] font-mono leading-relaxed text-purple-200/70">
            {text}
          </p>
        )}
      </div>
    );
  };

  const renderToolActivities = (activities: NipsToolActivity[]) => (
    <div className="mt-1 space-y-1">
      {activities.map((ta, i) => (
        <div
          key={`${ta.tool}-${i}`}
          className="flex items-center gap-2 rounded border border-amber-400/20 bg-amber-400/5 px-3 py-1.5"
        >
          <span
            className={`text-[9px] font-mono ${
              ta.status === "started"
                ? "animate-pulse text-amber-300"
                : "text-green-300"
            }`}
          >
            {ta.status === "started" ? "⟳" : "✓"}
          </span>
          <span className="text-[9px] font-mono text-amber-200">
            {ta.tool}
            {ta.status === "started" ? "..." : ""}
          </span>
          {ta.status === "completed" && ta.severity && (
            <span className="ml-auto text-[8px] font-mono uppercase text-[var(--muted)]">
              {ta.severity}
            </span>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4 py-4"
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0"
        tabIndex={-1}
        onClick={() => onClose(historyRef.current)}
      />

      <div className="rpg-panel relative flex h-[min(820px,94vh)] w-full max-w-5xl overflow-hidden">
        {/* LEFT: Profile panel */}
        <div className="w-72 shrink-0 overflow-y-auto border-r border-white/10 px-4 py-4">
          <div className="mb-3">
            <p
              className="text-[9px] font-mono uppercase tracking-[0.3em]"
              style={{ color: accentColor }}
            >
              {agent.archetype}
            </p>
            <h2 className="mt-1 text-base font-pixel">{agent.display_name}</h2>
            <p className="text-[10px] font-mono text-[var(--muted)]">
              {agent.codename} &middot; {agent.role_level}
            </p>
          </div>

          <div className="mb-3 rounded border border-white/10 bg-black/20 px-3 py-2">
            <p
              className="text-[9px] font-mono uppercase tracking-wider"
              style={{ color: accentColor }}
            >
              Bio
            </p>
            <p className="mt-1 text-[10px] font-mono leading-relaxed text-[var(--foreground)]">
              {agent.bio}
            </p>
          </div>

          <div className="mb-3 space-y-1">
            <p
              className="text-[9px] font-mono uppercase tracking-wider"
              style={{ color: accentColor }}
            >
              Stats
            </p>
            {statBar("Thorough", agent.thoroughness)}
            {statBar("Speed", agent.speed)}
            {statBar("Reliable", agent.reliability)}
            {statBar("Creative", agent.creativity)}
            {statBar("Caution", agent.caution)}
            {statBar("Confidence", agent.confidence_level)}
            {statBar("Resilience", agent.pressure_resilience)}
          </div>

          <div className="mb-3">
            <p
              className="text-[9px] font-mono uppercase tracking-wider"
              style={{ color: accentColor }}
            >
              Specialties
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {agent.primary_specialties.map((s) => (
                <span
                  key={s}
                  className="rounded border px-1.5 py-0.5 text-[8px] font-mono text-[var(--foreground)]"
                  style={{ borderColor: `${accentColor}40` }}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <p className="text-[9px] font-mono uppercase tracking-wider text-red-400/80">
              Weak Areas
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {agent.weak_areas.map((w) => (
                <span
                  key={w}
                  className="rounded border border-red-400/20 px-1.5 py-0.5 text-[8px] font-mono text-[var(--muted)]"
                >
                  {w}
                </span>
              ))}
            </div>
          </div>

          <div className="mb-3 flex flex-wrap gap-1">
            {agent.profile_tags.map((tag) => (
              <span
                key={tag}
                className="rounded bg-white/5 px-1.5 py-0.5 text-[8px] font-mono text-[var(--muted)]"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="text-[9px] font-mono text-[var(--muted)]">
            <p>Exp: {agent.years_experience} years</p>
            <p>Style: {agent.personality_type}</p>
            <p>Comm: {agent.communication_style}</p>
          </div>
        </div>

        {/* RIGHT: Chat panel */}
        <div className="flex flex-1 flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p
                className="text-[10px] font-mono uppercase tracking-[0.2em]"
                style={{ color: accentColor }}
              >
                Command Channel — {agent.display_name}
              </p>
              {nodeContext && (
                <p className="mt-0.5 text-[9px] font-mono text-[var(--muted)]">
                  Context: {nodeContext}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => { audioManager.playButtonClick(); onClose(historyRef.current); }}
              className="rounded border border-white/15 px-3 py-1.5 text-[10px] font-mono uppercase hover:bg-white/5"
            >
              Close
            </button>
          </div>

          {/* Starter prompts */}
          <div className="flex flex-wrap gap-1.5 border-b border-white/5 px-4 py-2">
            {agent.starter_prompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={isStreaming}
                onClick={() => {
                  setInput(prompt);
                  textareaRef.current?.focus();
                }}
                className="rounded border px-2 py-1 text-[9px] font-mono text-[var(--foreground)] hover:bg-white/5 disabled:opacity-40"
                style={{ borderColor: `${accentColor}40` }}
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <div className="space-y-3">
              {history.map((entry) => (
                <div key={entry.msg.id}>
                  <div
                    className={
                      entry.msg.role === "user"
                        ? "flex justify-end"
                        : entry.msg.role === "system"
                          ? "flex justify-center"
                          : "flex justify-start"
                    }
                  >
                    <div
                      className={`max-w-[88%] rounded border px-3 py-2 ${
                        entry.msg.role === "user"
                          ? "border-white/20 bg-white/5"
                          : entry.msg.role === "system"
                            ? "border-amber-400/30 bg-amber-400/10 text-center"
                            : "border-white/12 bg-white/4"
                      }`}
                      style={
                        entry.msg.role === "user"
                          ? { borderColor: `${accentColor}50`, background: `${accentColor}10` }
                          : undefined
                      }
                    >
                      <div
                        className="mb-1 text-[9px] font-mono uppercase tracking-[0.18em]"
                        style={{
                          color:
                            entry.msg.role === "user"
                              ? accentColor
                              : entry.msg.role === "system"
                                ? "#fbbf24"
                                : "#f0f4f8",
                        }}
                      >
                        {entry.msg.role === "user"
                          ? "Operator"
                          : entry.msg.role === "system"
                            ? "System"
                            : agent.codename}
                      </div>
                      <p className="whitespace-pre-wrap text-[11px] font-mono leading-relaxed text-[var(--foreground)]">
                        {entry.msg.content}
                      </p>
                    </div>
                  </div>

                  {/* Persisted thinking/tools for completed assistant messages */}
                  {entry.msg.role === "assistant" && entry.thoughtText && (
                    renderThinkingBlock(entry.thoughtText, entry.msg.id, false)
                  )}
                  {entry.msg.role === "assistant" && entry.toolActivities && entry.toolActivities.length > 0 && (
                    renderToolActivities(entry.toolActivities)
                  )}
                </div>
              ))}

              {/* Live streaming state */}
              {isStreaming && (
                <div className="space-y-2">
                  {thoughtText && renderThinkingBlock(thoughtText, "__streaming__", true)}

                  {toolActivities.length > 0 && renderToolActivities(toolActivities)}

                  {pendingText && (
                    <div className="flex justify-start">
                      <div className="max-w-[88%] rounded border border-white/12 bg-white/4 px-3 py-2">
                        <div className="mb-1 text-[9px] font-mono uppercase tracking-[0.18em] text-[#f0f4f8]">
                          {agent.codename}
                        </div>
                        <p className="whitespace-pre-wrap text-[11px] font-mono leading-relaxed text-[var(--foreground)]">
                          {pendingText}
                          <span className="animate-pulse">▊</span>
                        </p>
                      </div>
                    </div>
                  )}

                  {!thoughtText &&
                    !pendingText &&
                    toolActivities.length === 0 && (
                      <div className="flex justify-start">
                        <div className="rounded border border-white/12 bg-white/4 px-3 py-2">
                          <div
                            className="mb-1 text-[9px] font-mono uppercase tracking-[0.18em]"
                            style={{ color: accentColor }}
                          >
                            {agent.codename}
                          </div>
                          <p className="text-[11px] font-mono text-[var(--muted)] animate-pulse">
                            Processing request...
                          </p>
                        </div>
                      </div>
                    )}
                </div>
              )}

              <div ref={endRef} />
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-white/10 px-4 py-3">
            {error && (
              <div className="mb-2 text-[10px] font-mono text-red-300">
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={2}
                className="min-h-[56px] flex-1 resize-none rounded border border-white/15 bg-transparent px-3 py-2 text-[11px] font-mono text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
                placeholder={`Ask ${agent.codename} a question or request an investigation action...`}
              />
              <button
                type="button"
                onClick={send}
                disabled={isStreaming || !input.trim()}
                className="rounded border px-4 py-2 text-[10px] font-mono uppercase hover:bg-white/5 disabled:opacity-40"
                style={{ borderColor: accentColor, color: accentColor }}
              >
                Send
              </button>
            </div>
            <div className="mt-1.5 text-[8px] font-mono uppercase tracking-[0.16em] text-[var(--muted)]">
              Enter to send &middot; Shift+Enter for newline &middot; Esc to
              close
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

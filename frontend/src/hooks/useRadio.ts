"use client";

import { useCallback, useRef, useState } from "react";
import { streamInvestigationAgentChat } from "@/lib/investigationAgentClient";
import type { NipsAgentInstance } from "@/types/investigation";

const API_BASE = "http://localhost:8000";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RadioStatus =
  | "idle"
  | "listening"
  | "transcribing"
  | "thinking"
  | "speaking";

export interface RadioExchange {
  id: string;
  agentId: string;
  agentName: string;
  agentArchetype: string;
  userTranscript: string;
  agentResponse: string;
  audioUrl: string | null;
  timestamp: number;
}

export interface UseRadioReturn {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  selectedAgent: NipsAgentInstance | null;
  setSelectedAgent: (agent: NipsAgentInstance | null) => void;
  status: RadioStatus;
  currentTranscript: string;
  currentResponse: string;
  exchanges: RadioExchange[];
  audioUrl: string | null;
  permissionDenied: boolean;
  lastError: string | null;
  clearLastError: () => void;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  isRecording: boolean;
}

// ---------------------------------------------------------------------------
// Urgency → Deepgram speed (0.7–1.5)
// ---------------------------------------------------------------------------

const URGENCY_TERMS = [
  "critical",
  "urgent",
  "immediately",
  "asap",
  "breach",
  "compromised",
  "exfil",
  "alert",
  "emergency",
  "severe",
  "ransom",
  "malware",
  "exploit",
  "unauthorized",
  "warning",
  "lock down",
  "escalat",
  "cve-",
  "0-day",
];

function urgencyScore(text: string): number {
  let u = 0;
  const t = text.toLowerCase();
  for (const w of URGENCY_TERMS) {
    if (t.includes(w)) u += 0.11;
  }
  if (/[!]{2,}/.test(text)) u += 0.12;
  if (/\*\*(?:CRITICAL|URGENT|ALERT|WARNING)/i.test(text)) u += 0.18;
  return Math.min(1, u);
}

function speedForSentence(sentence: string, agentConfidence: number): number {
  const u = urgencyScore(sentence);
  // Higher urgency → faster read; lower analyst confidence → slightly slower (hesitant)
  let s = 1.0 + u * 0.48;
  s -= (1 - agentConfidence) * 0.07;
  return Math.max(0.75, Math.min(1.5, s));
}

// ---------------------------------------------------------------------------
// Sentence chunking (stream LLM → early TTS)
// ---------------------------------------------------------------------------

const MAX_BEFORE_FORCE = 200;

/** Take one speakable chunk from the buffer, or null if we should wait for more text. */
function takeOneChunk(buffer: string): { chunk: string | null; rest: string } {
  if (buffer.length < 14) {
    return { chunk: null, rest: buffer };
  }

  for (let i = 12; i < buffer.length; i++) {
    const ch = buffer[i];
    if (ch === "." || ch === "?" || ch === "!") {
      const next = buffer[i + 1];
      if (next === undefined || /\s/.test(next)) {
        return {
          chunk: buffer.slice(0, i + 1).trim(),
          rest: buffer.slice(i + 1).trimStart(),
        };
      }
    }
    if (ch === "\n" && i > 20) {
      return {
        chunk: buffer.slice(0, i + 1).trim(),
        rest: buffer.slice(i + 1).trimStart(),
      };
    }
  }

  if (buffer.length >= MAX_BEFORE_FORCE) {
    const sp = buffer.lastIndexOf(" ", MAX_BEFORE_FORCE);
    if (sp > 40) {
      return {
        chunk: buffer.slice(0, sp).trim(),
        rest: buffer.slice(sp).trimStart(),
      };
    }
  }

  return { chunk: null, rest: buffer };
}

function drainChunks(buffer: string): { chunks: string[]; rest: string } {
  const chunks: string[] = [];
  let rest = buffer;
  for (;;) {
    const { chunk, rest: r } = takeOneChunk(rest);
    if (!chunk) break;
    chunks.push(chunk);
    rest = r;
  }
  return { chunks, rest };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus"))
    return "audio/webm;codecs=opus";
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  return "audio/mp4";
}

async function transcribeAudio(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append("audio", blob, "recording.webm");
  const res = await fetch(`${API_BASE}/api/radio/stt`, {
    method: "POST",
    body: form,
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.transcript ?? "";
}

async function synthesizeSpeech(
  text: string,
  archetype: string,
  confidence: number,
  speed: number,
): Promise<string> {
  const form = new FormData();
  form.append("text", text);
  form.append("archetype", archetype);
  form.append("confidence", String(confidence));
  form.append("speed", String(speed));
  const res = await fetch(`${API_BASE}/api/radio/tts`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      const j = (await res.json()) as { error?: string };
      throw new Error(j.error ?? `TTS failed (${res.status})`);
    }
    if (res.status === 402) {
      throw new Error(
        "TTS billing/quota issue (402) — check your Deepgram account credits and plan.",
      );
    }
    throw new Error(`TTS failed (${res.status})`);
  }
  const audioBlob = await res.blob();
  return URL.createObjectURL(audioBlob);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useRadio(): UseRadioReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<NipsAgentInstance | null>(
    null,
  );
  const [status, setStatus] = useState<RadioStatus>("idle");
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [currentResponse, setCurrentResponse] = useState("");
  const [exchanges, setExchanges] = useState<RadioExchange[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playChainRef = useRef(Promise.resolve());

  const cleanup = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    for (const t of streamRef.current?.getTracks() ?? []) t.stop();
    streamRef.current = null;
    chunksRef.current = [];
  }, []);

  const processExchange = useCallback(
    async (audioBlob: Blob) => {
      if (!selectedAgent) return;

      setStatus("transcribing");
      setCurrentTranscript("");
      setCurrentResponse("");
      setAudioUrl(null);
      setLastError(null);
      playChainRef.current = Promise.resolve();

      try {
        const transcript = await transcribeAudio(audioBlob);
        if (!transcript.trim()) {
          setStatus("idle");
          return;
        }
        setCurrentTranscript(transcript);

        setStatus("thinking");
        let streamBuffer = "";
        let startedSpeaking = false;

        const enqueueSpeak = (text: string) => {
          const trimmed = text.trim();
          if (!trimmed) return;
          const spd = speedForSentence(trimmed, selectedAgent.confidence_level);
          const urlPromise = synthesizeSpeech(
            trimmed,
            selectedAgent.archetype,
            selectedAgent.confidence_level,
            spd,
          );

          if (!startedSpeaking) {
            startedSpeaking = true;
            setStatus("speaking");
            void urlPromise.then((u) => setAudioUrl(u));
          }

          playChainRef.current = playChainRef.current.then(async () => {
            const url = await urlPromise;
            const audio = new Audio(url);
            audioRef.current = audio;
            await new Promise<void>((resolve) => {
              audio.onended = () => {
                URL.revokeObjectURL(url);
                resolve();
              };
              audio.onerror = () => {
                URL.revokeObjectURL(url);
                resolve();
              };
              void audio.play().catch(() => resolve());
            });
          });
        };

        const result = await streamInvestigationAgentChat(
          {
            agentId: selectedAgent.instance_id,
            message: `[RADIO] ${transcript}`,
          },
          (delta, full) => {
            streamBuffer += delta;
            setCurrentResponse(full);
            const { chunks, rest } = drainChunks(streamBuffer);
            streamBuffer = rest;
            for (const c of chunks) {
              enqueueSpeak(c);
            }
          },
        );

        const { chunks: finalChunks, rest } = drainChunks(streamBuffer);
        streamBuffer = rest;
        for (const c of finalChunks) {
          enqueueSpeak(c);
        }
        if (streamBuffer.trim()) {
          enqueueSpeak(streamBuffer.trim());
        }

        setCurrentResponse(result.reply);

        await playChainRef.current.catch(() => {});
        setStatus("idle");

        const exchange: RadioExchange = {
          id: `radio-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          agentId: selectedAgent.instance_id,
          agentName: selectedAgent.display_name,
          agentArchetype: selectedAgent.archetype,
          userTranscript: transcript,
          agentResponse: result.reply,
          audioUrl: null,
          timestamp: Date.now(),
        };
        setExchanges((prev) => [exchange, ...prev].slice(0, 50));
      } catch (err) {
        console.error("[Radio] exchange failed:", err);
        const msg =
          err instanceof Error ? err.message : "Radio exchange failed";
        if (
          msg.includes("TTS") ||
          msg.includes("Deepgram") ||
          msg.includes("Agent chat")
        ) {
          setLastError(msg);
        }
        setStatus("idle");
      }
    },
    [selectedAgent],
  );

  const startRecording = useCallback(async () => {
    if (!selectedAgent) return;
    cleanup();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setPermissionDenied(false);

      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        for (const t of stream.getTracks()) t.stop();
        setIsRecording(false);
        if (blob.size > 0) processExchange(blob);
      };

      recorder.start();
      setIsRecording(true);
      setStatus("listening");
    } catch {
      setPermissionDenied(true);
      setStatus("idle");
      setIsRecording(false);
    }
  }, [selectedAgent, cleanup, processExchange]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }, []);

  const clearLastError = useCallback(() => setLastError(null), []);

  return {
    isOpen,
    setIsOpen,
    selectedAgent,
    setSelectedAgent,
    status,
    currentTranscript,
    currentResponse,
    exchanges,
    audioUrl,
    permissionDenied,
    lastError,
    clearLastError,
    startRecording,
    stopRecording,
    isRecording,
  };
}

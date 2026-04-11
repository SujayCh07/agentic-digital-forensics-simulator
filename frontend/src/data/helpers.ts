/**
 * NIPS — Helper roster
 *
 * Two helpers per role: a rookie (unlocked by default) and a veteran
 * (unlocked with player credits). Stats affect task speed + result quality.
 */

import type { Helper } from "@/types/investigation";

export const ALL_HELPERS: Helper[] = [
  // ── LOGIS ────────────────────────────────────────────────────────────────
  {
    id: "logis_1",
    name: "LOGIS-1",
    role: "logis",
    level: 1,
    efficiency: 0.55,
    accuracy: 0.58,
    cost: 0,
    unlocked: true,
    description: "Entry-level log parser. Slow and misses fine-grained detail.",
  },
  {
    id: "logis_2",
    name: "LOGIS-2",
    role: "logis",
    level: 2,
    efficiency: 0.88,
    accuracy: 0.92,
    cost: 700,
    unlocked: false,
    description:
      "Veteran analyst. Fast correlation — auth trails, gap detection, anomaly chains.",
  },

  // ── NEXUS ────────────────────────────────────────────────────────────────
  {
    id: "nexus_1",
    name: "NEXUS-1",
    role: "nexus",
    level: 1,
    efficiency: 0.55,
    accuracy: 0.6,
    cost: 0,
    unlocked: true,
    description:
      "Basic network tracer. Misses subtle packet patterns and lateral pivots.",
  },
  {
    id: "nexus_2",
    name: "NEXUS-2",
    role: "nexus",
    level: 2,
    efficiency: 0.9,
    accuracy: 0.93,
    cost: 800,
    unlocked: false,
    description:
      "Elite packet analyst. Full traffic reconstruction — no connection escapes.",
  },

  // ── FILER ────────────────────────────────────────────────────────────────
  {
    id: "filer_1",
    name: "FILER-1",
    role: "filer",
    level: 1,
    efficiency: 0.5,
    accuracy: 0.56,
    cost: 0,
    unlocked: true,
    description:
      "Trainee forensics. Recovers obvious artifacts only — carving is incomplete.",
  },
  {
    id: "filer_2",
    name: "FILER-2",
    role: "filer",
    level: 2,
    efficiency: 0.85,
    accuracy: 0.9,
    cost: 900,
    unlocked: false,
    description:
      "Seasoned artifact hunter. Deep steg analysis and full file carving.",
  },

  // ── CHRONO ───────────────────────────────────────────────────────────────
  {
    id: "chrono_1",
    name: "CHRONO-1",
    role: "chrono",
    level: 1,
    efficiency: 0.52,
    accuracy: 0.57,
    cost: 0,
    unlocked: true,
    description:
      "Junior timeline analyst. Partial sequence reconstruction — gaps remain.",
  },
  {
    id: "chrono_2",
    name: "CHRONO-2",
    role: "chrono",
    level: 2,
    efficiency: 0.92,
    accuracy: 0.95,
    cost: 1100,
    unlocked: false,
    description:
      "Master correlator. Full causal chains, cross-system event correlation.",
  },
];

/** Default level-1 helper per role (no credits needed) */
export const DEFAULT_ACTIVE_HELPERS: Record<
  import("@/types/investigation").AgentId,
  Helper
> = {
  logis: ALL_HELPERS.find((h) => h.id === "logis_1") as Helper,
  nexus: ALL_HELPERS.find((h) => h.id === "nexus_1") as Helper,
  filer: ALL_HELPERS.find((h) => h.id === "filer_1") as Helper,
  chrono: ALL_HELPERS.find((h) => h.id === "chrono_1") as Helper,
};

"use client";

import { AnimatePresence, motion } from "motion/react";
import { Particles } from "./Particles/Particles";

interface SimLoadingScreenProps {
  isVisible: boolean;
}

export function SimLoadingScreen({ isVisible }: SimLoadingScreenProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="fixed inset-0 z-[200] flex items-center justify-center font-pixel"
          style={{ background: "#080c12" }}
        >
          {/* Grid background */}
          <div
            className="pointer-events-none absolute inset-0 z-[1]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />

          {/* Rain particles */}
          <div className="pointer-events-none absolute inset-0 z-[2]">
            <Particles
              variant="rain"
              className="h-full w-full min-h-0"
              quantity={60}
              color="#00d4ff"
              alphaMin={0.03}
              alphaMax={0.1}
              vx={0.12}
              vy={0.3}
            />
          </div>

          <div className="relative z-10 flex flex-col items-center text-center space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 1.2 }}
              className="text-[11px] font-pixel uppercase tracking-[0.3em]"
              style={{
                color: "#00d4ff",
                textShadow: "0 0 12px rgba(0,212,255,0.6), 0 0 24px rgba(0,212,255,0.2)",
              }}
            >
              ◈ NIPS — Incident Loading
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0, duration: 1.0 }}
              className="text-[16px] font-pixel uppercase tracking-wide"
              style={{ color: "#c9d8e8" }}
            >
              Initializing City Grid
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.6, 1] }}
              transition={{
                delay: 1.5,
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
              }}
              className="text-[9px] font-mono uppercase tracking-[0.3em]"
              style={{ color: "#4a6580" }}
            >
              Deploying specialist agents...
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.8, duration: 0.8 }}
              className="w-72"
            >
              <div
                className="h-3 overflow-hidden rounded-sm"
                style={{
                  background: "#0d1520",
                  border: "1px solid #1e3d5a",
                }}
              >
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: "92%" }}
                  transition={{
                    delay: 2.2,
                    duration: 4,
                    ease: "easeInOut",
                  }}
                  className="h-full progress-glow"
                  style={{
                    background: "linear-gradient(90deg, #0a4060, #00d4ff)",
                  }}
                />
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

"use client";

import { AnimatePresence, motion } from "motion/react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import FuzzyText from "@/components/FuzzyText/FuzzyText";
import IntroAnimation from "@/components/IntroAnimation";
import LogoLoop from "@/components/LogoLoop/LogoLoop";
import { Particles } from "@/components/Particles/Particles";
import { SimLoadingScreen } from "@/components/SimLoadingScreen";
import { AuroraLayer } from "@/components/ui/aurora-background";
import { setReplayData } from "@/lib/replayStore";
import { simulacraTechLogos } from "@/lib/simulacraTechLogos";
import type { SavedSimulation } from "@/types/backend";

const NodeCanvasClient = dynamic(
  () => import("@/components/NodeCanvas/NodeCanvasClient"),
  { ssr: false },
);

function isSavedSimulation(data: unknown): data is SavedSimulation {
  if (!data || typeof data !== "object") return false;
  const candidate = data as Partial<SavedSimulation>;
  return (
    candidate.initMsg?.type === "init" &&
    Array.isArray(candidate.initMsg.npcs) &&
    Array.isArray(candidate.rounds)
  );
}

/* ── Corner bracket decorator ─────────────────────────────────────── */
function CornerBracket({
  pos,
}: {
  pos: "tl" | "tr" | "bl" | "br";
}) {
  const size = 12;
  const t = pos.startsWith("t") ? 0 : undefined;
  const b = pos.startsWith("b") ? 0 : undefined;
  const l = pos.endsWith("l") ? 0 : undefined;
  const r = pos.endsWith("r") ? 0 : undefined;
  const flipX = pos.endsWith("r");
  const flipY = pos.startsWith("b");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      className="absolute"
      style={{
        top: t,
        bottom: b,
        left: l,
        right: r,
        transform: `scaleX(${flipX ? -1 : 1}) scaleY(${flipY ? -1 : 1})`,
      }}
    >
      <path d="M0 8 L0 0 L8 0" stroke="#00d4ff" strokeWidth="1.5" fill="none" opacity="0.8" />
    </svg>
  );
}

export default function Home() {
  const [showIntro, setShowIntro] = useState(true);
  const [showLoading, setShowLoading] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showCurtain, setShowCurtain] = useState(false);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleIntroComplete = useCallback(() => {
    setShowIntro(false);
  }, []);

  const handlePlay = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setShowCurtain(true);
      setShowEditor(true);
    }, 500);
  }, [isTransitioning]);

  const handleLoadFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result as string) as SavedSimulation;
          if (!isSavedSimulation(parsed)) {
            console.error("Invalid simulation file");
            return;
          }
          setReplayData(parsed);
          router.push("/simulate?mode=replay&map=citypack");
        } catch (err) {
          console.error("Failed to parse simulation file:", err);
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [router],
  );

  return (
    <AnimatePresence mode="wait">
      {showIntro ? (
        <IntroAnimation key="intro" onComplete={handleIntroComplete} />
      ) : (
        <motion.div
          key="title-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="relative isolate flex h-screen flex-col items-center justify-center overflow-hidden"
          style={{ background: "#080c12" }}
        >
          {/* ── Aurora layer ─────────────────────────────────────── */}
          <AuroraLayer className="z-[3] opacity-30" showRadialGradient={false} />

          {/* ── Ambient rain particles ───────────────────────────── */}
          <div className="pointer-events-none absolute inset-0 z-[4]">
            <Particles
              variant="rain"
              className="h-full w-full min-h-0"
              quantity={120}
              color="#00d4ff"
              alphaMin={0.03}
              alphaMax={0.12}
              vx={0.15}
              vy={0.35}
            />
          </div>

          {/* ── Scanline overlay ─────────────────────────────────── */}
          <div
            className="pointer-events-none absolute inset-0 z-[5]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,212,255,0.015) 3px, rgba(0,212,255,0.015) 4px)",
            }}
          />

          {/* ── Grid background ──────────────────────────────────── */}
          <div
            className="pointer-events-none absolute inset-0 z-[2]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(0,212,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.04) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />

          {/* ── Terminal display (sign) ───────────────────────────── */}
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              delay: 0.3,
              duration: 1.0,
              type: "spring",
              stiffness: 80,
              damping: 14,
            }}
            className="relative z-[10] mb-10"
          >
            <div
              role="button"
              onClick={handlePlay}
              className="relative px-16 py-10 text-center cursor-pointer"
              style={{
                background: "rgba(8, 12, 18, 0.96)",
                border: "1px solid #1e3d5a",
                borderRadius: "4px",
                boxShadow:
                  "0 0 60px rgba(0,212,255,0.08), inset 0 0 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,212,255,0.05)",
                minWidth: "520px",
              }}
            >
              {/* Scan lines inside terminal */}
              <div
                className="absolute inset-0 pointer-events-none rounded"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.025) 2px, rgba(0,212,255,0.025) 4px)",
                }}
              />

              {/* Corner brackets */}
              <CornerBracket pos="tl" />
              <CornerBracket pos="tr" />
              <CornerBracket pos="bl" />
              <CornerBracket pos="br" />

              {/* Status dot */}
              <div className="absolute top-3 right-4 flex items-center gap-1.5">
                <motion.div
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 1.8, repeat: Number.POSITIVE_INFINITY }}
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: "#00ff88" }}
                />
                <span
                  className="text-[7px] font-mono uppercase tracking-widest"
                  style={{ color: "#4a6580" }}
                >
                  ONLINE
                </span>
              </div>

              {/* Header label */}
              <div
                className="absolute top-3 left-4 text-[7px] font-mono uppercase tracking-widest"
                style={{ color: "#1e3d5a" }}
              >
                SYS://NIPS/v1.0
              </div>

              {/* Title */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.6, type: "spring" }}
                className="relative z-10 mt-2"
              >
                <FuzzyText
                  fontSize={42}
                  fontFamily="'Press Start 2P', monospace"
                  fontWeight={900}
                  color="#00d4ff"
                  baseIntensity={isTransitioning ? 0.85 : 0}
                  hoverIntensity={0.1}
                  enableHover={!isTransitioning}
                  glitchMode={isTransitioning}
                  glitchInterval={90}
                  glitchDuration={220}
                  fuzzRange={28}
                  direction="both"
                  clickEffect={false}
                >
                  NIPS
                </FuzzyText>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1, duration: 0.8 }}
                className="relative z-10 mt-3 text-[8px] font-mono uppercase tracking-[0.2em]"
                style={{ color: "#4a6580" }}
              >
                Neural Investigative Procedure Simulator
              </motion.p>

              {/* Divider */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 1.4, duration: 0.6 }}
                className="mt-4 mb-1 h-px"
                style={{ background: "linear-gradient(90deg, transparent, #1e3d5a, transparent)" }}
              />

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.6, duration: 0.6 }}
                className="relative z-10 text-[7px] font-mono tracking-widest"
                style={{ color: "#1e5a6a" }}
              >
                [ CLICK TO LOAD INCIDENT ]
              </motion.p>
            </div>
          </motion.div>

          {/* ── Menu Buttons (Begin + Load) ──────────────────────── */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.0, duration: 0.8 }}
            className="relative z-[10] flex w-full max-w-[300px] justify-center gap-3 px-4 max-[500px]:max-w-[180px] max-[500px]:flex-col"
          >
            {/* BEGIN button */}
            <motion.button
              type="button"
              onClick={handlePlay}
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.5 }}
              whileHover={{ y: -2, boxShadow: "0 0 20px rgba(0,212,255,0.3)" }}
              whileTap={{ y: 1 }}
              className="flex min-h-[34px] flex-1 basis-0 items-center justify-center px-4 py-1.5 cursor-pointer max-[500px]:w-full"
              style={{
                background: "rgba(0,212,255,0.08)",
                border: "1px solid #00d4ff",
                borderRadius: "3px",
                boxShadow: "0 0 12px rgba(0,212,255,0.12), inset 0 0 20px rgba(0,212,255,0.04)",
              }}
            >
              <FuzzyText
                fontSize={11}
                fontFamily="'Press Start 2P', monospace"
                fontWeight={700}
                color="#00d4ff"
                baseIntensity={isTransitioning ? 0.85 : 0}
                hoverIntensity={0}
                enableHover={false}
                glitchMode={isTransitioning}
                glitchInterval={90}
                glitchDuration={220}
                fuzzRange={8}
                direction="both"
                clickEffect={false}
              >
                BEGIN
              </FuzzyText>
            </motion.button>

            {/* LOAD button */}
            <motion.button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.35, duration: 0.5 }}
              whileHover={{ y: -2, boxShadow: "0 0 20px rgba(0,212,255,0.15)" }}
              whileTap={{ y: 1 }}
              className="flex min-h-[34px] flex-1 basis-0 items-center justify-center px-4 py-1.5 cursor-pointer max-[500px]:w-full"
              style={{
                background: "rgba(8,12,18,0.9)",
                border: "1px solid #1e3d5a",
                borderRadius: "3px",
                boxShadow: "0 0 8px rgba(0,0,0,0.5)",
              }}
            >
              <FuzzyText
                fontSize={11}
                fontFamily="'Press Start 2P', monospace"
                fontWeight={700}
                color="#4a6580"
                baseIntensity={isTransitioning ? 0.85 : 0}
                hoverIntensity={0}
                enableHover={false}
                glitchMode={isTransitioning}
                glitchInterval={90}
                glitchDuration={220}
                fuzzRange={8}
                direction="both"
                clickEffect={false}
              >
                LOAD
              </FuzzyText>
            </motion.button>
          </motion.div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleLoadFile}
            className="hidden"
          />

          {/* ── Footer: tech strip ───────────────────────────────── */}
          <motion.footer
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.0, duration: 1.0 }}
            className="absolute bottom-0 left-0 right-0 z-[12] flex flex-col items-center px-4 pb-7 pt-10 pointer-events-none"
            style={{
              background:
                "linear-gradient(to top, rgba(8,12,18,0.9) 0%, rgba(8,12,18,0.4) 50%, transparent 100%)",
            }}
          >
            <div className="pointer-events-auto w-full max-w-5xl">
              <div
                className="rounded border px-5 py-3.5 [&_a]:flex [&_a]:items-center [&_svg]:text-white"
                style={{
                  background: "rgba(8, 12, 18, 0.7)",
                  borderColor: "#1e3d5a",
                  color: "rgba(201,216,232,0.7)",
                  WebkitBackdropFilter: "blur(18px)",
                  backdropFilter: "blur(18px)",
                }}
              >
                <LogoLoop
                  logos={simulacraTechLogos}
                  speed={52}
                  direction="left"
                  logoHeight={34}
                  gap={48}
                  hoverSpeed={0}
                  fadeOut
                  fadeOutColor="rgba(8, 12, 18, 0.9)"
                  ariaLabel="Built with"
                />
              </div>
            </div>
            <span
              className="pointer-events-auto absolute bottom-3 right-4 text-right text-[8px] font-mono uppercase tracking-widest sm:bottom-4 sm:right-6"
              style={{ color: "#1e3d5a" }}
            >
              NIPS v1.0 {"\u2014"} The Boys Inc.
            </span>
          </motion.footer>

          {/* ── Incident editor overlay ──────────────────────────── */}
          <AnimatePresence>
            {showEditor && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-[50] flex flex-col"
                style={{ background: "#080c12" }}
              >
                <div
                  className="absolute inset-0 z-[1] pointer-events-none"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(0,212,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.025) 1px, transparent 1px)",
                    backgroundSize: "48px 48px",
                  }}
                />
                <AuroraLayer className="z-[2] opacity-20" showRadialGradient={false} />
                <div
                  className="relative z-[20] flex h-10 shrink-0 items-center justify-between px-5"
                  style={{
                    background: "rgba(15, 25, 39, 0.98)",
                    borderBottom: "1px solid #1e3d5a",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setShowEditor(false)}
                    className="text-[9px] font-mono uppercase tracking-wide transition-opacity hover:opacity-70"
                    style={{ color: "#4a6580" }}
                  >
                    {"\u2190"} Back
                  </button>
                  <span
                    className="text-[9px] font-mono tracking-wide"
                    style={{ color: "#00d4ff" }}
                  >
                    ◈ New Investigation
                  </span>
                  <span
                    className="text-[8px] font-mono"
                    style={{ color: "#00ff88" }}
                  >
                    ● READY
                  </span>
                </div>
                <div className="relative z-[10] min-h-0 flex-1 flex items-center justify-center pt-20">
                  <NodeCanvasClient
                    onSimulateStart={() => setShowLoading(true)}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Loading screen ───────────────────────────────────── */}
          <SimLoadingScreen isVisible={showLoading} />
        </motion.div>
      )}

      {/* ── Slide curtain transition ─────────────────────────── */}
      <AnimatePresence>
        {showCurtain && (
          <motion.div
            key="slide-curtain"
            className="fixed inset-0 z-[300]"
            style={{ background: "#080c12" }}
            initial={{ x: "100%" }}
            animate={{ x: ["100%", "0%", "0%", "-100%"] }}
            transition={{
              duration: 1.1,
              times: [0, 0.28, 0.52, 1],
              ease: "easeInOut",
            }}
            onAnimationComplete={() => {
              setShowCurtain(false);
              setIsTransitioning(false);
            }}
          />
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}

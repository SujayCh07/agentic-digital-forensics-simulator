"use client";

import { AnimatePresence, motion } from "motion/react";
import dynamic from "next/dynamic";
import Image from "next/image";
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

function Leaf({ style, className, flip, size = 28 }: { style?: React.CSSProperties; className?: string; flip?: boolean; size?: number; }) {
  return <img src="/leaves.png" alt="" width={size} height={size} className={`pixel-crisp ${className ?? ""}`} style={{ ...style, transform: flip ? "scaleX(-1)" : undefined }} />;
}

function Star({ x, y, delay, size = 3 }: { x: string; y: string; delay: number; size?: number }) {
  return (
    <motion.div className="absolute" style={{ left: x, top: y }} animate={{ opacity: [0.15, 1, 0.15], scale: [0.7, 1.3, 0.7] }} transition={{ duration: 2.5 + Math.random() * 2, repeat: Number.POSITIVE_INFINITY, delay, ease: "easeInOut" }}>
      <svg width={size * 4} height={size * 4} viewBox="0 0 16 16"><path d="M8 0 L9 6 L16 8 L9 10 L8 16 L7 10 L0 8 L7 6 Z" fill="#FFF" opacity="0.9" /></svg>
    </motion.div>
  );
}

const CLOUD_ROWS = ["          ########              ", "        ############            ", "       ##############    ####   ", "      ################  ######  ", "     ########################## ", "    ############################", "   #############################", "  ##############################", " ###############################", " ###############################", "################################", "################################", "################################", " ############################## ", "  ############################  "];

function PixelCloud({ y, delay, duration, scale = 1 }: { y: string; delay: number; duration: number; scale?: number }) {
  const PX = 2;
  const cols = CLOUD_ROWS[0].length;
  const rows = CLOUD_ROWS.length;
  const w = cols * PX * scale;
  const h = rows * PX * scale;
  return <motion.div className="absolute" style={{ top: y }} initial={{ left: `-${w}px` }} animate={{ left: "110%" }} transition={{ duration, repeat: Number.POSITIVE_INFINITY, delay, ease: "linear" }}><svg width={w} height={h} viewBox={`0 0 ${cols * PX} ${rows * PX}`} className="pixel-crisp" shapeRendering="crispEdges">{CLOUD_ROWS.flatMap((row, r) => [...row].map((ch, c) => ch === "#" ? <rect key={`${r}-${c}`} x={c * PX} y={r * PX} width={PX} height={PX} fill={r <= 2 ? "#FFFFFF" : r >= rows - 2 ? "#E0EAF0" : "#F6F6F6"} opacity={r >= rows - 1 ? 0.85 : 0.94} /> : null))}</svg></motion.div>;
}

function Bird({ y, delay, duration, size = 1 }: { y: string; delay: number; duration: number; size?: number }) {
  const w = 20 * size;
  return <motion.div className="absolute" style={{ top: y }} initial={{ right: `-${w * 2}px` }} animate={{ right: "110%" }} transition={{ duration, repeat: Number.POSITIVE_INFINITY, delay, ease: "linear" }}><motion.svg width={w} height={w * 0.5} viewBox="0 0 20 10" fill="none" className="pixel-crisp" animate={{ scaleY: [1, 0.4, 1] }} transition={{ duration: 0.6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}><path d="M0 3 Q5 0 10 4 Q15 0 20 3" stroke="#1a1a2e" strokeWidth="1.5" fill="none" strokeLinecap="round" /></motion.svg></motion.div>;
}

export default function Home() {
  const [showIntro, setShowIntro] = useState(true);
  const [showLoading, setShowLoading] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showCurtain, setShowCurtain] = useState(false);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleIntroComplete = useCallback(() => setShowIntro(false), []);
  const handlePlay = useCallback(() => { if (isTransitioning) return; setIsTransitioning(true); setTimeout(() => { setShowCurtain(true); setShowEditor(true); }, 500); }, [isTransitioning]);

  const handleLoadFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { const parsed = JSON.parse(reader.result as string) as SavedSimulation; if (!isSavedSimulation(parsed)) return; setReplayData(parsed); router.push("/simulate?mode=replay&map=citypack"); } catch {} }; reader.readAsText(file); e.target.value = ""; }, [router]);

  return <AnimatePresence mode="wait">{showIntro ? <IntroAnimation key="intro" onComplete={handleIntroComplete} /> : <motion.div key="title-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 2, ease: "easeOut" }} className="relative isolate flex h-screen flex-col items-center justify-center overflow-hidden"><div className="pointer-events-none absolute inset-0 z-0 overflow-hidden"><Image src="/background.png" alt="" fill priority className="object-cover object-bottom pixel-crisp" /></div><AuroraLayer className="z-[3]" showRadialGradient={false} /><div className="pointer-events-none absolute inset-0 z-[4]"><Particles variant="dust" className="h-full w-full min-h-0" quantity={80} color="#FDF5E6" alphaMin={0.05} alphaMax={0.15} size={0.6} vx={0.05} vy={0.02} /></div><div className="pointer-events-none absolute inset-0 z-[5]"><Particles variant="rain" className="h-full w-full min-h-0" quantity={96} color="#3D3E45" alphaMin={0.08} alphaMax={0.22} vx={0.22} vy={0.28} /></div><div className="pointer-events-none absolute inset-0 z-[6]"><Star x="12%" y="6%" delay={0} size={3} /><Star x="28%" y="4%" delay={0.8} size={2} /><Star x="50%" y="2%" delay={1.5} size={4} /><Star x="70%" y="5%" delay={0.3} size={2} /><Star x="85%" y="3%" delay={1.1} size={3} /></div><div className="pointer-events-none absolute inset-0 z-[7] overflow-hidden"><PixelCloud y="22%" delay={0} duration={80} scale={1.4} /><PixelCloud y="32%" delay={15} duration={100} scale={1.0} /><PixelCloud y="18%" delay={35} duration={90} scale={1.2} /></div><div className="pointer-events-none absolute inset-0 z-[8] overflow-hidden"><Bird y="15%" delay={2} duration={18} size={1.0} /><Bird y="12%" delay={5} duration={20} size={0.8} /></div><motion.div initial={{ y: -60, opacity: 0, rotate: -2 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ delay: 0.3, duration: 1.2, type: "spring", stiffness: 80, damping: 12 }} className="relative z-[10] mb-10"><div role="button" onClick={handlePlay} className="relative cursor-pointer px-14 py-8 text-center pixel-crisp" style={{ background: "#1f2430", border: "6px solid #78d7ff", borderRadius: "2px", boxShadow: "inset 4px 4px 0 rgba(255,255,255,0.12), inset -4px -4px 0 rgba(0,0,0,0.35), 6px 6px 0 #091018", minWidth: "520px", imageRendering: "pixelated" }}><div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 12px, rgba(120,215,255,0.16) 12px, rgba(120,215,255,0.16) 14px, transparent 14px, transparent 26px)", opacity: 0.35 }} />{[{ top: 10, left: 10 }, { top: 10, right: 10 }, { bottom: 10, left: 10 }, { bottom: 10, right: 10 }].map((pos, i) => <div key={i} className="absolute" style={{ ...pos, width: 8, height: 8, background: "#78d7ff", border: "2px solid #0f2d3d", borderRadius: "1px", boxShadow: "1px 1px 0 #081018" }} />)}<Leaf className="absolute" style={{ top: -12, left: -10, rotate: "-15deg" }} size={32} /><Leaf className="absolute" style={{ top: -10, right: -12, rotate: "20deg" }} size={30} flip /><motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.8, duration: 0.6, type: "spring" }} className="relative z-10"><FuzzyText fontSize={36} fontFamily="'Press Start 2P', monospace" fontWeight={900} color="#dff7ff" baseIntensity={isTransitioning ? 0.85 : 0} hoverIntensity={0} enableHover={false} glitchMode={isTransitioning} glitchInterval={90} glitchDuration={220} fuzzRange={28} direction="both" clickEffect={false}>ECHO</FuzzyText></motion.div><motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.8 }} className="relative z-10 mt-2 text-[9px] font-pixel uppercase tracking-[0.25em]" style={{ color: "#78d7ff" }}>Digital Forensics City Simulator</motion.p></div></motion.div><motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.0, duration: 0.8 }} className="relative z-[10] flex w-full max-w-[320px] justify-center gap-3 px-4 max-[500px]:max-w-[160px] max-[500px]:flex-col"><motion.button type="button" onClick={handlePlay} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.2, duration: 0.5 }} whileHover={{ y: -3 }} whileTap={{ y: 2 }} className="flex min-h-[32px] flex-1 basis-0 items-center justify-center px-4 py-1.5 cursor-pointer pixel-crisp max-[500px]:w-full" style={{ background: "#1f2430", border: "2px solid #78d7ff", borderRadius: "2px", boxShadow: "inset 1px 1px 0 rgba(255,255,255,0.12), inset -1px -1px 0 rgba(0,0,0,0.35), 2px 2px 0 #091018" }}><FuzzyText fontSize={12} fontFamily="'Press Start 2P', monospace" fontWeight={900} color="#dff7ff" baseIntensity={isTransitioning ? 0.85 : 0} hoverIntensity={0} enableHover={false} glitchMode={isTransitioning} glitchInterval={90} glitchDuration={220} fuzzRange={8} direction="both" clickEffect={false}>ENTER</FuzzyText></motion.button><motion.button type="button" onClick={() => fileInputRef.current?.click()} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.35, duration: 0.5 }} whileHover={{ y: -2 }} whileTap={{ y: 1 }} className="flex min-h-[32px] flex-1 basis-0 items-center justify-center px-4 py-1.5 cursor-pointer pixel-crisp max-[500px]:w-full" style={{ background: "#1f2430", border: "2px solid #78d7ff", borderRadius: "2px", boxShadow: "inset 1px 1px 0 rgba(255,255,255,0.12), inset -1px -1px 0 rgba(0,0,0,0.35), 2px 2px 0 #091018" }}><FuzzyText fontSize={12} fontFamily="'Press Start 2P', monospace" fontWeight={900} color="#dff7ff" baseIntensity={isTransitioning ? 0.85 : 0} hoverIntensity={0} enableHover={false} glitchMode={isTransitioning} glitchInterval={90} glitchDuration={220} fuzzRange={8} direction="both" clickEffect={false}>LOAD</FuzzyText></motion.button></motion.div><input ref={fileInputRef} type="file" accept=".json" onChange={handleLoadFile} className="hidden" /><motion.footer initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.0, duration: 1.0 }} className="absolute bottom-0 left-0 right-0 z-[12] flex flex-col items-center px-4 pb-7 pt-10 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(9, 16, 24, 0.72) 0%, rgba(9, 16, 24, 0.28) 38%, rgba(9, 16, 24, 0.06) 68%, transparent 92%)" }}><div className="pointer-events-auto w-full max-w-5xl"><div className="rounded-2xl border border-white/20 px-5 py-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.18)]" style={{ background: "rgba(10, 20, 30, 0.3)", color: "rgba(255,255,255,0.92)", WebkitBackdropFilter: "blur(18px) saturate(140%)", backdropFilter: "blur(18px) saturate(140%)" }}><LogoLoop logos={simulacraTechLogos} speed={52} direction="left" logoHeight={34} gap={48} hoverSpeed={0} fadeOut fadeOutColor="rgba(10, 20, 30, 0.55)" ariaLabel="Built with" /></div></div><span className="pointer-events-auto absolute bottom-3 right-4 text-right text-[9px] font-pixel uppercase tracking-widest drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] sm:bottom-4 sm:right-6" style={{ color: "rgba(255,255,255,0.58)" }}>ECHO build</span></motion.footer><AnimatePresence>{showEditor && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="fixed inset-0 z-[50] flex flex-col"><div className="pointer-events-none absolute inset-0 z-0 overflow-hidden"><Image src="/background.png" alt="" fill className="object-cover object-bottom" /></div><div className="absolute inset-0 z-[1]" style={{ background: "linear-gradient(180deg, rgba(5,10,18,0.6) 0%, rgba(8,16,28,0.4) 40%, rgba(5,10,18,0.55) 100%)" }} /><AuroraLayer className="z-[2]" showRadialGradient={false} /><div className="relative z-[20] flex h-10 shrink-0 items-center justify-between px-5" style={{ background: "rgba(20,32,42,0.92)", borderBottom: "3px solid #78d7ff" }}><button type="button" onClick={() => setShowEditor(false)} className="text-[9px] font-pixel uppercase tracking-wide transition-opacity hover:opacity-70" style={{ color: "#dff7ff" }}>← Back</button><span className="text-[9px] font-pixel tracking-wide" style={{ color: "#bfefff" }}>★ New Investigation</span><span className="text-[8px] font-pixel" style={{ color: "#78d7ff" }}>★ Ready</span></div><div className="relative z-[10] min-h-0 flex-1 flex items-center justify-center pt-20"><NodeCanvasClient onSimulateStart={() => setShowLoading(true)} /></div></motion.div>}</AnimatePresence><SimLoadingScreen isVisible={showLoading} /></motion.div>}{showCurtain && <motion.div key="slide-curtain" className="fixed inset-0 z-[300]" style={{ background: "#060b12" }} initial={{ x: "100%" }} animate={{ x: ["100%", "0%", "0%", "-100%"] }} transition={{ duration: 1.1, times: [0, 0.28, 0.52, 1], ease: "easeInOut" }} onAnimationComplete={() => { setShowCurtain(false); setIsTransitioning(false); }} />}</AnimatePresence>;
}

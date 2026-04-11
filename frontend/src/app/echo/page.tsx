import { EchoScenarioPanel } from "@/components/EchoScenarioPanel";

export default function EchoPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-cyan-50">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded border border-cyan-300/30 bg-slate-900/80 p-6">
          <p className="text-[10px] uppercase tracking-[0.4em] text-cyan-300/70">
            ECHO
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Digital Forensics City Simulator</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-cyan-100/70">
            Buildings are machines, roads are traffic, citizens are processes, and the city itself is the evidence graph.
          </p>
        </header>
        <EchoScenarioPanel />
      </div>
    </main>
  );
}

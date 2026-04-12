"use client";

export function TutorialVictoryModal({
  onRestart,
  onPlayFullCase,
  onReturnHome,
}: {
  onRestart: () => void;
  onPlayFullCase: () => void;
  onReturnHome: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-2xl rounded-2xl border p-6"
        style={{
          background: "rgba(8,12,18,0.98)",
          borderColor: "rgba(53,247,207,0.38)",
          boxShadow:
            "0 24px 64px rgba(0,0,0,0.68), 0 0 30px rgba(53,247,207,0.12)",
        }}
        data-tutorial-id="tutorial-victory-modal"
      >
        <div
          className="text-[9px] font-mono uppercase tracking-[0.18em]"
          style={{ color: "#35f7cf" }}
        >
          Tutorial Complete
        </div>
        <h2 className="mt-3 text-[18px] font-mono" style={{ color: "#d8ecff" }}>
          You solved the guided case from first clue to final report.
        </h2>
        <p
          className="mt-4 text-[11px] font-mono leading-6"
          style={{ color: "#7aa5c6" }}
        >
          You learned how to start with one specialist, earn credits from real
          findings, recruit the right follow-up agents, read evidence as an
          attack chain, resolve midgame issues, and submit the winning final
          accusation.
        </p>

        <div
          className="mt-5 rounded-xl border px-4 py-4"
          style={{
            background: "rgba(10,19,32,0.94)",
            borderColor: "rgba(30,61,90,0.95)",
          }}
        >
          <div
            className="text-[8px] font-mono uppercase tracking-[0.16em]"
            style={{ color: "#ffcf70" }}
          >
            What You Practiced
          </div>
          <ul
            className="mt-3 space-y-2 text-[10px] font-mono leading-5"
            style={{ color: "#d8ecff" }}
          >
            <li>1. Opening the right node from the system list</li>
            <li>
              2. Recruiting LOGIS and NEXUS after your starter earned enough
              live credits
            </li>
            <li>
              3. Dispatching FILER, LOGIS, and NEXUS for the correct kinds of
              evidence
            </li>
            <li>4. Using evidence to justify issue resolution</li>
            <li>
              5. Building the ordered attack path before submitting the final
              report
            </li>
          </ul>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onPlayFullCase}
            className="rounded-md border px-4 py-3 text-[9px] font-mono uppercase tracking-[0.16em]"
            style={{
              color: "#35f7cf",
              borderColor: "rgba(53,247,207,0.45)",
              background: "rgba(53,247,207,0.08)",
            }}
          >
            Play Full Investigation
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="rounded-md border px-4 py-3 text-[9px] font-mono uppercase tracking-[0.16em]"
            style={{
              color: "#ffcf70",
              borderColor: "rgba(255,207,112,0.38)",
              background: "rgba(255,207,112,0.08)",
            }}
          >
            Restart Tutorial
          </button>
          <button
            type="button"
            onClick={onReturnHome}
            className="rounded-md border px-4 py-3 text-[9px] font-mono uppercase tracking-[0.16em]"
            style={{
              color: "#7aa5c6",
              borderColor: "rgba(30,61,90,0.95)",
              background: "rgba(10,19,32,0.92)",
            }}
          >
            Return Home
          </button>
        </div>
      </div>
    </div>
  );
}

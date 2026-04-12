"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * /tutorial — redirects to the simulation page in tutorial mode.
 * The tutorial overlay is rendered inside simulate/page.tsx when
 * the `tutorial=1` query param is present.
 */
export default function TutorialRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/simulate?tutorial=1&mode=investigate&map=moonCity");
  }, [router]);

  return (
    <div
      className="flex h-screen items-center justify-center"
      style={{ background: "#080c12" }}
    >
      <span
        className="text-[10px] font-mono uppercase tracking-widest"
        style={{ color: "#2a5070" }}
      >
        Loading tutorial…
      </span>
    </div>
  );
}

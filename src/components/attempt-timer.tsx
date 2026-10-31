"use client";

import { submitAttempt } from "@/app/actions/student";
import { useEffect, useState, useTransition } from "react";

export function AttemptTimer({
  attemptId,
  deadlineIso,
}: {
  attemptId: string;
  deadlineIso: string;
}) {
  const deadline = new Date(deadlineIso).getTime();
  const [, startTransition] = useTransition();
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, deadline - Date.now()),
  );

  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, deadline - Date.now());
      setRemaining(left);
      if (left <= 0) {
        startTransition(() => submitAttempt(attemptId));
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [attemptId, deadline]);

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const urgent = remaining < 5 * 60 * 1000;

  return (
    <span
      className={`rounded-md px-2.5 py-1 text-xs font-medium tabular-nums ${
        urgent ? "bg-red-50 text-red-800" : "bg-slate-100 text-slate-700"
      }`}
    >
      Time left {mins}:{String(secs).padStart(2, "0")}
    </span>
  );
}

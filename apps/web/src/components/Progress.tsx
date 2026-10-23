import type { Mode, Stage } from "@/lib/api";

const STEPS: { stage: Stage; label: string }[] = [
  { stage: "understanding", label: "Understanding your question" },
  { stage: "searching", label: "Searching Gurbani" },
  { stage: "reading", label: "Reading shabads in context" },
  { stage: "writing", label: "Writing the answer" },
  { stage: "checking", label: "Checking every citation" },
];

export function Progress({ mode, current }: { mode: Mode; current: Stage | null }) {
  const steps = mode === "explore" ? STEPS.slice(0, 3) : STEPS;
  const currentIndex = current ? steps.findIndex((s) => s.stage === current) : 0;
  return (
    <ol className="progress" aria-live="polite">
      {steps.map((s, i) => {
        const state = i < currentIndex ? "done" : i === currentIndex ? "active" : "todo";
        return (
          <li key={s.stage} data-state={state}>
            <span className="dot" aria-hidden="true">
              {state === "done" && (
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5.2 4.1 7.3 8 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span>
              {s.label}
              {state === "active" && <span className="sr-only"> (in progress)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

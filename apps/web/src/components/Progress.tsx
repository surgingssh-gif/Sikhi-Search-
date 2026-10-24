import type { Stage } from "@/lib/api";

type ProgressMode = "ask" | "explore" | "discuss";

const ASK_STEPS: { stage: Stage; label: string }[] = [
  { stage: "understanding", label: "Understanding your question" },
  { stage: "searching", label: "Searching Gurbani" },
  { stage: "reading", label: "Reading shabads in context" },
  { stage: "writing", label: "Writing the answer" },
  { stage: "checking", label: "Checking every citation" },
];

const DISCUSS_STEPS: { stage: Stage; label: string }[] = [
  { stage: "reading", label: "Reading the shabad" },
  { stage: "writing", label: "Thinking it through" },
  { stage: "checking", label: "Checking line references" },
];

export function Progress({ mode, current }: { mode: ProgressMode; current: Stage | null }) {
  const steps = mode === "discuss" ? DISCUSS_STEPS : mode === "explore" ? ASK_STEPS.slice(0, 3) : ASK_STEPS;
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

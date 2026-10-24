"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { askStream, friendlyError, type AskResult, type ChatTurn, type ExploreResult, type Mode, type Stage } from "@/lib/api";
import { AnswerView, ExploreView } from "./AnswerView";
import { Progress } from "./Progress";

type Exchange = {
  id: number;
  mode: Mode;
  question: string;
  stage: Stage | null;
  result?: AskResult | ExploreResult;
  error?: string;
};

export interface HukamnamaTeaser {
  shabadId: number;
  ang: number;
  writer: string | null;
  raag: string | null;
}

const SUGGESTED = [
  "What is Hukam?",
  "How does Gurbani explain ego (haumai)?",
  "I keep comparing myself to others. What does Sikhi teach?",
  "What does Sikhi teach about anxiety and worry?",
  "What is the significance of Vaisakhi?",
  "Why is seva important in Sikhi?",
];

const MODES: { mode: Mode; label: string; hint: string; placeholder: string }[] = [
  { mode: "ask", label: "Answer", hint: "A clear answer, with the Gurbani behind it.", placeholder: "Ask anything about Sikhi…" },
  {
    mode: "explore",
    label: "Gurbani only",
    hint: "Just the most relevant Gurbani, with a short note on each.",
    placeholder: "What would you like to find in Gurbani?",
  },
];

/** Conversation memory sent with each question. Kept only in this tab; the server stores nothing. */
function historyFrom(exchanges: Exchange[]): ChatTurn[] {
  return exchanges.flatMap((e) =>
    e.mode === "ask" && e.result && "answer" in e.result
      ? [
          { role: "user" as const, content: e.question },
          { role: "assistant" as const, content: e.result.answer },
        ]
      : [],
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 13V3M8 3 3.5 7.5M8 3l4.5 4.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Check() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 8.2 7 10.2 11 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AskApp({ hukamnama }: { hukamnama: HukamnamaTeaser | null }) {
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<Mode>("ask");
  const busy = exchanges.some((e) => !e.result && !e.error);
  const nextId = useRef(1);
  const latest = useRef<HTMLElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const started = exchanges.length > 0;
  const current = MODES.find((m) => m.mode === mode)!;

  // Bring each new question to the top of the screen so its answer reads from the start.
  useEffect(() => {
    if (started) latest.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [exchanges.length, started]);

  function update(id: number, patch: Partial<Exchange>) {
    setExchanges((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  async function submit(question: string, asMode: Mode = mode) {
    const q = question.trim();
    if (q.length < 3 || busy) return;
    const id = nextId.current++;
    const history = historyFrom(exchanges);
    setExchanges((xs) => [...xs, { id, mode: asMode, question: q, stage: null }]);
    setDraft("");
    if (textarea.current) textarea.current.style.height = "auto";
    try {
      const result = await askStream(asMode, q, history, (stage) => update(id, { stage }));
      update(id, { result });
    } catch (err) {
      update(id, { error: friendlyError(err) });
    }
  }

  function retry(x: Exchange) {
    setExchanges((xs) => xs.filter((e) => e.id !== x.id));
    void submit(x.question, x.mode);
  }

  const composer = (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(draft);
      }}
    >
      <label htmlFor="question" className="sr-only">
        Your question
      </label>
      <textarea
        id="question"
        ref={textarea}
        rows={started ? 1 : 2}
        value={draft}
        maxLength={500}
        placeholder={started ? (mode === "ask" ? "Ask a follow-up…" : "Find more Gurbani…") : current.placeholder}
        onChange={(e) => {
          setDraft(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = `${e.target.scrollHeight}px`;
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void submit(draft);
          }
        }}
      />
      <div className="composer-row">
        <div className="segmented" role="group" aria-label="Answer style">
          {MODES.map((m) => (
            <button key={m.mode} type="button" aria-pressed={mode === m.mode} onClick={() => setMode(m.mode)} title={m.hint}>
              {m.label}
            </button>
          ))}
        </div>
        <button className="send" type="submit" disabled={busy || draft.trim().length < 3} aria-label="Send">
          <SendIcon />
        </button>
      </div>
    </form>
  );

  if (!started) {
    return (
      <main className="wrap">
        <section className="hero">
          <p className="eyebrow">Learn Sikhi through Gurbani</p>
          <h1>What would you like to learn about Sikhi?</h1>
          <p>Ask in your own words. You&apos;ll get a clear answer and the Gurbani behind it, each line shown with its Ang.</p>
        </section>

        {composer}
        <p className="mode-hint" aria-live="polite">
          {current.hint}
        </p>

        {hukamnama && (
          <Link className="hukam-strip" href={`/discuss/${hukamnama.shabadId}`}>
            <span className="hukam-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5Z" />
                <path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" />
              </svg>
            </span>
            <span className="hukam-text">
              <strong>Today&apos;s Hukamnama</strong>
              <span>{["Ang " + hukamnama.ang, hukamnama.writer, hukamnama.raag].filter(Boolean).join(" · ")}</span>
            </span>
            <span className="hukam-go">
              <span>Discuss</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </Link>
        )}

        <section className="suggest" aria-label="Suggested questions">
          <p className="section-title">Try asking</p>
          <ul className="suggest-grid">
            {SUGGESTED.map((s) => (
              <li key={s}>
                <button type="button" onClick={() => void submit(s)}>
                  {s}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <ul className="trust" aria-label="How answers work">
          <li>
            <Check />
            <span>
              <strong>Real Gurbani only</strong>
              Every line comes from BaniDB, never written by AI.
            </span>
          </li>
          <li>
            <Check />
            <span>
              <strong>Always in context</strong>
              Each passage links to its full shabad.
            </span>
          </li>
          <li>
            <Check />
            <span>
              <strong>A guide, not an authority</strong>
              Interpretation is marked as such.
            </span>
          </li>
        </ul>
      </main>
    );
  }

  return (
    <main className="wrap">
      <div className="thread">
        {exchanges.map((x, i) => (
          <article
            key={x.id}
            ref={i === exchanges.length - 1 ? latest : undefined}
            className="exchange"
            style={{ scrollMarginTop: 80 }}
            aria-label={x.question}
          >
            <header>
              {x.mode === "explore" && <span className="mode-tag">Gurbani only</span>}
              <h2 className="question">{x.question}</h2>
            </header>
            {x.error ? (
              <div className="error" role="alert">
                <span>{x.error}</span>
                <button type="button" className="btn-secondary" onClick={() => retry(x)} disabled={busy}>
                  Try again
                </button>
              </div>
            ) : !x.result ? (
              <div className="answer-card">
                <Progress mode={x.mode} current={x.stage} />
              </div>
            ) : "answer" in x.result ? (
              <AnswerView result={x.result} prefix={`q${x.id}`} busy={busy} onFollowUp={(q) => void submit(q, "ask")} />
            ) : (
              <ExploreView result={x.result} prefix={`q${x.id}`} />
            )}
          </article>
        ))}
      </div>
      <div className="composer-dock">
        {composer}
        <p className="composer-note">Conversations aren&apos;t saved. Answers can be wrong, so check each passage in its shabad.</p>
      </div>
    </main>
  );
}

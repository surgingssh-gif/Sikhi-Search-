"use client";

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

const SUGGESTED = [
  "I've been comparing myself to others and feeling jealous. What does Sikhi teach?",
  "What is Hukam?",
  "How does Gurbani explain ego (haumai)?",
  "What does Sikhi teach about anxiety and worry?",
  "What does Gurbani say about women?",
  "Why is seva important in Sikhi?",
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

export function AskApp() {
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<Mode>("ask");
  const busy = exchanges.some((e) => !e.result && !e.error);
  const nextId = useRef(1);
  const bottom = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const started = exchanges.length > 0;

  useEffect(() => {
    if (started) bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
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
        placeholder={
          started
            ? mode === "ask"
              ? "Ask a follow-up…"
              : "Explore another question…"
            : mode === "ask"
              ? "Ask a question about Sikhi…"
              : "What would you like to explore in Gurbani?"
        }
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
        <div className="modes" role="group" aria-label="Answer style">
          <button type="button" aria-pressed={mode === "ask"} onClick={() => setMode("ask")}>
            Ask
          </button>
          <button type="button" aria-pressed={mode === "explore"} onClick={() => setMode("explore")}>
            Explore Gurbani
          </button>
        </div>
        <button className="send" type="submit" disabled={busy || draft.trim().length < 3} aria-label="Send question">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 13V3M8 3 3.5 7.5M8 3l4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </form>
  );

  if (!started) {
    return (
      <main className="wrap">
        <section className="hero">
          <p className="eyebrow">Learn · Reflect · Explore</p>
          <h1>Ask a question. Discover the Gurbani behind the answer.</h1>
          <p className="lede">
            Ask Sikhi helps you explore Sikh teachings through conversation. Every Gurbani line it shows comes from BaniDB, with its
            Ang and translator named, so you can read it in its full shabad.
          </p>
        </section>
        {composer}
        <ul className="suggestions" aria-label="Suggested questions">
          {SUGGESTED.map((s) => (
            <li key={s}>
              <button type="button" className="chip" onClick={() => void submit(s)}>
                {s}
              </button>
            </li>
          ))}
        </ul>
        <section className="principles" aria-label="How Ask Sikhi works">
          <div>
            <h2>Real Gurbani only</h2>
            <p>The AI never writes Gurbani. Every line is shown exactly as it appears in BaniDB.</p>
          </div>
          <div>
            <h2>Read it in context</h2>
            <p>Each passage links to its full shabad, so no line stands alone.</p>
          </div>
          <div>
            <h2>A guide, not an authority</h2>
            <p>Explanations are labelled as interpretation, and different Sikh views are named.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="wrap">
      <div className="thread">
        {exchanges.map((x) => (
          <section key={x.id} className="exchange" aria-label={`Question: ${x.question}`}>
            <p className="q">
              {x.mode === "explore" && <span className="q-mode">Explore Gurbani</span>}
              {x.question}
            </p>
            <div>
              {x.error ? (
                <div className="error" role="alert">
                  <span>{x.error}</span>
                  <button type="button" onClick={() => retry(x)} disabled={busy}>
                    Try again
                  </button>
                </div>
              ) : !x.result ? (
                <Progress mode={x.mode} current={x.stage} />
              ) : "answer" in x.result ? (
                <AnswerView result={x.result} onFollowUp={(q) => void submit(q, "ask")} />
              ) : (
                <ExploreView result={x.result} />
              )}
            </div>
          </section>
        ))}
        <div ref={bottom} />
      </div>
      <div className="composer-dock">
        {composer}
        <p className="composer-note">Conversations aren&apos;t saved. Answers can be wrong; check each passage in its shabad.</p>
      </div>
    </main>
  );
}

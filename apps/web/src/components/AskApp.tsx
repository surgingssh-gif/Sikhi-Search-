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
      <div className="tabs" role="group" aria-label="Answer style">
        <button type="button" aria-pressed={mode === "ask"} onClick={() => setMode("ask")}>
          Ask
        </button>
        <button type="button" aria-pressed={mode === "explore"} onClick={() => setMode("explore")}>
          Explore Gurbani
        </button>
      </div>
      <label htmlFor="question" className="sr-only">
        Your question
      </label>
      <div className="composer-row">
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
        <button className="send" type="submit" disabled={busy || draft.trim().length < 3}>
          {mode === "ask" ? "Ask" : "Explore"}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </form>
  );

  if (!started) {
    return (
      <main className="wrap">
        <section className="lead">
          <p className="kicker">Sikhi · Gurbani · Everyday life</p>
          <h1 className="headline">Ask a question. Discover the Gurbani behind the answer.</h1>
          <p className="dek">
            Ask Sikhi helps you explore Sikh teachings through conversation. Every Gurbani line it shows comes from BaniDB, with its
            Ang and translator named, so you can read it in its full shabad.
          </p>
          <p className="byline">
            By <strong>Ask Sikhi</strong> · Gurbani from BaniDB by Khalis Foundation · Explanations by Claude
          </p>
        </section>
        {composer}
        <aside className="sixty" aria-label="How Ask Sikhi works">
          <p className="sixty-label">How it works</p>
          <dl>
            <div className="sixty-row">
              <dt>Real Gurbani only</dt>
              <dd>The AI never writes Gurbani. Every line is shown exactly as it appears in BaniDB.</dd>
            </div>
            <div className="sixty-row">
              <dt>Read it in context</dt>
              <dd>Each passage names its Ang and translator, and links to the full shabad.</dd>
            </div>
            <div className="sixty-row">
              <dt>A guide, not an authority</dt>
              <dd>Explanations are marked as interpretation, and differing Sikh views are named.</dd>
            </div>
          </dl>
        </aside>
        <section className="suggest" aria-label="Suggested questions">
          <p className="news-kicker">Try asking</p>
          <ul className="index">
            {SUGGESTED.map((s) => (
              <li key={s}>
                <button type="button" onClick={() => void submit(s)}>
                  {s}
                </button>
              </li>
            ))}
          </ul>
        </section>
      </main>
    );
  }

  return (
    <main className="wrap">
      <div className="thread">
        {exchanges.map((x) => (
          <section key={x.id} className="exchange" aria-label={`Question: ${x.question}`}>
            <header className="q">
              <p className="kicker">{x.mode === "explore" ? "Explore Gurbani" : "Your question"}</p>
              <h2>{x.question}</h2>
            </header>
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

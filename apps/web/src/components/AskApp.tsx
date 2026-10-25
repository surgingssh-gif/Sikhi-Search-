"use client";

import { useEffect, useRef, useState } from "react";
import { askStream, friendlyError, type AskResult, type ChatTurn, type ExploreResult, type Mode, type Stage } from "@/lib/api";
import { AnswerView, ExploreView } from "./AnswerView";
import { useLanguage, useT } from "./Language";
import { Progress } from "./Progress";

type Exchange = {
  id: number;
  mode: Mode;
  question: string;
  stage: Stage | null;
  result?: AskResult | ExploreResult;
  error?: string;
};

const SUGGESTED = {
  en: [
    "How do I live in Hukam when life feels unfair?",
    "What does Gurbani mean by dying while alive?",
    "How can I keep simran going through a busy day?",
    "What does Gurbani say to someone grieving a loss?",
    "What is Miri Piri, and how should it shape my life?",
    "Why does Gurbani keep returning to haumai?",
  ],
  pa: [
    "ਜਦੋਂ ਜ਼ਿੰਦਗੀ ਨਾਇਨਸਾਫ਼ੀ ਲੱਗੇ, ਹੁਕਮ ਵਿੱਚ ਕਿਵੇਂ ਰਹੀਏ?",
    "ਜੀਵਤ ਮਰਨ ਦਾ ਗੁਰਬਾਣੀ ਵਿੱਚ ਕੀ ਅਰਥ ਹੈ?",
    "ਰੁਝੇਵੇਂ ਭਰੇ ਦਿਨ ਵਿੱਚ ਸਿਮਰਨ ਕਿਵੇਂ ਜਾਰੀ ਰੱਖੀਏ?",
    "ਕਿਸੇ ਦੇ ਵਿਛੋੜੇ ਦੇ ਦੁੱਖ ਵਿੱਚ ਗੁਰਬਾਣੀ ਕੀ ਕਹਿੰਦੀ ਹੈ?",
    "ਮੀਰੀ ਪੀਰੀ ਕੀ ਹੈ ਅਤੇ ਇਹ ਸਾਡੇ ਜੀਵਨ ਨੂੰ ਕਿਵੇਂ ਘੜੇ?",
    "ਗੁਰਬਾਣੀ ਵਾਰ-ਵਾਰ ਹਉਮੈ ਦੀ ਗੱਲ ਕਿਉਂ ਕਰਦੀ ਹੈ?",
  ],
};

const MODES: { mode: Mode; label: string; hint: string }[] = [
  { mode: "ask", label: "Answer", hint: "An answer with the Gurbani behind it." },
  { mode: "explore", label: "Gurbani only", hint: "Just the most relevant Gurbani, with a short note on each." },
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

export function AskApp({ initialQuestion }: { initialQuestion?: string }) {
  const { lang } = useLanguage();
  const t = useT();
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<Mode>("ask");
  const busy = exchanges.some((e) => !e.result && !e.error);
  const nextId = useRef(1);
  const latest = useRef<HTMLElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const askedInitial = useRef(false);
  const started = exchanges.length > 0;
  const current = MODES.find((m) => m.mode === mode)!;

  // Bring each new question to the top of the screen so its answer reads from the start.
  useEffect(() => {
    if (started) latest.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [exchanges.length, started]);

  // A question passed from another page (Today, Library) is asked straight away.
  useEffect(() => {
    if (initialQuestion && !askedInitial.current) {
      askedInitial.current = true;
      void submit(initialQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);

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
      const result = await askStream(asMode, q, history, (stage) => update(id, { stage }), lang);
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
        placeholder={started ? t("followUpPlaceholder") : t("askPlaceholder")}
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
          <p className="eyebrow">{t("vichaar")}</p>
          <h1>{lang === "pa" ? "ਕੀ ਵਿਚਾਰ ਕਰਨਾ ਚਾਹੋਗੇ?" : "What would you like to reflect on?"}</h1>
          <p>
            {lang === "pa"
              ? "ਆਪਣੇ ਸ਼ਬਦਾਂ ਵਿੱਚ ਪੁੱਛੋ। ਜਵਾਬ ਦੇ ਨਾਲ ਉਸ ਪਿੱਛੇ ਦੀ ਗੁਰਬਾਣੀ ਵੀ ਮਿਲੇਗੀ, ਹਰ ਪੰਕਤੀ ਆਪਣੇ ਅੰਗ ਸਮੇਤ।"
              : "Ask in your own words. You'll get an answer and the Gurbani behind it, each line with its Ang."}
          </p>
        </section>
        {composer}
        <p className="mode-hint" aria-live="polite">
          {current.hint}
        </p>
        <section className="suggest" aria-label="Suggested questions">
          <p className="section-title">{lang === "pa" ? "ਇਹ ਪੁੱਛ ਕੇ ਵੇਖੋ" : "Try asking"}</p>
          <ul className="suggest-grid" lang={lang === "pa" ? "pa" : undefined}>
            {SUGGESTED[lang].map((s) => (
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

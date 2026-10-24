"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { discussStream, friendlyError, type ChatTurn, type DiscussResult, type Shabad, type Stage } from "@/lib/api";
import { englishOf, isHeading } from "@/lib/shabad";
import { Arrow } from "./AnswerView";
import { CitedProse } from "./CitedProse";
import { Progress } from "./Progress";

type Exchange = { id: number; question: string; stage: Stage | null; result?: DiscussResult; error?: string };

const STARTERS = [
  "What is this shabad about?",
  "What does the Rahao line mean?",
  "Walk me through it line by line",
  "How can I apply this in my life?",
];

export function DiscussApp({ shabad }: { shabad: Shabad }) {
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [draft, setDraft] = useState("");
  const [flash, setFlash] = useState<number | null>(null);
  const busy = exchanges.some((e) => !e.result && !e.error);
  const nextId = useRef(1);
  const latest = useRef<HTMLElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);

  // Line numbers count only lines of text, not headings, so they match what the reader sees.
  const lineNo = new Map<number, number>();
  shabad.verses.filter((v) => !isHeading(v)).forEach((v, i) => lineNo.set(v.verseId, i + 1));
  const lastResult = [...exchanges].reverse().find((e) => e.result)?.result;
  const cited = new Set(lastResult?.citedVerseIds ?? []);

  useEffect(() => {
    if (exchanges.length) latest.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [exchanges.length]);

  useEffect(() => {
    if (flash === null) return;
    const t = setTimeout(() => setFlash(null), 1600);
    return () => clearTimeout(t);
  }, [flash]);

  function update(id: number, patch: Partial<Exchange>) {
    setExchanges((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  function history(): ChatTurn[] {
    return exchanges.flatMap((e) =>
      e.result
        ? [
            { role: "user" as const, content: e.question },
            { role: "assistant" as const, content: e.result.answer },
          ]
        : [],
    );
  }

  async function submit(question: string) {
    const q = question.trim();
    if (q.length < 3 || busy) return;
    const id = nextId.current++;
    const past = history();
    setExchanges((xs) => [...xs, { id, question: q, stage: null }]);
    setDraft("");
    if (textarea.current) textarea.current.style.height = "auto";
    try {
      update(id, { result: await discussStream(shabad.shabadId, q, past, (stage) => update(id, { stage })) });
    } catch (err) {
      update(id, { error: friendlyError(err) });
    }
  }

  function showLine(verseId: number, e: React.MouseEvent) {
    e.preventDefault();
    document.getElementById(`line-${verseId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlash(verseId);
  }

  return (
    <main className="wrap">
      <header className="reader-head">
        <Link href="/discuss" className="back-link">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Discuss Gurbani
        </Link>
        <h1>
          Ang {shabad.ang}
          {shabad.writer && <> · {shabad.writer.english}</>}
        </h1>
        <p className="reader-meta">
          {shabad.source.english}
          {shabad.raag && <> · {shabad.raag.english}</>} ·{" "}
          <Link href={`/shabad/${shabad.shabadId}`} className="read-link">
            Open in reader
          </Link>
        </p>
      </header>

      <section className="shabad-panel" aria-label="The shabad">
        <ol>
          {shabad.verses.map((v) =>
            isHeading(v) ? (
              <li key={v.verseId} className="panel-heading">
                <span className="gurmukhi" lang="pa">
                  {v.gurmukhi}
                </span>
                <span>{englishOf(v).replace(/:\s*$/, "")}</span>
              </li>
            ) : (
              <li key={v.verseId} id={`line-${v.verseId}`} data-cited={cited.has(v.verseId)} data-flash={flash === v.verseId}>
                <span className="line-no">{lineNo.get(v.verseId)}</span>
                <span>
                  <span className="gurmukhi" lang="pa">
                    {v.gurmukhi}
                  </span>
                  <span className="translation">{englishOf(v)}</span>
                </span>
              </li>
            ),
          )}
        </ol>
        <p className="panel-attrib">Translation: {shabad.verses[0]?.translations.find((t) => t.language === "en")?.attribution ?? "BaniDB"}</p>
      </section>

      {exchanges.length === 0 ? (
        <section className="suggest" aria-label="Ways to start">
          <p className="section-title">Start the conversation</p>
          <ul className="suggest-grid">
            {STARTERS.map((s) => (
              <li key={s}>
                <button type="button" onClick={() => void submit(s)}>
                  {s}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <div className="thread">
          {exchanges.map((x, i) => (
            <article
              key={x.id}
              ref={i === exchanges.length - 1 ? latest : undefined}
              className="exchange"
              style={{ scrollMarginTop: 76 }}
              aria-label={x.question}
            >
              <h2 className="question question-sm">{x.question}</h2>
              {x.error ? (
                <div className="error" role="alert">
                  <span>{x.error}</span>
                </div>
              ) : !x.result ? (
                <div className="answer-card">
                  <Progress mode="discuss" current={x.stage} />
                </div>
              ) : (
                <>
                  <div className="answer-card prose">
                    <CitedProse
                      segments={x.result.reply}
                      label={(id) => lineNo.get(id)}
                      href={(id) => `#line-${id}`}
                      onCite={showLine}
                    />
                  </div>
                  {x.result.followUps.length > 0 && i === exchanges.length - 1 && (
                    <section className="related" aria-label="Keep discussing">
                      <ul>
                        {x.result.followUps.map((f) => (
                          <li key={f}>
                            <button type="button" onClick={() => void submit(f)} disabled={busy}>
                              {f}
                              <Arrow />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </>
              )}
            </article>
          ))}
        </div>
      )}

      <div className="composer-dock">
        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(draft);
          }}
        >
          <label htmlFor="discuss-q" className="sr-only">
            Your question about this shabad
          </label>
          <div className="composer-row">
            <textarea
              id="discuss-q"
              ref={textarea}
              rows={1}
              value={draft}
              maxLength={500}
              placeholder={exchanges.length ? "Keep discussing…" : "Ask anything about this shabad…"}
              style={{ flex: 1 }}
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
            <button className="send" type="submit" disabled={busy || draft.trim().length < 3} aria-label="Send">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 13V3M8 3 3.5 7.5M8 3l4.5 4.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </form>
        <p className="composer-note">Discussing Ang {shabad.ang}. The conversation isn&apos;t saved, and the AI&apos;s reading can be wrong.</p>
      </div>
    </main>
  );
}

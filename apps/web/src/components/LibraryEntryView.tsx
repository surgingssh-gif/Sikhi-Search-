"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { fetchLibraryEntry, friendlyError, researchStream, slugify, type LibraryEntry, type Stage } from "@/lib/api";

const KIND_LABEL: Record<LibraryEntry["kind"], string> = {
  bani: "Bani",
  event: "Event",
  person: "Person",
  place: "Place",
  concept: "Concept",
  practice: "Practice",
  institution: "Institution",
  other: "Topic",
};

type State =
  | { status: "loading" }
  | { status: "researching"; stage: Stage | null }
  | { status: "ready"; entry: LibraryEntry }
  | { status: "error"; message: string };

/** Shows a stored entry, or researches the topic live (about 15-40 seconds) and then shows it. */
export function LibraryEntryView({ slug, topic }: { slug: string; topic: string }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await fetchLibraryEntry(slug);
        if (cancelled) return;
        if (stored) return setState({ status: "ready", entry: stored });
        setState({ status: "researching", stage: null });
        const entry = await researchStream(topic, (stage) => !cancelled && setState({ status: "researching", stage }));
        if (!cancelled) setState({ status: "ready", entry });
      } catch (err) {
        if (!cancelled) setState({ status: "error", message: friendlyError(err) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, topic, attempt]);

  const back = (
    <Link href="/library" className="back-link">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Library
    </Link>
  );

  if (state.status !== "ready") {
    const writing = state.status === "researching" && state.stage === "writing";
    return (
      <main className="wrap">
        <header className="reader-head">
          {back}
          <h1>{topic}</h1>
        </header>
        {state.status === "error" ? (
          <div className="error" role="alert">
            <span>{state.message}</span>
            <button type="button" className="btn-secondary" onClick={() => setAttempt((a) => a + 1)}>
              Try again
            </button>
          </div>
        ) : (
          <div className="answer-card">
            {state.status === "loading" ? (
              <p className="empty">Opening the Library…</p>
            ) : (
              <>
                <ol className="progress" aria-live="polite">
                  <li data-state={writing ? "done" : "active"}>
                    <span className="dot" aria-hidden="true" />
                    Researching sources
                  </li>
                  <li data-state={writing ? "active" : "todo"}>
                    <span className="dot" aria-hidden="true" />
                    Writing the entry
                  </li>
                </ol>
                <p className="research-note">This topic isn&apos;t in the Library yet, so it&apos;s being researched now. It usually takes under a minute, and only happens once.</p>
              </>
            )}
          </div>
        )}
      </main>
    );
  }

  const e = state.entry;
  return (
    <main className="wrap entry">
      <header className="reader-head">
        {back}
        <p className="entry-kind-tag">{KIND_LABEL[e.kind]}</p>
        <h1>
          {e.title}
          {e.titleGurmukhi && (
            <span className="entry-h1-gurmukhi" lang="pa">
              {e.titleGurmukhi}
            </span>
          )}
        </h1>
      </header>

      <section className="answer-card">
        <p className="summary">{e.summary}</p>
      </section>

      {e.facts.length > 0 && (
        <dl className="facts">
          {e.facts.map((f) => (
            <div key={f.label}>
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {e.baniId && (
        <Link className="hukam-strip" href={`/gurbani/bani/${e.baniId}`}>
          <span className="hukam-text">
            <strong>Read the bani</strong>
            <span>Full text from BaniDB, with translation and transliteration</span>
          </span>
          <span className="hukam-go">
            <span>Open</span> →
          </span>
        </Link>
      )}

      {e.sections.map((s) => (
        <section key={s.title} className="entry-section">
          <h2>{s.title}</h2>
          <div className="prose">
            <ReactMarkdown allowedElements={["p", "strong", "em", "ul", "ol", "li", "br"]} unwrapDisallowed>
              {s.body}
            </ReactMarkdown>
          </div>
        </section>
      ))}

      <div className="feature-actions">
        <Link className="btn-primary" href={`/vichaar?q=${encodeURIComponent(`What can I learn from ${e.title} for my own life as a Sikh?`)}`}>
          Vichaar on this
        </Link>
      </div>

      {e.sources.length > 0 && (
        <section className="entry-section" aria-label="Sources">
          <h2>Sources</h2>
          <ol className="sources">
            {e.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer">
                  <span className="source-title">{s.title}</span>
                  <span className="source-site">{s.site}</span>
                </a>
              </li>
            ))}
          </ol>
        </section>
      )}

      {e.related.length > 0 && (
        <section className="entry-section" aria-label="Related">
          <h2>Related</h2>
          <ul className="topic-chips">
            {e.related.map((r) => (
              <li key={r}>
                <Link href={`/library/${slugify(r)}?topic=${encodeURIComponent(r)}`}>{r}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="discuss-tip">
        Written by AI from the sources above{e.reviewed ? " and reviewed" : "; not yet reviewed by a scholar"}. Researched{" "}
        {new Date(e.generatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.
      </p>
    </main>
  );
}

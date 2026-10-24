import ReactMarkdown from "react-markdown";
import type { AskResult, ExploreResult, Segment } from "@/lib/api";
import { GurbaniCard } from "./GurbaniCard";

/** Model-written prose is rendered as Markdown with raw HTML disabled (react-markdown's default). */
const ALLOWED = ["p", "strong", "em", "ul", "ol", "li", "br"];

const cardId = (prefix: string, n: number) => `${prefix}-p${n}`;

/**
 * Prose with citation markers turned into numbered chips that jump to the
 * matching Gurbani card. Text and chips are joined into one Markdown string
 * with placeholder links so paragraphs and lists still render correctly.
 */
function CitedProse({ segments, numbers, prefix, inline = false }: { segments: Segment[]; numbers: Map<number, number>; prefix: string; inline?: boolean }) {
  const md = segments.map((s) => (s.type === "text" ? s.text : `[${numbers.get(s.verseId) ?? "?"}](#cite-${s.verseId})`)).join("");
  return (
    <ReactMarkdown
      allowedElements={[...ALLOWED, "a"]}
      unwrapDisallowed
      components={{
        p: inline ? ({ children }) => <>{children}</> : "p",
        a: ({ href, children }) => {
          // Only our own citation placeholders become links; any other link the model wrote is shown as plain text.
          const n = href?.startsWith("#cite-") ? numbers.get(Number(href.slice(6))) : undefined;
          if (!n) return <>{children}</>;
          return (
            <a className="cite" href={`#${cardId(prefix, n)}`} aria-label={`Gurbani passage ${n}`}>
              {children}
            </a>
          );
        },
      }}
    >
      {md}
    </ReactMarkdown>
  );
}

function Chevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Arrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AnswerView({
  result,
  prefix,
  onFollowUp,
  busy,
}: {
  result: AskResult;
  prefix: string;
  onFollowUp: (q: string) => void;
  busy: boolean;
}) {
  const numbers = new Map(result.passages.map((p, i) => [p.verseId, i + 1]));
  return (
    <>
      <section className="answer-card" aria-label="Answer">
        <p className="answer-label">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 1.5 9.6 6.4 14.5 8 9.6 9.6 8 14.5 6.4 9.6 1.5 8l4.9-1.6Z" fill="currentColor" />
          </svg>
          Answer
        </p>
        <p className="summary">
          <CitedProse segments={result.summary} numbers={numbers} prefix={prefix} inline />
        </p>
        {result.sourceLabel && (
          <p className="source-note">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M8 7.2v3.6M8 5.1v.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            {result.sourceLabel}
          </p>
        )}
      </section>

      {result.passages.length > 0 && (
        <section aria-label="Gurbani behind this answer">
          <p className="section-title">Gurbani behind this answer</p>
          <div className="passages">
            {result.passages.map((p, i) => (
              <GurbaniCard key={p.verseId} passage={p} number={i + 1} id={cardId(prefix, i + 1)} />
            ))}
          </div>
        </section>
      )}

      {result.sections.length > 0 && (
        <section className="sections" aria-label="Go deeper">
          {result.sections.map((s, i) => (
            <details key={i}>
              <summary>
                {s.title}
                <Chevron />
              </summary>
              <div className="prose">
                <CitedProse segments={s.segments} numbers={numbers} prefix={prefix} />
              </div>
            </details>
          ))}
        </section>
      )}

      {result.followUps.length > 0 && (
        <section className="related" aria-label="Related questions">
          <p className="section-title">Related</p>
          <ul>
            {result.followUps.map((f) => (
              <li key={f}>
                <button type="button" onClick={() => onFollowUp(f)} disabled={busy}>
                  {f}
                  <Arrow />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export function ExploreView({ result, prefix }: { result: ExploreResult; prefix: string }) {
  if (result.passages.length === 0) {
    return (
      <div className="answer-card">
        <p className="empty">
          No Gurbani passages clearly addressing this were found. Try rephrasing it, or switch to Ask for an explanation.
        </p>
      </div>
    );
  }
  return (
    <section aria-label="Gurbani passages">
      <p className="section-title">
        {result.passages.length === 1 ? "1 passage" : `${result.passages.length} passages`} from Sri Guru Granth Sahib Ji · notes are AI
        commentary, not scripture
      </p>
      <div className="passages">
        {result.passages.map((p, i) => (
          <GurbaniCard key={p.verseId} passage={p} number={i + 1} id={cardId(prefix, i + 1)} showNote />
        ))}
      </div>
    </section>
  );
}

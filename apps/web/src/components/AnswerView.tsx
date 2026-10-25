import type { AskResult, ExploreResult, Segment } from "@/lib/api";
import { CitedProse as Prose } from "./CitedProse";
import { CopyButton } from "./CopyButton";
import { useT } from "./Language";
import { GurbaniCard } from "./GurbaniCard";

const cardId = (prefix: string, n: number) => `${prefix}-p${n}`;

/** Plain-text version for copying: the answer with [n] markers, then each passage with its Ang. */
function answerAsText(r: AskResult): string {
  const n = new Map(r.passages.map((p, i) => [p.verseId, i + 1]));
  const text = (segs: Segment[]) => segs.map((s) => (s.type === "text" ? s.text : `[${n.get(s.verseId)}]`)).join("");
  const parts = [r.question, "", text(r.summary)];
  for (const s of r.sections) parts.push("", s.title, text(s.segments));
  if (r.passages.length) {
    parts.push("", "Gurbani");
    r.passages.forEach((p, i) => {
      const angs = [...new Set(p.lines.map((l) => l.ang))].join("–");
      parts.push(
        `[${i + 1}] ${p.lines.map((l) => l.gurmukhi).join(" ")}`,
        `    ${p.lines.map((l) => l.translation?.text ?? "").join(" ")}`,
        `    ${p.source.english}, Ang ${angs}${p.writer ? `, ${p.writer.english}` : ""}`,
      );
    });
  }
  parts.push("", "From Ask Sikhi. Gurbani from BaniDB by Khalis Foundation.");
  return parts.join("\n");
}

/** Citation chips numbered by passage, linking to the Gurbani cards. */
function CitedProse({ segments, numbers, prefix, inline = false }: { segments: Segment[]; numbers: Map<number, number>; prefix: string; inline?: boolean }) {
  return (
    <Prose
      segments={segments}
      inline={inline}
      label={(id) => numbers.get(id)}
      href={(id) => `#${cardId(prefix, numbers.get(id) ?? 0)}`}
    />
  );
}

function Chevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Arrow() {
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
  const t = useT();
  const numbers = new Map(result.passages.map((p, i) => [p.verseId, i + 1]));
  return (
    <>
      <section className="answer-card" aria-label="Answer">
        <div className="answer-head">
          <p className="answer-label">{t("answer")}</p>
          <CopyButton text={() => answerAsText(result)} />
        </div>
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
          <p className="section-title">{t("gurbaniBehind")}</p>
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
          <p className="section-title">{t("related")}</p>
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

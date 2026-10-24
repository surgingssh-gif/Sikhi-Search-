import Link from "next/link";
import type { Passage } from "@/lib/api";

/**
 * One Gurbani passage. Every word of scripture here comes from BaniDB via the
 * API; the only model-written text is the optional relevance note, which is
 * labelled as such.
 */
export function GurbaniCard({
  passage,
  number,
  id,
  showNote = false,
}: {
  passage: Passage;
  number?: number;
  id?: string;
  showNote?: boolean;
}) {
  const { lines } = passage;
  const angs = [...new Set(lines.map((l) => l.ang))].join("–");
  const attribution = lines[0]?.translation?.attribution;
  const meta = [passage.writer?.english, passage.raag?.english].filter(Boolean).join(" · ");

  return (
    <figure className="card" id={id}>
      <div className="card-top">
        <span>
          {number !== undefined && <span className="num">{number}</span>}
          {passage.source.english}
        </span>
        <span className="ang">Ang {angs}</span>
      </div>
      <p className="gurmukhi" lang="pa">
        {lines.map((l, i) => (
          <span key={l.verseId}>
            {i > 0 && <br />}
            {l.gurmukhi}
          </span>
        ))}
      </p>
      {lines.some((l) => l.transliteration) && <p className="translit">{lines.map((l) => l.transliteration).join(" ")}</p>}
      <p className="translation">{lines.map((l) => l.translation?.text ?? "").join(" ")}</p>
      {showNote && passage.relevanceNote && (
        <p className="ai-note">
          <b>Why this passage:</b>
          {passage.relevanceNote}
        </p>
      )}
      <figcaption className="card-foot">
        <span>
          {meta}
          {attribution && <> · Translation: {attribution}</>}
        </span>
        <span className="card-links">
          <Link className="read-link" href={`/discuss/${passage.shabadId}`}>
            Discuss
          </Link>
          <Link className="read-link" href={`/shabad/${passage.shabadId}?verse=${passage.verseId}`}>
            Read full shabad
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </span>
      </figcaption>
    </figure>
  );
}

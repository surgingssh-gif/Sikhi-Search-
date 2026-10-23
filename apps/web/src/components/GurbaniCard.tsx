import Link from "next/link";
import type { Passage } from "@/lib/api";

/**
 * One Gurbani passage. Every word of scripture here comes from BaniDB via the
 * API; the only model-written text is the optional relevance note, which is
 * labelled as such.
 */
export function GurbaniCard({ passage, showNote = false }: { passage: Passage; showNote?: boolean }) {
  const { lines } = passage;
  const angs = [...new Set(lines.map((l) => l.ang))].join("–");
  const attribution = lines[0]?.translation?.attribution;
  const meta = [passage.source.english, passage.writer?.english, passage.raag?.english].filter(Boolean).join(" · ");

  return (
    <figure className="card">
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
          <b>Why this passage</b>
          {passage.relevanceNote}
        </p>
      )}
      <figcaption className="card-meta">
        <span>
          <span className="ang">Ang {angs}</span> · {meta}
          {attribution && <> · Translation: {attribution}</>}
        </span>
        <Link className="read-link" href={`/shabad/${passage.shabadId}?verse=${passage.verseId}`}>
          Read full shabad →
        </Link>
      </figcaption>
    </figure>
  );
}

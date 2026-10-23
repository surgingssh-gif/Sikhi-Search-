import ReactMarkdown from "react-markdown";
import type { AskResult, ExploreResult } from "@/lib/api";
import { GurbaniCard } from "./GurbaniCard";

/** Model-written prose is rendered as Markdown with raw HTML disabled (react-markdown's default). */
const ALLOWED = ["p", "h1", "h2", "h3", "h4", "strong", "em", "ul", "ol", "li", "blockquote", "br"];

function Prose({ text }: { text: string }) {
  return (
    <ReactMarkdown allowedElements={ALLOWED} unwrapDisallowed components={{ h1: "h3", h2: "h3" }}>
      {text}
    </ReactMarkdown>
  );
}

function InfoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 7.2v3.6M8 5.1v.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function AnswerView({ result, onFollowUp }: { result: AskResult; onFollowUp: (q: string) => void }) {
  const byId = new Map(result.passages.map((p) => [p.verseId, p]));
  return (
    <div className="a">
      {result.sourceLabel && (
        <p className="source-label">
          <InfoIcon />
          {result.sourceLabel}
        </p>
      )}
      <div className="answer">
        {result.segments.map((seg, i) => {
          if (seg.type === "text") return <Prose key={i} text={seg.text} />;
          const passage = byId.get(seg.verseId);
          return passage ? <GurbaniCard key={i} passage={passage} /> : null;
        })}
      </div>
      {result.followUps.length > 0 && (
        <div className="followups">
          <h4>Continue exploring</h4>
          <ul className="suggestions">
            {result.followUps.map((f) => (
              <li key={f}>
                <button type="button" className="chip" onClick={() => onFollowUp(f)}>
                  {f}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function ExploreView({ result }: { result: ExploreResult }) {
  if (result.passages.length === 0) {
    return (
      <p className="empty">
        No Gurbani passages clearly addressing this question were found. Try rephrasing it, or switch to Ask for an explanation.
      </p>
    );
  }
  return (
    <div className="a">
      <p className="explore-intro">
        {result.passages.length === 1 ? "One passage" : `${result.passages.length} passages`} from Sri Guru Granth Sahib Ji that speak to
        your question. The notes below each are AI commentary, not scripture.
      </p>
      {result.passages.map((p) => (
        <GurbaniCard key={p.verseId} passage={p} showNote />
      ))}
    </div>
  );
}

import type { MouseEvent } from "react";
import ReactMarkdown from "react-markdown";
import type { Segment } from "@/lib/api";

/** Model-written prose is rendered as Markdown with raw HTML disabled (react-markdown's default). */
const ALLOWED = ["p", "strong", "em", "ul", "ol", "li", "br", "a"];

/**
 * Prose with [[verse:ID]] markers turned into small numbered chips that link
 * to the passage or line they cite. Text and chips are joined into one
 * Markdown string with placeholder links so paragraphs and lists still render.
 */
export function CitedProse({
  segments,
  label,
  href,
  onCite,
  inline = false,
}: {
  segments: Segment[];
  /** The chip text for a verse, or undefined if it can't be shown. */
  label: (verseId: number) => number | undefined;
  href: (verseId: number) => string;
  onCite?: (verseId: number, e: MouseEvent<HTMLAnchorElement>) => void;
  inline?: boolean;
}) {
  const md = segments.map((s) => (s.type === "text" ? s.text : `[${label(s.verseId) ?? "?"}](#cite-${s.verseId})`)).join("");
  return (
    <ReactMarkdown
      allowedElements={ALLOWED}
      unwrapDisallowed
      components={{
        p: inline ? ({ children }) => <>{children}</> : "p",
        a: ({ href: target, children }) => {
          // Only our own citation placeholders become links; any other link the model wrote is shown as plain text.
          const verseId = target?.startsWith("#cite-") ? Number(target.slice(6)) : NaN;
          const n = label(verseId);
          if (!n) return <>{children}</>;
          return (
            <a className="cite" href={href(verseId)} onClick={onCite ? (e) => onCite(verseId, e) : undefined}>
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

import type { NewsItem } from "@/lib/api";

const CATEGORY_LABEL: Record<string, string> = { panth: "Panth", punjab: "Punjab", diaspora: "Diaspora" };

export function timeAgo(iso: string | null, now = Date.now()): string {
  if (!iso) return "";
  const mins = Math.round((now - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

/** Headlines linking out to their publishers. */
export function NewsList({ items, compact = false }: { items: NewsItem[]; compact?: boolean }) {
  return (
    <ul className={`news-list${compact ? " news-compact" : ""}`}>
      {items.map((i) => (
        <li key={i.id}>
          <a href={i.url} target="_blank" rel="noreferrer" lang={i.language === "pa" ? "pa" : undefined}>
            <span className="news-meta">
              <span className="news-source">{i.source}</span>
              {i.publishedAt && <span suppressHydrationWarning>{timeAgo(i.publishedAt)}</span>}
              {!compact &&
                i.categories.map((c) => (
                  <span key={c} className={`news-tag tag-${c}`}>
                    {CATEGORY_LABEL[c]}
                  </span>
                ))}
            </span>
            <span className="news-title">{i.title}</span>
            {!compact && i.snippet && <span className="news-snippet">{i.snippet}</span>}
          </a>
        </li>
      ))}
    </ul>
  );
}

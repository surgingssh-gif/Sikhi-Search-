import type { NewsItem } from "@/lib/api";
import { StoryImage } from "./StoryImage";

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

export const CATEGORY_LABEL: Record<string, string> = { panth: "Sikhi", punjab: "Punjab", diaspora: "Diaspora" };

/** The label above a headline: where it happened, else its section. */
function kicker(item: NewsItem): string {
  return item.place?.name ?? CATEGORY_LABEL[item.categories[0] ?? ""] ?? "";
}

/**
 * One story, linking out to its publisher. `lead` is the front-page top story,
 * `row` puts the photo beside the text, `noImage` drops the photo.
 */
export function Story({
  item,
  variant = "card",
  snippet = false,
  noImage = false,
  className = "",
}: {
  item: NewsItem;
  variant?: "lead" | "medium" | "card" | "row" | "text";
  snippet?: boolean;
  noImage?: boolean;
  className?: string;
}) {
  const showImage = !noImage && variant !== "text" && item.image;
  const pa = item.language === "pa" ? "pa" : undefined;
  return (
    <a href={item.url} target="_blank" rel="noreferrer" className={`story story-${variant} ${className}`.trim()}>
      {showImage && <StoryImage src={item.image!} />}
      <span className="story-text">
        {kicker(item) && <span className="story-kicker">{kicker(item)}</span>}
        <span className="story-headline" lang={pa}>
          {item.title}
        </span>
        {snippet && item.snippet && (
          <span className="story-snippet" lang={pa}>
            {item.snippet}
          </span>
        )}
        <span className="story-meta">
          {item.source}
          {item.publishedAt && <span suppressHydrationWarning> · {timeAgo(item.publishedAt)}</span>}
        </span>
      </span>
    </a>
  );
}

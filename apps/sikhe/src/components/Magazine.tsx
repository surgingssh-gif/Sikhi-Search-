import { Image } from "expo-image";
import { Link, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { useCalendar, useEditions, useNews, type Edition, type EditionArticle, type EditionBrief, type EditionSource, type NewsItem } from "@/lib/api";
import { usePreview } from "@/lib/preview";
import { NEWS_SECTIONS, openStory, timeAgo } from "@/lib/stories";
import { useTheme } from "@/theme/theme";
import { FONT, NARROW, READING_WIDTH, SPACE, WIDE } from "@/theme/tokens";
import { outletName } from "./StoryCard";
import { Text } from "./Text";

/**
 * The day's paper, laid out like a news site's home page: the lead story
 * with its photo, two more stories with theirs, a list of the rest, the
 * latest briefs down the side, and the live news underneath. Every story
 * has its section, dateline, photo credit and time. The paper's own stories
 * open on their own page; each is written by AI from the publishers'
 * reporting, and says so.
 */

const dateLine = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

const shortDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export const articleHref = (date: string, slug: string) => `/issue/${date}/${slug}` as Href;

/** Countries and regions: too broad for a dateline, which names a city. */
const BROAD = /^(punjab|india|pakistan|canada|united kingdom|united states|australia|new zealand|europe|asia|africa|middle east|england|scotland|wales|italy|germany|kenya|malaysia|singapore|delhi ncr)$/i;

/**
 * A source's photo and place. Issues from now on carry them; for the first
 * issues they're looked up in today's news, where the same stories still are.
 */
function useSourceArt() {
  const { data } = useNews();
  const byId = new Map((data?.items ?? []).map((i) => [i.id, i]));
  return (s: EditionSource) => {
    const item = byId.get(s.id);
    return { image: s.image ?? item?.image ?? null, place: s.place ?? item?.place?.name ?? null };
  };
}

type Art = ReturnType<typeof useSourceArt>;

/** The article's photo: the first of its sources that has one, credited to that publisher. */
function photoOf(article: EditionArticle, art: Art) {
  for (const s of article.sources) {
    const { image } = art(s);
    if (image) return { uri: image, credit: outletName(s.outlet) };
  }
  return null;
}

/** "LAHORE", from the first source with a city to its name. */
function datelineOf(article: EditionArticle, art: Art) {
  for (const s of article.sources) {
    const { place } = art(s);
    if (place && !BROAD.test(place)) return place.toUpperCase();
  }
  return null;
}

/** "Livemint, Swarajya and Telegraph India". */
function outlets(sources: EditionSource[]) {
  const names = [...new Set(sources.map((s) => outletName(s.outlet)))];
  return names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/** A photo with its credit underneath. Leaves itself out if it won't load. */
function Photo({ uri, credit, ratio = 3 / 2, caption = true }: { uri: string; credit: string; ratio?: number; caption?: boolean }) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <View style={{ gap: 4 }}>
      <Image source={uri} style={{ width: "100%", aspectRatio: ratio, backgroundColor: colors.sunken }} contentFit="cover" transition={200} onError={() => setFailed(true)} accessibilityIgnoresInvertColors />
      {caption && (
        <Text variant="meta" color="inkFaint" style={{ fontSize: 10, textAlign: "right" }}>
          {`Photo: ${credit}`}
        </Text>
      )}
    </View>
  );
}

/** A small photo, for lists. */
function Thumb({ uri, size }: { uri: string; size: number }) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return <Image source={uri} style={{ width: size * 1.33, height: size, backgroundColor: colors.sunken }} contentFit="cover" transition={200} onError={() => setFailed(true)} accessibilityIgnoresInvertColors />;
}

/** The section and, where there is one, the place: "JUSTICE · MOHALI". */
function Kicker({ article, art }: { article: EditionArticle; art: Art }) {
  const place = datelineOf(article, art);
  return (
    <Text variant="label" color={article.tone === "good" ? "accentInk" : "danger"}>
      {article.kicker}
      {place ? (
        <Text variant="label" color="inkFaint">
          {`  ·  ${place}`}
        </Text>
      ) : null}
    </Text>
  );
}

/** "Sikhe · AI-written from Livemint and Swarajya · 3 min read". */
function Byline({ article }: { article: EditionArticle }) {
  return (
    <Text variant="meta" color="inkFaint">
      <Text variant="meta" color="ink" style={{ fontFamily: FONT.sansBold }}>
        Sikhe
      </Text>
      {`  ·  AI-written from ${outlets(article.sources)}  ·  ${article.readMinutes} min read`}
    </Text>
  );
}

/** A heading over a part of the page: a black rule, then small capitals. */
function Heading({ children, right }: { children: string; right?: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.heading, { borderTopColor: colors.rule }]}>
      <Text variant="label" style={{ fontSize: 12, letterSpacing: 1.4 }}>
        {children}
      </Text>
      {right}
    </View>
  );
}

/** The paper's line under the masthead: the date, the issue, and that it's written by AI. */
function Folio({ edition }: { edition: Edition }) {
  const { colors } = useTheme();
  const narrow = useWindowDimensions().width < NARROW;
  const { data } = useCalendar(edition.date, 1);
  return (
    <View style={[styles.folio, { borderBottomColor: colors.line }]}>
      <Text variant="meta" color="ink" style={{ fontFamily: FONT.sansBold, flexShrink: 1 }} numberOfLines={1}>
        {`Today's Paper  ·  ${narrow ? shortDate(edition.date) : dateLine(edition.date)}`}
        {data?.today && !narrow ? <Text variant="meta" color="inkSoft">{`  ·  ${data.today.label}`}</Text> : null}
      </Text>
      <Text variant="meta" color="inkFaint" numberOfLines={1}>{`No. ${edition.issue}`}</Text>
    </View>
  );
}

/** A story link that underlines its headline on hover, on the web. */
function StoryLink({ href, children, style }: { href: Href; children: (hovered: boolean) => React.ReactNode; style?: object }) {
  return (
    <Link href={href} asChild>
      <Pressable accessibilityRole="link" style={style}>
        {(state) => children(Boolean((state as { hovered?: boolean }).hovered))}
      </Pressable>
    </Link>
  );
}

/** The lead: headline and summary beside a big photo on wide screens, under it on narrow ones. */
function Lead({ edition, article, art }: { edition: Edition; article: EditionArticle; art: Art }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const side = width >= NARROW;
  const narrow = width < NARROW;
  const photo = photoOf(article, art);
  const size = narrow ? 28 : width >= WIDE ? 34 : 32;
  return (
    <StoryLink href={articleHref(edition.date, article.slug)} style={side ? { flexDirection: "row", gap: SPACE.xl, alignItems: "flex-start" } : { gap: SPACE.md }}>
      {(hovered) => (
        <>
          {photo && !side && <Photo {...photo} />}
          <View style={[{ gap: SPACE.sm }, side && { flex: 1 }]}>
            <Kicker article={article} art={art} />
            <Text accessibilityRole="header" style={{ fontFamily: FONT.serifBold, fontSize: size, lineHeight: size * 1.12, letterSpacing: -0.5, color: colors.ink, textDecorationLine: hovered ? "underline" : "none" }}>
              {article.headline}
            </Text>
            <Text style={{ fontFamily: FONT.serif, fontSize: 16.5, lineHeight: 24, color: colors.inkSoft }}>{article.dek}</Text>
            <Byline article={article} />
          </View>
          {photo && side && (
            <View style={{ flex: 1.25 }}>
              <Photo {...photo} />
            </View>
          )}
        </>
      )}
    </StoryLink>
  );
}

/** A story with its photo on top. */
function Card({ edition, article, art }: { edition: Edition; article: EditionArticle; art: Art }) {
  const { colors } = useTheme();
  const photo = photoOf(article, art);
  return (
    <StoryLink href={articleHref(edition.date, article.slug)} style={{ gap: SPACE.sm }}>
      {(hovered) => (
        <>
          {photo && <Photo {...photo} ratio={16 / 9} />}
          <Kicker article={article} art={art} />
          <Text style={{ fontFamily: FONT.serifBold, fontSize: 20, lineHeight: 25, color: colors.ink, textDecorationLine: hovered ? "underline" : "none" }}>{article.headline}</Text>
          <Text style={{ fontFamily: FONT.serif, fontSize: 15, lineHeight: 22, color: colors.inkSoft }} numberOfLines={3}>
            {article.dek}
          </Text>
          <Text variant="meta" color="inkFaint">{`${article.readMinutes} min read`}</Text>
        </>
      )}
    </StoryLink>
  );
}

/** A story as a row: headline and summary, with a small photo to the right. */
function Row({ edition, article, art }: { edition: Edition; article: EditionArticle; art: Art }) {
  const { colors } = useTheme();
  const photo = photoOf(article, art);
  return (
    <StoryLink href={articleHref(edition.date, article.slug)} style={{ flexDirection: "row", gap: SPACE.lg, alignItems: "flex-start" }}>
      {(hovered) => (
        <>
          <View style={{ flex: 1, gap: 5 }}>
            <Kicker article={article} art={art} />
            <Text style={{ fontFamily: FONT.serifBold, fontSize: 18, lineHeight: 23, color: colors.ink, textDecorationLine: hovered ? "underline" : "none" }}>{article.headline}</Text>
            <Text style={{ fontFamily: FONT.serif, fontSize: 14.5, lineHeight: 21, color: colors.inkSoft }} numberOfLines={2}>
              {article.dek}
            </Text>
            <Text variant="meta" color="inkFaint">{`${article.readMinutes} min read`}</Text>
          </View>
          {photo && <Thumb uri={photo.uri} size={84} />}
        </>
      )}
    </StoryLink>
  );
}

/** The briefs, newest first, each with when the publisher ran it. */
function Latest({ briefs }: { briefs: EditionBrief[] }) {
  const { colors } = useTheme();
  const sorted = [...briefs].sort((a, b) => (b.source.publishedAt ?? "").localeCompare(a.source.publishedAt ?? ""));
  return (
    <View style={{ gap: SPACE.md }}>
      <Heading>In brief</Heading>
      {sorted.map((b, n) => (
        <Pressable key={b.source.id} accessibilityRole="link" onPress={() => openStory(b.source)} style={[{ gap: 4 }, n > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: SPACE.md }]}>
          <Text variant="meta" color="danger" style={{ fontFamily: FONT.sansBold }}>
            {b.source.publishedAt ? timeAgo(b.source.publishedAt) : b.kicker}
            {b.source.publishedAt ? <Text variant="meta" color="inkFaint">{`  ·  ${b.kicker}`}</Text> : null}
          </Text>
          <Text style={{ fontFamily: FONT.serifBold, fontSize: 16, lineHeight: 21, color: colors.ink }}>{b.headline}</Text>
          <Text style={{ fontFamily: FONT.serif, fontSize: 14, lineHeight: 20, color: colors.inkSoft }} numberOfLines={3}>
            {b.text}
          </Text>
          <Text variant="meta" color="inkFaint">{`${outletName(b.source.outlet)} ›`}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** The live news, under the paper: the top stories right now that the paper doesn't already carry. */
function LiveNews({ edition }: { edition: Edition }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const preview = usePreview();
  const { data } = useNews();
  if (!data) return null;
  const used = new Set([...edition.articles.flatMap((a) => a.sources.map((s) => s.id)), ...edition.briefs.map((b) => b.source.id)]);
  const stories = NEWS_SECTIONS[0]!.stories(data.items)
    .filter((i) => i.language === "en" && !used.has(i.id))
    .slice(0, 8);
  if (!stories.length) return null;
  const perRow = width >= WIDE ? 4 : width >= NARROW ? 2 : 1;
  const card = (item: NewsItem) => (
    <Pressable accessibilityRole="button" accessibilityHint="Opens a preview of the story" onPress={() => preview(item)} style={perRow === 1 ? { flexDirection: "row", gap: SPACE.lg, alignItems: "flex-start" } : { gap: SPACE.sm }}>
      {(state) => {
        const hovered = Boolean((state as { hovered?: boolean }).hovered);
        return (
          <>
            {item.image && perRow > 1 && <Photo uri={item.image} credit={outletName(item.source)} ratio={16 / 9} caption={false} />}
            <View style={[{ gap: 5 }, perRow === 1 && { flex: 1 }]}>
              <Text variant="meta" color="inkFaint">
                <Text variant="meta" color="ink" style={{ fontFamily: FONT.sansBold }}>
                  {outletName(item.source)}
                </Text>
                {item.publishedAt ? `  ·  ${timeAgo(item.publishedAt)}` : ""}
              </Text>
              <Text style={{ fontFamily: FONT.headline, fontSize: 16.5, lineHeight: 21.5, color: colors.ink, textDecorationLine: hovered ? "underline" : "none" }} numberOfLines={4}>
                {item.title.replace(/\s+[-–|]\s+[^-–|]+$/, "")}
              </Text>
            </View>
            {item.image && perRow === 1 && <Thumb uri={item.image} size={64} />}
          </>
        );
      }}
    </Pressable>
  );
  return (
    <View style={{ gap: SPACE.lg }}>
      <Heading
        right={
          <Link href="/news" asChild>
            <Pressable accessibilityRole="link">
              <Text variant="meta" color="accentInk" style={{ fontFamily: FONT.sansBold }}>
                All news ›
              </Text>
            </Pressable>
          </Link>
        }
      >
        Latest news
      </Heading>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -SPACE.md, rowGap: SPACE.xl }}>
        {stories.map((item) => (
          <View key={item.id} style={{ width: `${100 / perRow}%`, paddingHorizontal: SPACE.md }}>
            {card(item)}
          </View>
        ))}
      </View>
    </View>
  );
}

/** The front page of one day's paper. */
export function Magazine({ edition }: { edition: Edition }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;
  const narrow = width < NARROW;
  const art = useSourceArt();
  const [lead, ...rest] = edition.articles;
  if (!lead) return null;
  // Two stories with photos under the lead; the rest as rows.
  const cards = narrow ? [] : rest.slice(0, 2);
  const rows = narrow ? rest : rest.slice(2);
  const line = { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: SPACE.lg } as const;

  const main = (
    <View style={{ gap: SPACE.xl }}>
      <Lead edition={edition} article={lead} art={art} />
      {cards.length > 0 && (
        <View style={[line, { flexDirection: "row", gap: SPACE.xl, alignItems: "flex-start" }]}>
          {cards.map((a, n) => (
            <View key={a.slug} style={[{ flex: 1 }, n > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.line, paddingLeft: SPACE.xl }]}>
              <Card edition={edition} article={a} art={art} />
            </View>
          ))}
        </View>
      )}
      {rows.map((a) => (
        <View key={a.slug} style={line}>
          <Row edition={edition} article={a} art={art} />
        </View>
      ))}
    </View>
  );

  return (
    <View style={{ gap: SPACE.xxl }}>
      <View style={{ gap: SPACE.lg, marginTop: -SPACE.md }}>
        <Folio edition={edition} />
        {wide ? (
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <View style={{ flex: 2.3, paddingRight: SPACE.xxl }}>{main}</View>
            {edition.briefs.length > 0 && (
              <View style={{ flex: 1, paddingLeft: SPACE.xxl, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.line }}>
                <Latest briefs={edition.briefs} />
              </View>
            )}
          </View>
        ) : (
          <View style={{ gap: SPACE.xxl }}>
            {main}
            {edition.briefs.length > 0 && <Latest briefs={edition.briefs} />}
          </View>
        )}
      </View>
      <LiveNews edition={edition} />
      <Text variant="meta" color="inkFaint" style={{ textAlign: "center" }}>
        Today&apos;s Paper is written by AI from the publishers&apos; own reporting, which each story lists and links. Photos are the publishers&apos;.
      </Text>
    </View>
  );
}

/** One of the paper's stories on its own page, set like a news article. */
export function ArticlePage({ edition, article }: { edition: Edition; article: EditionArticle }) {
  const { colors } = useTheme();
  const narrow = useWindowDimensions().width < NARROW;
  const art = useSourceArt();
  const photo = photoOf(article, art);
  const dateline = datelineOf(article, art);
  const size = narrow ? 29 : 40;
  const body = { fontFamily: FONT.serif, fontSize: narrow ? 17.5 : 19, lineHeight: narrow ? 29 : 32, color: colors.ink } as const;
  // The pull quote sits after the second paragraph, in long enough stories.
  const pullAt = article.pullQuote && article.paragraphs.length >= 4 ? 2 : -1;
  const others = edition.articles.filter((a) => a.slug !== article.slug);
  return (
    <View style={{ width: "100%", maxWidth: READING_WIDTH, alignSelf: "center", gap: SPACE.xl }}>
      <View style={{ gap: SPACE.md }}>
        <Kicker article={article} art={art} />
        <Text accessibilityRole="header" style={{ fontFamily: FONT.serifBold, fontSize: size, lineHeight: size * 1.12, letterSpacing: -0.5, color: colors.ink }}>
          {article.headline}
        </Text>
        <Text style={{ fontFamily: FONT.serif, fontSize: narrow ? 18 : 20, lineHeight: narrow ? 26 : 29, color: colors.inkSoft }}>{article.dek}</Text>
      </View>

      <View style={[styles.byline, { borderColor: colors.line }]}>
        <Text variant="meta" color="ink" style={{ fontFamily: FONT.sansBold }}>
          By Sikhe
        </Text>
        <Text variant="meta" color="inkSoft">{`Written by AI from reporting by ${outlets(article.sources)}`}</Text>
        <Text variant="meta" color="inkFaint">{`${dateLine(edition.date)}  ·  ${article.readMinutes} min read`}</Text>
      </View>

      {photo && (
        <View style={{ marginHorizontal: narrow ? -(SPACE.xl - 4) : 0 }}>
          <Photo uri={photo.uri} credit={photo.credit} ratio={16 / 9} />
        </View>
      )}

      <View style={{ gap: SPACE.xl }}>
        {article.paragraphs.map((p, n) => (
          <View key={n} style={{ gap: SPACE.xl }}>
            <Text style={body}>
              {n === 0 && dateline ? <Text style={[body, { fontFamily: FONT.sansBold, fontSize: body.fontSize - 3, letterSpacing: 0.6 }]}>{`${dateline} — `}</Text> : null}
              {p.text}
            </Text>
            {n + 1 === pullAt && (
              <View style={[styles.pull, { borderColor: colors.rule }]}>
                <Text style={{ fontFamily: FONT.displayItalic, fontSize: narrow ? 21 : 24, lineHeight: narrow ? 29 : 33, color: colors.ink }}>{article.pullQuote}</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      <View style={{ gap: SPACE.sm }}>
        <Heading>Sources</Heading>
        {article.sources.map((s) => (
          <Pressable key={s.id} accessibilityRole="link" onPress={() => openStory(s)} style={{ paddingVertical: 4 }}>
            <Text variant="small">
              <Text variant="small" color="ink" style={{ fontFamily: FONT.sansBold }}>
                {outletName(s.outlet)}
              </Text>
              {`  ${s.title} `}
              <Text variant="small" color="accentInk">
                ›
              </Text>
            </Text>
          </Pressable>
        ))}
        <Text variant="meta" color="inkFaint" style={{ marginTop: SPACE.sm }}>
          Sikhe wrote this story with AI from the reporting above. A checker removes any sentence whose numbers or quotations aren&apos;t in its sources.
        </Text>
      </View>

      {others.length > 0 && (
        <View style={{ gap: SPACE.lg }}>
          <Heading>More from Today&apos;s Paper</Heading>
          {others.map((a, n) => (
            <View key={a.slug} style={n > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: SPACE.lg } : undefined}>
              <Row edition={edition} article={a} art={art} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/** Earlier issues, to read again. */
export function BackIssues({ current }: { current: string }) {
  const { colors } = useTheme();
  const { data } = useEditions();
  const earlier = (data ?? []).filter((e) => e.date !== current).slice(0, 8);
  if (!earlier.length) return null;
  return (
    <View style={{ gap: SPACE.md }}>
      <Heading>Earlier papers</Heading>
      {earlier.map((e) => (
        <Link key={e.date} href={`/issue/${e.date}` as Href} asChild>
          <Pressable accessibilityRole="link" style={StyleSheet.flatten([styles.entry, { borderBottomColor: colors.line }])}>
            <Text variant="meta">{dateLine(e.date)}</Text>
            <Text variant="title">{e.headline}</Text>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  folio: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: SPACE.md, borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: SPACE.sm },
  heading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 2, paddingTop: SPACE.sm },
  byline: { gap: 3, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: SPACE.md },
  pull: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: SPACE.lg },
  entry: { gap: 4, paddingVertical: SPACE.md, borderBottomWidth: StyleSheet.hairlineWidth },
});

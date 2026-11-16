import { Image } from "expo-image";
import { Link, type Href } from "expo-router";
import { useState, type ReactNode } from "react";
import { Platform, Pressable, StyleSheet, useWindowDimensions, View, type TextStyle, type ViewStyle } from "react-native";
import { editionFileUrl, useCalendar, useEditions, useNews, type Edition, type EditionArt, type EditionArticle, type EditionBrief, type EditionParagraph, type EditionSource } from "@/lib/api";
import { openStory } from "@/lib/stories";
import { useTheme } from "@/theme/theme";
import { FONT, NARROW, SPACE, WIDE } from "@/theme/tokens";
import { outletName } from "./StoryCard";
import { Text } from "./Text";

/**
 * The day's paper, set like a printed broadsheet. The front page has a
 * banner headline over the lead, one photo printed in black and white, and
 * the day's stories in narrow justified columns divided by hairlines, each
 * running a good way before it jumps to its own page. The briefs run along
 * the foot. Each story's page is set like a newspaper article: the page
 * line, a centred headline and deck, a byline, a dateline and the full text.
 * Every story is written by AI from the publishers' reporting, and says so.
 */

const dateLine = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

export const articleHref = (date: string, slug: string) => `/issue/${date}/${slug}` as Href;

/** Inside pages start at A2, in front-page order. */
const pageOf = (edition: Edition, article: EditionArticle) => `A${edition.articles.indexOf(article) + 2}`;

/** Countries and regions: too broad for a dateline, which names a city. */
const BROAD = /^(punjab|india|pakistan|canada|united kingdom|united states|australia|new zealand|europe|asia|africa|middle east|england|scotland|wales|italy|germany|kenya|malaysia|singapore|delhi ncr)$/i;

/** A source's place: kept with new issues, looked up in the day's news for the first ones. */
function useSourceArt() {
  const { data } = useNews();
  const byId = new Map((data?.items ?? []).map((i) => [i.id, i]));
  return (s: EditionSource) => ({ place: s.place ?? byId.get(s.id)?.place?.name ?? null });
}
type Art = ReturnType<typeof useSourceArt>;

/** The article's picture: its illustration, or failing that its map. */
const pictureOf = (article: EditionArticle) => (article.art ? { art: article.art, kind: "illustration" as const } : article.map ? { art: article.map, kind: "map" as const } : null);

/** "LAHORE": the first city a source is tagged with that the article itself names, so the dateline is never a guess. */
function datelineOf(article: EditionArticle, art: Art) {
  const text = article.paragraphs.map((p) => p.text).join(" ").toLowerCase();
  for (const s of article.sources) {
    const { place } = art(s);
    if (place && !BROAD.test(place) && text.includes(place.toLowerCase())) return place.toUpperCase();
  }
  return null;
}

/** "Livemint, Swarajya and Telegraph India". */
function outlets(sources: EditionSource[]) {
  const names = [...new Set(sources.map((s) => outletName(s.outlet)))];
  return names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/** The opening of an article for the front page: whole paragraphs, up to about `budget` characters. */
function opening(paragraphs: EditionParagraph[], budget: number) {
  const out: EditionParagraph[] = [];
  let used = 0;
  for (const p of paragraphs) {
    if (out.length && used + p.text.length > budget) break;
    out.push(p);
    used += p.text.length;
  }
  return out;
}

/** Splits paragraphs into `n` columns of about equal length, keeping their order. */
function columns<T extends { text: string }>(items: T[], n: number): T[][] {
  if (n <= 1) return [items];
  const total = items.reduce((s, p) => s + p.text.length, 0);
  const out: T[][] = Array.from({ length: n }, () => []);
  let used = 0;
  for (const p of items) {
    out[Math.min(n - 1, Math.floor((used + p.text.length / 2) / (total / n)))]!.push(p);
    used += p.text.length;
  }
  return out.filter((c) => c.length);
}

/** Newspaper column text: justified and hyphenated on the web, so narrow columns set evenly. */
function useColumnType(size: number): TextStyle {
  const { colors } = useTheme();
  const web = Platform.OS === "web" ? ({ textAlign: "justify", hyphens: "auto", WebkitHyphens: "auto" } as TextStyle) : null;
  return { fontFamily: FONT.serif, fontSize: size, lineHeight: Math.round(size * 1.45), color: colors.ink, ...web };
}

/**
 * An illustration or a map, with its caption and credit under a hairline,
 * as a newspaper prints them. Leaves itself out if the file won't load.
 */
function Picture({ picture, compact = false }: { picture: { art: EditionArt; kind: "illustration" | "map" } | null; compact?: boolean }) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  if (!picture || failed) return null;
  const { art, kind } = picture;
  return (
    <View style={{ gap: 5 }}>
      <View style={{ width: "100%", aspectRatio: kind === "map" ? 1200 / 750 : 3 / 2, backgroundColor: colors.sunken, overflow: "hidden" }}>
        <Image source={editionFileUrl(art.file)} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={250} accessibilityLabel={art.alt} onError={() => setFailed(true)} />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: SPACE.md }}>
        {!compact && kind === "illustration" ? (
          <Text style={{ fontFamily: FONT.displayItalic, fontSize: 12.5, lineHeight: 17, color: colors.inkSoft, flex: 1 }}>{art.caption}</Text>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <Text variant="meta" color="inkFaint" style={{ fontSize: 9, letterSpacing: 0.4, textTransform: "uppercase" }}>
          {kind === "map" ? "Map: Sikhe · Natural Earth" : "Illustration: AI, for Sikhe"}
        </Text>
      </View>
    </View>
  );
}

/** The section and, where there is one, the place: "JUSTICE · MOHALI". */
function Kicker({ article, art, center }: { article: EditionArticle; art: Art; center?: boolean }) {
  const place = datelineOf(article, art);
  return (
    <Text variant="label" color={article.tone === "good" ? "accentInk" : "danger"} style={[{ fontSize: 9.5 }, center && { textAlign: "center" }]}>
      {article.kicker}
      {place ? <Text variant="label" color="inkFaint" style={{ fontSize: 9.5 }}>{`  ·  ${place}`}</Text> : null}
    </Text>
  );
}

/** "By SIKHE", and under it what the story was written from. */
function Byline({ article, center = true }: { article: EditionArticle; center?: boolean }) {
  const align = center ? ({ textAlign: "center" } as const) : null;
  return (
    <View style={{ gap: 1 }}>
      <Text variant="meta" color="ink" style={[{ fontFamily: FONT.sansBold, fontSize: 10, letterSpacing: 1.1, textTransform: "uppercase" }, align]}>
        By Sikhe
      </Text>
      <Text variant="meta" color="inkFaint" style={[{ fontSize: 10, lineHeight: 13 }, align]}>
        {`Written by AI from ${outlets(article.sources)}`}
      </Text>
    </View>
  );
}

/** A short centred rule between a headline's decks. */
function DeckRule() {
  const { colors } = useTheme();
  return <View style={{ width: 36, height: 1, backgroundColor: colors.inkFaint, alignSelf: "center", marginVertical: 2 }} />;
}

/** Hairline column rules: children side by side, divided as a newspaper divides its columns. */
function Columns({ children, gap = 14, style, weights }: { children: ReactNode[]; gap?: number; style?: ViewStyle; weights?: number[] }) {
  const { colors } = useTheme();
  return (
    <View style={[{ flexDirection: "row", alignItems: "stretch" }, style]}>
      {children.map((c, n) => (
        <View key={n} style={[{ flex: weights?.[n] ?? 1, minWidth: 0 }, n > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.line, paddingLeft: gap, marginLeft: gap }]}>
          {c}
        </View>
      ))}
    </View>
  );
}

/** Paragraphs set as a newspaper sets them: indented, no space between, the first opening with the dateline. */
function Body({ paragraphs, dateline, size }: { paragraphs: EditionParagraph[]; dateline: string | null; size: number }) {
  const type = useColumnType(size);
  return (
    <View>
      {paragraphs.map((p, n) => (
        <Text key={n} style={type}>
          {n === 0 && dateline ? <Text style={[type, { fontFamily: FONT.sansBold, fontSize: size - 2.5, letterSpacing: 0.4 }]}>{`${dateline} — `}</Text> : " "}
          {p.text}
        </Text>
      ))}
    </View>
  );
}

/** "Continued on Page A4": the jump to the rest of the story. */
function Jump({ edition, article }: { edition: Edition; article: EditionArticle }) {
  return (
    <Link href={articleHref(edition.date, article.slug)} asChild>
      <Pressable accessibilityRole="link" hitSlop={6} style={{ alignSelf: "flex-end", marginTop: 6 }}>
        <Text variant="meta" color="accentInk" style={{ fontFamily: FONT.displayItalic, fontSize: 13 }}>
          {`Continued on Page ${pageOf(edition, article)} ›`}
        </Text>
      </Pressable>
    </Link>
  );
}

type Head = { size: number; deck: number };
const HEADS = { one: { size: 21, deck: 14.5 }, two: { size: 26, deck: 16 }, three: { size: 30, deck: 17 }, phone: { size: 25, deck: 16 } } satisfies Record<string, Head>;

/**
 * A story on the front page: centred headline, deck and byline over its
 * opening in `cols` columns, then the jump. `showHead` false leaves the
 * headline to a banner above.
 */
function FrontStory({ edition, article, art, head, cols = 1, budget, text = 14, headline, picture = false }: { edition: Edition; article: EditionArticle; art: Art; head: Head; cols?: number; budget: number; text?: number; headline?: string | null; picture?: boolean }) {
  const { colors } = useTheme();
  const paras = opening(article.paragraphs, budget);
  const more = paras.length < article.paragraphs.length;
  const dateline = datelineOf(article, art);
  const split = columns(paras, cols);
  const title = headline === undefined ? article.headline : headline;
  return (
    <View style={{ gap: SPACE.sm }}>
      {picture && (
        <View style={{ marginBottom: 4 }}>
          <Picture picture={pictureOf(article)} compact />
        </View>
      )}
      <Link href={articleHref(edition.date, article.slug)} asChild>
        <Pressable accessibilityRole="link" style={{ gap: 6 }}>
          {(state) => {
            const hovered = Boolean((state as { hovered?: boolean }).hovered);
            return (
              <>
                <Kicker article={article} art={art} center />
                {title ? (
                  <Text accessibilityRole="header" style={{ fontFamily: FONT.serifBold, fontSize: head.size, lineHeight: Math.round(head.size * 1.13), letterSpacing: -0.3, color: colors.ink, textAlign: "center", textDecorationLine: hovered ? "underline" : "none" }}>
                    {title}
                  </Text>
                ) : null}
                <Text style={{ fontFamily: FONT.displayItalic, fontSize: head.deck, lineHeight: Math.round(head.deck * 1.35), color: colors.ink, textAlign: "center" }}>{article.dek}</Text>
              </>
            );
          }}
        </Pressable>
      </Link>
      <DeckRule />
      <Byline article={article} />
      <View style={{ marginTop: 4 }}>
        {split.length > 1 ? (
          <Columns>{split.map((c, n) => <Body key={n} paragraphs={c} dateline={n === 0 ? dateline : null} size={text} />)}</Columns>
        ) : (
          <Body paragraphs={paras} dateline={dateline} size={text} />
        )}
      </View>
      {more && <Jump edition={edition} article={article} />}
    </View>
  );
}

/** The line under the nameplate, between rules: the issue, the date, and that it's written by AI. */
function Folio({ edition }: { edition: Edition }) {
  const { colors } = useTheme();
  const narrow = useWindowDimensions().width < NARROW;
  const { data } = useCalendar(edition.date, 1);
  const style = { fontFamily: FONT.sansBold, fontSize: 9.5, letterSpacing: 1, textTransform: "uppercase" } as const;
  return (
    <View style={[styles.folio, { borderColor: colors.rule }]}>
      <Text variant="meta" color="ink" style={[style, { flex: 1 }]} numberOfLines={1}>
        {`No. ${edition.issue}`}
      </Text>
      <Text variant="meta" color="ink" style={[style, { flex: narrow ? 2 : 3, textAlign: "center" }]} numberOfLines={1}>
        {narrow ? new Date(`${edition.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : dateLine(edition.date)}
      </Text>
      <Text variant="meta" color="ink" style={[style, { flex: 1, textAlign: "right" }]} numberOfLines={1}>
        {narrow ? "By AI" : (data?.today?.label ?? "Written by AI")}
      </Text>
    </View>
  );
}

/** The banner across the top of the page, over the lead. */
function Banner({ edition, article, size }: { edition: Edition; article: EditionArticle; size: number }) {
  const { colors } = useTheme();
  return (
    <Link href={articleHref(edition.date, article.slug)} asChild>
      <Pressable accessibilityRole="link">
        {(state) => (
          <Text
            accessibilityRole="header"
            style={{ fontFamily: FONT.serifBold, fontSize: size, lineHeight: Math.round(size * 1.06), letterSpacing: -0.8, color: colors.ink, textAlign: "center", textDecorationLine: (state as { hovered?: boolean }).hovered ? "underline" : "none" }}
          >
            {article.banner ?? article.headline}
          </Text>
        )}
      </Pressable>
    </Link>
  );
}

/** The briefs along the foot of the page, in boxes like a newspaper's index. */
function BriefsStrip({ briefs, perRow }: { briefs: EditionBrief[]; perRow: number }) {
  const { colors } = useTheme();
  const rows = Array.from({ length: Math.ceil(briefs.length / perRow) }, (_, r) => briefs.slice(r * perRow, r * perRow + perRow));
  return (
    <View style={{ gap: SPACE.md }}>
      <View style={[styles.stripHead, { borderTopColor: colors.rule, borderBottomColor: colors.line }]}>
        <Text style={{ fontFamily: FONT.serifBold, fontSize: 15, color: colors.ink }}>In Brief</Text>
        <Text variant="meta" color="inkFaint" style={{ fontSize: 10 }}>
          More news of the kaum, from the publishers
        </Text>
      </View>
      {rows.map((row, r) => (
        <Columns key={r} style={r > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: SPACE.md } : undefined}>
          {[...row, ...Array(perRow - row.length).fill(null)].map((b: EditionBrief | null, n) =>
            b ? (
              <Pressable key={b.source.id} accessibilityRole="link" onPress={() => openStory(b.source)} style={{ gap: 3 }}>
                <Text variant="label" color="inkSoft" style={{ fontSize: 9 }}>
                  {b.kicker}
                </Text>
                <Text style={{ fontFamily: FONT.serifBold, fontSize: 15, lineHeight: 19, color: colors.ink }}>{b.headline}</Text>
                <Text style={{ fontFamily: FONT.serif, fontSize: 13, lineHeight: 18.5, color: colors.inkSoft }}>{b.text}</Text>
                <Text variant="meta" color="inkFaint" style={{ fontSize: 10 }}>{`${outletName(b.source.outlet)} ›`}</Text>
              </Pressable>
            ) : (
              <View key={`empty-${n}`} />
            ),
          )}
        </Columns>
      ))}
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
  const [lead, a, b, c, d, ...extra] = edition.articles;
  if (!lead) return null;
  const leadPicture = pictureOf(lead);
  // A banner over the lead's own column, unless the issue has none: then the column carries the headline.
  const leadHead = lead.banner ? lead.headline : null;
  const fold = { borderTopWidth: 1, borderTopColor: colors.rule, paddingTop: SPACE.lg } as const;
  const story = (x: EditionArticle | undefined, head: Head, budget: number, cols = 1, text = 14) => (x ? <FrontStory edition={edition} article={x} art={art} head={head} budget={budget} cols={cols} text={text} picture /> : null);

  if (narrow) {
    return (
      <View style={{ gap: SPACE.xl }}>
        <Folio edition={edition} />
        <Banner edition={edition} article={lead} size={31} />
        <Picture picture={leadPicture} />
        <FrontStory edition={edition} article={lead} art={art} head={HEADS.phone} budget={1100} text={16} headline={leadHead} />
        {[a, b, c, d, ...extra].map((x) =>
          x ? (
            <View key={x.slug} style={{ borderTopWidth: 1, borderTopColor: colors.rule, paddingTop: SPACE.lg }}>
              {story(x, HEADS.phone, 650, 1, 16)}
            </View>
          ) : null,
        )}
        {edition.briefs.length > 0 && <BriefsStrip briefs={edition.briefs} perRow={1} />}
      </View>
    );
  }

  if (!wide) {
    const rest = [a, b, c, d, ...extra].filter((x): x is EditionArticle => !!x);
    return (
      <View style={{ gap: SPACE.xl }}>
        <Folio edition={edition} />
        <Banner edition={edition} article={lead} size={40} />
        <Picture picture={leadPicture} />
        <FrontStory edition={edition} article={lead} art={art} head={HEADS.two} budget={2200} cols={2} text={14.5} headline={leadHead} />
        {Array.from({ length: Math.ceil(rest.length / 2) }, (_, r) => (
          <Columns key={r} gap={18} style={fold}>
            {[rest[r * 2], rest[r * 2 + 1]].map((x, n) => <View key={n}>{story(x, HEADS.one, 1000, 1, 14.5)}</View>)}
          </Columns>
        ))}
        {edition.briefs.length > 0 && <BriefsStrip briefs={edition.briefs} perRow={2} />}
      </View>
    );
  }

  // The broadsheet: five columns. Story A down the first; the banner across the other four, over the
  // photo and story C in three columns, with the lead's own text down the last. Below the fold, B and D.
  return (
    <View style={{ gap: SPACE.xl }}>
      <Folio edition={edition} />
      <Columns gap={16} weights={[1, 4.1]}>
        {[
          <View key="a">{story(a, HEADS.one, 1500)}</View>,
          <View key="lead" style={{ gap: SPACE.lg }}>
            <Banner edition={edition} article={lead} size={46} />
            <View style={{ flexDirection: "row" }}>
              <View style={{ flex: 3, gap: SPACE.lg, minWidth: 0 }}>
                <Picture picture={leadPicture} />
                {c && (
                  <View style={{ borderTopWidth: 1, borderTopColor: colors.ink, paddingTop: SPACE.md }}>
                    {story(c, HEADS.three, 2400, 3)}
                  </View>
                )}
              </View>
              <View style={{ flex: 1, minWidth: 0, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.line, paddingLeft: 16, marginLeft: 16 }}>
                <FrontStory edition={edition} article={lead} art={art} head={HEADS.one} budget={1500} headline={leadHead} />
              </View>
            </View>
          </View>,
        ].map((x) => x)}
      </Columns>
      {(b || d) && (
        <View style={[fold, { flexDirection: "row" }]}>
          {b && <View style={{ flex: 3, minWidth: 0 }}>{story(b, HEADS.three, 2700, 3)}</View>}
          {d && (
            <View style={[{ flex: 2, minWidth: 0 }, b && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.line, paddingLeft: 16, marginLeft: 16 }]}>
              {story(d, HEADS.two, 1800, 2)}
            </View>
          )}
        </View>
      )}
      {extra.length > 0 && (
        <Columns gap={16} style={fold}>
          {extra.map((x) => (
            <View key={x.slug}>{story(x, HEADS.one, 900)}</View>
          ))}
        </Columns>
      )}
      {edition.briefs.length > 0 && <BriefsStrip briefs={edition.briefs} perRow={4} />}
      <Text variant="meta" color="inkFaint" style={{ textAlign: "center", fontSize: 10 }}>
        Every story in this paper is written by AI from the publishers&apos; own reporting, which each one lists and links. Photos are the publishers&apos;.
      </Text>
    </View>
  );
}

/** One of the paper's stories on its own page, set like a newspaper article. */
export function ArticlePage({ edition, article }: { edition: Edition; article: EditionArticle }) {
  const { colors } = useTheme();
  const narrow = useWindowDimensions().width < NARROW;
  const art = useSourceArt();
  const dateline = datelineOf(article, art);
  const size = narrow ? 30 : 44;
  const body: TextStyle = { fontFamily: FONT.serif, fontSize: narrow ? 17.5 : 19, lineHeight: narrow ? 29 : 32, color: colors.ink };
  // The pull quote sits after the third paragraph, in long enough stories.
  const pullAt = article.pullQuote && article.paragraphs.length >= 6 ? 3 : -1;
  const others = edition.articles.filter((a) => a.slug !== article.slug);
  const text = { width: "100%", maxWidth: 660, alignSelf: "center" } as const;
  return (
    <View style={{ gap: SPACE.xl }}>
      <View style={[styles.pageLine, { borderBottomColor: colors.rule }]}>
        <Text style={{ fontFamily: FONT.serifBold, fontSize: 15, color: colors.ink }}>{pageOf(edition, article)}</Text>
        <Text variant="meta" color="ink" style={{ fontFamily: FONT.sansBold, fontSize: 9.5, letterSpacing: 1, textTransform: "uppercase", flexShrink: 1, textAlign: "center" }} numberOfLines={1}>
          {`Sikhe  ·  ${dateLine(edition.date)}`}
        </Text>
        <Text variant="meta" color="ink" style={{ fontFamily: FONT.sansBold, fontSize: 9.5, letterSpacing: 1, textTransform: "uppercase" }}>{`No. ${edition.issue}`}</Text>
      </View>

      <View style={{ gap: SPACE.md, maxWidth: 860, width: "100%", alignSelf: "center" }}>
        <Kicker article={article} art={art} center />
        <Text accessibilityRole="header" style={{ fontFamily: FONT.serifBold, fontSize: size, lineHeight: Math.round(size * 1.1), letterSpacing: -0.6, color: colors.ink, textAlign: "center" }}>
          {article.headline}
        </Text>
        <Text style={{ fontFamily: FONT.displayItalic, fontSize: narrow ? 18 : 21, lineHeight: narrow ? 25 : 29, color: colors.ink, textAlign: "center", maxWidth: 680, alignSelf: "center" }}>{article.dek}</Text>
        <DeckRule />
        <Byline article={article} />
        <Text variant="meta" color="inkFaint" style={{ textAlign: "center", fontSize: 10.5 }}>{`${dateLine(edition.date)}  ·  ${article.readMinutes} min read`}</Text>
      </View>

      <View style={{ maxWidth: 860, width: "100%", alignSelf: "center" }}>
        <Picture picture={pictureOf(article)} />
      </View>

      <View style={text}>
        {article.paragraphs.map((p, n) => (
          <View key={n}>
            {p.subhead ? <Text style={{ fontFamily: FONT.serifBold, fontSize: narrow ? 19 : 21, lineHeight: 28, color: colors.ink, marginTop: SPACE.lg, marginBottom: SPACE.sm }}>{p.subhead}</Text> : null}
            <Text style={[body, { marginBottom: SPACE.lg }]}>
              {n === 0 && dateline ? <Text style={[body, { fontFamily: FONT.sansBold, fontSize: (body.fontSize ?? 19) - 3, letterSpacing: 0.5 }]}>{`${dateline} — `}</Text> : null}
              {p.text}
              {n === article.paragraphs.length - 1 ? <Text style={[body, { color: colors.accent }]}>{"  ■"}</Text> : null}
            </Text>
            {n === 3 && article.art && article.map ? (
              <View style={{ marginBottom: SPACE.xl, gap: 4 }}>
                <Text variant="label" color="inkSoft" style={{ fontSize: 9.5 }}>
                  Where it happened
                </Text>
                <Picture picture={{ art: article.map, kind: "map" }} compact />
              </View>
            ) : null}
            {n + 1 === pullAt && (
              <View style={[styles.pull, { borderColor: colors.rule }]}>
                <Text style={{ fontFamily: FONT.displayItalic, fontSize: narrow ? 22 : 26, lineHeight: narrow ? 30 : 35, color: colors.ink, textAlign: "center" }}>{article.pullQuote}</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      <View style={[text, { gap: SPACE.sm }]}>
        <View style={[styles.stripHead, { borderTopColor: colors.rule, borderBottomColor: colors.line }]}>
          <Text style={{ fontFamily: FONT.serifBold, fontSize: 15, color: colors.ink }}>Sources</Text>
        </View>
        {article.sources.map((s) => (
          <Pressable key={s.id} accessibilityRole="link" onPress={() => openStory(s)} style={{ paddingVertical: 3 }}>
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
        <View style={[text, { gap: SPACE.md }]}>
          <View style={[styles.stripHead, { borderTopColor: colors.rule, borderBottomColor: colors.line }]}>
            <Text style={{ fontFamily: FONT.serifBold, fontSize: 15, color: colors.ink }}>More in Today&apos;s Paper</Text>
          </View>
          {others.map((a) => (
            <Link key={a.slug} href={articleHref(edition.date, a.slug)} asChild>
              <Pressable accessibilityRole="link" style={StyleSheet.flatten([styles.entry, { borderBottomColor: colors.line }])}>
                <Kicker article={a} art={art} />
                <Text style={{ fontFamily: FONT.serifBold, fontSize: 18, lineHeight: 23, color: colors.ink }}>{a.headline}</Text>
                <Text variant="meta" color="inkFaint">{`Page ${pageOf(edition, a)}  ·  ${a.readMinutes} min read`}</Text>
              </Pressable>
            </Link>
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
      <View style={[styles.stripHead, { borderTopColor: colors.rule, borderBottomColor: colors.line }]}>
        <Text style={{ fontFamily: FONT.serifBold, fontSize: 15, color: colors.ink }}>Earlier Papers</Text>
      </View>
      {earlier.map((e) => (
        <Link key={e.date} href={`/issue/${e.date}` as Href} asChild>
          <Pressable accessibilityRole="link" style={StyleSheet.flatten([styles.entry, { borderBottomColor: colors.line }])}>
            <Text variant="meta">{`No. ${e.issue}  ·  ${dateLine(e.date)}`}</Text>
            <Text style={{ fontFamily: FONT.serifBold, fontSize: 17, lineHeight: 22, color: colors.ink }}>{e.headline}</Text>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  folio: { flexDirection: "row", alignItems: "center", gap: SPACE.md, borderTopWidth: 1, borderBottomWidth: 3, paddingVertical: 5, marginTop: -SPACE.md },
  pageLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: SPACE.md, borderBottomWidth: 3, paddingBottom: 6 },
  stripHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: SPACE.md, borderTopWidth: 3, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 6 },
  pull: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: SPACE.lg, marginBottom: SPACE.lg, marginHorizontal: SPACE.xl },
  entry: { gap: 4, paddingVertical: SPACE.md, borderBottomWidth: StyleSheet.hairlineWidth },
});

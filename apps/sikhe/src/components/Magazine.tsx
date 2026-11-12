import { Link, type Href } from "expo-router";
import { useRef, type ReactNode, type RefObject } from "react";
import { Platform, Pressable, StyleSheet, useWindowDimensions, View, type HostInstance, type ScrollViewInstance, type TextStyle } from "react-native";
import { useCalendar, useEditions, type Edition, type EditionArticle, type EditionBrief, type EditionParagraph } from "@/lib/api";
import { openStory } from "@/lib/stories";
import { useTheme } from "@/theme/theme";
import { FONT, NARROW, SPACE, WIDE } from "@/theme/tokens";
import { Text } from "./Text";

/**
 * The day's paper, set like a printed broadsheet front page: a folio line,
 * the lead story in the wide middle column with a story either side, more
 * stories and the briefs below the fold, every column divided by a hairline.
 * Each front-page story is the opening of the article and jumps to the rest
 * on the inside pages, where each one runs in full with its sources. Written
 * by AI from the publishers' reporting, and it says so.
 */

const dateLine = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

/** Scrolls the page to an article: the browser does it itself; on a phone, measured against the page. */
function scrollToView(view: HostInstance | null, scroll: RefObject<ScrollViewInstance | null> | undefined) {
  if (!view) return;
  if (Platform.OS === "web") {
    (view as unknown as HTMLElement).scrollIntoView?.({ behavior: "smooth", block: "start" });
    return;
  }
  const page = scroll?.current;
  if (!page) return;
  view.measureLayout(page as unknown as HostInstance, (_x: number, y: number) => page.scrollTo({ y: Math.max(0, y - 12), animated: true }));
}

/** "Written by AI from reporting by The Tribune, Sikh Press Association and CBC." */
function credit(article: EditionArticle) {
  const outlets = [...new Set(article.sources.map((s) => s.outlet))];
  const list = outlets.length <= 1 ? outlets.join("") : `${outlets.slice(0, -1).join(", ")} and ${outlets.at(-1)}`;
  return `Written by AI from reporting by ${list}`;
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
    const col = Math.min(n - 1, Math.floor((used + p.text.length / 2) / (total / n)));
    out[col]!.push(p);
    used += p.text.length;
  }
  return out.filter((c) => c.length);
}

/** Text columns side by side, with a hairline between them. */
function Columns({ children, gap = SPACE.lg }: { children: ReactNode[]; gap?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
      {children.map((c, n) => (
        <View key={n} style={[{ flex: 1, gap: SPACE.md }, n > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.line, paddingLeft: gap, marginLeft: gap }]}>
          {c}
        </View>
      ))}
    </View>
  );
}

/** Column text. Wide columns are justified like a newspaper's; narrow ones stay ragged, so no line gapes. */
function useBodyStyle(size = 15, justify = true): TextStyle {
  const { colors } = useTheme();
  return { fontFamily: FONT.serif, fontSize: size, lineHeight: size * 1.47, color: colors.ink, ...(justify && Platform.OS === "web" ? { textAlign: "justify" } : null) };
}

function Kicker({ article }: { article: EditionArticle }) {
  return (
    <Text variant="label" color={article.tone === "good" ? "accentInk" : "inkSoft"}>
      {article.kicker}
    </Text>
  );
}

function Byline({ article }: { article: EditionArticle }) {
  return (
    <Text variant="meta" color="inkSoft" style={{ fontFamily: FONT.sansBold, fontSize: 9.5, letterSpacing: 0.9, textTransform: "uppercase" }}>
      {credit(article)}
    </Text>
  );
}

/** "Continued on Page 3": the jump to the rest of the article inside. */
function Jump({ page, onPress }: { page: number; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} hitSlop={6}>
      <Text variant="meta" color="accentInk" style={{ fontFamily: FONT.sansBold }}>
        {`Continued on Page ${page} ›`}
      </Text>
    </Pressable>
  );
}

type Size = "lead" | "side" | "lower" | "phone";

const HEAD: Record<Size, { font: string; size: number }> = {
  lead: { font: FONT.serifBold, size: 40 },
  side: { font: FONT.headline, size: 21 },
  lower: { font: FONT.headline, size: 25 },
  phone: { font: FONT.headline, size: 23 },
};

/** A story on the front page: kicker, headline, dek, byline and the article's opening in `cols` columns. */
function FrontStory({ article, size, cols = 1, budget, page, onJump }: { article: EditionArticle; size: Size; cols?: number; budget: number; page: number; onJump: () => void }) {
  const { colors } = useTheme();
  const narrow = useWindowDimensions().width < NARROW;
  const body = useBodyStyle(size === "side" ? 14 : 15, size === "lead" && !narrow);
  const head = size === "lead" && narrow ? { font: FONT.serifBold, size: 31 } : HEAD[size];
  const text = opening(article.paragraphs, budget);
  const more = text.length < article.paragraphs.length;
  const paras = (ps: EditionParagraph[]) => ps.map((p, n) => <Text key={n} style={body}>{p.text}</Text>);
  return (
    <View style={{ gap: SPACE.md }}>
      <Pressable accessibilityRole="link" accessibilityLabel={article.headline} onPress={onJump} style={{ gap: SPACE.sm }}>
        <Kicker article={article} />
        <Text accessibilityRole="header" style={{ fontFamily: head.font, fontSize: head.size, lineHeight: head.size * 1.12, letterSpacing: size === "lead" ? -0.6 : -0.2, color: colors.ink }}>
          {article.headline}
        </Text>
        <Text style={{ fontFamily: FONT.displayItalic, fontSize: size === "lead" ? 19 : size === "side" ? 15 : 16.5, lineHeight: size === "lead" ? 26 : 21, color: colors.inkSoft }}>{article.dek}</Text>
      </Pressable>
      <Byline article={article} />
      {cols > 1 ? <Columns>{columns(text, cols).map((c) => paras(c))}</Columns> : paras(text)}
      {more && <Jump page={page} onPress={onJump} />}
    </View>
  );
}

/** The folio under the masthead: issue number, date and the Nanakshahi date between rules. */
function Folio({ edition }: { edition: Edition }) {
  const { colors } = useTheme();
  const narrow = useWindowDimensions().width < NARROW;
  const { data } = useCalendar(edition.date, 1);
  const style = { fontFamily: FONT.sansBold, fontSize: 10, letterSpacing: 1, textTransform: "uppercase" } as const;
  return (
    <View style={[styles.folio, { borderColor: colors.rule }]}>
      <Text variant="meta" color="ink" style={[style, narrow ? { flexShrink: 0 } : { flex: 1 }]} numberOfLines={1}>{`No. ${edition.issue}`}</Text>
      <Text variant="meta" color="ink" style={[style, { flex: 1, textAlign: "center" }]} numberOfLines={1}>
        {narrow ? new Date(`${edition.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : dateLine(edition.date)}
      </Text>
      {!narrow && (
        <Text variant="meta" color="ink" style={[style, { flex: 1, textAlign: "right" }]} numberOfLines={1}>
          {data?.today?.label ?? "Written by AI"}
        </Text>
      )}
    </View>
  );
}

/** The briefs, as a narrow column of short items under a heading. */
function BriefsColumn({ briefs }: { briefs: EditionBrief[] }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: SPACE.md }}>
      <Text style={{ fontFamily: FONT.serifBold, fontSize: 17, color: colors.ink, borderBottomWidth: 1, borderBottomColor: colors.rule, paddingBottom: SPACE.xs }}>In Brief</Text>
      {briefs.map((b, n) => (
        <Pressable key={b.source.id} accessibilityRole="link" onPress={() => openStory(b.source)} style={[{ gap: 3 }, n > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: SPACE.md }]}>
          <Text style={{ fontFamily: FONT.serifBold, fontSize: 14.5, lineHeight: 18.5, color: colors.ink }}>{b.headline}</Text>
          <Text style={{ fontFamily: FONT.serif, fontSize: 13, lineHeight: 18.5, color: colors.inkSoft }}>{b.text}</Text>
          <Text variant="meta" color="inkFaint">{`${b.source.outlet} ›`}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** The front page, laid out for the width of the screen. */
function FrontPage({ edition, onOpen }: { edition: Edition; onOpen: (slug: string) => void }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;
  const narrow = width < NARROW;
  const [lead, ...features] = edition.articles;
  if (!lead) return null;
  // Inside, the articles run from Page 2 in front-page order.
  const page = (a: EditionArticle) => edition.articles.indexOf(a) + 2;
  const story = (a: EditionArticle, size: Size, budget: number, cols = 1) => <FrontStory key={a.slug} article={a} size={size} cols={cols} budget={budget} page={page(a)} onJump={() => onOpen(a.slug)} />;
  const divider = { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.line, paddingLeft: SPACE.xl, marginLeft: SPACE.xl } as const;
  const fold = { borderTopWidth: 1, borderTopColor: colors.rule, paddingTop: SPACE.lg } as const;

  if (narrow) {
    return (
      <View style={{ gap: SPACE.xl }}>
        {story(lead, "lead", 800)}
        {features.map((a) => (
          <View key={a.slug} style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: SPACE.lg }}>
            {story(a, "phone", 380)}
          </View>
        ))}
        {edition.briefs.length > 0 && <BriefsColumn briefs={edition.briefs} />}
      </View>
    );
  }

  if (!wide) {
    return (
      <View style={{ gap: SPACE.xl }}>
        {story(lead, "lead", 1300, 2)}
        <View style={[fold, { flexDirection: "row", flexWrap: "wrap", rowGap: SPACE.xl }]}>
          {features.map((a, n) => (
            <View key={a.slug} style={[{ width: "50%" }, n % 2 === 1 ? { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.line, paddingLeft: SPACE.lg } : { paddingRight: SPACE.lg }]}>
              {story(a, "side", 650)}
            </View>
          ))}
        </View>
        {edition.briefs.length > 0 && (
          <View style={fold}>
            <BriefsColumn briefs={edition.briefs} />
          </View>
        )}
      </View>
    );
  }

  // Above the fold: a story, the lead across the wide middle, a story. Below it, the rest and the briefs.
  const [left, right, ...lower] = features;
  return (
    <View style={{ gap: SPACE.xl }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        {left && <View style={{ flex: 1 }}>{story(left, "side", 1250)}</View>}
        <View style={[{ flex: 2.6 }, left && divider]}>{story(lead, "lead", 1800, 2)}</View>
        {right && <View style={[{ flex: 1 }, divider]}>{story(right, "side", 1250)}</View>}
      </View>
      {(lower.length > 0 || edition.briefs.length > 0) && (
        <View style={[fold, { flexDirection: "row", alignItems: "flex-start" }]}>
          {lower.map((a, n) => (
            <View key={a.slug} style={[{ flex: n === 0 ? 2 : 1 }, n > 0 && divider]}>
              {story(a, "lower", n === 0 ? 1100 : 750, n === 0 ? 2 : 1)}
            </View>
          ))}
          {edition.briefs.length > 0 && (
            <View style={[{ flex: 1 }, lower.length > 0 && divider]}>
              <BriefsColumn briefs={edition.briefs} />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

/** An article in full on its inside page: headline, dek, byline, the text in columns, then its sources. */
function Article({ article, page }: { article: EditionArticle; page: number }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const narrow = width < NARROW;
  const cols = width >= WIDE ? 3 : narrow ? 1 : 2;
  const body = useBodyStyle(15.5, !narrow);
  const size = narrow ? 27 : 34;
  const quote = article.pullQuote ? (
    <View key="quote" style={[styles.pull, { borderColor: colors.rule }]}>
      <Text style={{ fontFamily: FONT.displayItalic, fontSize: 21, lineHeight: 28, color: colors.ink }}>{`“${article.pullQuote.replace(/^["“]|["”]$/g, "")}”`}</Text>
    </View>
  ) : null;
  const split = columns(article.paragraphs, cols);
  return (
    <View style={{ gap: SPACE.md }}>
      <View style={[styles.pageHead, { borderBottomColor: colors.rule }]}>
        <Text variant="label">{`Page ${page}`}</Text>
        <Kicker article={article} />
      </View>
      <Text accessibilityRole="header" style={{ fontFamily: FONT.serifBold, fontSize: size, lineHeight: size * 1.1, letterSpacing: -0.4, color: colors.ink, maxWidth: 900 }}>
        {article.headline}
      </Text>
      <Text style={{ fontFamily: FONT.displayItalic, fontSize: narrow ? 17 : 19, lineHeight: narrow ? 23 : 26, color: colors.inkSoft, maxWidth: 760 }}>{article.dek}</Text>
      <Text variant="meta" color="inkFaint">
        <Byline article={article} />
        {`  ·  ${article.readMinutes} min read`}
      </Text>
      <View style={{ marginTop: SPACE.sm }}>
        <Columns gap={SPACE.xl}>
          {/* The pull quote opens the second column, or follows the second paragraph in one column. */}
          {split.map((c, n) =>
            c.flatMap((p, k) => {
              const text = <Text key={k} style={body}>{p.text}</Text>;
              if (!quote) return [text];
              if (split.length > 1 && n === 1 && k === 0) return [quote, text];
              if (split.length === 1 && k === 1) return [text, quote];
              return [text];
            }),
          )}
        </Columns>
      </View>
      <View style={[styles.sources, { borderTopColor: colors.line }]}>
        <Text variant="label" color="inkSoft">
          Sources
        </Text>
        {article.sources.map((s) => (
          <Pressable key={s.id} accessibilityRole="link" onPress={() => openStory(s)}>
            <Text variant="small">
              <Text variant="small" color="ink" style={{ fontFamily: FONT.sansMedium }}>
                {s.outlet}
              </Text>
              {`: ${s.title} `}
              <Text variant="small" color="accentInk">
                ›
              </Text>
            </Text>
          </Pressable>
        ))}
      </View>
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
      <Text variant="label">Back issues</Text>
      <View style={{ height: 3, backgroundColor: colors.rule }} />
      {earlier.map((e) => (
        <Link key={e.date} href={`/issue/${e.date}` as Href} asChild>
          <Pressable accessibilityRole="link" style={[styles.entry, { borderBottomColor: colors.line }]}>
            <Text variant="meta" style={{ width: 84 }}>{`No. ${e.issue}`}</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="title">{e.headline}</Text>
              <Text variant="meta">{dateLine(e.date)}</Text>
            </View>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}

/** One day's paper: the front page, then each article in full inside. `scrollRef` is the page's, so a jump can scroll to its article. */
export function Magazine({ edition, scrollRef }: { edition: Edition; scrollRef?: RefObject<ScrollViewInstance | null> }) {
  const { colors } = useTheme();
  const places = useRef(new Map<string, HostInstance | null>());
  const open = (id: string) => scrollToView(places.current.get(id) ?? null, scrollRef);
  return (
    <View style={{ gap: SPACE.xxxl }}>
      <View style={{ gap: SPACE.xl, marginTop: -SPACE.md }}>
        <Folio edition={edition} />
        <FrontPage edition={edition} onOpen={open} />
      </View>
      <View style={{ height: 4, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.rule }} />
      {edition.articles.map((a, n) => (
        <View key={a.slug} ref={(v) => void places.current.set(a.slug, v)}>
          <Article article={a} page={n + 2} />
        </View>
      ))}
      <Text variant="meta" color="inkFaint" style={{ textAlign: "center", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: SPACE.lg }}>
        Every article in this paper is written by AI from the publishers&apos; own reporting, which each one lists and links. A checker removes any sentence whose numbers or quotations aren&apos;t in its sources.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  folio: { flexDirection: "row", alignItems: "center", gap: SPACE.md, borderBottomWidth: 1, paddingBottom: 6 },
  pageHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 2, paddingBottom: 6 },
  entry: { flexDirection: "row", alignItems: "flex-start", gap: SPACE.md, paddingVertical: SPACE.md, borderBottomWidth: StyleSheet.hairlineWidth },
  pull: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: SPACE.md },
  sources: { gap: SPACE.sm, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: SPACE.lg, marginTop: SPACE.sm },
});

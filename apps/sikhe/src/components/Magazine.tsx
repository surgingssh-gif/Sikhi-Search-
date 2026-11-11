import { Link, type Href } from "expo-router";
import { useRef, type RefObject } from "react";
import { Platform, Pressable, StyleSheet, useWindowDimensions, View, type HostInstance, type ScrollViewInstance } from "react-native";
import { useCalendar, useEditions, type Edition, type EditionArticle, type EditionBrief } from "@/lib/api";
import { openStory } from "@/lib/stories";
import { useTheme } from "@/theme/theme";
import { FONT, NARROW, READING_WIDTH, SPACE, WIDE } from "@/theme/tokens";
import { Text } from "./Text";

/**
 * The daily magazine, set like a printed one: a type-only cover with the
 * cover story's headline and cover lines for the features, the contents,
 * then each article in full with its lead-in, pull quote and sources, and a
 * page of briefs. Written by AI from the publishers' reporting, and it says so.
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

function Rule({ heavy }: { heavy?: boolean }) {
  const { colors } = useTheme();
  return <View style={{ height: heavy ? 3 : StyleSheet.hairlineWidth, backgroundColor: heavy ? colors.rule : colors.line }} />;
}

function Cover({ edition, onOpen }: { edition: Edition; onOpen: (slug: string) => void }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const narrow = width < NARROW;
  const wide = width >= WIDE;
  const { data } = useCalendar(edition.date, 1);
  const cover = edition.articles[0]!;
  const lines = edition.articles.slice(1);
  return (
    <View style={[styles.cover, { backgroundColor: colors.sunken, borderTopColor: colors.rule }]}>
      <View style={styles.coverTop}>
        <Text variant="label" color="inkSoft" style={{ flex: 1 }} numberOfLines={1}>
          {narrow ? new Date(`${edition.date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : dateLine(edition.date)}
          {data?.today ? `  ·  ${data.today.label}` : ""}
        </Text>
        <Text variant="label" color="accentInk">{`No. ${edition.issue}`}</Text>
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel={`Read the cover story: ${cover.headline}`} onPress={() => onOpen(cover.slug)} style={{ gap: SPACE.md }}>
        <Text variant="label" color="accentInk" style={{ letterSpacing: 2.2 }}>
          {`Cover story · ${cover.kicker}`}
        </Text>
        <Text
          accessibilityRole="header"
          style={{ fontFamily: FONT.nameplateItalic, fontSize: narrow ? 38 : wide ? 68 : 54, lineHeight: narrow ? 42 : wide ? 72 : 58, letterSpacing: -0.8, color: colors.ink, maxWidth: 980 }}
        >
          {cover.headline}
        </Text>
        <Text style={{ fontFamily: FONT.displayItalic, fontSize: narrow ? 17 : 21, lineHeight: narrow ? 24 : 29, color: colors.inkSoft, maxWidth: 760 }}>{cover.dek}</Text>
      </Pressable>

      {lines.length > 0 && (
        <View style={[styles.coverLines, { borderTopColor: colors.rule }, wide && { flexDirection: "row" }]}>
          {lines.map((a, n) => (
            <Pressable
              key={a.slug}
              accessibilityRole="button"
              onPress={() => onOpen(a.slug)}
              style={[styles.coverLine, wide && { flex: 1 }, wide && n > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.line, paddingLeft: SPACE.lg }]}
            >
              <Text variant="label" color={a.tone === "good" ? "accentInk" : "inkSoft"}>
                {a.kicker}
              </Text>
              <Text style={{ fontFamily: FONT.nameplate, fontSize: 17, lineHeight: 21, color: colors.ink }}>{a.headline}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function Contents({ edition, onOpen }: { edition: Edition; onOpen: (slug: string) => void }) {
  const { colors } = useTheme();
  const wide = useWindowDimensions().width >= WIDE;
  const entries = [...edition.articles.map((a) => ({ id: a.slug, kicker: a.kicker, title: a.headline, meta: `${a.readMinutes} min read` })), ...(edition.briefs.length ? [{ id: "briefs", kicker: "In brief", title: `${edition.briefs.length} more stories from the kaum`, meta: "" }] : [])];
  return (
    <View style={{ gap: SPACE.md }}>
      <Text variant="label">In this issue</Text>
      <Rule heavy />
      <View style={wide ? { flexDirection: "row", flexWrap: "wrap" } : undefined}>
        {entries.map((e, n) => (
          <Pressable key={e.id} accessibilityRole="button" onPress={() => onOpen(e.id)} style={[styles.entry, { borderBottomColor: colors.line }, wide && { width: "50%", paddingRight: SPACE.xl }]}>
            <Text style={{ fontFamily: FONT.nameplate, fontSize: 22, lineHeight: 26, color: colors.accentInk, width: 34 }}>{String(n + 1).padStart(2, "0")}</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="label" color="inkSoft">
                {e.kicker}
              </Text>
              <Text variant="title">{e.title}</Text>
              {e.meta ? <Text variant="meta">{e.meta}</Text> : null}
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Article({ article, cover }: { article: EditionArticle; cover: boolean }) {
  const { colors } = useTheme();
  const narrow = useWindowDimensions().width < NARROW;
  const size = cover ? (narrow ? 32 : 44) : narrow ? 27 : 34;
  // The pull quote sits after the second paragraph, in long enough articles.
  const pullAt = article.pullQuote && article.paragraphs.length >= 4 ? 2 : -1;
  return (
    <View style={{ gap: SPACE.lg }}>
      <View style={{ alignItems: "center", gap: SPACE.md }}>
        <Text variant="label" color={article.tone === "good" ? "accentInk" : "inkSoft"} style={{ letterSpacing: 2.2 }}>
          {cover ? `Cover story · ${article.kicker}` : article.kicker}
        </Text>
        <Text accessibilityRole="header" style={{ fontFamily: FONT.nameplate, fontSize: size, lineHeight: size * 1.12, color: colors.ink, textAlign: "center", maxWidth: 880 }}>
          {article.headline}
        </Text>
        <Text style={{ fontFamily: FONT.displayItalic, fontSize: narrow ? 16.5 : 19, lineHeight: narrow ? 23 : 27, color: colors.inkSoft, textAlign: "center", maxWidth: 680 }}>{article.dek}</Text>
        <Text variant="meta" color="inkFaint" style={{ textAlign: "center" }}>
          {`${credit(article)}  ·  ${article.readMinutes} min read`}
        </Text>
      </View>

      <View style={[styles.body, { maxWidth: READING_WIDTH }]}>
        <View style={{ height: 1, width: 48, backgroundColor: colors.rule, alignSelf: "center", marginBottom: SPACE.sm }} />
        {article.paragraphs.map((p, n) => (
          <View key={n} style={{ gap: SPACE.lg }}>
            <Text style={{ fontFamily: FONT.serif, fontSize: 17, lineHeight: 28, color: colors.ink }}>
              {n === 0 ? <LeadIn text={p.text} /> : p.text}
            </Text>
            {n + 1 === pullAt && (
              <View style={[styles.pull, { borderColor: colors.rule }]}>
                <Text style={{ fontFamily: FONT.nameplateItalic, fontSize: narrow ? 22 : 26, lineHeight: narrow ? 29 : 34, color: colors.accentInk, textAlign: "center" }}>{article.pullQuote}</Text>
              </View>
            )}
          </View>
        ))}
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
    </View>
  );
}

/** The first few words of an article in small capitals, the way a magazine opens a story. */
function LeadIn({ text }: { text: string }) {
  const { colors } = useTheme();
  const words = text.split(" ");
  const n = Math.min(4, Math.max(2, words.length - 1));
  return (
    <>
      <Text style={{ fontFamily: FONT.sansBold, fontSize: 14, letterSpacing: 1.1, color: colors.ink, textTransform: "uppercase" }}>{words.slice(0, n).join(" ")}</Text>
      {` ${words.slice(n).join(" ")}`}
    </>
  );
}

function Briefs({ briefs }: { briefs: EditionBrief[] }) {
  const { colors } = useTheme();
  const wide = useWindowDimensions().width >= WIDE;
  return (
    <View style={{ gap: SPACE.md }}>
      <Text style={{ fontFamily: FONT.nameplateItalic, fontSize: 30, lineHeight: 36, color: colors.ink, textAlign: "center" }}>In brief</Text>
      <Rule heavy />
      <View style={wide ? { flexDirection: "row", flexWrap: "wrap" } : { gap: SPACE.lg }}>
        {briefs.map((b) => (
          <Pressable
            key={b.source.id}
            accessibilityRole="link"
            onPress={() => openStory(b.source)}
            style={[styles.brief, { borderBottomColor: colors.line }, wide && { width: "33.33%", paddingRight: SPACE.xl }]}
          >
            <Text variant="label" color="accentInk">
              {b.kicker}
            </Text>
            <Text variant="title">{b.headline}</Text>
            <Text variant="small">{b.text}</Text>
            <Text variant="meta" color="inkFaint">
              {`${b.source.outlet} ›`}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Ornament() {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "center", gap: 10, paddingVertical: SPACE.md }}>
      {[0, 1, 2].map((n) => (
        <View key={n} style={{ width: 5, height: 5, backgroundColor: n === 1 ? colors.accent : colors.inkFaint, transform: [{ rotate: "45deg" }] }} />
      ))}
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
      <Rule heavy />
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

/** One issue, cover to briefs. `scrollRef` is the page's, so the contents can jump to an article. */
export function Magazine({ edition, scrollRef }: { edition: Edition; scrollRef?: RefObject<ScrollViewInstance | null> }) {
  const { colors } = useTheme();
  const places = useRef(new Map<string, HostInstance | null>());
  const open = (id: string) => scrollToView(places.current.get(id) ?? null, scrollRef);
  return (
    <View style={{ gap: SPACE.xxxl }}>
      <Cover edition={edition} onOpen={open} />
      <Contents edition={edition} onOpen={open} />
      {edition.articles.map((a, n) => (
        <View key={a.slug} ref={(v) => void places.current.set(a.slug, v)} style={{ gap: SPACE.xxxl }}>
          {n > 0 && <Ornament />}
          <Article article={a} cover={n === 0} />
        </View>
      ))}
      {edition.briefs.length > 0 && (
        <View ref={(v) => void places.current.set("briefs", v)}>
          <Briefs briefs={edition.briefs} />
        </View>
      )}
      <Text variant="meta" color="inkFaint" style={{ textAlign: "center", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: SPACE.lg }}>
        Every article in this issue is written by AI from the publishers&apos; own reporting, which each one lists and links. A checker removes any sentence whose numbers or quotations aren&apos;t in its sources.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { gap: SPACE.xl, padding: SPACE.xl, paddingTop: SPACE.lg, paddingBottom: SPACE.xxl, borderTopWidth: 3 },
  coverTop: { flexDirection: "row", alignItems: "center", gap: SPACE.md },
  coverLines: { gap: SPACE.lg, borderTopWidth: 1, paddingTop: SPACE.lg },
  coverLine: { gap: 4 },
  entry: { flexDirection: "row", alignItems: "flex-start", gap: SPACE.md, paddingVertical: SPACE.md, borderBottomWidth: StyleSheet.hairlineWidth },
  body: { width: "100%", alignSelf: "center", gap: SPACE.lg },
  pull: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: SPACE.lg, marginVertical: SPACE.sm },
  sources: { gap: SPACE.sm, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: SPACE.lg, marginTop: SPACE.sm },
  brief: { gap: 4, paddingVertical: SPACE.lg, borderBottomWidth: StyleSheet.hairlineWidth },
});

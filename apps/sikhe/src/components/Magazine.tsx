import { Link, type Href } from "expo-router";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { useCalendar, useEditions, type Edition, type EditionArticle, type EditionBrief } from "@/lib/api";
import { openStory } from "@/lib/stories";
import { useTheme } from "@/theme/theme";
import { FONT, NARROW, READING_WIDTH, SPACE, WIDE } from "@/theme/tokens";
import { Text } from "./Text";

/**
 * The day's paper. The front page is set for scanning: the lead story and
 * the briefs beside it, then the other stories in a row, each with only its
 * headline and a summary. Every story opens on its own page, in one column
 * of large type. Written by AI from the publishers' reporting, and it says so.
 */

const dateLine = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

export const articleHref = (date: string, slug: string) => `/issue/${date}/${slug}` as Href;

/** "Written by AI from reporting by The Tribune, Sikh Press Association and CBC." */
function credit(article: EditionArticle) {
  const outlets = [...new Set(article.sources.map((s) => s.outlet))];
  const list = outlets.length <= 1 ? outlets.join("") : `${outlets.slice(0, -1).join(", ")} and ${outlets.at(-1)}`;
  return `Written by AI from reporting by ${list}`;
}

function Kicker({ article }: { article: EditionArticle }) {
  return (
    <Text variant="label" color={article.tone === "good" ? "accentInk" : "inkSoft"}>
      {article.kicker}
    </Text>
  );
}

/** A heading over a part of the page: small capitals over a black rule. */
function Heading({ children }: { children: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ borderBottomWidth: 2, borderBottomColor: colors.rule, paddingBottom: 6 }}>
      <Text variant="label">{children}</Text>
    </View>
  );
}

/** The issue number, date and Nanakshahi date under the masthead. */
function Folio({ edition }: { edition: Edition }) {
  const narrow = useWindowDimensions().width < NARROW;
  const { data } = useCalendar(edition.date, 1);
  const day = narrow ? new Date(`${edition.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : dateLine(edition.date);
  return (
    <View style={styles.folio}>
      <Text variant="meta" color="ink" style={styles.folioText} numberOfLines={1}>
        {`No. ${edition.issue}  ·  ${day}${data?.today && !narrow ? `  ·  ${data.today.label}` : ""}`}
      </Text>
      <Text variant="meta" color="inkFaint" numberOfLines={1}>
        Today&apos;s paper, written by AI
      </Text>
    </View>
  );
}

/** The lead story: its headline large, the summary, and the way in. */
function Lead({ edition, article }: { edition: Edition; article: EditionArticle }) {
  const { colors } = useTheme();
  const narrow = useWindowDimensions().width < NARROW;
  const size = narrow ? 32 : 44;
  return (
    <Link href={articleHref(edition.date, article.slug)} asChild>
      <Pressable accessibilityRole="link" style={{ gap: SPACE.md }}>
        <Kicker article={article} />
        <Text accessibilityRole="header" style={{ fontFamily: FONT.serifBold, fontSize: size, lineHeight: size * 1.1, letterSpacing: -0.6, color: colors.ink }}>
          {article.headline}
        </Text>
        <Text style={{ fontFamily: FONT.serif, fontSize: narrow ? 17 : 19, lineHeight: narrow ? 25 : 28, color: colors.inkSoft }}>{article.dek}</Text>
        <Text variant="meta" color="inkFaint">{`${article.readMinutes} min read`}</Text>
        <Text variant="button" color="accentInk">
          Read the story ›
        </Text>
      </Pressable>
    </Link>
  );
}

/** Another story: kicker, headline and summary. */
function StoryBlock({ edition, article }: { edition: Edition; article: EditionArticle }) {
  const { colors } = useTheme();
  return (
    <Link href={articleHref(edition.date, article.slug)} asChild>
      <Pressable accessibilityRole="link" style={{ gap: SPACE.sm }}>
        <Kicker article={article} />
        <Text style={{ fontFamily: FONT.headline, fontSize: 20, lineHeight: 25, color: colors.ink }}>{article.headline}</Text>
        <Text style={{ fontFamily: FONT.serif, fontSize: 15, lineHeight: 22, color: colors.inkSoft }}>{article.dek}</Text>
        <Text variant="meta" color="inkFaint">{`${article.readMinutes} min read`}</Text>
      </Pressable>
    </Link>
  );
}

/** The briefs: short items, numbered, each opening the publisher's story. */
function Briefs({ briefs }: { briefs: EditionBrief[] }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: SPACE.md }}>
      <Heading>In brief</Heading>
      {briefs.map((b, n) => (
        <Pressable key={b.source.id} accessibilityRole="link" onPress={() => openStory(b.source)} style={[styles.brief, n > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: SPACE.md }]}>
          <Text style={{ fontFamily: FONT.serifBold, fontSize: 18, lineHeight: 22, color: colors.accentInk, width: 22 }}>{n + 1}</Text>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ fontFamily: FONT.headline, fontSize: 15.5, lineHeight: 20, color: colors.ink }}>{b.headline}</Text>
            <Text style={{ fontFamily: FONT.serif, fontSize: 14, lineHeight: 20, color: colors.inkSoft }}>{b.text}</Text>
            <Text variant="meta" color="inkFaint">{`${b.source.outlet} ›`}</Text>
          </View>
        </Pressable>
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
  const [lead, ...rest] = edition.articles;
  if (!lead) return null;
  // On a wide screen the other stories sit under the lead, two to a row, with the briefs down the side.
  const perRow = narrow ? 1 : 2;
  const more = rest.length > 0 && (
    <View style={{ gap: SPACE.lg }}>
      <Heading>More in today&apos;s paper</Heading>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -SPACE.lg, rowGap: SPACE.xl }}>
        {rest.map((a, n) => (
          <View key={a.slug} style={[{ width: `${100 / perRow}%`, paddingHorizontal: SPACE.lg }, perRow > 1 && n % perRow > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.line }]}>
            <StoryBlock edition={edition} article={a} />
          </View>
        ))}
      </View>
    </View>
  );
  const briefs = edition.briefs.length > 0 && <Briefs briefs={edition.briefs} />;
  return (
    <View style={{ gap: SPACE.xxl }}>
      <View style={{ gap: SPACE.lg, marginTop: -SPACE.md }}>
        <Folio edition={edition} />
        {wide ? (
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 40 }}>
            <View style={{ flex: 2, gap: SPACE.xxl }}>
              <Lead edition={edition} article={lead} />
              {more}
            </View>
            {briefs && <View style={{ flex: 1, paddingLeft: 40, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.line }}>{briefs}</View>}
          </View>
        ) : (
          <View style={{ gap: SPACE.xxl }}>
            <Lead edition={edition} article={lead} />
            {more}
            {briefs}
          </View>
        )}
      </View>

      <Text variant="meta" color="inkFaint" style={{ textAlign: "center" }}>
        Every story in this paper is written by AI from the publishers&apos; own reporting, which each one lists and links.
      </Text>
    </View>
  );
}

/** One story in full, in a single column of large type, then its sources and the rest of the paper. */
export function ArticlePage({ edition, article }: { edition: Edition; article: EditionArticle }) {
  const { colors } = useTheme();
  const narrow = useWindowDimensions().width < NARROW;
  const size = narrow ? 30 : 40;
  // The pull quote sits after the second paragraph, in long enough stories.
  const pullAt = article.pullQuote && article.paragraphs.length >= 4 ? 2 : -1;
  const others = edition.articles.filter((a) => a.slug !== article.slug);
  return (
    <View style={{ width: "100%", maxWidth: READING_WIDTH, alignSelf: "center", gap: SPACE.xxl }}>
      <View style={{ gap: SPACE.md }}>
        <Text variant="meta" color="inkSoft">{`No. ${edition.issue}  ·  ${dateLine(edition.date)}`}</Text>
        <Kicker article={article} />
        <Text accessibilityRole="header" style={{ fontFamily: FONT.serifBold, fontSize: size, lineHeight: size * 1.12, letterSpacing: -0.5, color: colors.ink }}>
          {article.headline}
        </Text>
        <Text style={{ fontFamily: FONT.serif, fontSize: narrow ? 18 : 20, lineHeight: narrow ? 26 : 29, color: colors.inkSoft }}>{article.dek}</Text>
        <View style={[styles.byline, { borderColor: colors.line }]}>
          <Text variant="meta" color="inkSoft" style={{ fontFamily: FONT.sansMedium, flexShrink: 1 }}>
            {credit(article)}
          </Text>
          <Text variant="meta" color="inkFaint">{`${article.readMinutes} min read`}</Text>
        </View>
      </View>

      <View style={{ gap: SPACE.xl }}>
        {article.paragraphs.map((p, n) => (
          <View key={n} style={{ gap: SPACE.xl }}>
            <Text style={{ fontFamily: FONT.serif, fontSize: narrow ? 17.5 : 19, lineHeight: narrow ? 29 : 32, color: colors.ink }}>{p.text}</Text>
            {n + 1 === pullAt && (
              <View style={[styles.pull, { borderLeftColor: colors.accent }]}>
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
        <Text variant="meta" color="inkFaint" style={{ marginTop: SPACE.sm }}>
          This story was written by AI from the reporting above. A checker removes any sentence whose numbers or quotations aren&apos;t in its sources.
        </Text>
      </View>

      {others.length > 0 && (
        <View style={{ gap: SPACE.md }}>
          <Heading>More in this paper</Heading>
          {others.map((a) => (
            <Link key={a.slug} href={articleHref(edition.date, a.slug)} asChild>
              <Pressable accessibilityRole="link" style={StyleSheet.flatten([styles.entry, { borderBottomColor: colors.line }])}>
                <Kicker article={a} />
                <Text variant="title" style={{ fontSize: 17, lineHeight: 22 }}>
                  {a.headline}
                </Text>
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
      <Heading>Back issues</Heading>
      {earlier.map((e) => (
        <Link key={e.date} href={`/issue/${e.date}` as Href} asChild>
          <Pressable accessibilityRole="link" style={StyleSheet.flatten([styles.entry, { borderBottomColor: colors.line }])}>
            <Text variant="meta">{`No. ${e.issue}  ·  ${dateLine(e.date)}`}</Text>
            <Text variant="title">{e.headline}</Text>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  folio: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: SPACE.md },
  folioText: { fontFamily: FONT.sansBold, fontSize: 10.5, letterSpacing: 0.9, textTransform: "uppercase", flexShrink: 1 },
  brief: { flexDirection: "row", alignItems: "flex-start", gap: SPACE.sm },
  byline: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: SPACE.sm, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: SPACE.sm, marginTop: SPACE.xs },
  pull: { borderLeftWidth: 3, paddingLeft: SPACE.lg, paddingVertical: SPACE.xs },
  entry: { gap: 4, paddingVertical: SPACE.md, borderBottomWidth: StyleSheet.hairlineWidth },
});

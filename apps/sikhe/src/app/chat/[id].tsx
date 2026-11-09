import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View, type ScrollViewInstance } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Composer, FollowUps, PassageCard, Progress, Prose, Question } from "@/components/Chat";
import { ShabadMeta } from "@/components/Gurbani";
import { Text } from "@/components/Text";
import { Button } from "@/components/ui";
import type { Shabad, Verse } from "@/lib/api";
import { ASK_STEPS, chatTitle, DISCUSS_STEPS, isAnswer, SHABAD_STARTERS, useChats, type Chat, type Turn } from "@/lib/ask";
import { isHeading, useShabad } from "@/lib/gurbani";
import { englishOf } from "@/lib/shabad";
import { useTheme } from "@/theme/theme";
import { RADIUS, READING_WIDTH, SPACE } from "@/theme/tokens";

const openVerse = (shabadId: number, verseId: number) => router.push({ pathname: "/shabad/[id]", params: { id: String(shabadId), verse: String(verseId) } });

/** Line numbers as the discussion uses them: lines of text, not headings. */
function lineNumbers(shabad: Shabad | undefined): Map<number, { n: number; verse: Verse }> {
  const map = new Map<number, { n: number; verse: Verse }>();
  let n = 0;
  for (const v of shabad?.verses ?? []) if (!isHeading(v)) map.set(v.verseId, { n: ++n, verse: v });
  return map;
}

function Answer({ chat, turn, shabad, last }: { chat: Chat; turn: Turn; shabad?: Shabad; last: boolean }) {
  const { colors } = useTheme();
  const { send, retry } = useChats();
  const busy = chat.turns.some((t) => t.status === "pending");

  if (turn.status === "pending") return <Progress steps={chat.shabadId ? DISCUSS_STEPS : ASK_STEPS} current={turn.stage} />;
  if (turn.status === "error" || !turn.result) {
    return (
      <View style={{ gap: SPACE.sm, alignItems: "flex-start" }}>
        <Text variant="small" color="danger">
          {turn.error ?? "Something went wrong."}
        </Text>
        {last && <Button label="Try again" icon="refresh" kind="quiet" onPress={() => retry(chat.id)} />}
      </View>
    );
  }

  const result = turn.result;
  if (isAnswer(result)) {
    const index = new Map(result.passages.map((p, i) => [p.verseId, i + 1]));
    // A chip for any line of a cited passage points at that passage.
    for (const [i, p] of result.passages.entries()) for (const l of p.lines) if (!index.has(l.verseId)) index.set(l.verseId, i + 1);
    const cite = (verseId: number) => {
      const p = result.passages.find((x) => x.lines.some((l) => l.verseId === verseId));
      if (p) openVerse(p.shabadId, verseId);
    };
    return (
      <View style={{ gap: SPACE.lg }}>
        {result.sourceLabel && (
          <View style={[styles.note, { backgroundColor: colors.sunken }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.inkSoft} />
            <Text variant="meta" style={{ flex: 1 }}>
              {result.sourceLabel}
            </Text>
          </View>
        )}
        <Prose segments={result.summary} label={(v) => index.get(v)} onCite={cite} />
        {result.passages.length > 0 && (
          <View style={{ gap: SPACE.md }}>
            <Text variant="label">From Gurbani</Text>
            {result.passages.map((p, i) => (
              <PassageCard key={p.verseId} passage={p} n={i + 1} />
            ))}
          </View>
        )}
        {result.sections.map((s) => (
          <View key={s.title} style={{ gap: SPACE.sm }}>
            <Text variant="title" accessibilityRole="header">
              {s.title}
            </Text>
            <Prose segments={s.segments} label={(v) => index.get(v)} onCite={cite} />
          </View>
        ))}
        {last && <FollowUps items={result.followUps} onPick={(q) => send(chat.id, q)} disabled={busy} />}
      </View>
    );
  }

  // A reply about one shabad: chips are its line numbers.
  const lines = lineNumbers(shabad);
  const cited = result.citedVerseIds.map((id) => lines.get(id)).filter((x) => x !== undefined);
  return (
    <View style={{ gap: SPACE.lg }}>
      <Prose segments={result.reply} label={(v) => lines.get(v)?.n} onCite={(v) => openVerse(chat.shabadId!, v)} />
      {cited.length > 0 && (
        <View style={{ gap: SPACE.sm }}>
          {cited.map(({ n, verse }) => (
            <Pressable
              key={verse.verseId}
              onPress={() => openVerse(chat.shabadId!, verse.verseId)}
              accessibilityRole="link"
              style={[styles.line, { borderLeftColor: colors.accent }]}
            >
              <Text variant="meta" color="accentInk">
                Line {n}
              </Text>
              <Text variant="gurmukhi" style={{ fontSize: 19, lineHeight: 32 }}>
                {verse.gurmukhi}
              </Text>
              <Text variant="small">{englishOf(verse)}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {last && <FollowUps items={result.followUps} onPick={(q) => send(chat.id, q)} disabled={busy} />}
    </View>
  );
}

/** The shabad a conversation is about, at the top. */
function ShabadHeader({ shabad }: { shabad: Shabad }) {
  const { colors } = useTheme();
  const opening = shabad.verses.filter((v) => !isHeading(v)).slice(0, 2);
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/shabad/[id]", params: { id: String(shabad.shabadId) } })}
      accessibilityRole="link"
      accessibilityHint="Opens the whole shabad"
      style={[styles.shabad, { backgroundColor: colors.accentWash }]}
    >
      <ShabadMeta shabad={shabad} />
      {opening.map((v) => (
        <Text key={v.verseId} variant="gurmukhi" style={{ fontSize: 19, lineHeight: 32 }}>
          {v.gurmukhi}
        </Text>
      ))}
      <Text variant="button" color="accentInk">
        Read the whole shabad ›
      </Text>
    </Pressable>
  );
}

export default function ChatScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string; draft?: string }>();
  const { ready, get, send, remove } = useChats();
  const chat = get(params.id);
  const { data } = useShabad(chat?.shabadId ?? 0);
  const shabad = data?.shabad;
  const scroll = useRef<ScrollViewInstance>(null);
  const busy = chat?.turns.some((t) => t.status === "pending") ?? false;
  const turns = chat?.turns.length ?? 0;

  // Keep the newest question in view as it is asked and answered.
  useEffect(() => {
    const t = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [turns]);

  const back = () => (router.canGoBack() ? router.back() : router.replace("/ask"));

  if (ready && !chat) {
    return (
      <View style={[styles.fill, { backgroundColor: colors.bg, paddingTop: insets.top + SPACE.xl, alignItems: "center", gap: SPACE.lg }]}>
        <Text variant="body">This conversation isn't on this device.</Text>
        <Button label="Back to Ask" onPress={() => router.replace("/ask")} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={[styles.fill, { backgroundColor: colors.bg }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.bar, { paddingTop: insets.top + SPACE.sm, borderBottomColor: colors.line }]}>
        <View style={[styles.column, styles.barInner]}>
          <Pressable onPress={back} accessibilityRole="button" accessibilityLabel="Back" hitSlop={10} style={{ flexDirection: "row", alignItems: "center", marginLeft: -6 }}>
            <Ionicons name="chevron-back" size={22} color={colors.accentInk} />
            <Text variant="body" color="accentInk">
              Back
            </Text>
          </Pressable>
          <Text variant="meta" numberOfLines={1} style={{ flex: 1, textAlign: "center" }}>
            {chat?.shabadId ? "About a shabad" : turns ? chatTitle(chat!) : "New conversation"}
          </Text>
          <Pressable
            onPress={() => {
              if (chat) remove(chat.id);
              back();
            }}
            disabled={!chat}
            accessibilityRole="button"
            accessibilityLabel="Delete this conversation"
            hitSlop={10}
          >
            <Ionicons name="trash-outline" size={20} color={colors.inkSoft} />
          </Pressable>
        </View>
      </View>

      <ScrollView ref={scroll} style={styles.fill} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.column, { gap: SPACE.xl }]}>
          {shabad && <ShabadHeader shabad={shabad} />}
          {chat && turns === 0 && (
            <View style={{ gap: SPACE.md }}>
              <Text variant="small">{chat.shabadId ? "Ask anything about this shabad: what it means, a word, a line, or how to live it." : "Ask your question below."}</Text>
              {chat.shabadId && <FollowUps items={SHABAD_STARTERS} onPick={(q) => send(chat.id, q)} />}
            </View>
          )}
          {chat?.turns.map((t, i) => (
            <View key={t.id} style={{ gap: SPACE.lg }}>
              <Question text={t.question} />
              <Answer chat={chat} turn={t} shabad={shabad} last={i === turns - 1} />
            </View>
          ))}
          {chat?.turns.some((t) => t.result?.attribution) && (
            <Text variant="meta" color="inkFaint" style={{ fontSize: 11 }}>
              {chat.turns.find((t) => t.result?.attribution)!.result!.attribution} Answers are written by AI and can be wrong; check what matters with your sangat.
            </Text>
          )}
        </View>
      </ScrollView>

      <View style={[styles.composerBar, { paddingBottom: Math.max(insets.bottom, SPACE.md), backgroundColor: colors.bg, borderTopColor: colors.line }]}>
        <View style={styles.column}>
          {chat && (
            <Composer
              key={chat.id}
              initial={params.draft ?? ""}
              autoFocus={Boolean(params.draft)}
              disabled={busy}
              placeholder={chat.shabadId ? "Ask about this shabad" : turns ? "Ask a follow-up" : "Ask a question"}
              onSend={(q) => send(chat.id, q)}
            />
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  column: { width: "100%", maxWidth: READING_WIDTH, alignSelf: "center" },
  bar: { paddingHorizontal: SPACE.xl - 4, paddingBottom: SPACE.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  barInner: { flexDirection: "row", alignItems: "center", gap: SPACE.md },
  content: { paddingHorizontal: SPACE.xl - 4, paddingVertical: SPACE.xl },
  composerBar: { paddingHorizontal: SPACE.lg, paddingTop: SPACE.sm, borderTopWidth: StyleSheet.hairlineWidth },
  note: { flexDirection: "row", gap: SPACE.sm, alignItems: "flex-start", padding: SPACE.md, borderRadius: RADIUS.md },
  shabad: { gap: SPACE.sm, padding: SPACE.lg, borderRadius: RADIUS.lg },
  line: { gap: 2, paddingLeft: SPACE.md, borderLeftWidth: 3 },
});

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Fragment, useState, type ReactNode } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import type { Passage, Segment, Stage } from "@/lib/ask";
import { useLibrary } from "@/lib/library";
import { useTheme } from "@/theme/theme";
import { FONT, RADIUS, SPACE } from "@/theme/tokens";
import { Text } from "./Text";

const openVerse = (shabadId: number, verseId: number) => router.push({ pathname: "/shabad/[id]", params: { id: String(shabadId), verse: String(verseId) } });

/**
 * Model-written prose with its [[verse:ID]] markers as small numbered chips.
 * Handles the little Markdown the model writes: paragraphs, lists, headings,
 * bold and italics. Anything else shows as plain text.
 */
export function Prose({ segments, label, onCite }: { segments: Segment[]; label: (verseId: number) => number | undefined; onCite: (verseId: number) => void }) {
  // Citations become placeholders so they survive the Markdown pass.
  const text = segments.map((s) => (s.type === "text" ? s.text : `\u0000${s.verseId}\u0000`)).join("");
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <View style={{ gap: SPACE.md }}>
      {blocks.map((block, n) => {
        const lines = block.split("\n").filter((l) => l.trim());
        const heading = /^#{1,4}\s+/.exec(lines[0] ?? "");
        if (heading && lines.length === 1) {
          return (
            <Text key={n} variant="title" accessibilityRole="header">
              <Inline text={lines[0]!.slice(heading[0].length)} label={label} onCite={onCite} />
            </Text>
          );
        }
        const listItem = /^\s*(?:[-*•]|\d+[.)])\s+/;
        if (lines.length > 0 && lines.every((l) => listItem.test(l))) {
          return (
            <View key={n} style={{ gap: SPACE.xs }}>
              {lines.map((l, i) => {
                const marker = /^\s*(\d+)[.)]/.exec(l)?.[1];
                return (
                  <View key={i} style={{ flexDirection: "row", gap: SPACE.sm }}>
                    <Text variant="body" color="accentInk" style={{ minWidth: 16 }}>
                      {marker ? `${marker}.` : "•"}
                    </Text>
                    <Text variant="body" style={{ flex: 1 }}>
                      <Inline text={l.replace(listItem, "")} label={label} onCite={onCite} />
                    </Text>
                  </View>
                );
              })}
            </View>
          );
        }
        return (
          <Text key={n} variant="body">
            <Inline text={lines.join(" ")} label={label} onCite={onCite} />
          </Text>
        );
      })}
    </View>
  );
}

function Inline({ text, label, onCite }: { text: string; label: (verseId: number) => number | undefined; onCite: (verseId: number) => void }) {
  const { colors } = useTheme();
  const out: ReactNode[] = [];
  // Bold, italics and citation placeholders, in the order they appear.
  const pattern = /\*\*(.+?)\*\*|__(.+?)__|\*([^*\s][^*]*?)\*|\b_([^_\s][^_]*?)_\b|\u0000(\d+)\u0000/g;
  let last = 0;
  for (const m of text.matchAll(pattern)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${m.index}`;
    if (m[1] ?? m[2]) out.push(<Text key={key} style={{ fontFamily: FONT.serifBold }}>{m[1] ?? m[2]}</Text>);
    else if (m[3] ?? m[4]) out.push(<Text key={key} style={{ fontStyle: "italic" }}>{m[3] ?? m[4]}</Text>);
    else {
      const verseId = Number(m[5]);
      const n = label(verseId);
      if (n !== undefined) {
        out.push(
          <Fragment key={key}>
            {"\u00a0"}
            <Text
              onPress={() => onCite(verseId)}
              accessibilityRole="link"
              accessibilityLabel={`Source ${n}`}
              style={[styles.cite, { backgroundColor: colors.accentWash, color: colors.accentInk }]}
            >
              {`\u00a0${n}\u00a0`}
            </Text>
          </Fragment>,
        );
      }
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

/** A cited passage of Gurbani, numbered to match the chips in the answer. */
export function PassageCard({ passage, n }: { passage: Passage; n: number }) {
  const { colors } = useTheme();
  const { prefs } = useLibrary();
  return (
    <Pressable
      onPress={() => openVerse(passage.shabadId, passage.verseId)}
      accessibilityRole="link"
      accessibilityHint="Opens the whole shabad"
      style={({ pressed }) => [styles.passage, { backgroundColor: colors.surface, borderColor: colors.line, opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: SPACE.sm }}>
        <View style={[styles.badge, { backgroundColor: colors.accentWash }]}>
          <Text variant="meta" color="accentInk" style={{ fontFamily: FONT.sansBold }}>
            {n}
          </Text>
        </View>
        <Text variant="meta" style={{ flex: 1 }} numberOfLines={1}>
          {[`Ang ${passage.ang}`, passage.writer?.english, passage.raag?.english].filter(Boolean).join(" · ")}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
      </View>
      <View style={{ gap: SPACE.sm }}>
        {passage.lines.map((l) => (
          <View key={l.verseId} style={{ gap: 2 }}>
            <Text variant="gurmukhi" style={{ fontSize: 20, lineHeight: 34 }}>
              {l.gurmukhi}
            </Text>
            {prefs.transliteration && l.transliteration && (
              <Text variant="small" color="inkSoft" style={{ fontStyle: "italic" }}>
                {l.transliteration}
              </Text>
            )}
            {l.translation && <Text variant="small">{l.translation.text}</Text>}
          </View>
        ))}
      </View>
      {passage.relevanceNote ? (
        <Text variant="meta" color="inkFaint">
          {passage.relevanceNote}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** What the server is doing, step by step. */
export function Progress({ steps, current }: { steps: { stage: Stage; label: string }[]; current: Stage | null }) {
  const { colors } = useTheme();
  const at = Math.max(0, current ? steps.findIndex((s) => s.stage === current) : 0);
  return (
    <View style={{ gap: SPACE.sm }} accessibilityLiveRegion="polite">
      {steps.map((s, i) => {
        const state = i < at ? "done" : i === at ? "active" : "todo";
        return (
          <View key={s.stage} style={{ flexDirection: "row", alignItems: "center", gap: SPACE.sm }}>
            <View style={{ width: 18, alignItems: "center" }}>
              {state === "done" ? (
                <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
              ) : state === "active" ? (
                <ActivityIndicator size="small" color={colors.accent} style={{ transform: [{ scale: 0.75 }] }} />
              ) : (
                <View style={[styles.todo, { borderColor: colors.line }]} />
              )}
            </View>
            <Text variant="small" color={state === "todo" ? "inkFaint" : "ink"}>
              {s.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** The reader's question, on the right like a message they sent. */
export function Question({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.question, { backgroundColor: colors.accentWash }]}>
      <Text variant="body">{text}</Text>
    </View>
  );
}

/** Suggested next questions. */
export function FollowUps({ items, onPick, disabled }: { items: string[]; onPick: (q: string) => void; disabled?: boolean }) {
  const { colors } = useTheme();
  if (!items.length) return null;
  return (
    <View style={{ gap: SPACE.sm }}>
      {items.map((f) => (
        <Pressable
          key={f}
          disabled={disabled}
          onPress={() => onPick(f)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.followUp, { borderColor: colors.line, backgroundColor: pressed ? colors.sunken : "transparent", opacity: disabled ? 0.5 : 1 }]}
        >
          <Ionicons name="return-down-forward" size={16} color={colors.accentInk} />
          <Text variant="small" color="ink" style={{ flex: 1 }}>
            {f}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Where the reader types. Enter sends on the web; Shift+Enter adds a line. */
export function Composer({
  onSend,
  disabled,
  placeholder = "Ask a question",
  initial = "",
  autoFocus,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  initial?: string;
  autoFocus?: boolean;
}) {
  const { colors } = useTheme();
  const [text, setText] = useState(initial);
  // The web box doesn't grow by itself, so it follows its content, up to six lines.
  const [height, setHeight] = useState(40);
  const canSend = !disabled && text.trim().length >= 3;
  const send = () => {
    if (!canSend) return;
    onSend(text.trim());
    setText("");
  };
  return (
    <View style={[styles.composer, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkFaint}
        multiline
        // A one-line box on the web; it scrolls once the question is longer.
        numberOfLines={Platform.OS === "web" ? 1 : undefined}
        maxLength={500}
        autoFocus={autoFocus}
        accessibilityLabel="Your question"
        onContentSizeChange={(e) => setHeight(Math.min(140, Math.max(40, Math.ceil(e.nativeEvent.contentSize.height))))}
        style={[styles.input, { color: colors.ink }, Platform.OS === "web" && ({ outlineStyle: "none", height } as object)]}
        onKeyPress={(e) => {
          const ev = e.nativeEvent as unknown as { key: string; shiftKey?: boolean };
          if (Platform.OS === "web" && ev.key === "Enter" && !ev.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
      />
      <Pressable
        onPress={send}
        disabled={!canSend}
        accessibilityRole="button"
        accessibilityLabel="Send"
        style={[styles.send, { backgroundColor: canSend ? colors.accent : colors.sunken }]}
      >
        <Ionicons name="arrow-up" size={20} color={canSend ? colors.onAccent : colors.inkFaint} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  cite: { fontFamily: FONT.sansBold, fontSize: 12, borderRadius: 6, overflow: "hidden" },
  passage: { gap: SPACE.md, padding: SPACE.lg, borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth },
  badge: { minWidth: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  todo: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5 },
  question: { alignSelf: "flex-end", maxWidth: "88%", paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md, borderRadius: RADIUS.lg, borderBottomRightRadius: 6 },
  followUp: { flexDirection: "row", alignItems: "center", gap: SPACE.sm, paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm + 2, borderRadius: RADIUS.md, borderWidth: StyleSheet.hairlineWidth },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: SPACE.sm, padding: SPACE.sm, paddingLeft: SPACE.lg, borderRadius: 24, borderWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, fontFamily: FONT.sans, fontSize: 16, lineHeight: 22, minHeight: 40, maxHeight: 140, paddingTop: 9, paddingBottom: 9 },
  send: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});

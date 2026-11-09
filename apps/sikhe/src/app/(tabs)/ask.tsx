import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { Composer } from "@/components/Chat";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Card, Divider, Section } from "@/components/ui";
import { chatTitle, STARTERS, useAskAvailable, useChats, type Chat } from "@/lib/ask";
import { timeAgo } from "@/lib/stories";
import { useTheme } from "@/theme/theme";
import { RADIUS, SPACE } from "@/theme/tokens";

function ChatRow({ chat }: { chat: Chat }) {
  const { colors } = useTheme();
  const pending = chat.turns.some((t) => t.status === "pending");
  return (
    <Link href={{ pathname: "/chat/[id]", params: { id: chat.id } }} asChild>
      <Pressable accessibilityRole="link" style={styles.row}>
        <Ionicons name={chat.shabadId ? "book-outline" : "chatbubble-outline"} size={18} color={colors.accentInk} style={{ marginTop: 3 }} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="body" numberOfLines={2}>
            {chatTitle(chat)}
          </Text>
          <Text variant="meta">
            {[chat.shabadId ? "About a shabad" : null, `${chat.turns.length} ${chat.turns.length === 1 ? "question" : "questions"}`, pending ? "Answering…" : timeAgo(chat.updatedAt)]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}

export default function AskScreen() {
  const { colors } = useTheme();
  const { chats, start } = useChats();
  const { data: health } = useAskAvailable();
  const off = health && !health.ai;

  const ask = (question: string) => {
    const id = start(undefined, question);
    router.push({ pathname: "/chat/[id]", params: { id } });
  };

  return (
    <Screen masthead width={860} title="Ask" kicker="Questions on Gurbani, history and Sikh life">
      <View style={{ gap: SPACE.md }}>
        <Text variant="body" color="inkSoft">
          Ask about Gurbani, Sikh history or living as a Sikh. Every quote of Gurbani comes from BaniDB, and every citation is checked before you see it.
        </Text>
        {off ? (
          <Card>
            <Text variant="small">Ask isn't available right now. Search, the Hukamnama and everything else still work.</Text>
          </Card>
        ) : (
          <Composer onSend={ask} />
        )}
      </View>

      {!off && (
        <Section title="Try asking">
          <View style={{ gap: SPACE.sm }}>
            {STARTERS.map((q) => (
              <Pressable
                key={q}
                onPress={() => ask(q)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.starter, { backgroundColor: pressed ? colors.sunken : colors.surface, borderColor: colors.line }]}
              >
                <Text variant="small" color="ink" style={{ flex: 1 }}>
                  {q}
                </Text>
                <Ionicons name="arrow-forward" size={16} color={colors.inkFaint} />
              </Pressable>
            ))}
          </View>
        </Section>
      )}

      {chats.length > 0 && (
        <Section title="Your conversations">
          <Card>
            {chats.map((c, n) => (
              <View key={c.id} style={{ gap: SPACE.md }}>
                {n > 0 && <Divider />}
                <ChatRow chat={c} />
              </View>
            ))}
          </Card>
          <Text variant="meta" color="inkFaint">
            Kept on this device only.
          </Text>
        </Section>
      )}

      <Text variant="meta" color="inkFaint">
        Sikhe is a learning guide, not a Granthi or a religious authority. Answers are written by AI from the Gurbani it finds; for matters of rehat and practice, speak with your sangat and Granthi Singhs.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: SPACE.md, alignItems: "flex-start" },
  starter: { flexDirection: "row", alignItems: "center", gap: SPACE.sm, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md, borderRadius: RADIUS.md, borderWidth: StyleSheet.hairlineWidth },
});

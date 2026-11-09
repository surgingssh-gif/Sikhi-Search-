import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { ArticleRow, CollectionCarousel, EventRow } from "@/components/History";
import { Screen } from "@/components/Screen";
import { SearchBox, useDebounced } from "@/components/SearchBox";
import { Text } from "@/components/Text";
import { Card, Chip, Divider, ErrorState, Loading, Section } from "@/components/ui";
import { friendlyError, localDate, useHistoryAround } from "@/lib/api";
import { anniversaryLabel, useHistoryCollections, useHistorySearch } from "@/lib/history";
import { useTheme } from "@/theme/theme";
import { SPACE } from "@/theme/tokens";

const SUGGESTIONS = ["Saragarhi", "Ghadar", "Stockton gurdwara", "Hari Singh Nalwa", "Anandpur Sahib", "Komagata Maru"];

function Results({ query }: { query: string }) {
  const { data, error, isPending, isFetching, refetch } = useHistorySearch(query);
  if (query.trim().length < 2) return null;
  if (isPending) return <Loading />;
  if (error) return <ErrorState message={friendlyError(error)} onRetry={() => refetch()} />;
  if (!data.events.length && !data.articles.length) return <Text variant="small">Nothing found. Try a name, a place or a battle.</Text>;
  return (
    <>
      {data.events.length > 0 && (
        <Section title="From the Sikhe timeline">
          <Card>
            {data.events.map((e, n) => (
              <View key={e.id} style={{ gap: SPACE.md }}>
                {n > 0 && <Divider />}
                <EventRow event={e} />
              </View>
            ))}
          </Card>
        </Section>
      )}
      {data.articles.length > 0 && (
        <Section title={isFetching ? "From Wikipedia · searching…" : "From Wikipedia"}>
          <Card>
            {data.articles.map((a, n) => (
              <View key={a.title} style={{ gap: SPACE.md }}>
                {n > 0 && <Divider />}
                <ArticleRow item={a} />
              </View>
            ))}
          </Card>
          <Text variant="meta" color="inkFaint" style={{ fontSize: 11 }}>
            {data.attribution}
          </Text>
        </Section>
      )}
    </>
  );
}

/** Anniversaries in the week ahead, from our own timeline. */
function ThisWeek() {
  const today = localDate();
  const { data } = useHistoryAround(today, 0, 6);
  if (!data?.events.length) return null;
  return (
    <Section title="This week in Sikh history">
      <Card featured>
        {data.events.slice(0, 3).map((e, n) => (
          <View key={e.id} style={{ gap: SPACE.md }}>
            {n > 0 && <Divider />}
            <EventRow
              event={e}
              when={anniversaryLabel(e, today)}
            />
          </View>
        ))}
      </Card>
    </Section>
  );
}

function TimelineLink() {
  const { colors } = useTheme();
  return (
    <Link href="/timeline" asChild>
      <Pressable accessibilityRole="link" style={{ flexDirection: "row", alignItems: "center", gap: SPACE.md, padding: SPACE.lg, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 0.5, borderColor: colors.line }}>
        <Ionicons name="git-commit-outline" size={24} color={colors.accentInk} />
        <View style={{ flex: 1 }}>
          <Text variant="title">The timeline</Text>
          <Text variant="meta">From Guru Nanak Dev Ji in 1469 to the Panth today, era by era.</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
      </Pressable>
    </Link>
  );
}

export default function HistoryScreen() {
  const [query, setQuery] = useState("");
  const settled = useDebounced(query);
  const { data, error, isPending, refetch } = useHistoryCollections();
  const searching = query.trim().length > 0;

  return (
    <Screen title="History">
      <View style={{ gap: SPACE.sm }}>
        <SearchBox value={query} onChange={setQuery} placeholder="Search Sikh history: a Guru, a battle, a place" label="Search Sikh history" />
        {!searching && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACE.sm }}>
            {SUGGESTIONS.map((s) => (
              <Chip key={s} label={s} onPress={() => setQuery(s)} />
            ))}
          </View>
        )}
      </View>

      {searching ? (
        <Results query={settled} />
      ) : (
        <>
          <ThisWeek />
          <TimelineLink />
          {isPending ? (
            <Loading />
          ) : error ? (
            <ErrorState message={friendlyError(error)} onRetry={() => refetch()} />
          ) : (
            <>
              {data.collections.map((c) => (
                <CollectionCarousel key={c.id} collection={c} />
              ))}
              <Text variant="meta" color="inkFaint" style={{ fontSize: 11 }}>
                {data.attribution}
              </Text>
            </>
          )}
        </>
      )}
    </Screen>
  );
}

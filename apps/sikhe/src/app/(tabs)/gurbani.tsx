import { Ionicons } from "@expo/vector-icons";
import { Link, router, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Screen } from "@/components/Screen";
import { SearchBox, useDebounced } from "@/components/SearchBox";
import { Text } from "@/components/Text";
import { Card, Chip, Divider, ErrorState, Loading, Section } from "@/components/ui";
import { friendlyError, useHukamnama } from "@/lib/api";
import { baniTitle, guessMode, LAST_ANG, NITNEM, NITNEM_TIME, useBanis, useGurbaniSearch, type GurbaniSearchMode, type SearchHit } from "@/lib/gurbani";
import { useLibrary } from "@/lib/library";
import { englishOf } from "@/lib/shabad";
import { useTheme } from "@/theme/theme";
import { FONT, RADIUS, SPACE } from "@/theme/tokens";

const MODES: { id: GurbaniSearchMode; label: string; hint: string }[] = [
  { id: "first-letters", label: "First letters", hint: "The first letter of each word, in Gurmukhi or Gurbani Akhar keys: skmk finds ਸਭ ਕੀਮਤਿ ਮਿਲਿ ਕੀਮਤਿ." },
  { id: "words", label: "Gurmukhi words", hint: "Whole words in Gurmukhi, such as ਸਤਿ ਨਾਮੁ." },
  { id: "meaning", label: "English meaning", hint: "Words from the English translation, such as peace of mind." },
];

/** A row that opens a page: title, a line under it and a chevron. */
function LinkRow({ href, title, subtitle, gurmukhi }: { href: Href; title: string; subtitle?: string; gurmukhi?: string }) {
  const { colors } = useTheme();
  return (
    <Link href={href} asChild>
      <Pressable accessibilityRole="link" style={styles.linkRow}>
        <View style={{ flex: 1, gap: 2 }}>
          {gurmukhi && <Text style={{ fontFamily: FONT.gurmukhi, fontSize: 18, lineHeight: 30, color: colors.ink }}>{gurmukhi}</Text>}
          <Text variant={gurmukhi ? "meta" : "body"} color={gurmukhi ? "inkSoft" : "ink"}>
            {title}
          </Text>
          {subtitle && <Text variant="meta">{subtitle}</Text>}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
      </Pressable>
    </Link>
  );
}

function SearchResults({ query, mode }: { query: string; mode: GurbaniSearchMode }) {
  const { data, error, isPending, isFetching, refetch } = useGurbaniSearch(query, mode);
  const ang = /^\d{1,4}$/.test(query.trim()) ? Number(query.trim()) : null;
  return (
    <View style={{ gap: SPACE.md }}>
      {ang !== null && ang >= 1 && ang <= LAST_ANG && (
        <Card>
          <LinkRow href={`/ang/${ang}`} title={`Go to Ang ${ang}`} subtitle="Sri Guru Granth Sahib Ji" />
        </Card>
      )}
      {ang === null &&
        (isPending ? (
          <Loading />
        ) : error ? (
          <ErrorState message={friendlyError(error)} onRetry={() => refetch()} />
        ) : !data.hits.length ? (
          <Text variant="small">Nothing found. Try another search type below the box.</Text>
        ) : (
          <>
            <Text variant="meta">
              {data.totalResults} {data.totalResults === 1 ? "line" : "lines"}
              {data.totalResults > data.hits.length ? `, showing the first ${data.hits.length}` : ""}
              {isFetching ? " · searching…" : ""}
            </Text>
            <Card>
              {data.hits.map((hit, n) => (
                <View key={hit.verse.verseId} style={{ gap: SPACE.md }}>
                  {n > 0 && <Divider />}
                  <SearchHitRow hit={hit} />
                </View>
              ))}
            </Card>
          </>
        ))}
    </View>
  );
}

function SearchHitRow({ hit }: { hit: SearchHit }) {
  const { colors } = useTheme();
  return (
    <Link href={{ pathname: "/shabad/[id]", params: { id: String(hit.verse.shabadId), verse: String(hit.verse.verseId) } }} asChild>
      <Pressable accessibilityRole="link" style={{ gap: 4 }}>
        <Text style={{ fontFamily: FONT.gurmukhi, fontSize: 20, lineHeight: 34, color: colors.ink }}>{hit.verse.gurmukhi}</Text>
        <Text variant="small">{englishOf(hit.verse)}</Text>
        <Text variant="meta">{[hit.source.english, `Ang ${hit.verse.ang}`, hit.writer?.english].filter(Boolean).join(" · ")}</Text>
      </Pressable>
    </Link>
  );
}

export default function GurbaniScreen() {
  const { colors } = useTheme();
  const [query, setQuery] = useState("");
  const [chosenMode, setChosenMode] = useState<GurbaniSearchMode | null>(null);
  const settled = useDebounced(query);
  const mode = chosenMode ?? guessMode(query);
  const searching = query.trim().length >= 1;

  const { data: hukam } = useHukamnama();
  const { data: banis } = useBanis();
  const { saved } = useLibrary();
  const byId = new Map((banis?.banis ?? []).map((b) => [b.baniId, b]));
  const nitnem = NITNEM.map((id) => byId.get(id)).filter((b) => b !== undefined);
  const others = (banis?.banis ?? []).filter((b) => !NITNEM.includes(b.baniId));
  const today = hukam?.shabads[0];

  return (
    <Screen title="Gurbani">
      <View style={{ gap: SPACE.sm }}>
        <SearchBox value={query} onChange={setQuery} placeholder="Search Gurbani, or type an Ang number" label="Search Gurbani" />
        {searching && (
          <>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACE.sm }}>
              {MODES.map((m) => (
                <Chip key={m.id} label={m.label} active={m.id === mode} onPress={() => setChosenMode(m.id)} />
              ))}
            </View>
            <Text variant="meta">{MODES.find((m) => m.id === mode)!.hint}</Text>
          </>
        )}
      </View>

      {searching ? (
        <SearchResults query={settled} mode={mode} />
      ) : (
        <>
          {today && (
            <Card featured>
              <LinkRow href={`/shabad/${today.shabadId}`} title="Today's Hukamnama" subtitle={`Sri Darbar Sahib · Ang ${today.ang}`} />
            </Card>
          )}

          <Section title="Nitnem">
            <Card>
              {nitnem.length ? (
                nitnem.map((b, n) => (
                  <View key={b.baniId} style={{ gap: SPACE.md }}>
                    {n > 0 && <Divider />}
                    <LinkRow href={`/bani/${b.baniId}`} gurmukhi={b.gurmukhi} title={baniTitle(b)} subtitle={NITNEM_TIME[b.baniId]} />
                  </View>
                ))
              ) : (
                <Loading />
              )}
            </Card>
          </Section>

          <Section title="Sri Guru Granth Sahib Ji">
            <AngPicker />
          </Section>

          {saved.length > 0 && (
            <Section title="Saved shabads">
              <Card>
                {saved.map((s, n) => (
                  <View key={s.shabadId} style={{ gap: SPACE.md }}>
                    {n > 0 && <Divider />}
                    <LinkRow href={`/shabad/${s.shabadId}`} gurmukhi={s.gurmukhi} title={s.english} subtitle={[`Ang ${s.ang}`, s.writer].filter(Boolean).join(" · ")} />
                  </View>
                ))}
              </Card>
            </Section>
          )}

          {others.length > 0 && (
            <Section title="More banis">
              <Card>
                {others.map((b, n) => (
                  <View key={b.baniId} style={{ gap: SPACE.md }}>
                    {n > 0 && <Divider />}
                    <LinkRow href={`/bani/${b.baniId}`} gurmukhi={b.gurmukhi} title={baniTitle(b)} />
                  </View>
                ))}
              </Card>
            </Section>
          )}
        </>
      )}
    </Screen>
  );
}

/** Open any Ang by number, or a random one. */
function AngPicker() {
  const { colors } = useTheme();
  const [value, setValue] = useState("");
  const n = Number(value);
  const ok = Number.isInteger(n) && n >= 1 && n <= LAST_ANG;
  return (
    <Card>
      <Text variant="small">Read any of the {LAST_ANG} Angs, page by page.</Text>
      <View style={{ flexDirection: "row", gap: SPACE.sm, alignItems: "center" }}>
        <TextInput
          value={value}
          onChangeText={(t) => setValue(t.replace(/\D/g, "").slice(0, 4))}
          onSubmitEditing={() => ok && router.push(`/ang/${n}`)}
          placeholder="Ang"
          placeholderTextColor={colors.inkFaint}
          keyboardType="number-pad"
          returnKeyType="go"
          accessibilityLabel="Ang number"
          style={[styles.angInput, { color: colors.ink, backgroundColor: colors.sunken }]}
        />
        <Chip label="Open" active={ok} onPress={ok ? () => router.push(`/ang/${n}`) : undefined} />
        <Chip label="Ang 1" onPress={() => router.push("/ang/1")} />
        <Chip label="Random" onPress={() => router.push(`/ang/${1 + Math.floor(Math.random() * LAST_ANG)}`)} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  linkRow: { flexDirection: "row", alignItems: "center", gap: SPACE.md },
  angInput: { width: 80, fontSize: 16, fontFamily: FONT.sans, paddingVertical: SPACE.sm, paddingHorizontal: SPACE.md, borderRadius: RADIUS.sm },
});

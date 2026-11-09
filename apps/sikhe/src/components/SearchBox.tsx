import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useTheme } from "@/theme/theme";
import { FONT, RADIUS, SPACE } from "@/theme/tokens";

/** Waits until typing pauses before searching. */
export function useDebounced<T>(value: T, ms = 350): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return settled;
}

/** A search field with a clear button. Gurmukhi typed into it is shown in the Gurmukhi font. */
export function SearchBox({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <Ionicons name="search" size={18} color={colors.inkFaint} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.inkFaint}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel={label}
        style={[styles.input, { color: colors.ink, fontFamily: /[਀-੿]/.test(value) ? FONT.gurmukhi : FONT.sans }]}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChange("")} accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10}>
          <Ionicons name="close-circle" size={18} color={colors.inkFaint} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: "row", alignItems: "center", gap: SPACE.sm, borderWidth: StyleSheet.hairlineWidth, borderRadius: RADIUS.md, paddingHorizontal: SPACE.md },
  input: { flex: 1, fontSize: 16, paddingVertical: SPACE.md, outlineStyle: "none" } as never,
});

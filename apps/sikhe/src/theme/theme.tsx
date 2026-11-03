import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { DARK, LIGHT, type Colors } from "./tokens";

/** "system" follows the phone's own light or dark setting. */
export type Appearance = "system" | "light" | "dark";

interface Theme {
  colors: Colors;
  dark: boolean;
  appearance: Appearance;
  setAppearance: (a: Appearance) => void;
}

const KEY = "sikhe.appearance";
const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [appearance, setAppearanceState] = useState<Appearance>("system");

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => {
        if (v === "light" || v === "dark" || v === "system") setAppearanceState(v);
      })
      .catch(() => {});
  }, []);

  const theme = useMemo<Theme>(() => {
    const dark = appearance === "system" ? system === "dark" : appearance === "dark";
    return {
      colors: dark ? DARK : LIGHT,
      dark,
      appearance,
      setAppearance: (a) => {
        setAppearanceState(a);
        AsyncStorage.setItem(KEY, a).catch(() => {});
      },
    };
  }, [appearance, system]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("useTheme must be used inside ThemeProvider");
  return theme;
}

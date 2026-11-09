import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Shabad } from "./api";
import { englishOf, openingLines } from "./shabad";

/**
 * The reader's own Gurbani library, kept on the device: how they like to read
 * and the shabads they have saved.
 */

export type GurmukhiSize = "md" | "lg" | "xl";

export interface ReaderPrefs {
  translation: boolean;
  transliteration: boolean;
  /** Words run together, as in a saroop. */
  larivaar: boolean;
  size: GurmukhiSize;
}

export interface SavedShabad {
  shabadId: number;
  ang: number;
  /** The opening line, for the list. */
  gurmukhi: string;
  english: string;
  writer: string | null;
  savedAt: string;
}

const DEFAULT_PREFS: ReaderPrefs = { translation: true, transliteration: false, larivaar: false, size: "lg" };
const PREFS_KEY = "sikhe.reader";
const SAVED_KEY = "sikhe.saved";

interface Library {
  prefs: ReaderPrefs;
  setPrefs: (p: Partial<ReaderPrefs>) => void;
  saved: SavedShabad[];
  isSaved: (shabadId: number) => boolean;
  toggleSaved: (shabad: Shabad) => void;
}

const LibraryContext = createContext<Library | null>(null);

async function load<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const store = (key: string, value: unknown) => AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {});

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefsState] = useState<ReaderPrefs>(DEFAULT_PREFS);
  const [saved, setSaved] = useState<SavedShabad[]>([]);

  useEffect(() => {
    load<Partial<ReaderPrefs>>(PREFS_KEY, {}).then((p) => setPrefsState({ ...DEFAULT_PREFS, ...p }));
    load<SavedShabad[]>(SAVED_KEY, []).then(setSaved);
  }, []);

  const library = useMemo<Library>(
    () => ({
      prefs,
      setPrefs: (p) =>
        setPrefsState((old) => {
          const next = { ...old, ...p };
          store(PREFS_KEY, next);
          return next;
        }),
      saved,
      isSaved: (id) => saved.some((s) => s.shabadId === id),
      toggleSaved: (shabad) =>
        setSaved((old) => {
          const next = old.some((s) => s.shabadId === shabad.shabadId)
            ? old.filter((s) => s.shabadId !== shabad.shabadId)
            : [toSaved(shabad), ...old];
          store(SAVED_KEY, next);
          return next;
        }),
    }),
    [prefs, saved],
  );

  return <LibraryContext.Provider value={library}>{children}</LibraryContext.Provider>;
}

function toSaved(shabad: Shabad): SavedShabad {
  const first = openingLines(shabad.verses, 1)[0] ?? shabad.verses[0];
  return {
    shabadId: shabad.shabadId,
    ang: shabad.ang,
    gurmukhi: first?.gurmukhi ?? "",
    english: first ? englishOf(first) : "",
    writer: shabad.writer?.english ?? null,
    savedAt: new Date().toISOString(),
  };
}

export function useLibrary(): Library {
  const library = useContext(LibraryContext);
  if (!library) throw new Error("useLibrary must be used inside LibraryProvider");
  return library;
}

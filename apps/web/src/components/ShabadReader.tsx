"use client";

import { useEffect, useMemo, useState } from "react";
import type { Shabad } from "@/lib/api";

const SIZES = ["1.25rem", "1.55rem", "1.9rem", "2.35rem"];
const PREFS_KEY = "ask-sikhi:reader";

interface Prefs {
  size: number;
  translit: boolean;
  translation: boolean;
  translator: string;
}

function loadPrefs(): Partial<Prefs> {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") as Partial<Prefs>;
  } catch {
    return {};
  }
}

export function ShabadReader({ shabad, highlightVerseId }: { shabad: Shabad; highlightVerseId: number | null }) {
  // Translators present in this shabad, in BaniDB's preference order, e.g. "en:bdb" → "BaniDB (Khalis Foundation)".
  const translators = useMemo(() => {
    const seen = new Map<string, string>();
    for (const v of shabad.verses)
      for (const t of v.translations) {
        // Skip translations whose translator we can't name (see TRANSLATION_ATTRIBUTIONS in core).
        if (t.attribution.startsWith("BaniDB translation ")) continue;
        const key = `${t.language}:${t.key}`;
        if (!seen.has(key)) seen.set(key, t.language === "pu" ? `${t.attribution} (Punjabi)` : t.attribution);
      }
    return [...seen];
  }, [shabad]);

  const [prefs, setPrefs] = useState<Prefs>({ size: 1, translit: true, translation: true, translator: translators[0]?.[0] ?? "" });

  useEffect(() => {
    const saved = loadPrefs();
    setPrefs((p) => ({
      ...p,
      ...saved,
      translator: saved.translator && translators.some(([k]) => k === saved.translator) ? saved.translator : p.translator,
    }));
  }, [translators]);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // Private browsing or blocked storage: preferences just won't persist.
    }
  }, [prefs]);

  useEffect(() => {
    if (highlightVerseId) document.getElementById(`v${highlightVerseId}`)?.scrollIntoView({ block: "center" });
  }, [highlightVerseId]);

  const set = (patch: Partial<Prefs>) => setPrefs((p) => ({ ...p, ...patch }));
  const [lang, key] = prefs.translator.split(":");

  return (
    <>
      <div className="toolbar">
        <span className="size-buttons" role="group" aria-label="Gurmukhi text size">
          <button type="button" onClick={() => set({ size: prefs.size - 1 })} disabled={prefs.size === 0} aria-label="Smaller text">
            A−
          </button>
          <button
            type="button"
            onClick={() => set({ size: prefs.size + 1 })}
            disabled={prefs.size === SIZES.length - 1}
            aria-label="Larger text"
          >
            A+
          </button>
        </span>
        <label>
          <input type="checkbox" checked={prefs.translit} onChange={(e) => set({ translit: e.target.checked })} />
          Transliteration
        </label>
        <label>
          <input type="checkbox" checked={prefs.translation} onChange={(e) => set({ translation: e.target.checked })} />
          Translation
        </label>
        {prefs.translation && translators.length > 1 && (
          <label>
            <span className="sr-only">Translator</span>
            <select value={prefs.translator} onChange={(e) => set({ translator: e.target.value })}>
              {translators.map(([k, name]) => (
                <option key={k} value={k}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <ol className="verses" style={{ ["--gurbani-size" as string]: SIZES[prefs.size] }}>
        {shabad.verses.map((v) => {
          const t = v.translations.find((x) => x.language === lang && x.key === key);
          return (
            <li key={v.verseId} id={`v${v.verseId}`} className="verse" data-highlight={v.verseId === highlightVerseId}>
              <p className="gurmukhi" lang="pa">
                {v.gurmukhi}
              </p>
              {prefs.translit && v.transliteration && <p className="translit">{v.transliteration}</p>}
              {prefs.translation && t && (
                <p className="translation" lang={lang === "pu" ? "pa" : "en"}>
                  {t.text}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}

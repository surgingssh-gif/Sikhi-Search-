"use client";

import Link from "next/link";
import { useState } from "react";
import { fetchAng, friendlyError, type AngContents } from "@/lib/api";

export function AngPicker() {
  const [value, setValue] = useState("");
  const [state, setState] = useState<{ loading: boolean; result?: AngContents; error?: string }>({ loading: false });

  async function lookUp() {
    const ang = Number(value);
    if (!Number.isInteger(ang) || ang < 1 || ang > 1430) {
      setState({ loading: false, error: "Enter an Ang between 1 and 1430." });
      return;
    }
    setState({ loading: true });
    try {
      setState({ loading: false, result: await fetchAng(ang) });
    } catch (err) {
      setState({ loading: false, error: friendlyError(err) });
    }
  }

  return (
    <>
      <form
        className="ang-form"
        onSubmit={(e) => {
          e.preventDefault();
          void lookUp();
        }}
      >
        <label htmlFor="ang" className="sr-only">
          Ang number
        </label>
        <input
          id="ang"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="Ang number, e.g. 473"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 4))}
        />
        <button className="btn-primary" type="submit" disabled={!value || state.loading}>
          {state.loading ? "Looking…" : "Find"}
        </button>
      </form>

      {state.error && (
        <p className="error" role="alert" style={{ marginTop: 12 }}>
          {state.error}
        </p>
      )}

      {state.result && (
        <ul className="shabad-list" aria-label={`Shabads on Ang ${state.result.ang}`}>
          {state.result.shabads.map((s) => (
            <li key={s.shabadId}>
              <Link href={`/discuss/${s.shabadId}`}>
                <span className="shabad-list-meta">
                  {[s.heading, s.writer?.english, s.raag?.english].filter(Boolean).join(" · ") || `Shabad ${s.shabadId}`}
                </span>
                {s.firstLine && (
                  <>
                    <span className="gurmukhi" lang="pa">
                      {s.firstLine.gurmukhi}
                    </span>
                    <span className="translation">{s.firstLine.translations.find((t) => t.language === "en")?.text}</span>
                  </>
                )}
                <span className="shabad-list-go">Discuss →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

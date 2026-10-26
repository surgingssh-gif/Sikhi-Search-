"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LanguageToggle, useT, type StringKey } from "./Language";
import { ThemeToggle } from "./ThemeToggle";

export const SECTIONS: { href: string; label: string; key?: StringKey; match: (p: string) => boolean }[] = [
  { href: "/", label: "Front Page", match: (p) => p === "/" },
  { href: "/section/sikhi", label: "Sikhi", match: (p) => p === "/section/sikhi" },
  { href: "/section/punjab", label: "Punjab", match: (p) => p === "/section/punjab" },
  { href: "/history", label: "History", key: "history", match: (p) => p.startsWith("/history") },
  { href: "/map", label: "Map", match: (p) => p.startsWith("/map") },
  { href: "/vichaar", label: "Vichaar", key: "vichaar", match: (p) => p.startsWith("/vichaar") || p.startsWith("/discuss") },
  { href: "/library", label: "Library", key: "library", match: (p) => p.startsWith("/library") },
  { href: "/gurbani", label: "Gurbani", key: "gurbani", match: (p) => p.startsWith("/gurbani") || p.startsWith("/shabad") },
];

function useToday() {
  const [label, setLabel] = useState("");
  useEffect(() => {
    setLabel(new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }));
  }, []);
  return label;
}

/**
 * Newspaper masthead: the full nameplate on the front page, a compact bar
 * everywhere else, and a row of sections underneath.
 */
export function Masthead() {
  const pathname = usePathname() ?? "/";
  const t = useT();
  const today = useToday();
  const front = pathname === "/";

  return (
    <header className={`masthead${front ? " masthead-front" : ""}`}>
      <div className="wrap wrap-wide masthead-top">
        <span className="masthead-date">{today}</span>
        {!front && (
          <Link href="/" className="nameplate nameplate-small" aria-label="Ask Sikhi, front page">
            Ask Sikhi
          </Link>
        )}
        <div className="header-tools">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
      {front && (
        <div className="wrap wrap-wide">
          <h1 className="nameplate">
            <Link href="/">Ask Sikhi</Link>
          </h1>
          <p className="masthead-tagline">Sikh news from around the world · Punjab · Vichaar on Gurbani</p>
        </div>
      )}
      <nav className="section-nav" aria-label="Sections">
        <div className="wrap wrap-wide sections-row">
          {SECTIONS.map((s) => (
            <Link key={s.href} href={s.href} aria-current={s.match(pathname) ? "page" : undefined}>
              {s.key ? t(s.key) : s.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}

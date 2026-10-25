"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT, type StringKey } from "./Language";

const ICONS: Record<string, React.ReactNode> = {
  today: <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1Z" />,
  vichaar: <path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H10l-4 3.5V16H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />,
  library: (
    <>
      <path d="M5 4h4v16H5zM10 4h4v16h-4z" />
      <path d="m15.5 5.2 3.8-1 3.2 15.3-3.8.8z" />
    </>
  ),
  news: (
    <>
      <path d="M4 5h13v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" />
      <path d="M17 9h3v10a1 1 0 0 1-1 1h-2M7.5 9h6M7.5 12.5h6M7.5 16h4" />
    </>
  ),
  gurbani: (
    <>
      <path d="M12 6.5C10 5 7.5 4.5 4 4.5v13c3.5 0 6 .5 8 2 2-1.5 4.5-2 8-2v-13c-3.5 0-6 .5-8 2Z" />
      <path d="M12 6.5v13" />
    </>
  ),
};

export const NAV: { href: string; key: StringKey; match: (p: string) => boolean }[] = [
  { href: "/", key: "today", match: (p) => p === "/" },
  { href: "/vichaar", key: "vichaar", match: (p) => p.startsWith("/vichaar") || p.startsWith("/discuss") },
  { href: "/library", key: "library", match: (p) => p.startsWith("/library") },
  { href: "/news", key: "news", match: (p) => p.startsWith("/news") },
  { href: "/gurbani", key: "gurbani", match: (p) => p.startsWith("/gurbani") || p.startsWith("/shabad") },
];

/** Top navigation on wider screens. */
export function NavLinks() {
  const pathname = usePathname() ?? "/";
  const t = useT();
  return (
    <>
      {NAV.map((l) => (
        <Link key={l.href} href={l.href} className="nav-link" aria-current={l.match(pathname) ? "page" : undefined}>
          {t(l.key)}
        </Link>
      ))}
    </>
  );
}

/** App-style tab bar on phones, where five tabs don't fit in the header. */
export function BottomNav() {
  const pathname = usePathname() ?? "/";
  const t = useT();
  return (
    <nav className="bottom-nav" aria-label="Main">
      {NAV.map((l) => (
        <Link key={l.href} href={l.href} aria-current={l.match(pathname) ? "page" : undefined}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {ICONS[l.key]}
          </svg>
          <span>{t(l.key)}</span>
        </Link>
      ))}
    </nav>
  );
}

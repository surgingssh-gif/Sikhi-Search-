"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Ask", match: (p: string) => p === "/" },
  { href: "/discuss", label: "Discuss", match: (p: string) => p.startsWith("/discuss") },
  { href: "/about", label: "About", match: (p: string) => p.startsWith("/about") },
];

export function NavLinks() {
  const pathname = usePathname() ?? "/";
  return (
    <>
      {LINKS.map((l) => {
        const active = l.match(pathname);
        return (
          <Link key={l.href} href={l.href} className="nav-link" aria-current={active ? "page" : undefined}>
            {l.label}
          </Link>
        );
      })}
    </>
  );
}

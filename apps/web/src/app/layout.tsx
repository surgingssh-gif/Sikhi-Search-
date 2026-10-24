import type { Metadata, Viewport } from "next";
import { Inter, Noto_Serif_Gurmukhi, Source_Serif_4 } from "next/font/google";
import Link from "next/link";
import { ThemeToggle, THEME_SCRIPT } from "@/components/ThemeToggle";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const serif = Source_Serif_4({ subsets: ["latin"], variable: "--font-serif", display: "swap", style: ["normal", "italic"] });
const gurmukhi = Noto_Serif_Gurmukhi({ subsets: ["gurmukhi"], variable: "--font-gurmukhi", display: "swap" });

export const metadata: Metadata = {
  title: "Ask Sikhi",
  description: "Ask a question. Explore Sikh teachings. Discover the Gurbani behind the answer.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f11" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${gurmukhi.variable}`} suppressHydrationWarning>
      <head>
        {/* Apply a saved light/dark choice before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <header className="site-header">
          <div className="wrap">
            <Link href="/" className="logo">
              <span className="logo-mark" aria-hidden="true">
                A
              </span>
              Ask Sikhi
            </Link>
            <nav className="header-actions" aria-label="Site">
              <Link href="/about" className="header-link">
                About
              </Link>
              <ThemeToggle />
            </nav>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div className="wrap">
            <p>Ask Sikhi is a learning tool, not a religious authority.</p>
            <p>Gurbani text, translations and transliterations from BaniDB by Khalis Foundation.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}

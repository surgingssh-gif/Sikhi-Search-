import type { Metadata, Viewport } from "next";
import { Inter, Noto_Serif_Gurmukhi, Source_Serif_4 } from "next/font/google";
import Link from "next/link";
import { LanguageProvider, LanguageToggle } from "@/components/Language";
import { BottomNav, NavLinks } from "@/components/NavLinks";
import { ThemeToggle, THEME_SCRIPT } from "@/components/ThemeToggle";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const serif = Source_Serif_4({ subsets: ["latin"], variable: "--font-serif", display: "swap", style: ["normal", "italic"] });
const gurmukhi = Noto_Serif_Gurmukhi({ subsets: ["gurmukhi"], variable: "--font-gurmukhi", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Ask Sikhi", template: "%s · Ask Sikhi" },
  description: "Vichaar on Gurbani, a Sikh library, and news from the Panth and Punjab.",
  applicationName: "Ask Sikhi",
  openGraph: {
    title: "Ask Sikhi",
    description: "Vichaar on Gurbani, a Sikh library, and news from the Panth and Punjab.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f7f4" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1012" },
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
        <LanguageProvider>
          <a href="#main" className="skip-link">
            Skip to content
          </a>
          <header className="site-header">
            <div className="wrap wrap-wide">
              <Link href="/" className="logo" aria-label="Ask Sikhi, home">
                <span className="logo-mark" aria-hidden="true" lang="pa">
                  ਸ
                </span>
                <span className="logo-text">Ask Sikhi</span>
              </Link>
              <nav className="header-nav" aria-label="Main">
                <NavLinks />
              </nav>
              <div className="header-tools">
                <LanguageToggle />
                <ThemeToggle />
              </div>
            </div>
          </header>
          <div id="main" className="page">
            {children}
          </div>
          <footer className="site-footer">
            <div className="wrap">
              <div className="footer-inner">
                <nav className="footer-links" aria-label="Footer">
                  <Link href="/about">About</Link>
                  <a href="https://www.banidb.com" target="_blank" rel="noreferrer">
                    BaniDB
                  </a>
                </nav>
                <p>
                  Ask Sikhi is a learning tool, not a religious authority. Gurbani text, translations and transliterations from BaniDB by
                  Khalis Foundation. News links go to their publishers.
                </p>
              </div>
            </div>
          </footer>
          <BottomNav />
        </LanguageProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Libre_Franklin, Noto_Serif_Gurmukhi, Source_Serif_4, UnifrakturMaguntia } from "next/font/google";
import Link from "next/link";
import { ThemeToggle, THEME_SCRIPT } from "@/components/ThemeToggle";
import { Today } from "@/components/Today";
import "./globals.css";

const sans = Libre_Franklin({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const serif = Source_Serif_4({ subsets: ["latin"], variable: "--font-serif", display: "swap", style: ["normal", "italic"] });
const blackletter = UnifrakturMaguntia({ subsets: ["latin"], weight: "400", variable: "--font-blackletter", display: "swap" });
const gurmukhi = Noto_Serif_Gurmukhi({ subsets: ["gurmukhi"], variable: "--font-gurmukhi", display: "swap" });

export const metadata: Metadata = {
  title: "Ask Sikhi",
  description: "Ask a question. Explore Sikh teachings. Discover the Gurbani behind the answer.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#161615" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${serif.variable} ${blackletter.variable} ${gurmukhi.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Apply a saved light/dark choice before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <header className="wrap">
          <div className="topbar">
            <a className="topbar-left" href="https://www.banidb.com" target="_blank" rel="noreferrer">
              <span className="live-dot" aria-hidden="true" />
              Gurbani from BaniDB
            </a>
            <ThemeToggle />
          </div>
          <p className="nameplate">
            <Link href="/">Ask Sikhi</Link>
          </p>
          <div className="dateline">
            <span>Learn · Reflect · Explore</span>
            <Today />
            <span>A learning tool, not a religious authority.</span>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div className="wrap">
            <div>
              <p>
                Ask Sikhi is a learning tool, not a religious authority. For guidance on your own path, speak with a Granthi, a
                teacher you trust, or your sangat.
              </p>
              <p>Gurbani text, translations and transliterations from BaniDB by Khalis Foundation.</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

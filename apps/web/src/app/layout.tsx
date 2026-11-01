import type { Metadata, Viewport } from "next";
import { Libre_Franklin, Noto_Serif_Gurmukhi, Source_Serif_4, UnifrakturMaguntia } from "next/font/google";
import Link from "next/link";
import { LanguageProvider } from "@/components/Language";
import { Masthead } from "@/components/Masthead";
import { BottomNav } from "@/components/NavLinks";
import { THEME_SCRIPT } from "@/components/ThemeToggle";
import "./globals.css";

const sans = Libre_Franklin({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const serif = Source_Serif_4({ subsets: ["latin"], variable: "--font-serif", display: "swap", style: ["normal", "italic"] });
const blackletter = UnifrakturMaguntia({ subsets: ["latin"], weight: "400", variable: "--font-blackletter", display: "swap" });
const gurmukhi = Noto_Serif_Gurmukhi({ subsets: ["gurmukhi"], variable: "--font-gurmukhi", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Ask Sikhi: Sikh news from America and the world", template: "%s · Ask Sikhi" },
  description: "News from the Sikh world and Punjab, a story map, and Vichaar on Gurbani.",
  applicationName: "Ask Sikhi",
  openGraph: {
    title: "Ask Sikhi",
    description: "News from the Sikh world and Punjab, a story map, and Vichaar on Gurbani.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#121212" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${blackletter.variable} ${gurmukhi.variable}`} suppressHydrationWarning>
      <head>
        {/* Apply a saved light/dark choice before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <LanguageProvider>
          <a href="#main" className="skip-link">
            Skip to content
          </a>
          <Masthead />
          <div id="main" className="page">
            {children}
          </div>
          <footer className="site-footer">
            <div className="wrap wrap-wide">
              <div className="footer-inner">
                <p className="footer-nameplate">Ask Sikhi</p>
                <nav className="footer-links" aria-label="Footer">
                  <Link href="/">Front Page</Link>
                  <Link href="/map">Map</Link>
                  <Link href="/vichaar">Vichaar</Link>
                  <Link href="/library">Library</Link>
                  <Link href="/gurbani">Gurbani</Link>
                  <Link href="/about">About</Link>
                </nav>
                <p>
                  Headlines and photos belong to their publishers and link to the original story. Gurbani from BaniDB by Khalis
                  Foundation. Ask Sikhi is a learning tool, not a religious authority.
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

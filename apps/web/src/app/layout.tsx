import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, Noto_Serif_Gurmukhi } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const serif = Fraunces({ subsets: ["latin"], variable: "--font-serif", display: "swap" });
const gurmukhi = Noto_Serif_Gurmukhi({ subsets: ["gurmukhi"], variable: "--font-gurmukhi", display: "swap" });

export const metadata: Metadata = {
  title: "Ask Sikhi",
  description: "Ask a question. Explore Sikh teachings. Discover the Gurbani behind the answer.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf8f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0e131d" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${gurmukhi.variable}`}>
      <body>
        <header className="site-header">
          <div className="wrap">
            <Link href="/" className="wordmark">
              <span className="wordmark-dot" aria-hidden="true" />
              Ask Sikhi
            </Link>
            <a className="header-link" href="https://www.banidb.com" target="_blank" rel="noreferrer">
              Gurbani from BaniDB
            </a>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div className="wrap">
            <p>
              Ask Sikhi is a learning tool, not a religious authority. For guidance on your own path, speak with a Granthi,
              a teacher you trust, or your sangat.
            </p>
            <p>Gurbani text, translations and transliterations from BaniDB by Khalis Foundation.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}

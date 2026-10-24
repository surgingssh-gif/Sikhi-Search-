import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "About · Ask Sikhi" };

export default function About() {
  return (
    <main className="wrap about">
      <h1>About Ask Sikhi</h1>
      <p>
        Ask Sikhi helps you learn about Sikhi through conversation. Ask a question in your own words and you get a clear answer, the
        Gurbani behind it, and the option to read each passage in its full shabad.
      </p>

      <h2>How answers are made</h2>
      <ul>
        <li>Your question is turned into search terms and matched against Gurbani translations in BaniDB.</li>
        <li>Each match is read in the context of its shabad, and only passages that genuinely address your question are kept.</li>
        <li>An AI model writes the explanation, pointing to those passages by number.</li>
        <li>Every citation is checked automatically before you see the answer.</li>
      </ul>

      <h2>What you can trust, and what to check</h2>
      <ul>
        <li>
          <strong>Gurbani is never written by AI.</strong> Every Gurmukhi line, translation and Ang number comes straight from BaniDB.
        </li>
        <li>
          <strong>Explanations are interpretation.</strong> They can be wrong or incomplete. Read the full shabad, and where Sikhs hold
          different views, the answer should say so.
        </li>
        <li>
          <strong>History is labelled.</strong> Answers that rely on general knowledge rather than Gurbani say so.
        </li>
      </ul>

      <h2>Not a religious authority</h2>
      <p>
        Ask Sikhi is a learning tool. For guidance on your own path, speak with a Granthi, a teacher you trust, or your sangat. If
        you&apos;re going through something difficult, please also reach out to people and professionals who can support you.
      </p>

      <h2>Privacy</h2>
      <p>Conversations aren&apos;t saved. Earlier questions are kept only in your browser tab, so follow-ups make sense.</p>

      <h2>Sources</h2>
      <p>
        Gurbani text, translations and transliterations from{" "}
        <a href="https://www.banidb.com" target="_blank" rel="noreferrer">
          BaniDB
        </a>{" "}
        by Khalis Foundation. Explanations are written by Claude, an AI model by Anthropic.
      </p>

      <p style={{ marginTop: 32 }}>
        <Link href="/" className="read-link">
          ← Start asking
        </Link>
      </p>
    </main>
  );
}

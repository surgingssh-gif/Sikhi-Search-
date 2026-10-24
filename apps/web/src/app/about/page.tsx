import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "About" };

export default function About() {
  return (
    <main className="wrap about">
      <p className="eyebrow">About</p>
      <h1>Learn Sikhi, with the Gurbani in front of you</h1>
      <p className="lead">
        Ask Sikhi answers questions about Sikhi, Gurbani, Sikh history and everyday life, and shows you the Gurbani behind each answer
        so you can read it in its full shabad.
      </p>

      <div className="about-grid">
        <section className="about-card">
          <h2>Gurbani is never written by AI</h2>
          <p>
            Every Gurmukhi line, translation and Ang number comes straight from BaniDB. The AI only explains, and every passage it
            points to is checked automatically before you see it.
          </p>
        </section>

        <section className="about-card">
          <h2>How an answer is made</h2>
          <ol>
            <li>Your question is matched against Gurbani translations in BaniDB.</li>
            <li>Each match is read in the context of its shabad; only passages that genuinely speak to your question are kept.</li>
            <li>The AI writes a short answer, pointing to those passages by number.</li>
          </ol>
        </section>

        <section className="about-card">
          <h2>Three ways to learn</h2>
          <ul>
            <li>
              <strong>Answer</strong>: a clear explanation with the Gurbani behind it.
            </li>
            <li>
              <strong>Gurbani only</strong>: just the most relevant passages, with a short note on each.
            </li>
            <li>
              <strong>Discuss</strong>: talk through one shabad, such as today&apos;s Hukamnama, line by line.
            </li>
          </ul>
        </section>

        <section className="about-card">
          <h2>Told from a Sikh perspective</h2>
          <p>
            Sikh history is told as the Sikh community remembers it, grounded in documented facts, and violence against Sikhs is named
            plainly. Where Sikhs themselves hold different views, answers say so.
          </p>
        </section>

        <section className="about-card">
          <h2>A guide, not an authority</h2>
          <p>
            Explanations are interpretation and can be wrong. For guidance on your own path, speak with a Granthi, a teacher you
            trust, or your sangat. If you&apos;re going through something difficult, please also reach out to people and
            professionals who can support you.
          </p>
        </section>

        <section className="about-card">
          <h2>Privacy and sources</h2>
          <p>
            Conversations aren&apos;t saved; earlier questions stay only in your browser tab so follow-ups make sense. Gurbani text,
            translations and transliterations are from{" "}
            <a href="https://www.banidb.com" target="_blank" rel="noreferrer">
              BaniDB
            </a>{" "}
            by Khalis Foundation. Explanations are written by Claude, an AI model by Anthropic.
          </p>
        </section>
      </div>

      <div className="feature-actions" style={{ marginTop: 28 }}>
        <Link className="btn-primary" href="/">
          Ask a question
        </Link>
        <Link className="btn-ghost" href="/discuss">
          Discuss Gurbani
        </Link>
      </div>
    </main>
  );
}

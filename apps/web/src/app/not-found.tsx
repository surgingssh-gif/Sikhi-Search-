import Link from "next/link";

export default function NotFound() {
  return (
    <main className="wrap empty-page">
      <p className="eyebrow">Page not found</p>
      <h1>This page doesn&apos;t exist.</h1>
      <p>The link may be old or mistyped.</p>
      <div className="feature-actions" style={{ justifyContent: "center" }}>
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

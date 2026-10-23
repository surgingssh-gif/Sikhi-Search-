import Link from "next/link";

export default function ShabadNotFound() {
  return (
    <main className="wrap">
      <header className="reader-head">
        <Link href="/" className="back-link">
          ← Back to Ask Sikhi
        </Link>
        <h1>Shabad not found</h1>
        <p className="reader-meta">BaniDB has no shabad with that number.</p>
      </header>
    </main>
  );
}

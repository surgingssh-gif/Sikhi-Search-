import Link from "next/link";

export default function ShabadNotFound() {
  return (
    <main className="wrap">
      <header className="reader-head">
        <Link href="/" className="back-link">
          ← Back to Ask Sikhi
        </Link>
        <h1 className="headline" style={{ marginTop: 18 }}>Shabad not found</h1>
        <p className="dek">BaniDB has no shabad with that number.</p>
      </header>
    </main>
  );
}

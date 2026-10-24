"use client";

import { useState } from "react";

/** Copies text to the clipboard and briefly confirms. */
export function CopyButton({ text, label = "Copy" }: { text: () => string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const value = text();
    let ok = false;
    try {
      await navigator.clipboard.writeText(value);
      ok = true;
    } catch {
      ok = legacyCopy(value);
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  }

  return (
    <button type="button" className="copy-btn" onClick={() => void copy()} aria-live="polite">
      {copied ? (
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3.5 8.5 6.5 11.5 12.5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="5" y="5" width="8.5" height="8.5" rx="2" stroke="currentColor" strokeWidth="1.4" />
          <path d="M10.5 5V3.8A1.3 1.3 0 0 0 9.2 2.5H3.8A1.3 1.3 0 0 0 2.5 3.8v5.4a1.3 1.3 0 0 0 1.3 1.3H5" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      )}
      {copied ? "Copied" : label}
    </button>
  );
}

/** Fallback for browsers or frames where the async Clipboard API is unavailable. */
function legacyCopy(value: string): boolean {
  const area = document.createElement("textarea");
  area.value = value;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
  }
}

// Checks that each Sikh history date appears in its Wikipedia article.
// Run: node scripts/check-history-dates.mjs
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../packages/core/src/history/events.ts", import.meta.url), "utf8");
const events = [...src.matchAll(/id: "([^"]+)",\s*date: "(\d{4})-(\d{2})-(\d{2})",[\s\S]*?wiki: "([^"]+)"/g)].map((m) => ({
  id: m[1], y: m[2], m: Number(m[3]), d: Number(m[4]), wiki: m[5],
}));
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const pages = new Map();
async function wikitext(title) {
  if (!pages.has(title)) {
    const res = await fetch(`https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(title)}&action=raw&redirect=true`, {
      headers: { "user-agent": "AskSikhi-date-check/1.0 (history verification)" },
    });
    let text = res.ok ? await res.text() : "";
    const redirect = /^#REDIRECT\s*\[\[([^\]#]+)/i.exec(text);
    if (redirect) return wikitext(redirect[1]);
    pages.set(title, text);
  }
  return pages.get(title);
}
let bad = 0;
for (const e of events) {
  const text = (await wikitext(e.wiki)).replace(/&nbsp;|\{\{nbsp\}\}/g, " ");
  const month = MONTHS[e.m - 1];
  const patterns = [
    new RegExp(`\\b0?${e.d}(st|nd|rd|th)?\\s+(of\\s+)?${month},?\\s+${e.y}`),
    new RegExp(`${month}\\s+0?${e.d}(st|nd|rd|th)?,?\\s+${e.y}`),
    new RegExp(`\\|\\s*${e.y}\\s*\\|\\s*0?${e.m}\\s*\\|\\s*0?${e.d}\\b`),
    new RegExp(`${e.y}-0?${e.m}-0?${e.d}\\b`),
  ];
  const ok = text && patterns.some((p) => p.test(text));
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "MISS"} ${e.y}-${String(e.m).padStart(2, "0")}-${String(e.d).padStart(2, "0")} ${e.id} [${e.wiki}]${text ? "" : " (page not found)"}`);
}
console.log(`\n${events.length - bad}/${events.length} dates found in their articles`);
process.exitCode = bad ? 1 : 0;

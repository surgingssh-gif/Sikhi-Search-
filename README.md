# Ask Sikhi

Ask a question. Explore Sikh teachings. Discover the Gurbani behind the answer.

Ask Sikhi is an AI-assisted Sikh learning tool. Answers are grounded in real
Gurbani from [BaniDB](https://api.banidb.com/v2/api-docs/) (Khalis Foundation),
with exact Gurmukhi, Ang numbers, translations and attribution. It runs as a
standalone service so [GurdwaraOS](#gurdwaraos-integration) can use the same API later.

> Status: **Phase 3 (website)**. The website, `/v1/ask` and `/v1/explore` work
> end to end; answers still need review by Sikh educators before any public launch.

## How a question is answered

```
question
 → expand (Haiku 5.5): category, Sikh concepts, English search terms
 → retrieve (BaniDB): English-translation search per term, whole-word matches only;
     shabads ranked by how often they return to the terms (rarer terms count more);
     best line per shabad, completed to a full sentence, plus neighbouring lines
     and the Rahao line for context; top 20 go to the judge
 → judge (Haiku 5.5): keep up to 3 passages that genuinely address the question in context
 → answer (Sonnet 5.5 by default; Opus 5.5 via ANSWER_MODEL): cites passages as [[verse:ID]], never writes Gurmukhi
 → citation check: one rewrite if it fails, then strip anything still invalid
 → response: answer segments + passage cards built from BaniDB data
```

Explore mode (`/v1/explore`) stops after judging and returns Gurbani first,
each with a short note on why it was selected. It costs a fraction of `/v1/ask`.

Answers carry a `basis` and, when needed, a `sourceLabel`. History questions
are always labelled as general knowledge for now, since the only verified
sources are Gurbani and (soon) Rehat Maryada.

## How accuracy is enforced

The language model **never writes Gurbani or Ang numbers**. It cites retrieved
verses with markers like `[[verse:9224]]`, and the server renders the Gurmukhi,
translation, Ang and attribution from BaniDB. `validateAnswer()` in
`packages/core` rejects answers that:

- cite a verse that wasn't retrieved for that question,
- contain any Gurmukhi the model typed itself (even a correct copy), or
- mention an Ang that doesn't belong to a cited verse.

Invented quotations are blocked by how the system is built, not by prompt wording.

## Layout

```
packages/core   Framework-free logic: BaniDB client, Gurbani types, citation validation
apps/api        Hono HTTP API (the service the website and GurdwaraOS call)
apps/web        Next.js website: landing page, conversation, Gurbani cards, shabad reader
```

## Getting started

Requires Node 22+.

```bash
npm install
cp .env.example .env   # then add your ANTHROPIC_API_KEY
npm run dev            # API on :8787 and website on http://localhost:3000; Ctrl+C stops both
                       # (or run them separately: npm run dev:api / npm run dev:web)
npm test               # no API key or network needed
npm run typecheck
```

### Evaluation

`evals/questions.json` holds real questions (personal, philosophical, practice,
history, contested, off-topic, prompt injection). Reviewers add the shabads they
would expect in `expectedShabadIds`; never guess these.

```bash
npm run eval -- --limit 3                          # costs real money; prints the estimate
npm run eval -- --answer-model claude-opus-5-5     # compare models
npm run eval -- --mode explore
```

Reports land in `evals/results/` (git-ignored) as Markdown for review.

## API (v1)

| Method | Path | Description |
|---|---|---|
| GET | `/v1/health` | Liveness check |
| GET | `/v1/shabads/:id` | Full shabad: Gurmukhi, larivaar, transliteration, attributed translations, Ang, writer, raag, prev/next |
| POST | `/v1/ask` | `{ question, history? }` → answer, segments, passages, follow-ups, basis, sourceLabel, usage. Send `Accept: text/event-stream` for `stage` progress events then a `result` (or `error`) event |
| POST | `/v1/explore` | `{ question }` → relevant passages with relevance notes |

The server stores no conversations; clients send earlier turns in `history`.
AI endpoints are rate limited per client (`AI_REQUESTS_PER_MINUTE`, default 10).

Every response with Gurbani includes an `attribution` field. Errors are JSON:
`400 invalid_request`, `404 not_found`, `422 declined`, `429 rate_limited`,
`502 upstream_unavailable`, `503 ai_not_configured`.

## BaniDB: verified vs. open questions

Verified against the live API (Oct 2026): no API key needed; verse-level
Unicode Gurmukhi, Ang, shabad/verse IDs, writer, raag; English translations
(`bdb`, `ssk`, `ms`), Punjabi teekas, transliterations; English-translation
search (`searchtype=3`); Rehat Maryada endpoints.

Learned the hard way: the English "full word" search (`searchtype=3`) actually
matches substrings ("meat" finds "permeating") and returns results in Ang
order. Retrieval therefore fetches up to 500 results per term, keeps only
whole-word matches, and ranks shabads itself.

To confirm with Khalis Foundation before launch:

- rate limits and acceptable use,
- permission/bulk export for building a semantic search index,
- reproduction and attribution terms for each translation,
- a possible line misalignment seen in the `ms` English translation
  (we prefer `bdb`, then `ssk`, then `ms` for now).

## Roadmap

1. **Foundation**: BaniDB client, shabad API, citation checker *(done)*
2. **Answer pipeline**: concept expansion → BaniDB search → relevance judging → answer → citation check; Explore mode; evaluation set *(done; Sonnet 5.5 chosen over Opus 5.5 at ~40% of the cost)*
3. **Website**: landing page, chat with live progress, Gurbani cards, full shabad reader with text size and translator choice, light/dark, mobile *(done)*
4. **Semantic index**: pgvector index (after Khalis approval), hybrid search
5. **Review and launch**: review by Sikh educators, rate limits, privacy, then GurdwaraOS integration

## GurdwaraOS integration

GurdwaraOS will call this API over HTTP (`ALLOWED_ORIGINS` controls browser
access). There is no shared database or code with GurdwaraOS.

## Credits

Gurbani text, translations and transliterations from
[BaniDB](https://github.com/KhalisFoundation/banidb-api) by Khalis Foundation.

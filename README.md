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

## Hosting (GitHub Pages, free)

The site runs with no server of its own, the same way as a scheduled bot. `.github/workflows/site.yml` runs on GitHub's computers every hour and on every push to `main`:

1. It builds the website (only when the code changed; otherwise it reuses the last build).
2. It runs `scripts/build-news.ts`, which fetches the feeds, has the model rate and summarise the stories, writes the edition note and the opening paragraphs of the good stories, and saves them as JSON next to the site. What earlier runs worked out is kept in the Actions cache, so each story is rated and summarised once.
3. It publishes the site to GitHub Pages at `https://<user>.github.io/<repo>/`.

### The daily magazine

The home page is a digital magazine, written by AI once a day. The first hourly run after 5 a.m. New York time calls `writeEdition()` (`packages/core/src/magazine/edition.ts`):

1. The editor step (Sonnet 5.5) picks a cover story, four features (at least two good news, at least one hard news) and 6-8 briefs from the last three days' rated stories.
2. For each article it reads the publishers' full pages and writes from them alone. Every paragraph cites its sources.
3. `paragraphProblems()` checks each paragraph against the sources it cites: every number must be in them, every quotation word for word, and no run of 14 words copied without quotation marks. A failing article is rewritten once with the problems listed; paragraphs that still fail are dropped, and an article with fewer than two left is dropped.
4. The issue is saved to `.editions/` (kept between runs in the Actions cache, with every back issue) and published with the site. Each article says it was written by AI and lists and links its sources. An issue costs about $0.20.

To write today's issue again, run the workflow by hand with "Write today's magazine issue again now" ticked. Locally: `FORCE_EDITION=1 npx tsx --env-file-if-exists=.env scripts/build-news.ts <out> .news-memory.json .editions`; the dev API serves `.editions/`.

In the published site (`EXPO_PUBLIC_STATIC=1`) the app answers its own API requests (`apps/sikhe/src/lib/local-api.ts`): Gurbani, the Hukamnama and history come straight from BaniDB and Wikipedia, and the news from the job's files. Ask needs the model key, which can't be in a website, so Ask is off there.

Setup, once: add the Anthropic key as the repository secret `ANTHROPIC_API_KEY` (Settings > Secrets and variables > Actions), set Settings > Pages > Source to **GitHub Actions**, then run the workflow from the Actions tab. Pages on a private repository needs GitHub Pro.

The site is marked `noindex`, so it stays out of search engines until launch. Before a public launch, check BaniDB's terms for showing translations, and whether showing a story's opening paragraphs in previews is acceptable.

## API (v1)

| Method | Path | Description |
|---|---|---|
| GET | `/v1/health` | Liveness check |
| GET | `/v1/shabads/:id` | Full shabad: Gurmukhi, larivaar, transliteration, attributed translations, Ang, writer, raag, prev/next |
| POST | `/v1/ask` | `{ question, history? }` → summary (main paragraph), sections (deeper detail), passages (Gurbani cards), follow-ups, basis, sourceLabel, usage. Send `Accept: text/event-stream` for `stage` progress events then a `result` (or `error`) event |
| POST | `/v1/explore` | `{ question }` → relevant passages with relevance notes |
| POST | `/v1/discuss` | `{ shabadId, question, history? }` → a reply about that shabad, citing its lines; follow-ups |
| GET | `/v1/hukamnama/today` | Today's Hukamnama (date and shabad), cached 10 minutes |
| GET | `/v1/angs/:ang` | The shabads on an Ang (1-1430), each with its heading and first line |
| GET | `/v1/editions` | The magazine's issues, newest first |
| GET | `/v1/editions/:date` | One issue (`latest`, or YYYY-MM-DD): cover story, features, briefs, each article's sources |

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

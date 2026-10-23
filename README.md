# Ask Sikhi

Ask a question. Explore Sikh teachings. Discover the Gurbani behind the answer.

Ask Sikhi is an AI-assisted Sikh learning tool. Answers are grounded in real
Gurbani from [BaniDB](https://api.banidb.com/v2/api-docs/) (Khalis Foundation),
with exact Gurmukhi, Ang numbers, translations and attribution. It runs as a
standalone service so [GurdwaraOS](#gurdwaraos-integration) can use the same API later.

> Status: **Phase 1 (foundation)**. The BaniDB client, shabad endpoint and
> citation checker work. No AI answers or website yet.

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
apps/web        (Phase 3) Next.js website
```

## Getting started

Requires Node 22+.

```bash
npm install
cp .env.example .env
npm run dev:api        # http://localhost:8787
npm test
npm run typecheck
```

## API (v1)

| Method | Path | Description |
|---|---|---|
| GET | `/v1/health` | Liveness check |
| GET | `/v1/shabads/:id` | Full shabad: Gurmukhi, larivaar, transliteration, attributed translations, Ang, writer, raag, prev/next |

Every response with Gurbani includes an `attribution` field. Errors are JSON:
`400 invalid_shabad_id`, `404 not_found`, `502 upstream_unavailable`.

## BaniDB: verified vs. open questions

Verified against the live API (Oct 2026): no API key needed; verse-level
Unicode Gurmukhi, Ang, shabad/verse IDs, writer, raag; English translations
(`bdb`, `ssk`, `ms`), Punjabi teekas, transliterations; English-translation
search (`searchtype=3`); Rehat Maryada endpoints.

To confirm with Khalis Foundation before launch:

- rate limits and acceptable use,
- permission/bulk export for building a semantic search index,
- reproduction and attribution terms for each translation,
- a possible line misalignment seen in the `ms` English translation
  (we prefer `bdb`, then `ssk`, then `ms` for now).

## Roadmap

1. **Foundation**: BaniDB client, shabad API, citation checker *(done)*
2. **Answer pipeline**: concept expansion → BaniDB search → relevance judging → answer → citation check; Explore-through-Gurbani mode; an evaluation set of real questions
3. **Website**: landing page, chat, Gurbani cards, full shabad reader
4. **Semantic index**: pgvector index (after Khalis approval), hybrid search
5. **Review and launch**: review by Sikh educators, rate limits, privacy, then GurdwaraOS integration

## GurdwaraOS integration

GurdwaraOS will call this API over HTTP (`ALLOWED_ORIGINS` controls browser
access). There is no shared database or code with GurdwaraOS.

## Credits

Gurbani text, translations and transliterations from
[BaniDB](https://github.com/KhalisFoundation/banidb-api) by Khalis Foundation.

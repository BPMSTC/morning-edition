# Morning Edition — Claude Code Instructions

## What This Project Is

A Node.js script (`curator.js`) that fetches AI news from 13 sources, scores/filters stories by relevance, and generates a styled HTML magazine file. It runs daily at 7am UTC via GitHub Actions and commits the output to `magazines/YYYY-MM-DD.html`.

## Running the Project

```bash
node curator.js        # generate today's magazine
npm run curate         # same thing via package.json script
```

Output lands in `magazines/YYYY-MM-DD.html`. Open in a browser to review.

## Tech Stack

- **Node.js 18+**, ESM modules (`import`/`export`)
- **No build step** — single script, run directly with `node`
- **Dependencies**: `@anthropic-ai/sdk` (commentary generation), `cheerio` (HTML parsing), `node-html-parser` (available but not yet wired in)
- **GitHub Actions** for scheduling (`.github/workflows/morning-edition.yml`)
- **`ANTHROPIC_API_KEY`** required — set as env var locally, GitHub Actions secret for CI

## Key Files

| File | Purpose |
|------|---------|
| `curator.js` | Everything: fetch, parse, score, generate HTML |
| `package.json` | ESM config + `npm run curate` script |
| `.github/workflows/morning-edition.yml` | Cron job (7am UTC) + manual dispatch |
| `magazines/` | Output directory — one HTML file per day |
| `PROJECT_CONTEXT.md` | Full project reference and setup guide |

## Architecture (curator.js)

1. `fetchStories()` — fetches all 13 source URLs with a browser User-Agent
2. `extractStories(html, source)` — cheerio-parses titles, descriptions, URLs from raw HTML
3. `scoreStories(stories)` — adds `relevanceScore` via keyword matching
4. `curateStories(stories, 18)` — filters, sorts by score, deduplicates, returns top 18
5. `generateCommentary(story)` — calls Claude API (Haiku) to write 1-2 sharp paragraphs per story
6. `generateHTML(stories)` — builds full HTML document with inline CSS
7. `generateSpread(story, idx)` — generates one story's layout (cycles 13 CSS classes)
8. `main()` — entry point; fetches → curates → enriches with commentary → generates HTML

## Content Preferences (for scoring tuning)

**Wants:** AI tools, creative software, dev tools, privacy, weird science, actionable/practical content

**Filtered out:** AI governance, regulation, policy, ethics debates, lawsuits, investigations

Scoring is in `scoreStories()` — `keywords.positive` (+10 each), `keywords.negative` (-20 each), plus source bonuses for Latent Space (+5) and The Rundown AI (+3).

## Sources (13 total)

Defined in the `SOURCES` array at the top of `curator.js`. Each entry has `name`, `url`, `category`. To add or remove a source, edit that array.

## File Naming

Magazine files use `YYYY-MM-DD.html` format (with dashes). The filename is set in `main()` using `new Date().toISOString().split("T")[0]`.

## Known Limitations to Be Aware Of

- **HTML parsing varies by site** — cheerio selectors work well for static HTML blogs; JS-rendered sites (TechCrunch, VentureBeat) may not expose article links in static HTML, causing fallback to homepage URLs.
- **Images are placeholder** — all spreads use the same static Unsplash URL. Real `og:image` extraction is a planned improvement.
- **Commentary is based on scraped description** — if article extraction is shallow, Claude's commentary will be less specific. Better extraction = better commentary.

## What NOT to Change Without Asking

- The 13 spread CSS classes in `generateHTML()` — visual design is intentional
- The scoring thresholds (filter at > -10, +10/-20 per keyword) — these are tuned
- File output format — always `magazines/YYYY-MM-DD.html`

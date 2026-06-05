# Morning Edition - Daily AI News Magazine

A Node.js project that curates AI news from 13 sources every morning and generates a beautifully designed HTML "magazine" with editorial layouts, descriptions, images, and links.

---

## Project Overview

**Purpose:** Generate a daily curated AI news magazine tailored to one reader's taste — AI tools, creative software, dev tools, privacy, weird science, and actionable content. Governance/policy/ethics stories are filtered out.

**Output:** A single self-contained HTML file per day (e.g. `magazines/2026-06-05.html`) styled like a print editorial magazine with up to 18 distinct story spreads.

**Schedule:** Runs daily at 7am UTC via GitHub Actions. Can also be triggered manually via `workflow_dispatch` or run locally with `node curator.js`.

---

## File Structure

```
morning-edition/
├── curator.js                          # Main curator script (fetches, scores, generates HTML)
├── package.json                        # Node.js project config (ESM)
├── .claude/
│   └── settings.json                   # Optional SessionStart hook for local runs
├── .github/
│   └── workflows/
│       └── morning-edition.yml         # GitHub Actions cron job (7am UTC daily)
└── magazines/
    └── YYYY-MM-DD.html                 # Generated daily editions
```

---

## How It Works

### 1. Sources (13 total, defined in `SOURCES` array in curator.js)

| Source | Category | URL |
|--------|----------|-----|
| Latent Space | Software Engineering | https://www.latentspace.dev/ |
| The Pragmatic Engineer | Software Engineering | https://blog.pragmaticengineer.com/ |
| TechCrunch AI | Business | https://techcrunch.com/tag/artificial-intelligence/ |
| VentureBeat | Business | https://venturebeat.com/ai/ |
| OpenAI Blog | AI Insiders | https://openai.com/news/ |
| Google DeepMind News | AI Insiders | https://deepmind.google/news/ |
| The Rundown AI | Unique | https://www.therundown.ai/ |
| Anthropic News | AI Insiders | https://www.anthropic.com/news |
| Hugging Face Blog | Open Source AI | https://huggingface.co/blog |
| The Batch | Research & Analysis | https://www.deeplearning.ai/the-batch/tag/the-batch |
| TLDR AI | Unique | https://tldr.tech/ai |
| Import AI | Research & Policy | https://jack-clark.net/ |
| MIT News AI | Research & Academia | https://news.mit.edu/topic/artificial-intelligence2 |

### 2. Curation Logic

Each story is scored based on keywords:

**Positive (+10 each):** AI, tool, software, dev, privacy, code, engineer, creative, application, build, open source, framework, library, API, security, automation, neural, language model, research, model, breakthrough, innovation

**Negative (-20 each):** governance, regulation, policy, ethics, bias, safety concerns, lawsuit, investigation

**Source bonus:** Latent Space +5, The Rundown AI +3

Top 18 stories with score > -10 are selected, deduplicated by normalized title.

### 3. HTML Generation

13 distinct spread styles cycle through the stories:

1. **spread-hero** - Full-bleed hero image with overlay
2. **spread-midnight** - Dark midnight blue with cyan accent
3. **spread-alert** - Rose alert stamp style with red left border
4. **spread-terminal** - Monospace code terminal aesthetic
5. **spread-academic** - Newsprint with drop cap
6. **spread-stat** - Big stat finish with golden numeral
7. **spread-vibrant** - Pink/yellow gradient
8. **spread-minimal** - White space minimal
9. **spread-column** - Two-column newspaper
10. **spread-tilted** - Skewed diagonal layout
11. **spread-neon** - Cyberpunk neon green/magenta
12. **spread-vintage** - Vintage paper with brown border
13. **spread-floating** - Card floats on gradient background

Each spread includes:
- Large numeral (01–18)
- Huge serif title (Fraunces, 72px)
- 20px description
- Unsplash placeholder image
- Source name + "Read →" link to the original article

Fonts loaded from Google Fonts: **Fraunces** (display serif) + **Inter** (body sans).

---

## Setup From Scratch

### Prerequisites
- Node.js 18+
- Git
- GitHub account

### Step 1: Initialize Project

```bash
mkdir morning-edition && cd morning-edition
git init
```

### Step 2: Create package.json

```json
{
  "name": "morning-edition",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "curate": "node curator.js"
  },
  "dependencies": {
    "cheerio": "^1.0.0-rc.12",
    "feed-parser": "^0.0.2",
    "node-html-parser": "^7.1.0"
  }
}
```

Note: `type: "module"` is required because curator.js uses ESM imports.

### Step 3: Set Up GitHub Actions

Create `.github/workflows/morning-edition.yml`:

```yaml
name: Morning Edition

on:
  schedule:
    - cron: '0 7 * * *'  # 7am UTC daily
  workflow_dispatch:     # allow manual run

jobs:
  curate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run curator
        run: node curator.js

      - name: Commit & push
        run: |
          git config user.name "Morning Edition Bot"
          git config user.email "bot@example.com"
          if [ -n "$(git status --porcelain magazines/)" ]; then
            git add magazines/
            git commit -m "Morning Edition - $(date +%Y-%m-%d)"
            git push
          fi
```

GitHub Actions needs write permission. Go to your repo → Settings → Actions → General → Workflow permissions → enable "Read and write permissions".

### Step 4: Push to GitHub

```bash
git add .
git commit -m "Initial commit: Morning Edition daily AI news curator"
git remote add origin https://github.com/BPMSTC/morning-edition.git
git branch -M main
git push -u origin main
```

### Step 5: Verify

- Go to **Actions** tab in GitHub
- Click "Morning Edition" workflow
- Click "Run workflow" to test manually
- Check `magazines/` folder for the new HTML file

---

## Running Locally

```bash
node curator.js
# or
npm run curate
```

Output: `magazines/YYYY-MM-DD.html` is created (or overwritten if run again same day).

Open the file in a browser to view the magazine.

---

## Known Limitations

1. **Images:** Uses a static Unsplash placeholder URL for all spreads. To make images relevant, integrate with:
   - Unsplash API (search by keyword)
   - Open Graph image scraping (`<meta property="og:image">` from each article)

2. **Descriptions:** `extractStories()` parses descriptions from `<p>` tags near article titles via regex. Accuracy varies per source since each site uses different HTML structure.

3. **Source extraction fragility:** Each site has different HTML; more robust approaches:
   - `cheerio` or `node-html-parser` with site-specific CSS selectors (both are in dependencies)
   - Per-source extractors instead of generic regex

---

## Recommended Improvements

### High Priority
- [ ] Use `cheerio` library for HTML parsing (cleaner than regex, library already in deps)
- [ ] Extract real `og:image` from each article for relevant pictures
- [ ] Per-source extractors to handle each site's unique HTML structure

### Medium Priority
- [ ] Generate an index page (`magazines/index.html`) listing all editions
- [ ] Add `.gitignore` to exclude `node_modules/`
- [ ] Send daily email with magazine link (via SendGrid/Resend/etc.)

### Polish
- [ ] Add print stylesheet for actual paper printing
- [ ] Add dark/light mode toggle
- [ ] Add table of contents jump links
- [ ] Add reading time estimates per story

---

## Customization

### Change Schedule
Edit `.github/workflows/morning-edition.yml`:
```yaml
- cron: '0 12 * * *'   # noon UTC instead of 7am
- cron: '0 7 * * 1-5'  # weekdays only
```

### Change Sources
Edit the `SOURCES` array at the top of `curator.js`. Each source needs `name`, `url`, and `category`.

### Change Scoring
Edit `keywords.positive` and `keywords.negative` arrays in `scoreStories()`.

### Change Number of Stories
In `main()`, change the limit in `curateStories(stories, 18)`. The `styles` array in `generateSpread()` has 13 layouts and will cycle for counts above 13.

### Change Styling
All CSS is inline in `generateHTML()`. The 13 spread classes (`spread-hero`, `spread-midnight`, etc.) each have their own CSS rules with distinct colors, backgrounds, and effects.

---

## File Reference

### curator.js — Key Functions

| Function | Purpose |
|----------|---------|
| `fetchStories()` | HTTP fetch all 13 source URLs |
| `extractStories(html, source)` | Parse titles, descriptions, URLs from raw HTML |
| `makeAbsoluteUrl(url, base)` | Convert relative URLs to absolute |
| `getImageForKeywords(title)` | Returns an Unsplash placeholder image URL |
| `extractKeywords(text)` | Extracts topic keywords from text |
| `scoreStories(stories)` | Adds `relevanceScore` to each story |
| `curateStories(stories, limit)` | Filters, sorts, dedupes, returns top N |
| `generateHTML(stories)` | Wraps spreads in full HTML document |
| `generateSpread(story, idx, total)` | Generates one story's HTML spread |
| `escapeHtml(text)` | XSS protection for user content |
| `main()` | Entry point — fetches live stories and runs everything |

### .claude/settings.json

Optional SessionStart hook — runs curator.js if you start Claude Code at 7am locally:

```json
{
  "hooks": {
    "SessionStart": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "HOUR=$(date +%H); if [ \"$HOUR\" = \"07\" ]; then LOCK=\"/tmp/morning-edition-$(date +%Y-%m-%d).lock\"; if [ ! -f \"$LOCK\" ]; then node /home/user/curator.js && touch \"$LOCK\"; fi; fi",
        "statusMessage": "Morning Edition: checking if it's time to curate..."
      }]
    }]
  }
}
```

This is **optional** — GitHub Actions handles the real scheduling.

---

## Troubleshooting

### "node: command not found"
Install Node.js 18+ from https://nodejs.org or via package manager.

### GitHub Actions fails with "permission denied"
Repo Settings → Actions → General → Workflow permissions → "Read and write permissions"

### GitHub Actions runs but no commit appears
- Check the workflow logs in the Actions tab
- Verify the magazine HTML file was generated
- The `if [ -n "$(git status --porcelain magazines/)" ]` check skips commit if nothing changed

### Magazine images don't load
The Unsplash placeholder URL may be invalid or rate-limited. Update `getImageForKeywords()` with a new static URL or integrate a real image source.

### Articles all link to source homepage instead of article
The HTML parser fell back to homepage URLs. This is a known limitation of generic regex extraction — per-source extractors with `cheerio` would fix this.

### Local commit fails with "signing failed"
Run: `git config commit.gpgsign false` in the repo.

---

## Quick Reference Commands

```bash
# Run curator once
node curator.js

# Test GitHub Actions workflow manually
# Go to Actions tab → Morning Edition → Run workflow

# Update curator
git add curator.js
git commit -m "Update curator"
git push

# View today's magazine
start magazines/$(date +%Y-%m-%d).html   # Windows (Git Bash)
open magazines/$(date +%Y-%m-%d).html    # macOS
xdg-open magazines/$(date +%Y-%m-%d).html  # Linux
```

---

## Repo URL

https://github.com/BPMSTC/morning-edition

---

## Context Transfer Checklist

To pick this up in a new session:

- [ ] All files in `git ls-files`: `curator.js`, `package.json`, `.claude/settings.json`, `.github/workflows/morning-edition.yml`
- [ ] The repo URL: https://github.com/BPMSTC/morning-edition
- [ ] User's email (for git config): brent.presley@mstc.edu
- [ ] Reader taste: AI tools, creative software, dev tools, privacy, weird science, actionable content — skip governance/policy/ethics

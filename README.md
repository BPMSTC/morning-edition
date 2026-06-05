# Morning Edition

A daily AI news digest that fetches articles from 13 sources, filters by relevance, and generates a styled HTML magazine — automatically, every morning.

Runs at **7am UTC** via GitHub Actions. Each edition is a self-contained HTML file with up to 18 stories, each with sharp editorial commentary written by Claude.

---

## What It Does

- Scrapes 13 AI/tech news sources (blogs, research labs, newsletters)
- Scores and filters stories based on topic relevance — keeps tools, dev content, research; drops governance/policy noise
- Generates 1–2 paragraphs of commentary per story via Claude API
- Outputs a styled HTML magazine to `magazines/YYYY-MM-DD.html`
- Commits and pushes the result automatically via GitHub Actions

---

## Setup

### Prerequisites

- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)

### Install

```bash
git clone https://github.com/BPMSTC/morning-edition.git
cd morning-edition
npm install
```

### Configure

Create a `.env` file in the project root:

```
ANTHROPIC_API_KEY=your-api-key-here
```

### Run

```bash
node curator.js
# or
npm run curate
```

Output: `magazines/YYYY-MM-DD.html`. Open in any browser.

---

## GitHub Actions (Automated Daily Run)

1. Go to **Settings → Secrets and variables → Actions**
2. Add a secret named `ANTHROPIC_API_KEY` with your key
3. Go to **Settings → Actions → General → Workflow permissions**
4. Enable **Read and write permissions**

The workflow runs daily at 7am UTC and commits the new edition to `magazines/`. You can also trigger it manually from the **Actions** tab.

---

## Customization

| What | Where |
|------|-------|
| News sources | `SOURCES` array at top of `curator.js` |
| Scoring keywords | `scoreStories()` in `curator.js` |
| Number of stories | `curateStories(stories, 18)` in `main()` |
| Run schedule | `cron:` in `.github/workflows/morning-edition.yml` |

For full architecture details, function reference, and troubleshooting, see [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md).

---

## Stack

Node.js · ESM · Cheerio · Anthropic SDK · GitHub Actions

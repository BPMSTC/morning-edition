import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { load as cheerioLoad } from "cheerio";
import Anthropic from "@anthropic-ai/sdk";

// Load .env if present (local dev). GitHub Actions uses repo secrets directly.
const __envPath = new URL(".env", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
if (fs.existsSync(__envPath)) {
  const envVars = fs.readFileSync(__envPath, "utf8").split("\n");
  for (const line of envVars) {
    const [key, ...rest] = line.split("=");
    if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SOURCES = [
  {
    name: "Latent Space",
    url: "https://www.latentspace.dev/",
    category: "Software Engineering",
  },
  {
    name: "The Pragmatic Engineer",
    url: "https://blog.pragmaticengineer.com/",
    category: "Software Engineering",
  },
  {
    name: "TechCrunch AI",
    url: "https://techcrunch.com/category/artificial-intelligence/feed/",
    category: "Business",
    type: "rss",
  },
  {
    name: "VentureBeat",
    url: "https://venturebeat.com/category/ai/feed/",
    category: "Business",
    type: "rss",
  },
  {
    name: "OpenAI Blog",
    url: "https://openai.com/news/",
    category: "AI Insiders",
  },
  {
    name: "Google DeepMind News",
    url: "https://deepmind.google/news/",
    category: "AI Insiders",
  },
  {
    name: "The Rundown AI",
    url: "https://www.therundown.ai/",
    category: "Unique",
  },
   {
    name: "Anthropic News",
    url: "https://www.anthropic.com/news",
    category: "AI Insiders",
  },
  {
    name: "Hugging Face Blog",
    url: "https://huggingface.co/blog",
    category: "Open Source AI",
  },
  {
    name: "The Batch",
    url: "https://www.deeplearning.ai/the-batch/tag/the-batch",
    category: "Research & Analysis",
  },
  {
    name: "TLDR AI",
    url: "https://tldr.tech/ai",
    category: "Unique",
  },
  {
    name: "Import AI",
    url: "https://jack-clark.net/",
    category: "Research & Policy",
  },
  {
    name: "MIT News AI",
    url: "https://news.mit.edu/topic/artificial-intelligence2",
    category: "Research & Academia",
  },
];

async function fetchHtmlSource(source) {
  const response = await fetch(source.url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const html = await response.text();
  return extractStories(html, source);
}

async function fetchRssSource(source) {
  const response = await fetch(source.url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const xml = await response.text();
  const $ = cheerioLoad(xml, { xmlMode: true });
  const stories = [];
  $("item").slice(0, 5).each((_, el) => {
    const $el = $(el);
    const title = $el.find("title").text().trim();
    const url =
      $el.find("link").text().trim() ||
      $el.find("guid").text().trim();
    const rawDesc = $el.find("description").text()
      .replace(/<!\[CDATA\[|\]\]>/g, "")
      .replace(/<[^>]+>/g, "")
      .trim()
      .slice(0, 300);
    if (title && url && url.startsWith("http")) {
      stories.push({
        title,
        description: rawDesc || `Article from ${source.name}`,
        url,
        source: source.name,
        category: source.category,
        timestamp: new Date(),
        image: "",
        relevanceScore: 0,
      });
    }
  });
  return stories;
}

async function fetchStories() {
  const stories = [];
  const health = {};

  for (const source of SOURCES) {
    try {
      process.stdout.write(`  Fetching ${source.name}...`);
      const sourceStories = source.type === "rss"
        ? await fetchRssSource(source)
        : await fetchHtmlSource(source);
      stories.push(...sourceStories);
      health[source.name] = sourceStories.length;
      process.stdout.write(` ${sourceStories.length} stories\n`);
    } catch (error) {
      health[source.name] = 0;
      process.stdout.write(` FAILED (${error.message})\n`);
    }
  }

  return { stories, health };
}

function extractStories(html, source) {
  const $ = cheerioLoad(html);
  const stories = [];
  const seen = new Set();

  // Selectors ordered from most specific to least specific
  const linkSelectors = [
    "article h2 a",
    "article h3 a",
    "h2.entry-title a",
    "h3.entry-title a",
    ".post-title a",
    ".article-title a",
    ".post-header a",
    "h2 > a",
    "h3 > a",
  ];

  for (const selector of linkSelectors) {
    if (stories.length >= 5) break;
    $(selector).each((_, el) => {
      if (stories.length >= 5) return false;
      const $el = $(el);
      const title = $el.text().trim().replace(/\s+/g, " ");
      const href = $el.attr("href");

      if (!title || title.length < 10 || /^\d+\s*$/.test(title)) return;

      // Skip navigation/tag/category links
      if (href && /\/(tag|category|author|page|topic)\//.test(href)) return;
      // Skip fragment-only or javascript links
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;

      const url = makeAbsoluteUrl(href, source.url);
      const normalized = title.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (seen.has(normalized)) return;
      seen.add(normalized);

      // Get description from nearest paragraph in the article container
      const $container = $el.closest("article, .post, .entry, .card, li, .item");
      const description = ($container.length ? $container : $el.parent())
        .find("p")
        .first()
        .text()
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 300) || `Article from ${source.name}`;

      stories.push({
        title,
        description,
        url,
        source: source.name,
        category: source.category,
        timestamp: new Date(),
        image: getImageForKeywords(title),
        relevanceScore: 0,
      });
    });
    if (stories.length >= 5) break;
  }

  // Fallback: grab headings without links
  if (stories.length === 0) {
    $("h2, h3").each((_, el) => {
      if (stories.length >= 5) return false;
      const title = $(el).text().trim().replace(/\s+/g, " ");
      if (!title || title.length < 10 || /^\d+\s*$/.test(title)) return;
      const normalized = title.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (seen.has(normalized)) return;
      seen.add(normalized);
      stories.push({
        title,
        description: `Article from ${source.name}`,
        url: source.url,
        source: source.name,
        category: source.category,
        timestamp: new Date(),
        image: getImageForKeywords(title),
        relevanceScore: 0,
      });
    });
  }

  return stories;
}

function makeAbsoluteUrl(url, baseUrl) {
  if (url.startsWith("http")) return url;
  if (url.startsWith("/")) {
    try {
      const base = new URL(baseUrl);
      return base.origin + url;
    } catch {
      return baseUrl;
    }
  }
  return baseUrl;
}

function getImageForKeywords(title) {
  // Use Unsplash API for relevant images based on article keywords
  const keywords = extractKeywords(title);
  if (keywords.length === 0) keywords.push("artificial intelligence");

  // Create a simple image URL using Unsplash
  const query = encodeURIComponent(keywords[0]);
  return `https://images.unsplash.com/photo-1677442d019cecf8978b4ec4c75b31b2?w=800&h=400&fit=crop&q=80`;
}

function extractKeywords(text) {
  const keywords = [
    "AI",
    "machine learning",
    "neural",
    "API",
    "tool",
    "framework",
    "model",
    "code",
    "developer",
  ];
  const found = [];
  const lower = text.toLowerCase();
  for (const kw of keywords) {
    if (lower.includes(kw.toLowerCase())) {
      found.push(kw);
    }
  }
  return found;
}

function scoreStories(stories) {
  const keywords = {
    positive: [
      "AI",
      "tool",
      "software",
      "dev",
      "privacy",
      "code",
      "engineer",
      "creative",
      "application",
      "build",
      "open source",
      "framework",
      "library",
      "API",
      "security",
      "automation",
      "neural",
      "language model",
      "research",
      "model",
      "breakthrough",
      "innovation",
    ],
    negative: [
      "governance",
      "regulation",
      "policy",
      "ethics",
      "bias",
      "safety concerns",
      "lawsuit",
      "investigation",
    ],
  };

  return stories.map((story) => {
    let score = 0;

    const lowerTitle = story.title.toLowerCase();
    const lowerDesc = (story.description || "").toLowerCase();
    const combined = lowerTitle + " " + lowerDesc;

    // Positive keywords boost score
    keywords.positive.forEach((keyword) => {
      if (combined.includes(keyword.toLowerCase())) {
        score += 10;
      }
    });

    // Negative keywords reduce score
    keywords.negative.forEach((keyword) => {
      if (combined.includes(keyword.toLowerCase())) {
        score -= 20;
      }
    });

    // Boost stories from specialized sources
    if (story.source === "Latent Space") score += 5;
    if (story.source === "The Rundown AI") score += 3;

    return {
      ...story,
      relevanceScore: score,
    };
  });
}

function curateStories(stories, limit = 18) {
  // Score and filter
  const scored = scoreStories(stories);
  const filtered = scored.filter((s) => s.relevanceScore > -10);

  // Sort by relevance and deduplicate similar titles
  const sorted = filtered.sort((a, b) => b.relevanceScore - a.relevanceScore);

  const seen = new Set();
  const curated = [];
  for (const story of sorted) {
    const normalized = story.title.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!seen.has(normalized) && curated.length < limit) {
      seen.add(normalized);
      curated.push(story);
    }
  }

  return curated;
}

function generateHTML(stories) {
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0];
  const readableDate = today.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const spreads = stories.map((story, idx) => {
    return generateSpread(story, idx, stories.length);
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Morning Edition - ${dateStr}</title>
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,700&family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', sans-serif;
            background: #0a0a0a;
            color: #333;
            line-height: 1.6;
            overflow-x: hidden;
        }

        .magazine {
            max-width: 100%;
        }

        .header {
            background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
            color: white;
            padding: 80px 40px;
            text-align: center;
            border-bottom: 4px solid #d4a574;
        }

        .header h1 {
            font-family: 'Fraunces', serif;
            font-size: 96px;
            font-weight: 700;
            letter-spacing: -2px;
            margin-bottom: 20px;
            line-height: 1;
        }

        .header .date {
            font-size: 24px;
            font-weight: 300;
            color: #b0b0b0;
            letter-spacing: 2px;
        }

        .header .tagline {
            font-size: 20px;
            margin-top: 20px;
            color: #d4a574;
            font-weight: 300;
            letter-spacing: 1px;
        }

        .spreads {
            display: grid;
            grid-template-columns: 1fr;
        }

        .spread {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 80px 60px;
            position: relative;
            overflow: hidden;
        }

        .spread::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: -1;
        }

        .spread-number {
            font-family: 'Fraunces', serif;
            font-size: 200px;
            font-weight: 700;
            line-height: 1;
            margin-bottom: 40px;
            opacity: 0.15;
        }

        .spread-title {
            font-family: 'Fraunces', serif;
            font-size: 72px;
            font-weight: 700;
            line-height: 1.1;
            margin-bottom: 40px;
        }

        .spread-content {
            font-size: 24px;
            line-height: 1.8;
            max-width: 800px;
            margin-bottom: 40px;
        }

        .spread-description {
            font-size: 20px;
            line-height: 1.7;
            margin-bottom: 30px;
            opacity: 0.95;
        }

        .spread-meta {
            font-size: 18px;
            opacity: 0.8;
            display: flex;
            gap: 40px;
            margin-top: 40px;
            align-items: center;
        }

        .spread-source {
            font-weight: 600;
            font-size: 16px;
        }

        .spread-link {
            background: rgba(255, 255, 255, 0.2);
            padding: 12px 24px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            font-size: 16px;
            transition: all 0.3s ease;
            border: 2px solid rgba(255, 255, 255, 0.3);
        }

        .spread-link:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-2px);
        }

        .article-image {
            width: 100%;
            max-width: 600px;
            height: auto;
            border-radius: 12px;
            margin-bottom: 40px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }

        .article-image-small {
            width: 300px;
            height: 200px;
            object-fit: cover;
            border-radius: 8px;
            margin-bottom: 30px;
        }

        .article-image-sidebar {
            width: 300px;
            height: 250px;
            object-fit: cover;
            border-radius: 12px;
            flex-shrink: 0;
        }

        .card-image {
            width: 100%;
            height: 250px;
            object-fit: cover;
            border-radius: 16px 16px 0 0;
            margin-bottom: 20px;
        }

        .spread-overlay {
            background: rgba(0, 0, 0, 0.5);
            padding: 80px 60px;
            border-radius: 0;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }

        .spread-category {
            opacity: 0.6;
        }

        /* Distinct Spread Styles */

        .spread-hero {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }

        .spread-midnight {
            background: #1a1a2e;
            color: #eee;
        }

        .spread-midnight .spread-title {
            color: #64d7ff;
        }

        .spread-alert {
            background: #f8e9e4;
            color: #2c2c2c;
            border-left: 20px solid #d4574a;
        }

        .spread-alert .spread-title {
            color: #d4574a;
        }

        .spread-terminal {
            background: #0d1117;
            color: #c9d1d9;
            font-family: 'Courier New', monospace;
            padding: 60px;
        }

        .spread-terminal .spread-title {
            color: #58a6ff;
            font-family: 'Courier New', monospace;
            font-size: 48px;
        }

        .spread-terminal .spread-content {
            font-size: 20px;
        }

        .spread-academic {
            background: #faf8f3;
            color: #2c2c2c;
        }

        .spread-academic .spread-title {
            color: #4a4a4a;
        }

        .spread-academic .drop-cap {
            float: left;
            font-family: 'Fraunces', serif;
            font-size: 120px;
            font-weight: 700;
            line-height: 80px;
            margin-right: 20px;
            margin-top: 10px;
        }

        .spread-stat {
            background: linear-gradient(to bottom, #f5f5f5, #ffffff);
            color: #1a1a1a;
        }

        .spread-stat .stat-highlight {
            font-family: 'Fraunces', serif;
            font-size: 140px;
            font-weight: 700;
            color: #d4a574;
            line-height: 1;
            margin: 40px 0;
        }

        .spread-vibrant {
            background: linear-gradient(135deg, #ff6b9d 0%, #feca57 100%);
            color: #1a1a1a;
        }

        .spread-vibrant .spread-title {
            color: #1a1a1a;
            text-shadow: 2px 2px 4px rgba(255,255,255,0.3);
        }

        .spread-minimal {
            background: white;
            color: #2c2c2c;
            padding: 100px 100px;
        }

        .spread-minimal .spread-number {
            color: #d4a574;
            opacity: 0.3;
            font-size: 150px;
        }

        .spread-column {
            background: #f9f9f9;
            color: #2c2c2c;
        }

        .spread-column .spread-content {
            columns: 2;
            column-gap: 60px;
        }

        .spread-tilted {
            background: linear-gradient(45deg, #e8f4f8, #d4e9f7);
            color: #2c2c2c;
            transform: skewY(-2deg);
        }

        .spread-tilted .spread-title {
            transform: skewY(2deg);
        }

        .spread-neon {
            background: #0a0e27;
            color: #00ff88;
            border-top: 8px solid #00ff88;
            border-bottom: 8px solid #ff00ff;
        }

        .spread-neon .spread-title {
            color: #00ff88;
            text-shadow: 0 0 20px rgba(0, 255, 136, 0.5);
        }

        .spread-vintage {
            background: #e8e4d0;
            color: #3a3a3a;
            border: 20px solid #8b7355;
            box-shadow: inset 0 0 30px rgba(0,0,0,0.1);
        }

        .spread-vintage .spread-title {
            text-decoration: underline;
            text-decoration-color: #8b7355;
        }

        .spread-floating {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 60px;
        }

        .spread-floating .card {
            background: rgba(255,255,255,0.95);
            color: #2c2c2c;
            padding: 40px;
            border-radius: 20px;
            max-width: 600px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            transform: translateY(-20px);
        }

        .spread-floating .card .spread-title {
            color: #667eea;
        }

        .footer {
            background: #1a1a1a;
            color: #999;
            text-align: center;
            padding: 60px 40px;
            font-size: 18px;
            border-top: 4px solid #d4a574;
        }

        .footer-title {
            font-family: 'Fraunces', serif;
            font-size: 36px;
            color: #d4a574;
            margin-bottom: 20px;
        }

        @media (max-width: 768px) {
            .spread {
                padding: 60px 40px;
            }

            .spread-title {
                font-size: 48px;
            }

            .header h1 {
                font-size: 56px;
            }

            .spread-number {
                font-size: 120px;
            }

            .spread-content {
                font-size: 18px;
            }
        }
    </style>
</head>
<body>
    <div class="magazine">
        <div class="header">
            <h1>Morning Edition</h1>
            <div class="date">${readableDate}</div>
            <div class="tagline">Your Daily AI News Curated</div>
        </div>

        <div class="spreads">
            ${spreads.join("\n")}
        </div>

        <div class="footer">
            <div class="footer-title">End of Edition</div>
            <p>Next edition: ${getTomorrowDate()}</p>
            <p style="margin-top: 20px; font-size: 14px; opacity: 0.5;">Generated on ${new Date().toLocaleString()}</p>
        </div>
    </div>
</body>
</html>`;

  return html;
}

function getTomorrowDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function generateSpread(story, index, total) {
  const styles = [
    "spread-hero",
    "spread-midnight",
    "spread-alert",
    "spread-terminal",
    "spread-academic",
    "spread-stat",
    "spread-vibrant",
    "spread-minimal",
    "spread-column",
    "spread-tilted",
    "spread-neon",
    "spread-vintage",
    "spread-floating",
  ];

  const styleClass = styles[index % styles.length];
  const number = String(index + 1).padStart(2, "0");

  // Escape HTML in title; format commentary as paragraphs
  const safeTitle = escapeHtml(story.title);
  const commentary = formatCommentary(story.commentary || story.description);

  // Format content based on style
  if (styleClass === "spread-hero") {
    return `<div class="spread ${styleClass}" style="background-image: url('${story.image}'); background-size: cover; background-position: center;">
        <div class="spread-overlay">
            <div class="spread-number">${number}</div>
            <div class="spread-title">${safeTitle}</div>
            ${commentary}
            <div class="spread-meta">
                <span class="spread-source">${escapeHtml(story.source)}</span>
                <a href="${escapeHtml(story.url)}" target="_blank" class="spread-link">Read →</a>
            </div>
        </div>
    </div>`;
  } else if (styleClass === "spread-academic") {
    const firstChar = safeTitle.charAt(0);
    const restOfTitle = safeTitle.slice(1);
    return `<div class="spread ${styleClass}">
        <img src="${story.image}" alt="${safeTitle}" class="article-image" />
        <div class="spread-number">${number}</div>
        <div class="spread-title"><span class="drop-cap">${firstChar}</span>${restOfTitle}</div>
        ${commentary}
        <div class="spread-meta">
            <span class="spread-source">${escapeHtml(story.source)}</span>
            <a href="${escapeHtml(story.url)}" target="_blank" class="spread-link">Read full article →</a>
        </div>
    </div>`;
  } else if (styleClass === "spread-stat") {
    return `<div class="spread ${styleClass}">
        <img src="${story.image}" alt="${safeTitle}" class="article-image-small" />
        <div class="spread-number">${number}</div>
        <div class="stat-highlight">${number}</div>
        <div class="spread-title">${safeTitle}</div>
        ${commentary}
        <div class="spread-meta">
            <span class="spread-source">${escapeHtml(story.source)}</span>
            <a href="${escapeHtml(story.url)}" target="_blank" class="spread-link">Learn more →</a>
        </div>
    </div>`;
  } else if (styleClass === "spread-floating") {
    return `<div class="spread ${styleClass}">
        <div class="card">
            <img src="${story.image}" alt="${safeTitle}" class="card-image" />
            <div class="spread-number">${number}</div>
            <div class="spread-title">${safeTitle}</div>
            ${commentary}
            <div class="spread-meta">
                <span class="spread-source">${escapeHtml(story.source)}</span>
                <a href="${escapeHtml(story.url)}" target="_blank" class="spread-link">Read →</a>
            </div>
        </div>
    </div>`;
  }

  // Default spread template
  return `<div class="spread ${styleClass}">
    <div style="display: flex; gap: 40px; align-items: center;">
        <img src="${story.image}" alt="${safeTitle}" class="article-image-sidebar" />
        <div>
            <div class="spread-number">${number}</div>
            <div class="spread-title">${safeTitle}</div>
            ${commentary}
            <div class="spread-meta">
                <span class="spread-source">${escapeHtml(story.source)}</span>
                <a href="${escapeHtml(story.url)}" target="_blank" class="spread-link">Read more →</a>
            </div>
        </div>
    </div>
</div>`;
}

function escapeHtml(text) {
  if (!text) return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

function generateFallbackImage(source, category) {
  const colors = {
    "Software Engineering": ["#1a1a2e", "#64d7ff"],
    "Business":             ["#1c2833", "#f0b27a"],
    "AI Insiders":          ["#4a235a", "#d7bde2"],
    "Open Source AI":       ["#1a5276", "#7fb3d3"],
    "Research & Analysis":  ["#145a32", "#82e0aa"],
    "Research & Policy":    ["#6e2f1a", "#f1948a"],
    "Research & Academia":  ["#1a3a5c", "#aed6f1"],
    "Unique":               ["#7d6608", "#f9e79f"],
  };
  const [bg, fg] = colors[category] || ["#2c2c2c", "#aaaaaa"];
  const label = source.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400">
  <rect width="800" height="400" fill="${bg}"/>
  <text x="400" y="185" font-family="Georgia,serif" font-size="28" fill="${fg}" opacity="0.7" text-anchor="middle">${label}</text>
  <text x="400" y="230" font-family="Georgia,serif" font-size="18" fill="${fg}" opacity="0.4" text-anchor="middle">${category}</text>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

// Find the section of a page most relevant to the story title.
// For newsletters (Rundown, TLDR, Import AI) the "page" is the whole issue —
// this extracts only the story we care about. For regular articles it's a no-op.
function findRelevantSection(text, title) {
  const keywords = (title.toLowerCase().match(/\b[a-z]{4,}\b/g) || []);
  if (keywords.length === 0) return text.slice(0, 3000);

  // Split into paragraphs; each blank line is a potential section boundary
  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 20);

  let bestIdx = 0;
  let bestScore = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const lower = paragraphs[i].toLowerCase();
    const hits = keywords.filter(w => lower.includes(w)).length;
    const score = hits / keywords.length;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  // If nothing matched well, return the start of the document
  if (bestScore < 0.25) return text.slice(0, 3000);

  // Return the matched paragraph + the next 4 paragraphs (covers multi-para newsletter items)
  return paragraphs.slice(bestIdx, bestIdx + 5).join("\n\n").slice(0, 3000);
}

async function fetchArticleData(url, title) {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return { image: null, content: null };

    const html = await response.text();
    const $ = cheerioLoad(html);

    // og:image
    const rawImage =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      $('meta[name="twitter:image:src"]').attr("content") ||
      null;
    const image = rawImage && rawImage.startsWith("http") ? rawImage : null;

    // Article content — strip chrome, keep body
    $("nav, header, footer, script, style, .nav, .header, .footer, .sidebar, .ad, .subscribe, .newsletter-form").remove();
    const bodyEl = $("article, .post-content, .entry-content, .article-body, main").first();
    const rawText = (bodyEl.length ? bodyEl : $("body"))
      .text()
      .replace(/\s+/g, " ")
      .replace(/ {2,}/g, "\n\n")
      .trim();

    const content = rawText.length > 100 ? findRelevantSection(rawText, title) : null;

    return { image, content };
  } catch {
    return { image: null, content: null };
  }
}

const SEEN_TITLES_FILE = path.join(__dirname, "seen-titles.json");
const SEEN_TTL_DAYS = 7;

function loadSeenTitles() {
  try {
    const raw = JSON.parse(fs.readFileSync(SEEN_TITLES_FILE, "utf8"));
    const cutoff = Date.now() - SEEN_TTL_DAYS * 24 * 60 * 60 * 1000;
    return Object.fromEntries(
      Object.entries(raw).filter(([, date]) => new Date(date).getTime() > cutoff)
    );
  } catch {
    return {};
  }
}

function saveSeenTitles(existing, newTitles) {
  const today = new Date().toISOString().split("T")[0];
  const updated = { ...existing };
  for (const title of newTitles) updated[title] = today;
  fs.writeFileSync(SEEN_TITLES_FILE, JSON.stringify(updated, null, 2));
}

function normalizeTitle(title) {
  return title.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function formatCommentary(text) {
  if (!text) return "";
  return text
    .split(/\n\n+/)
    .filter((p) => p.trim())
    .map((p) => `<p class="spread-description">${escapeHtml(p.trim())}</p>`)
    .join("\n");
}

async function generateCommentary(story, articleContent) {
  const client = new Anthropic();
  const context = articleContent
    ? `Article content:\n${articleContent}`
    : `Available context: ${story.description}`;

  const prompt = `You are writing for a daily AI news digest. One reader: technically sophisticated, not a policymaker, doesn't care about AI governance theater.

Article: "${story.title}"
Source: ${story.source} (${story.category})
${context}

Write 1–2 tight paragraphs covering:
1. What this news actually is — specific, no vague summary
2. How it moves the field forward (or doesn't)
3. Context the reader likely doesn't already know
4. Ethical implications only if genuinely material — skip the boilerplate

Style: Sharp. Witty. Pointed. Blunt. No "it remains to be seen." No "this could potentially." No "in the rapidly evolving landscape of." Call things what they are. If something is overhyped, say so.`;

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });
    return response.content[0].text.trim();
  } catch (err) {
    console.error(`Commentary failed for "${story.title}":`, err.message);
    return story.description;
  }
}

async function main() {
  const testMode = process.argv.includes("--test");
  const storyLimit = testMode ? 2 : 18;
  const minThreshold = testMode ? 1 : 5;

  if (testMode) {
    console.log("TEST MODE — 2 stories, seen-titles will not be updated\n");
  }

  try {
    console.log("Starting Morning Edition curation...");

    const seenTitles = loadSeenTitles();

    console.log(`Fetching from ${SOURCES.length} sources...`);
    const { stories, health } = await fetchStories();

    // Source health report
    console.log("\nSource health:");
    const dead = [];
    for (const [name, count] of Object.entries(health)) {
      const flag = count === 0 ? " ⚠  NO STORIES" : "";
      console.log(`  ${count.toString().padStart(2)} stories  ${name}${flag}`);
      if (count === 0) dead.push(name);
    }
    if (dead.length) {
      console.log(`\n  Dead sources (JS-rendered or blocked): ${dead.join(", ")}`);
    }

    // Filter stories seen in the last ${SEEN_TTL_DAYS} days
    const fresh = stories.filter(s => !seenTitles[normalizeTitle(s.title)]);
    console.log(`\n${stories.length} raw → ${fresh.length} after dedup (${stories.length - fresh.length} already seen)`);

    const curated = curateStories(fresh, storyLimit);
    console.log(`${curated.length} stories after scoring/curation`);

    if (curated.length < minThreshold) {
      console.error(`\nERROR: Only ${curated.length} stories passed curation — minimum is ${minThreshold}. Aborting.`);
      process.exit(1);
    }

    curated.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.title} (${s.source})`);
    });

    // Fetch article pages in parallel: extract og:image + relevant content in one request
    console.log("\nFetching article content and images...");
    const withArticleData = await Promise.all(
      curated.map(async (story) => {
        const { image, content } = await fetchArticleData(story.url, story.title);
        return {
          ...story,
          image: image || generateFallbackImage(story.source, story.category),
          articleContent: content,
        };
      })
    );

    // Generate sharp commentary for each story via Claude API (sequential to avoid rate limits)
    console.log("\nGenerating commentary...");
    const enriched = [];
    for (let i = 0; i < withArticleData.length; i++) {
      const story = withArticleData[i];
      const commentary = await generateCommentary(story, story.articleContent);
      console.log(`  ${i + 1}/${withArticleData.length} done: ${story.title.slice(0, 50)}`);
      enriched.push({ ...story, commentary });
    }

    // Persist seen titles (skipped in test mode so test runs don't pollute the dedup list)
    if (!testMode) {
      saveSeenTitles(seenTitles, enriched.map(s => normalizeTitle(s.title)));
    }

    // Generate HTML
    const html = generateHTML(enriched);

    // Save file
    const date = new Date().toISOString().split("T")[0];
    const suffix = testMode ? `-test` : "";
    const filename = path.join(__dirname, "magazines", `${date}${suffix}.html`);

    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, html);

    console.log(`\n✓ Magazine saved: ${filename}`);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();

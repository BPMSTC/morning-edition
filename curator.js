import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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
    url: "https://techcrunch.com/tag/artificial-intelligence/",
    category: "Business",
  },
  {
    name: "VentureBeat",
    url: "https://venturebeat.com/ai/",
    category: "Business",
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

async function fetchStories() {
  const stories = [];

  for (const source of SOURCES) {
    try {
      console.log(`Fetching from ${source.name}...`);
      const response = await fetch(source.url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      if (!response.ok) {
        console.error(`Failed to fetch ${source.name}: ${response.status}`);
        continue;
      }

      const html = await response.text();
      const sourceStories = extractStories(html, source);
      stories.push(...sourceStories);
    } catch (error) {
      console.error(`Error fetching ${source.name}:`, error.message);
    }
  }

  return stories;
}

function extractStories(html, source) {
  const stories = [];

  // Extract articles using common patterns with title, description, and URL
  const articlePatterns = [
    // Generic article pattern: h2/h3 followed by paragraph
    /<(?:h[2-3]|a)[^>]*href="([^"]+)"[^>]*>([^<]+)<\/(?:h[2-3]|a)>[\s\S]{0,300}?<p[^>]*>([^<]{10,300})/gi,
    // Article with data attributes
    /<article[^>]*>[\s\S]{0,2000}?<(?:h[2-3]|a)[^>]*href="([^"]+)"[^>]*>([^<]+)<\/(?:h[2-3]|a)>[\s\S]{0,500}?<p[^>]*>([^<]{10,300})/gi,
  ];

  let count = 0;
  for (const pattern of articlePatterns) {
    if (count >= 5) break;
    let match;
    while ((match = pattern.exec(html)) !== null && count < 5) {
      const url = match[1]?.trim();
      const title = match[2]?.trim();
      const description = match[3]?.trim();

      if (title && title.length > 10 && !title.match(/^\d+\s*$/)) {
        // Clean up description
        const cleanDesc = description
          ?.replace(/<[^>]+>/g, "")
          ?.replace(/&[a-z]+;/g, "")
          ?.slice(0, 200);

        stories.push({
          title,
          description: cleanDesc || "Article from " + source.name,
          url: url ? makeAbsoluteUrl(url, source.url) : source.url,
          source: source.name,
          category: source.category,
          timestamp: new Date(),
          image: getImageForKeywords(title),
          relevanceScore: 0,
        });
        count++;
      }
    }
  }

  // Fallback: simple extraction if patterns don't work
  if (stories.length === 0) {
    const fallbackPattern =
      /<(?:h[2-3])[^>]*>([^<]{10,200})<\/(?:h[2-3])>/gi;
    let match;
    let count = 0;
    while ((match = fallbackPattern.exec(html)) !== null && count < 5) {
      const title = match[1]?.trim();
      if (title && title.length > 10 && !title.match(/^\d+\s*$/)) {
        stories.push({
          title,
          description: "New article from " + source.name,
          url: source.url,
          source: source.name,
          category: source.category,
          timestamp: new Date(),
          image: getImageForKeywords(title),
          relevanceScore: 0,
        });
        count++;
      }
    }
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

  // Escape HTML in title and description
  const safeTitle = escapeHtml(story.title);
  const safeDesc = escapeHtml(story.description || "");

  // Format content based on style
  if (styleClass === "spread-hero") {
    return `<div class="spread ${styleClass}" style="background-image: url('${story.image}'); background-size: cover; background-position: center;">
        <div class="spread-overlay">
            <div class="spread-number">${number}</div>
            <div class="spread-title">${safeTitle}</div>
            <div class="spread-description">${safeDesc}</div>
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
        <div class="spread-description">${safeDesc}</div>
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
        <div class="spread-description">${safeDesc}</div>
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
            <div class="spread-description">${safeDesc}</div>
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
            <div class="spread-description">${safeDesc}</div>
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

async function main() {
  try {
    console.log("Starting Morning Edition curation...");

    // For now, create a demo with sample stories since we're testing
    // In production, this would fetch real stories
    const stories = [
      {
        title: "Claude Updates: New Improvements to AI Assistant",
        description: "Latest enhancements to Claude's capabilities including improved reasoning, better context understanding, and new tool integration features.",
        source: "OpenAI Blog",
        category: "AI Insiders",
        url: "https://openai.com",
        timestamp: new Date(),
        image: "https://images.unsplash.com/photo-1677442d019cecf8978b4ec4c75b31b2?w=800&h=400&fit=crop&q=80",
      },
      {
        title: "Building Production-Grade AI Tools",
        description: "Learn best practices for deploying AI applications in production environments, from infrastructure to monitoring and scaling.",
        source: "The Pragmatic Engineer",
        category: "Software Engineering",
        url: "https://pragmaticengineer.com",
        timestamp: new Date(),
        image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop&q=80",
      },
      {
        title: "DeepMind Releases New Research on Neural Networks",
        description: "Breakthrough research on transformer architectures and attention mechanisms that could improve model efficiency by 40%.",
        source: "Google DeepMind News",
        category: "AI Insiders",
        url: "https://deepmind.google",
        timestamp: new Date(),
        image: "https://images.unsplash.com/photo-1516321318423-f06fe8c66a7b?w=800&h=400&fit=crop&q=80",
      },
      {
        title: "AI-Powered Privacy Tools Transform Data Protection",
        description: "New generation of privacy-preserving machine learning tools allows companies to train models without exposing sensitive user data.",
        source: "TechCrunch AI",
        category: "Business",
        url: "https://techcrunch.com",
        timestamp: new Date(),
        image: "https://images.unsplash.com/photo-1550439062-1d5daa881006?w=800&h=400&fit=crop&q=80",
      },
      {
        title: "Creative Code Generation: The Future of Development",
        description: "AI code generation tools are evolving beyond simple completions to handle complex architectural decisions and design patterns.",
        source: "Latent Space",
        category: "Software Engineering",
        url: "https://latentspace.dev",
        timestamp: new Date(),
        image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&h=400&fit=crop&q=80",
      },
      {
        title: "Open Source AI Framework Reaches 1M Downloads",
        description: "Community-driven AI framework hits major milestone, demonstrating strong adoption in enterprise and startup environments worldwide.",
        source: "The Rundown AI",
        category: "Unique",
        url: "https://therundown.ai",
        timestamp: new Date(),
        image: "https://images.unsplash.com/photo-1517694712845-70c9cc0c1d5b?w=800&h=400&fit=crop&q=80",
      },
      {
        title: "Developers Embrace AI-Assisted Coding Workflows",
        description: "Survey reveals 78% of developers now use AI tools daily for coding, with 65% reporting significant productivity gains.",
        source: "VentureBeat",
        category: "Business",
        url: "https://venturebeat.com",
        timestamp: new Date(),
        image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&h=400&fit=crop&q=80",
      },
      {
        title: "Privacy-First Language Models Gain Traction",
        description: "New approaches to federated learning and differential privacy enable AI models that respect user privacy by design.",
        source: "The Pragmatic Engineer",
        category: "Software Engineering",
        url: "https://pragmaticengineer.com",
        timestamp: new Date(),
        image: "https://images.unsplash.com/photo-1550439062-1d5daa881006?w=800&h=400&fit=crop&q=80",
      },
      {
        title: "Weird Science: AI Discovers New Materials",
        description: "Machine learning algorithms identify novel crystalline structures with unique properties, accelerating materials science by years.",
        source: "Latent Space",
        category: "Software Engineering",
        url: "https://latentspace.dev",
        timestamp: new Date(),
        image: "https://images.unsplash.com/photo-1518581506702-bba5e3b2c6f7?w=800&h=400&fit=crop&q=80",
      },
      {
        title: "API Design Best Practices for AI Services",
        description: "Comprehensive guide to designing robust APIs for machine learning services with emphasis on scalability and reliability.",
        source: "OpenAI Blog",
        category: "AI Insiders",
        url: "https://openai.com",
        timestamp: new Date(),
        image: "https://images.unsplash.com/photo-1573804633827-038bfbb4e87c?w=800&h=400&fit=crop&q=80",
      },
      {
        title: "Automation Tools Powered by Recent AI Breakthroughs",
        description: "Latest AI models enable new wave of intelligent automation for business processes, reducing manual work by 50%+.",
        source: "The Rundown AI",
        category: "Unique",
        url: "https://therundown.ai",
        timestamp: new Date(),
        image: "https://images.unsplash.com/photo-1516321318423-f06fe8c66a7b?w=800&h=400&fit=crop&q=80",
      },
      {
        title: "Machine Learning Framework Wars: Which Will Win?",
        description: "Analysis of competing ML frameworks shows PyTorch gaining ground in research, TensorFlow dominating enterprise.",
        source: "TechCrunch AI",
        category: "Business",
        url: "https://techcrunch.com",
        timestamp: new Date(),
        image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&h=400&fit=crop&q=80",
      },
    ];

    const curated = curateStories(stories, 12);

    console.log(`Curated ${curated.length} stories`);
    curated.forEach((s, i) => {
      console.log(`${i + 1}. ${s.title} (${s.source})`);
    });

    // Generate HTML
    const html = generateHTML(curated);

    // Save file
    const date = new Date().toISOString().split("T")[0];
    const filename = path.join(__dirname, "magazines", `${date}.html`);

    // Ensure directory exists
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, html);

    console.log(`\n✓ Magazine saved: ${filename}`);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();

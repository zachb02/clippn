import sharp from "sharp";
import { escapeXml, wrapToWidth } from "./render";

/**
 * Renders a deterministic "story post card" background via sharp/SVG --
 * not AI-generated, so this workflow doesn't need image-generation
 * capability at all, only text + speech + transcription. Uses a generic
 * placeholder community/author label ("r/stories", "u/anonymous") and a
 * visible "AI-narrated story" line, never a real subreddit or username --
 * this is a well-understood stylistic convention for narrated story
 * content, not a claim that a specific real post exists.
 */
export async function renderStoryCard(title: string, width: number, height: number): Promise<Buffer> {
  const titleFontSize = 56;
  const safeWidth = width * 0.86;
  const lines = wrapToWidth(title, titleFontSize, safeWidth).slice(0, 8);
  const lineHeight = titleFontSize * 1.3;
  const cardTop = height * 0.28;
  const cardPadding = width * 0.07;

  const titleTspans = lines
    .map((line, i) => `<tspan x="${cardPadding}" y="${cardTop + 140 + i * lineHeight}">${escapeXml(line)}</tspan>`)
    .join("\n");

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${height}" fill="#0f0f13"/>
    <rect x="${cardPadding * 0.6}" y="${cardTop}" width="${width - cardPadding * 1.2}" height="${height * 0.5}"
      rx="28" fill="#1a1a20" stroke="#2c2c34" stroke-width="2"/>
    <circle cx="${cardPadding + 24}" cy="${cardTop + 60}" r="20" fill="#3a3a44"/>
    <text x="${cardPadding + 58}" y="${cardTop + 54}" font-size="26" font-weight="700" fill="#e8e8ec" font-family="sans-serif">r/stories</text>
    <text x="${cardPadding + 58}" y="${cardTop + 84}" font-size="20" fill="#8a8a94" font-family="sans-serif">Posted by u/anonymous</text>
    <text font-size="${titleFontSize}" font-weight="700" fill="#f5f5f7" font-family="sans-serif">
      ${titleTspans}
    </text>
    <text x="${width / 2}" y="${height - 60}" font-size="24" fill="#6a6a74" text-anchor="middle" font-family="sans-serif">
      AI-generated story, narrated
    </text>
  </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

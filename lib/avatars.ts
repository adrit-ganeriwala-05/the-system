/**
 * HUD-style rank insignia, offered as an alternative to a Google profile photo.
 *
 * Stored as a self-contained data URI in User.image so every existing <img> that renders
 * an avatar works unchanged, with no asset hosting and no special-casing at render time.
 * Colors are baked in rather than tokenized: an SVG in an <img> cannot inherit page CSS
 * variables, and these read acceptably on both themes.
 */
export const INSIGNIA_RANKS = ["E", "D", "C", "B", "A", "S"] as const;
export type InsigniaRank = (typeof INSIGNIA_RANKS)[number];

// One light temperature for all six. The letter carries the distinction, not a hue —
// six colored avatars would break the interface's near-monochrome discipline.
const INSIGNIA_LIGHT = "#7fefff";

export function insigniaDataUri(rank: InsigniaRank): string {
  const accent = INSIGNIA_LIGHT;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stop-color="#12151f"/><stop offset="100%" stop-color="#05070c"/>
</linearGradient></defs>
<rect width="96" height="96" fill="url(#g)"/>
<path d="M 14 4.5 H 82 L 91.5 14 V 82 L 82 91.5 H 14 L 4.5 82 V 14 Z" fill="none" stroke="${accent}" stroke-width="2.5"/>
<path d="M48 14 L74 28 V54 C74 68 62 78 48 84 C34 78 22 68 22 54 V28 Z" fill="none" stroke="${accent}" stroke-width="2.5" opacity="0.55"/>
<text x="48" y="60" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="34" font-weight="700" fill="${accent}" text-anchor="middle">${rank}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const INSIGNIA_OPTIONS = INSIGNIA_RANKS.map((rank) => ({
  rank,
  uri: insigniaDataUri(rank),
}));

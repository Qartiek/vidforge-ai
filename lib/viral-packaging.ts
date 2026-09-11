export type PackagingBrief = {
  title: string;
  description: string;
  tags: string[];
  thumbnail?: string;
};

export type PackagingResult = {
  title: string;
  description: string;
  tags: string[];
  ctrScore: number;
  recommendations: string[];
};

export function scoreTitle(title: string): number {
  let score = 50;
  if (title.length < 30) score += 10;
  if (title.length > 70) score -= 15;
  if (/[\[\(]/.test(title)) score += 10;
  if (/\d+/.test(title)) score += 5;
  if (/why|how|best|top|ultimate|secret|revealed/i.test(title)) score += 15;
  return Math.min(100, Math.max(0, score));
}

export function scoreDescription(description: string): number {
  let score = 50;
  if (description.length < 100) score -= 10;
  if (description.length > 500) score -= 10;
  if (description.includes("\n")) score += 5;
  if (/call.{0,10}action|subscribe|link|description/i.test(description)) score += 10;
  return Math.min(100, Math.max(0, score));
}

export function analyzeThumbnail(thumbnail: string): number {
  let score = 50;
  if (thumbnail.includes("face")) score += 15;
  if (thumbnail.includes("text")) score += 10;
  if (thumbnail.includes("emotion")) score += 10;
  if (thumbnail.includes("contrast")) score += 10;
  return Math.min(100, Math.max(0, score));
}

export function scorePackaging(brief: PackagingBrief): PackagingResult {
  const titleScore = scoreTitle(brief.title);
  const descriptionScore = scoreDescription(brief.description);
  const thumbnailScore = brief.thumbnail ? analyzeThumbnail(brief.thumbnail) : 50;
  const tagScore = Math.min(100, brief.tags.length * 10);
  const ctrScore = Math.round((titleScore + descriptionScore + thumbnailScore + tagScore) / 4);
  const recommendations: string[] = [];
  if (titleScore < 60) recommendations.push("Title could be more compelling. Add power words like 'Why', 'How', or 'Best'.");
  if (descriptionScore < 60) recommendations.push("Expand description and add clear CTA. Aim for 200-500 characters.");
  if (brief.tags.length < 5) recommendations.push("Add more tags to improve discoverability (aim for 10-15 relevant tags).");
  if (thumbnailScore < 60 && brief.thumbnail) recommendations.push("Thumbnail could use more contrast, emotion, or face prominence.");
  return { title: brief.title, description: brief.description, tags: brief.tags, ctrScore, recommendations };
}

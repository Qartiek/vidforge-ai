export type QualityCheckInput = {
  title: string;
  script: string;
  description: string;
};

export type QualityCheckResult = {
  passed: boolean;
  score: number;
  issues: Array<{ level: "error" | "warning" | "info"; message: string }>;
  recommendations: string[];
};

export function runContentQualityChecks(input: QualityCheckInput): QualityCheckResult {
  const issues: Array<{ level: "error" | "warning" | "info"; message: string }> = [];
  let score = 100;

  // Title checks
  if (input.title.length < 10) {
    issues.push({ level: "error", message: "Title is too short (minimum 10 characters)" });
    score -= 20;
  }
  if (input.title.length > 100) {
    issues.push({ level: "warning", message: "Title exceeds 100 characters and may be truncated on YouTube" });
    score -= 10;
  }
  if (!/[A-Z]/.test(input.title)) {
    issues.push({ level: "warning", message: "Title has no capital letters" });
    score -= 5;
  }

  // Script checks
  if (input.script.length < 50) {
    issues.push({ level: "error", message: "Script is too short (minimum 50 characters)" });
    score -= 20;
  }
  const hookPattern = /^[^.!?]{20,}/;
  if (!hookPattern.test(input.script)) {
    issues.push({ level: "warning", message: "Script may lack a strong opening hook" });
    score -= 15;
  }
  const allCaps = (input.script.match(/[A-Z]{10,}/g) || []).length;
  if (allCaps > 0) {
    issues.push({ level: "info", message: `Script contains ${allCaps} passages in all caps (consider varying case)` });
  }

  // Description checks
  if (input.description.length < 50) {
    issues.push({ level: "warning", message: "Description is short. Aim for 200+ characters to improve SEO." });
    score -= 10;
  }
  if (input.description.length > 5000) {
    issues.push({ level: "warning", message: "Description exceeds 5000 bytes" });
    score -= 5;
  }

  const recommendations: string[] = [];
  if (score < 50) recommendations.push("Review critical issues before publishing.");
  if (!/[?!]$/.test(input.script)) recommendations.push("Consider ending the script with a question or exclamation for stronger CTA.");
  if (!/(subscribe|like|comment|share|check|link)/i.test(input.description))
    recommendations.push("Add a clear call-to-action in the description.");

  return {
    passed: score >= 60,
    score: Math.max(0, score),
    issues,
    recommendations,
  };
}

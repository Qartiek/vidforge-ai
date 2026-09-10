export type QualityReport = {
  score: number;
  checks: { name: string; status: "pass" | "warn"; detail: string }[];
  ready: boolean;
};

export function runContentQualityChecks(input: {
  title?: string;
  script?: string;
  description?: string;
  tags?: string[];
}): QualityReport {
  const script = input.script?.trim() || "";
  const title = input.title?.trim() || "";
  const description = input.description?.trim() || "";
  const tags = Array.isArray(input.tags) ? input.tags.filter(Boolean) : [];
  const opening = script.slice(0, 900);
  const ending = script.slice(-1400);

  const checks: QualityReport["checks"] = [
    { name: "Title present", status: title ? "pass" : "warn", detail: title ? "Title is available" : "Title is missing" },
    { name: "Script present", status: script.length > 120 ? "pass" : "warn", detail: script.length > 120 ? "Script has usable length" : "Script is missing or too short" },
    { name: "Hook in opening", status: /why|imagine|here's|heres|today|you('re| are)|most people|the truth|what if/i.test(opening) ? "pass" : "warn", detail: "Opening should establish a strong, honest reason to keep watching" },
    { name: "Retention structure", status: /but|however|next|first|then|finally|here's why|the problem/i.test(script) ? "pass" : "warn", detail: "Script should contain transitions or retention beats" },
    { name: "CTA", status: /subscribe|follow|comment|share|learn more|check out/i.test(ending) ? "pass" : "warn", detail: "A natural CTA is recommended near the ending" },
    { name: "Description", status: description.length > 40 ? "pass" : "warn", detail: description.length > 40 ? "Description is available" : "Description is missing or too short" },
    { name: "Tags", status: tags.length >= 3 ? "pass" : "warn", detail: tags.length >= 3 ? `${tags.length} tags available` : "Add at least 3 relevant tags" },
    { name: "Verification safety", status: /\[VERIFY\]/i.test(script) ? "warn" : "pass", detail: /\[VERIFY\]/i.test(script) ? "Some claims require verification" : "No explicit verification flags" },
    { name: "Safety / manipulation", status: /guaranteed|100% guaranteed|secret hack that always|instant money/i.test(script) ? "warn" : "pass", detail: /guaranteed|100% guaranteed|secret hack that always|instant money/i.test(script) ? "Potentially misleading certainty detected" : "No obvious certainty/manipulation phrase detected" },
  ];

  const passed = checks.filter((x) => x.status === "pass").length;
  const score = Math.round((passed / checks.length) * 100);
  return { score, checks, ready: score >= 80 && !checks.some((x) => x.name === "Verification safety" && x.status === "warn") };
}

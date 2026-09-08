export const SECURITY_POLICY={
  secrets:"Never expose provider keys to client code, logs, API responses or Git history.",
  auth:"All user-owned resources must be authorized server-side; never trust userId from request bodies.",
  validation:"Validate and bound every external input before processing.",
  rateLimit:"Apply per-user and per-IP rate limits to expensive endpoints.",
  jobs:"Jobs must be idempotent, authenticated, authorization-checked and retry-bounded.",
  uploads:"Allowlist file types, enforce size limits, scan untrusted files and store outside executable paths.",
  webhooks:"Verify provider signatures before processing webhooks and make handlers idempotent.",
  payments:"Never store raw card data; use a PCI-compliant payment provider.",
  publishing:"Require explicit user authorization before publishing to external accounts.",
  privacy:"Minimize stored personal data and provide deletion/export workflows.",
  audit:"Record security-relevant events without storing secrets or sensitive payloads."
} as const;

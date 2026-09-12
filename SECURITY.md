# NOVYN Security Baseline

NOVYN treats security as a release requirement, not a feature added later.

## Required controls before production
- Real authentication and server-side authorization on every protected resource.
- PostgreSQL with least-privilege database credentials and encrypted connections.
- Secrets stored only in the deployment secret manager; never in source code or client bundles.
- Strict input validation, output encoding and bounded payload sizes.
- Per-user and per-IP rate limiting for AI, upload, render and publish endpoints.
- Idempotency keys and bounded retries for asynchronous jobs.
- Signed webhook verification and replay protection.
- Secure OAuth state/PKCE and minimum YouTube scopes required for publishing.
- Payment processing delegated to a PCI-compliant provider; no raw card storage.
- Upload MIME/extension allowlists, size limits, malware scanning and isolated object storage.
- Security headers, HTTPS, dependency scanning, secret scanning and audit logging.
- Explicit authorization before YouTube publishing or other external side effects.
- Data retention, account deletion and export controls.

## Rule
A feature is not considered production-ready until authentication, authorization, validation, rate limiting, logging and failure handling have been implemented for its threat model.
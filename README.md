# VidForge AI

AI-powered YouTube content creation and automation SaaS — from idea to publish.

## Foundation
- Next.js + TypeScript web app
- Public landing page
- Creator dashboard
- Pricing foundation
- Super Admin foundation
- Modular content production pipeline
- API health endpoint
- Project creation API foundation
- PostgreSQL + Prisma persistence
- Authentication, rate limiting and audit logging
- Stripe billing foundation
- Secure YouTube OAuth 2.0 connection
- Idempotent YouTube publish queue
- Encrypted YouTube access/refresh tokens
- Resumable YouTube video upload worker
- Private asset materialization with HTTPS host allowlist and size limits
- Scheduled YouTube job dispatcher
- CI build/type checks

## Production pipeline
Research -> Hook -> Script -> Voice -> Visuals -> Edit -> Thumbnail -> SEO -> Publish

## Initial niche
Company finance and business analysis, with a modular architecture for additional niches.

## YouTube publishing flow
Generated video asset -> secure asset storage -> publish request -> queued job -> scheduled dispatcher -> authenticated worker -> YouTube resumable upload -> YouTube Video ID -> published status.

## Required production configuration
Copy `.env.example` into the deployment environment and configure real server-side values. At minimum, the database, application URL, authentication/encryption secrets, worker/cron secrets, asset storage host, and YouTube OAuth credentials are required for live YouTube publishing. Stripe requires real Price IDs and webhook credentials before live billing is enabled.

Never commit real secrets to GitHub. `JOB_WORKER_SECRET` and `CRON_SECRET` must be long random values. Asset storage must use a private HTTPS host controlled by the deployment.

## Status
**Public-ready application foundation.** Core security, persistence, billing foundation, YouTube OAuth, queued publishing, worker execution, scheduled dispatch and CI checks are implemented. External provider credentials and production infrastructure must still be configured in the deployment environment before live publishing/billing can operate.

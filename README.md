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
- Scheduled worker dispatch
- CI build/type checks

## Production pipeline
Research -> Hook -> Script -> Voice -> Visuals -> Edit -> Thumbnail -> SEO -> Publish

## Initial niche
Company finance and business analysis, with a modular architecture for additional niches.

## YouTube publishing flow
Generated video asset -> secure asset storage -> publish request -> queued job -> scheduled dispatcher -> authenticated worker -> YouTube resumable upload -> YouTube Video ID -> published status.

## Free deployment architecture
The web application can be deployed on Vercel Hobby. The background worker dispatcher is intentionally run by the public GitHub Actions workflow `.github/workflows/worker-dispatch.yml`, so the app does not depend on paid per-minute Vercel Cron scheduling.

The GitHub Actions scheduler runs every 5 minutes and calls the protected pipeline and YouTube dispatcher endpoints. Configure these GitHub repository secrets:
- `APP_URL` — the deployed HTTPS application URL
- `CRON_SECRET` — the same long random secret configured in the deployment environment

The workflow also supports manual execution with **Run workflow**.

## Required production configuration
Copy `.env.example` into the deployment environment and configure real server-side values. At minimum, the database, application URL, authentication/encryption secrets, worker/cron secrets, asset storage host, and YouTube OAuth credentials are required for live YouTube publishing. Stripe requires real Price IDs and webhook credentials before live billing is enabled.

Never commit real secrets to GitHub. `JOB_WORKER_SECRET` and `CRON_SECRET` must be long random values. Asset storage must use a private HTTPS host controlled by the deployment.

## Status
**Public-ready application foundation.** Core security, persistence, billing foundation, YouTube OAuth, queued publishing, worker execution, free GitHub Actions dispatch and CI checks are implemented. External provider credentials, PostgreSQL and production asset/render infrastructure must still be configured before live AI generation, publishing and billing can operate.

## Deployment
Vercel build configuration uses `prisma generate && next build`; database migrations are intentionally run separately from the Vercel build.

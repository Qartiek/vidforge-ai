# VidForge AutoPilot

AutoPilot is designed as a durable pipeline rather than a single long-running request:

1. Topic/idea selection
2. Research and source verification
3. Original angle + script
4. Production assets and rendering
5. Quality/originality/policy gates
6. Calendar scheduling
7. YouTube upload/scheduling
8. Analytics collection
9. Feedback for future topics and packaging

## Safety boundary
Auto-publish must remain disabled until the configured quality gate passes and the required YouTube OAuth connection is available. Missing provider credentials must fail the individual run cleanly rather than silently publishing placeholder content.

## External requirements
- OpenAI provider credentials for AI generation.
- YouTube OAuth 2.0 channel connection for publishing.
- A live worker/cron execution environment for background jobs.
- Storage/render provider configuration for media assets.
- Resend configuration for password-reset email delivery.

## YouTube compliance
Automation should create materially useful, original content. Repetitive, mass-produced, or minimally transformed content can be ineligible for monetization or violate platform policies. The quality gate should therefore reject obvious templating, missing research verification, and low-value output before publishing.

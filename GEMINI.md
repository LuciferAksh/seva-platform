# Seva project standards

## Current stack
React + TypeScript + Vite 7; FastAPI; Supabase Postgres/Auth/private Storage; Groq text/vision/Whisper; optional Brevo email. Cloudflare Pages or Render Static Site frontend; Render Free API.

## Experience boundaries
- `/`: community reporting, receipt only, no account required.
- `/admin`: coordinator workspace; connected mode requires verified email and backend `ADMIN_EMAILS` allowlist.
- `/volunteer`: own missions, profile and evidence.
- `/verify-email`: Supabase verification/password recovery.

## Safety and implementation
- Demo mode is browser-local synthetic data. Connected mode uses the API and Supabase. Never grant demo sessions access to real data.
- Keep operational data private. Public intake must fail closed without server-validated Turnstile in connected mode.
- Completion needs an active owned assignment, an actual photo and coordinator review. AI output is advisory, not proof.
- Accept confirmed GPS/map pins; do not invent a default location.
- Do not commit secrets or `.env.local`. `VITE_*` is public. Ignore legacy Google `.env` files in the new backend.
- Preserve account ownership for offline queues, enforce idempotency, and use revision-checked writes for dispatch/review.
- Keep maps on compliant tile sources; no offline/bulk prefetch from the public OSM tile service.
- Build the frontend after changes. Run meaningful backend flow tests after API/store/auth changes.

Deployment details and environment configuration: `docs/free-stack-deployment.md`. Legacy Google files are references, not active runtime dependencies. The old Google deployment has not been retired automatically.

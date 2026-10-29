# Deploy the new Seva experience

The implementation now has three separate entry points:

| Path | Audience | Connected-mode access |
|---|---|---|
| `/` | Community members reporting a need | No account required; Turnstile-protected intake, receipt only |
| `/admin` | Coordinators | Verified Supabase account and server-side email allowlist |
| `/volunteer` | Volunteers | Verified Supabase account; own profile, assigned missions and reports only |

## First release: free interactive demo

The demo needs **no backend, database, API key, or paid service**. It runs entirely in the browser. Start with this deployment while connected services are configured.

From `frontend/`, use Node 22.12+ (Node 24 recommended):

```powershell
npm ci
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

Set `VITE_APP_MODE=demo` at build time. `frontend/.env.example` documents the build settings. Do not reuse the old Firebase environment values as deployment configuration.

Cloudflare Pages: root directory `frontend`, build command `npm ci && npm run build`, output directory `dist`. The tracked `frontend/wrangler.toml` supports Pages deployment after Cloudflare login. `frontend/public/_redirects` preserves application routes. Route-specific index files are also emitted for hosts without SPA rewrite configuration.

Render Static Site is a free alternative using `infra/render-demo.yaml`. This avoids a second hosting account if that is more convenient. It needs no web-service instance and does not have the API sleep delay.

The demo supports public reporting, coordinator review, filtering/search, map layers, volunteer matching, assignments, photo evidence, coordinator approval/rejection, confirmed people counts, volunteer portal, CSV export, and persistent browser state. Voice recording and field attachments are supported with a text description. No AI audit/transcription is claimed in demo mode. External map tiles still require internet.

Demo data belongs to one browser and origin. A report created on one device does **not** appear on another device's coordinator dashboard. All visitors must see the demo notice. Use only synthetic data for presentations.

### Five-minute walkthrough

1. Open `/`, choose **Report a need**, describe a synthetic incident and optionally provide coordinates.
2. Submit and use the receipt's link to `/admin`.
3. Open the report. Compare volunteers and assign an available one. Assign Asha Verma if you want to demonstrate the sample volunteer portal.
4. Open `/volunteer` in the same browser/origin. Open Asha's mission, upload a harmless demo photo and submit evidence.
5. Return to `/admin`, open **Missions**, review the image and enter a confirmed count if appropriate. Approve or request new evidence.
6. Check **Impact & insights**. Only approved evidence counts contribute to the people-helped metric. Export reports as CSV if useful.

## Connected release: Supabase + Render + Groq

1. Create a new **free** Supabase project for Seva. Keep unrelated projects untouched. Run `infra/supabase.sql` in that project's SQL editor. It creates the private record table, version-checked write function, indexes and private `seva-media` bucket. There is deliberately no browser access to operational records.
2. Configure Supabase email/password authentication, email confirmation and redirect URLs for the final domain's `/verify-email` route. Add an approved custom SMTP provider for public signup and password reset; Supabase's default mail sender is unsuitable for public registration. Brevo Free can serve both authentication SMTP and operational HTTPS emails, subject to its limits and sender approval.
3. Copy root `.env.example` to **`backend/.env.local`** for local connected tests. Set `APP_MODE=connected`, Supabase URL and server-side service-role key, Groq key, coordinator emails and exact frontend origins. `APP_MODE=demo` uses an isolated in-memory synthetic API instead and never loads Firestore.
4. Create a Cloudflare Turnstile widget for the frontend domain. Put its public site key in `VITE_TURNSTILE_SITE_KEY` and secret in backend `TURNSTILE_SECRET_KEY`. The server validates the token, action and hostname. Connected anonymous intake fails closed if protection is missing. Signed-in reporting remains available to verified users.
5. Deploy the FastAPI API on Render's **Free** web service using `render.yaml`. Docker build context is `backend/` and Dockerfile is `backend/Dockerfile`. With the Render native tool, equivalent paths relative to repository root are `dockerContext=backend`, `dockerfilePath=backend/Dockerfile`. Render injects `PORT`. Set `APP_MODE=connected`; never use demo auth with real project data.
6. Set frontend `VITE_APP_MODE=connected`, `VITE_API_BASE_URL` to the new Render service URL, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and the Turnstile site key. Rebuild the frontend. Set backend `FRONTEND_URL` and `ALLOWED_ORIGINS` to that exact frontend origin. Allow localhost only for local development.
7. Register and verify a coordinator email that is listed in backend `ADMIN_EMAILS`; use `/admin` to sign in. Volunteer accounts use `/volunteer` and create their profiles after verifying email. No browser-supplied role or frontend email list grants coordinator privileges.
8. Validate public intake, signup/verification/reset, authorization boundaries, text/voice/photo processing, attachments, assignment, evidence review, email delivery, rate limiting, and cold-start behavior using synthetic records first.

Secrets belong only in backend environment settings. Never put service-role, Groq, Brevo or Turnstile **secret** keys in `VITE_*`, Git, screenshots or chat. Build-time `VITE_*` values are public. The connector can retrieve publishable project configuration but may not expose the service-role secret; enter that directly in the backend service settings if necessary.

### Check connections before switching the frontend

The ignored `backend/.env.local` file can hold deployment credentials locally. Required for the initial signed-in release: `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY` and `ADMIN_EMAILS`, plus the project URL and exact frontend origin. Public reporting additionally requires the Turnstile widget and secret; do not replace them with test keys on the published site. Public account verification/reset needs approved SMTP configuration in Supabase.

Run `.venv/Scripts/python.exe backend/check_connections.py` from the repository root. It performs read-only Supabase table and private-bucket checks, verifies the configured Groq model IDs against the account's available models, and sends one synthetic water report to validate actual text extraction. It prints pass/fail labels without credentials or provider response bodies. It does not create operational records or send email. Voice/image inference quality, email delivery and full connected browser flows still require separate acceptance checks.

Keep the published frontend in demo mode until the connected API, authentication and public intake checks pass. The deployable backend reads environment variables; its Docker ignore rules exclude local environment files and uploads.

### Data migration and retirement

The new deployment does not automatically copy Firestore records, Firebase passwords or GCS objects. Export and back up the old data before any cutover. Map volunteer identities and preserve incident IDs. Assignments and completion records are keyed by incident ID in the new repository to enforce one active mission and one current review per incident; retain old IDs in a migration audit. Password migration requires a verified import path or a reset flow. Copy private attachments and rewrite their references. Reconcile totals and file hashes in staging before switching real users.

Leave the existing Google project recoverable until connected-mode acceptance and data reconciliation are complete. No code here deletes GCP resources or disables billing.

## Runtime behavior and limits

- Demo: browser-local persistence. The optional API demo is in memory and resets on restart; it is not a production database.
- Connected: data in Supabase; media in its private bucket. Render local disk is never used for connected persistence.
- Text structuring and optional semantic matching use Groq. Voice uses hosted Whisper; image/OCR and photo analysis use the configured vision model. IDs are configurable because free model availability can change. No free-provider key is embedded in the client.
- Rule matching is the default to conserve quota. Coordinators can request AI-assisted suggestions explicitly. Assignment is always a human action.
- If AI is unavailable, the UI distinguishes rule extraction and manual photo review. A completion always requires real image bytes, assignment ownership and coordinator review. An AI count is an estimate; the reviewer may enter a confirmed count.
- Nearby facility lookup is on demand, cached by coarse area, and uses OpenStreetMap/Overpass. Results do not establish operating status. Google Maps direction links require no API key; no GCP billing is used for those links. Google satellite tiles were removed.
- The dashboard uses one snapshot request, with a one-minute refresh only while the tab is visible, plus mutation-driven updates. Large pilot datasets still need database-side aggregates/pagination beyond this demo-sized implementation.
- Anonymous intake uses Turnstile plus a bounded per-process submission limiter. For multiple API replicas, replace the limiter with a shared limiter. The free Render deployment is a single small instance.
- Uploads are limited to 10 MB/file and 12 MB/request; image bytes and dimensions are checked. Photos are private; signed reads expire after two minutes.
- Offline: the service worker caches the app shell, not operational API responses or map tiles. Signed-in submissions queued while offline remain tied to their account and sync on reconnect/app start. The browser must open the app to retry. Public reporters can explicitly save a draft (including an attachment) on the device and restore it by reopening the form. Drafts are not silently auto-submitted without a fresh security check.
- Emails use a persistent outbox in connected mode. Assignment/review attempts delivery through Brevo; coordinators can retry pending items through `POST /api/email/retry`. The small pilot has no separate always-on queue worker, and delivery retries can produce duplicates if a provider accepted an email before an ambiguous timeout.
- Free service quotas, server sleep, database inactivity pauses and external API throttling still apply. The demo is not a guaranteed emergency response service.

## Checks

```powershell
python -m pip install -r backend/requirements.txt
python -m unittest discover -s backend/tests -v
```

Frontend: run `npm ci`, `npm run build`, and `npm audit` from `frontend/`. GitHub Actions runs the build, dependency audit and Python tests. Connected provider calls, delivery quality and cloud configuration require a separately configured acceptance run.

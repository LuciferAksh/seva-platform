# Seva: ₹0 hosting outside GCP

> This is the initial pre-migration evaluation. For the implemented architecture and current setup, see [free-stack-deployment.md](free-stack-deployment.md) and [architecture.md](architecture.md).

Evaluated 29 October 2026. Scope: current local source plus the public GitHub main branch. This is an evaluation and migration specification; no deployment, account creation, credential change, or production data migration was performed.

## Recommendation

Move to **Cloudflare Pages + Render Free + Supabase Free + Groq Free**, with **Brevo** for verification and operational emails and OpenStreetMap-based facility/map data. This retains the React UI and FastAPI backend and replaces the Google-specific service adapters. Use provider subdomains to avoid a domain purchase.

This can run a small project for ₹0 while within all allowances. It preserves feature categories after implementation and validation, but cannot promise the same latency, AI accuracy, map coverage, or continuous availability. Render sleeps; Supabase can pause; external APIs can throttle. These are material limits for real emergency operations.

## What is actually implemented

| Component | Evidence in current source | Migration consequence |
|---|---|---|
| React + Vite + Leaflet PWA | `frontend/package.json`, `vite.config.ts`, `src/App.tsx` | Static frontend; no Next.js rewrite needed. |
| FastAPI backend | `backend/app/main.py`, Dockerfile | Keep Python; the existing Dockerfile uses Python 3.12. |
| Firebase identity | `frontend/src/firebase.ts`, `VerifyEmailPage.tsx`, `backend/app/auth.py` | Replace signup, login, reset/verification redirects, session observation and token validation. |
| Firestore persistence | `store.py`, `firestore_store.py` | Implement Postgres store methods while preserving API response shapes. |
| Media | `services/storage.py` | GCS or local filesystem today; use private Supabase Storage. |
| AI | `google_pipeline.py`, `matching.py` | Vertex client initialization is duplicated; replace both paths. |
| Speech and OCR | Google Speech-to-Text and optional Document AI | Use hosted Whisper and a vision model, not large local models on free compute. |
| Facilities | Places Nearby Search inside report structuring | Replace with cached OSM facility data; require human confirmation of operational status. |
| Emails | Writes to Firestore `mail` collection | Delivery depends on an external extension/worker not defined in source; create a replacement outbox and HTTPS sender. |
| Offline reports | IndexedDB queue replayed by page `online` event | Preserve queue/files; add idempotency and retry-on-start. Closed-browser background delivery is not established by this code. |

Cloud SQL, Pub/Sub, pgvector, and BigQuery are described in planning documents but are not implemented service dependencies in the examined application. Importing `BackgroundTasks` does not establish a running precompute job: no task scheduling call exists in the current API. Matching is cached after a request-driven cache miss. README performance and impact percentages are unverified claims.

GitHub `main` was `49d3f2b`; local HEAD was `a9030d5`, three commits ahead. Five tracked files also had existing modifications, plus an untracked helper script. Migration should start from this local work after preserving it, rather than overwriting it from GitHub.

## Feature replacement and free allowances

| Capability | Proposed replacement | Boundary / implementation work |
|---|---|---|
| Frontend hosting | Cloudflare Pages Free | Build `frontend` with `npm run build`, publish `dist`; 500 builds/month. [Limits](https://developers.cloudflare.com/pages/platform/limits/) |
| Python API | Render Free web service | Sleeps after 15 idle minutes; wake-up about a minute. 750 instance-hours/workspace/month. Filesystem is ephemeral; use external persistence. Render explicitly positions Free for hobby/testing, not production. [Free services](https://render.com/docs/free) |
| Database, identity and files | Supabase Free | 500 MB database, 1 GB file storage, 50,000 monthly active users, 5 GB egress plus 5 GB cached egress; two active projects. Pauses after a week of inactivity. [Pricing](https://supabase.com/pricing) |
| Individual uploads | Private Supabase Storage | Free project maximum configurable file size is 50 MB. Set smaller app limits and use signed URLs. [Upload limits](https://supabase.com/docs/guides/storage/uploads/file-limits) |
| Text extraction and optional AI matching | Groq `openai/gpt-oss-20b` or `openai/gpt-oss-120b` | Published free limits include 30 requests/minute, 1,000/day, 8,000 tokens/minute and 200,000 tokens/day per listed model; actual organization dashboard is authoritative. [Rate limits](https://console.groq.com/docs/rate-limits) |
| Voice reports | Groq `whisper-large-v3` or `whisper-large-v3-turbo` | Supports multilingual transcription and existing WebM recordings; free uploads up to 25 MB. Test Hindi/English and field noise. [Speech documentation](https://console.groq.com/docs/speech-to-text) |
| Image intake and completion photo analysis | Groq `qwen/qwen3.8-27b` | Current vision documentation lists image input, OCR and JSON mode; currently listed in free quota table. Validate output with Pydantic; JSON mode alone is not schema enforcement. Keep model IDs configurable. [Vision](https://console.groq.com/docs/vision), [quotas](https://console.groq.com/docs/rate-limits) |
| Deterministic matching | Existing `score_volunteer()` | No paid API required. Preserve semantic matching as an optional Groq enhancement with the existing rule scorer as fallback. |
| Verification and mission emails | Brevo Free | 300 sends/day shared across uses; requires sender/account setup and deliverability testing. Supabase uses custom SMTP; Render should send mission emails over HTTPS. [Brevo allowance](https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans) |
| Map display | Leaflet + compliant OSM tiles for modest interactive use | Show attribution, obey caching and usage policy; no bulk/offline prefetch from the public tile service. Satellite imagery and Google-specific boundary rendering need a separately validated provider; they are not equivalent replacements. [Tile policy](https://operations.osmfoundation.org/policies/tiles/) |
| Nearby hospitals/pharmacies | Cached OSM facilities via Overpass or imported regional datasets | Query once per area/type and reuse; do not query per volunteer dashboard refresh. Coverage/freshness differ from Places. [Overpass](https://overpass-api.de/) |
| Navigation links | Existing Google Maps direction URLs can remain | These links need no API key or GCP hosting. A fully Google-free option can use another navigation destination. [Maps URLs](https://developers.google.com/maps/documentation/urls/get-started) |

Supabase's default email sender is limited to authorized team recipients and currently two messages/hour. Public registration therefore needs custom SMTP before testing real signup. Brevo sender approval/verification is a dependency, not an already-configured service. Resend is another option if a suitable sending domain is already available. [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp)

Do not count free tiers as unlimited throughput. For example, vision input can exhaust a daily token allowance well before the request allowance. A reasonable initial trial is 50 text reports, 20 short voice reports, and 20 image reports per day, with measured usage and a separate completion-photo budget. This is a sizing scenario, not a tested capacity guarantee. At 1 MB/file, 1 GB holds roughly 1,000 files before overhead; compress uploads and agree retention before deleting evidence.

## Why not Vercel for everything?

Vercel can host the Vite frontend and supports Python/FastAPI. However, its Functions have a 4.5 MB request/response payload limit, which conflicts with the current multipart photo/voice endpoints. A viable Vercel backend design needs direct signed uploads to Storage followed by a small metadata request. Hobby is limited to personal, non-commercial use; a noble purpose alone does not establish eligibility for an organization-operated deployment. It is a valid alternative after that refactor and eligibility check, but Render has less friction for this existing backend. [Function limits](https://vercel.com/docs/functions/limitations), [Hobby conditions](https://vercel.com/docs/plans/hobby)

Supabase Edge Functions are another option only if the Python backend is ported; Supabase hosting does not automatically run this FastAPI service. Avoid free Render Postgres for persistent project data because it expires after 30 days. Avoid relying on temporary cloud credits or local SQLite/upload folders for long-term hosting.

Gemini Developer API free quotas are an optional compatibility route if Google AI is acceptable despite moving hosting off GCP. They are separate from Vertex billing, but still a Google dependency. Unpaid-service data handling differs: do not route identifiable victim reports/photos through a free model without evaluating those terms. Groq also has data-control and retention exceptions; minimize submitted identifiers and configure appropriate controls. [Gemini terms](https://ai.google.dev/gemini-api/terms), [Groq data controls](https://console.groq.com/docs/your-data)

## Code changes needed before cutover

1. **Decouple configuration.** Honor `VITE_API_BASE_URL` in `frontend/src/api.ts` (currently ignored). Read CORS origins from settings (currently a hardcoded list). Introduce explicit database/auth/AI/storage provider settings; Firebase project ID currently also implicitly enables Google AI and Firestore. Extend `processing_mode` and `auth_mode` literals in Python/TypeScript to represent new providers.
2. **Replace identity.** Add Supabase frontend auth/session handling and backend JWT validation with issuer, audience, signature and expiry checks. Enforce roles and verified-email requirements on the server. Export existing Firebase identity records and validate a compatible import/password migration or offer password reset; do not assume password hashes transfer automatically. Preserve mappings from old Firebase UID/email to new user ID.
3. **Implement a Postgres store.** Tables: profiles/roles, volunteers, needs, assignments, completions, need_matches, email_outbox. Preserve existing record IDs and UTC timestamps. Use JSONB for extraction/match payloads initially; add indexes on status, created_at, volunteer_id and need_id. Use transactions for assignment/completion and constraints against duplicate active assignments. Enforce access with backend authorization and RLS for browser-accessible data; service-role keys bypass RLS and must remain server-only.
4. **Replace media and intelligence.** Store private objects in Supabase; replace `gs://` references and generate short-lived read links. Add Groq adapters for audio, vision, structuring and matching, with timeouts, bounded retries and validated output. A free-model outage must leave a report queued or requiring review; it must never silently label an unaudited completion as verified.
5. **Replace email and facilities.** Queue emails transactionally and send via HTTPS with delivery status/retries. Move facility lookup out of model-generated coordinates: use reporter GPS or confirmed map pins. Cache regional OSM results. Retain suggested supply lists as reviewable model suggestions.
6. **Reduce unnecessary traffic.** Dashboard requests currently run every 30 seconds even before login. Gate fetching by role and active view, pause hidden tabs, paginate results, and use incremental queries/cached summaries. Invalidate match caches when relevant volunteer/need state changes.
7. **Preserve offline behavior.** Add client-generated submission IDs and server uniqueness constraints so replay cannot duplicate a mission after an ambiguous timeout. Persist upload state; retry when the app opens online as well as on reconnect. Show a backend-waking state on Render.

## Findings that affect safe feature retention

- **Public data routes:** `/api/volunteers`, `/api/needs`, `/api/assignments`, `/api/summary` have no auth dependency; volunteer responses include email, phone and coordinates. `/api/reports` and volunteer creation also lack authentication. A frontend route guard does not protect these endpoints. Redesign signup carefully so profile creation binds to the authenticated identity.
- **Anonymous admin default:** `ALLOW_ANONYMOUS_AUTH` defaults to true and returns `is_admin=True` without a token. This is confirmed locally; the actual deployed environment value was not inspected.
- **Auth error-path bug:** `auth.py` references an undefined `logger`; rejecting missing/invalid credentials can raise a server error instead of the intended auth response. `google_pipeline.py` has a similar undefined logger on its AI failure path.
- **Completion enforcement:** API accepts an absent photo. If AI is unavailable, its helper returns a successful verdict. Store methods do not require that the completing volunteer has an active assignment for that need. Require assignment ownership, mandatory evidence, and a pending-review state. An image model's people count is an estimate, not proof of delivery or fraud detection.
- **Fallback semantics:** rule extraction still caps urgency at 5 while the model/UI contract uses 1–10. A local fire/trapped-person probe produced 4. Unknown locations can default to Delhi. Provider failure must be visible and trigger review rather than silently degrading dispatch decisions.
- **Caching/metrics:** need_matches has no evident expiry/invalidation. The summary scans entire needs, completions and volunteers collections and reports people counts under `families_impacted`. Correct metric units and cache semantics during migration.
- **Maps:** direct `mt1.google.com/vt` tile URLs are used rather than an explicitly configured supported map provider. Treat tiles, facilities, navigation links, imagery and boundary requirements as separate dependencies.

Cost example from source: one refresh reads approximately `2N + 2V + A + C` Firestore documents for N needs, V volunteers, A assignments and C completions (excluding minimum/index charges and extra requests). For N=100, V=100, A=50, C=50: about 500 documents/refresh, 60,000/hour/tab. This is illustrative, not measured billing. Moving databases alone does not eliminate repeated full scans.

## Migration order and acceptance

1. Preserve local changes. Export Firestore collections, identity mappings, and GCS objects; record counts, hashes and references. Do not disable billing/delete the old project yet.
2. Create free accounts/project and configure sender identity. Select compatible regions, create schema/policies and private bucket, configure environment secrets. Required items: Supabase URL/publishable key, backend credentials/JWKS settings, Groq API key, Brevo SMTP/API credentials. Never put service keys in `VITE_*` variables or chat.
3. Implement and test adapters and the access-control fixes above locally, then deploy a separate staging frontend/API.
4. Dry-run imports preserving IDs; reconcile counts, timestamps, references and file hashes. Test verified-email signup/login/reset, role isolation, all three intake modes, image audit accept/reject/error, matching, assignment, completion ownership, summaries, email delivery, offline replay, large-file rejection, API throttling, and sleep/restart recovery. Evaluate multilingual/OCR/vision quality against representative consented samples; no parity claim before that comparison.
5. During a brief write freeze, import the final delta, reconcile again, and switch the frontend API/auth configuration. Keep a recoverable export and temporary rollback path; handle writes made after cutover explicitly if rolling back.
6. Only after acceptance and retention decisions: retire old services/keys and remove GCP resources/billing dependencies. Do not merely stop Cloud Run while leaving buckets, images, extensions, or other resources billable.

## Verification performed

- Frontend `npm run build`: passed, including TypeScript and PWA generation. Existing bundle-size and stale Browserslist warnings remain.
- Normal backend import under local Python 3.14 failed in the installed Google/protobuf native dependency (`Metaclasses with custom tp_new are not supported`). The Dockerfile specifies Python 3.12; its container was not built here.
- Isolated local probes ran with dotenv and optional cloud SDK imports disabled, using DemoStore only. Four public data endpoints returned 200; anonymous auth yielded admin; strict missing-token auth raised NameError; a no-photo/no-assignment completion returned 200 in demo mode. These results do not establish the deployed configuration or production exploitability. Evidence: `graphify-out/local-validation.json`.
- No paid inference calls, production mutation, live database reads or production load tests were performed. Free account eligibility, key availability and current account-specific quotas remain to be validated at setup.

Graph outputs: `graphify-out/graph.html`, `graphify-out/graph.json`, `graphify-out/GRAPH_REPORT.md`. Graph scope is tracked project source/documentation using current local contents; excludes secrets, uploads and generated files. Legacy tracked helper/reference files are included and should not be mistaken for active runtime modules.

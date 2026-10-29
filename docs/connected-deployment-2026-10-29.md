# Connected Seva deployment — 29 October 2026

## Resources and configuration

- Frontend: https://seva-community-demo.onrender.com, Render static site `srv-dbhjvlou01pc73bh8nmg`.
- API: https://seva-api-z13o.onrender.com, Render Free Docker web service `srv-dbhn86etlv9c7397ck30`, Singapore.
- Supabase: `nsjeecefxqdcgkbcobck`, Mumbai. Private operational records and media bucket, server-side access only.
- Groq: live text structuring, Whisper transcription, image extraction, optional semantic volunteer suggestions and delivery-image review.
- Turnstile: Managed widget restricted to the frontend hostname; no pre-clearance. The backend checks success, action and hostname.
- Supabase authentication: hosted site URL, exact verification callback and recovery callback configured. Coordinator roles come from the backend email allowlist. Requested coordinator accounts were provisioned; their temporary password is not stored in source.
- Backend credentials are configured in Render. Only public project/widget values are included in the frontend build. Ignored local credentials are in `backend/.env.local`.

## Acceptance evidence

| Check | Result |
|---|---|
| Backend `/health` | Connected mode, HTTP 200 |
| Backend `/api/config` | AI enabled |
| Supabase record and private bucket access | Passed using backend credential |
| Groq model discovery and structured text extraction | Passed live |
| Text report through deployed API → shared dashboard | Passed live with synthetic report |
| Image report → OCR/description → structured report → private storage | Passed live with generated text image |
| Voice report → Whisper → structured report → private storage | Passed live with synthesized speech |
| Coordinator browser sign-in → dashboard | Passed against Supabase and Render |
| Public form → real Turnstile validation → AI intake → receipt | Passed in deployed browser with synthetic report |
| Delivery-image review | Live AI rejected an unrelated synthetic report image; real delivery-photo quality remains unverified |
| AI volunteer suggestions → dispatch → volunteer-owned assignment view | Passed live with disposable test account |
| Volunteer directory access and dispatch permission | Both denied with HTTP 403 |
| Anonymous private API and attachment access | Denied with HTTP 401 |
| Disposable dispatch fixture cleanup | Test account, profile, assignment, report and outbox removed |
| Backend regression/provider boundary tests | 19 passing, no live calls in unit suite |

Synthetic text, image and voice integration reports are labeled by their reporter as synthetic tests. No real assistance was dispatched. Auth passwords, service keys and session tokens are never included in this report.

## Remaining limitations

- Approved SMTP/sender configuration is still required for general public signup verification, password reset delivery and operational email notifications. Existing provisioned coordinator accounts can sign in. Do not disable email verification to work around mail setup.
- Free Render servers can sleep; Supabase and Groq have free-tier limits. No paid upgrades were selected.
- No migration of old Firebase users, Firestore records or Google Storage attachments has been performed. The old GCP deployment remains intact.
- AI output remains advisory. Dispatch and completion approval remain human decisions. Complete a real delivery-photo acceptance check before operational use.
- Render's CDN can temporarily serve the preceding app shell while a deployment propagates. Existing browsers may need a reload after the new version is available.

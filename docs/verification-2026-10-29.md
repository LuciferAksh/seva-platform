# Seva implementation verification — 29 October 2026

## Scope

Current source, production frontend build and the published Render browser demo. The tested UI used synthetic/browser-local data. The new Supabase schema and permissions were verified remotely. Connected API flows, Groq inference quality, email delivery and production identity migration are not yet verified.

| Boundary | Result | Evidence |
|---|---|---|
| Public UI | Passed | Separate public homepage, reporting dialog and receipt inspected in desktop and 390px mobile viewport. |
| Public report → coordinator UI | Passed | A synthetic public shelter report appeared in the same-origin coordinator demo after following the receipt link. |
| Dispatch → evidence → approval | Passed | Browser demo created a water report, assigned Asha, uploaded a synthetic PNG, reached pending review and then completed after coordinator approval. |
| Private API authorization | Passed | Backend tests reject unauthenticated data reads, directory access by volunteers, role escalation, token tampering and unowned completion. |
| API → data → response | Passed locally | In-memory repository flow tests cover idempotent intake, concurrent dispatch (one winner), review/rejection/resubmission and confirmed impact counts. |
| Public connected intake guard | Passed locally | Test confirms public intake fails closed when Turnstile is unconfigured. A real Turnstile challenge requires deployment/domain setup. |
| Input validation | Passed locally | Tests reject missing/invalid completion images and oversized request bodies. |
| Frontend build | Passed | TypeScript checks, Vite 7 production build and generated offline app shell. |
| Dependencies | Passed at verification time | npm audit reported zero vulnerabilities after removing unused Firebase and old PWA build dependencies. |
| Mobile layout | Passed | Viewport width 390px; document/root width 375px after scrollbar, without document-level horizontal overflow. Table scrolling stays inside its container. |
| Provider integration | Prepared, not live-tested | Supabase schema, Render manifests, Cloudflare Pages configuration, Groq and Brevo adapters, Turnstile validation and setup guide are present. |

## Automated checks

`python -m unittest discover -s backend/tests -v`: 14 passing tests.

`npm run build` from frontend: passing. `npm audit`: zero reported vulnerabilities. `git diff --check`: no whitespace errors.

Browser screenshots: `artifacts/seva-public-preview.jpg`, `artifacts/seva-admin-preview.jpg`. The generated deployable browser demo is packaged as `artifacts/seva-demo.zip`.

## Limits and pending work

- Demo state is shared only within one browser/origin. It does not dispatch real responders or call AI.
- Connected service setup still needs private environment credentials, public-intake bot protection and an approved email sender.
- No Firestore/GCS/Firebase-user migration, GCP deletion, billing change or real-world dispatch was performed.
- Free-hosted connected mode needs acceptance checks for signup/verification/reset, storage, API cold start, voice/image quality, operational email and rate/quota failures before real use.

## Published demo and database

- Public: https://seva-community-demo.onrender.com/
- Coordinator: https://seva-community-demo.onrender.com/admin
- Volunteer: https://seva-community-demo.onrender.com/volunteer
- Render static site: `srv-dbhjvlou01pc73bh8nmg`, branch `codex/seva-free-demo`. Initial deploy `dep-dbhjvm8u01pc73bh8pdg` reached `live`.
- All portal routes, verification route, service worker and manifest returned HTTP 200. Live browser verification confirmed public intake → receipt → coordinator dispatch to Asha → assignment visible in the separate volunteer portal.
- Supabase: `seva-platform`, ref `nsjeecefxqdcgkbcobck`, Mumbai, healthy. Private `seva_records` and `seva-media` bucket are provisioned. Anonymous/authenticated direct table access and anonymous transaction execution are denied; backend service role access is granted. Browser demo does not connect to this database.
- Security advisor has one informational [RLS enabled without policy notice](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), consistent with deliberately server-only data and revoked browser-role grants. Performance advisor reports [unused indexes](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index) on the new empty database. No warning/error-level findings were returned.
- GCP and unrelated Render/Supabase resources were left unchanged. Cloud resources use the approved free options; provider quotas still apply.

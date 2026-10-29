# Seva — Humanity, coordinated.

Seva turns community field reports into coordinated volunteer action: report a need, review it, dispatch the right person, and close the loop with reviewed evidence.

## Three experiences, one response

- **Community site (`/`)**: accessible reporting by text, voice note or photo. Public reporters receive a reference, not access to private reports.
- **Coordinator workspace (`/admin`)**: interactive response map, incident queue, volunteer matching, dispatch, evidence review and impact reporting.
- **Volunteer portal (`/volunteer`)**: a volunteer’s own assignments and evidence submissions.

The frontend now includes a complete **browser-local demo** requiring no account, backend or API key. It is clearly marked as a demo and does not send a request for real assistance.

## Stack

React 18, TypeScript, Vite 7, Leaflet, Supabase Auth/Postgres/Storage, FastAPI, hosted Groq text/vision/Whisper processing, and optional Brevo email delivery. Frontend hosting can use Cloudflare Pages or Render Static Sites; the Python API targets Render Free. Active application code has no Firebase or GCP runtime requirement.

## Run the demo

Use Node 24 (minimum 22.12). From `frontend/`:

```powershell
npm ci
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

Open `http://127.0.0.1:4173/`. Create a synthetic public report and follow its receipt to the coordinator demo. Assign Asha Verma, open `/volunteer`, submit a harmless demonstration photo, and return to `/admin` to review the mission. Demo state persists only in that browser and origin.

For local frontend development, use `npm run dev`. For the optional synthetic API, install `backend/requirements.txt` and run `python -m uvicorn app.main:app --reload` from `backend/`. The API defaults to explicit demo mode with short-lived, signed demo sessions; connected mode requires Supabase configuration.

## Deploy connected services

Read [the deployment guide](docs/free-stack-deployment.md). It covers free hosting, SQL setup, bot protection, authentication, private storage, AI configuration, email, identity/data migration, and acceptance checks. Examples are in `.env.example` and `frontend/.env.example`; production secrets must never enter Git or frontend variables.

Connected mode enforces server-side roles, verified email, account-bound offline replay, idempotent submissions, version-checked assignments, required completion photos and coordinator review. AI assists the team; it does not establish authenticity or make dispatch decisions.

## Verify

From the repository root:

```powershell
python -m pip install -r backend/requirements.txt
python -m unittest discover -s backend/tests -v
```

From `frontend/`, run `npm run build` and `npm audit`. The [CI workflow](.github/workflows/verify.yml) checks both stacks.

## Project notes

- [Current architecture](docs/architecture.md)
- [Free stack deployment and demo walkthrough](docs/free-stack-deployment.md)
- [Initial hosting evaluation](docs/free-hosting-evaluation.md)
- [Design system](DESIGN.md)

Seva began as a Google Solution Challenge project. Earlier Google service modules and prototype helper scripts remain as historical source references; they are not loaded by the new application. Existing Google-hosted data is not automatically migrated or deleted.

Free hosting has capacity and availability limits. Use the current release for demonstration or an evaluated small pilot, not guaranteed emergency-service availability.

# Seva API

Python FastAPI service, without required Google dependencies.

Install `requirements.txt`, then run `python -m uvicorn app.main:app --reload` from this folder. `APP_MODE=demo` is the default and seeds isolated in-memory synthetic records. It does not use any old Google credentials. `/api/demo/session` issues a one-hour demo token only in demo mode. Every private data route still requires a token.

For connected mode, copy the repository-root `.env.example` to `backend/.env.local`, fill it privately, and set `APP_MODE=connected`. Apply `infra/supabase.sql` to a new Supabase project first. Operational records and files are server-only. Do not configure demo mode with real data.

Public intake is `POST /api/public/reports/upload`; connected mode requires a valid Turnstile token. It returns a receipt only. Private intake, dashboard, matching, assignment, evidence and review routes require a verified account and appropriate role. `/docs` exposes the request schemas.

Run `python -m unittest discover -s backend/tests -v` from the repository root. See `docs/free-stack-deployment.md` for deployment, secrets, quotas and acceptance testing.

The legacy `firestore_store.py` and `services/google_pipeline.py`, `storage.py`, `intake.py` are historical references and are not imported by `main.py`. Their old provider configuration is intentionally not loaded by the new settings.

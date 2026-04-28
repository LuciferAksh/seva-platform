# SEVA: Project Standards & Architecture

This file serves as the foundational context for Gemini CLI. The instructions here take precedence over general tool defaults.

## 🛠 Tech Stack
- **Frontend**: React (TypeScript), Vite, Leaflet (Map), idb-keyval (Offline Storage).
- **Backend**: Python (FastAPI), Uvicorn.
- **Database**: Firebase Firestore (Production) / DemoStore (Local Mock).
- **AI Engine**: Google Vertex AI (Gemini 1.5 Flash).
- **Hosting**: Firebase Hosting (Frontend), Google Cloud Run (Backend).

## 🌍 Deployment Details
- **Backend URL**: `https://seva-backend-1064361639605.asia-south1.run.app`
- **Frontend URL**: `https://seva-solution-challenge-2026.web.app`
- **Cloud Run Settings**: Always use `--region asia-south1` and `--allow-unauthenticated`.
- **CORS**: Production origins are explicitly whitelisted in `backend/app/main.py`.

## 🛡 Security & Auth Rules
- **Admin Access**: Restricted to whitelisted emails in the `ADMIN_EMAILS` environment variable.
- **Path Guard**: Admin panel is at `/admin`. Volunteers/Public cannot load profiles on this path.
- **Session Isolation**: No session leakage between public home page and `/admin` portal.
- **Credentials**: Never commit `.env` or `secrets/` files. Use `os.getenv("K_SERVICE")` to detect cloud environments.

## 🤖 AI Implementation
- **Dispatcher**: Uses Gemini for semantic volunteer matching based on skills and GPS distance.
- **Gatekeeper**: Uses Gemini Vision to audit "Mark Complete" photos. Rejects unrelated or fake images.
- **Pre-Compute**: New incidents trigger a `BackgroundTasks` matching job to ensure instant dashboard load.
- **Caching**: Matches are stored in the `need_matches` subcollection to prevent redundant AI costs.

## 🏗 Engineering Standards
- **Testing**: Always run `npm run build` after frontend changes to verify TypeScript integrity.
- **Cleanliness**: Keep the root directory free of screenshots and temporary `.py` migration scripts.
- **Mobile-First**: Maintain the `repeat(auto-fit, minmax(...))` responsive grid layouts.

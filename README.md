# SEVA

SEVA stands for Scalable Emergency Volunteer Activator. It is a multimodal, AI-powered coordination platform that helps NGOs turn scattered field intelligence into fast, explainable volunteer action.

The problem is simple and urgent: community need data is often trapped in handwritten surveys, WhatsApp voice notes, photos, and fragmented forms. That makes it hard for coordinators to see where help is needed most, and even harder to deploy the right volunteers quickly.

SEVA solves this by ingesting messy real-world inputs, extracting structured needs with Google Cloud AI services, prioritizing them on a live map, and matching volunteers to tasks using explainable scoring.

## Why This Can Win

- It is built around a real problem that NGOs face every day.
- It uses AI for a task that is genuinely hard: turning unstructured field inputs into operational decisions.
- It is ambitious, but the MVP is still realistic for a 4-person team and a short hackathon.
- It is strongly aligned with the Google Solution Challenge focus on social impact, technical quality, and scalability.

## Final Product Framing

SEVA is not just a dashboard. It is an operational intelligence layer for NGOs.

Core promise:

1. Accept input in the way field workers already operate: voice notes, survey images, and short text.
2. Convert that input into structured, geotagged, urgency-ranked needs.
3. Show the community pulse on a live coordinator map.
4. Match the right volunteer to the right need with a clear explanation.
5. Close the loop with completion evidence and auto-generated impact summaries.

## Best Hackathon MVP

For Solution Challenge 2026, the strongest demo is:

1. A field worker uploads a Hindi or English voice note, an image of a handwritten form, or a text report.
2. SEVA extracts `category`, `severity`, `people_affected`, `location`, `time`, and `required_skills`.
3. The need appears on a live heatmap with urgency decay.
4. The system recommends the top 3 volunteers and explains each match.
5. A volunteer marks the task complete with a short voice note or text.
6. SEVA updates the dashboard and generates an impact snapshot.

Keep the demo focused on one crisis scenario such as flood relief, urban food insecurity, or medical outreach.

## Recommended GCP-First Stack

This version is stronger than the original Supabase-heavy stack because you already have Google Cloud credits and judges will respond well to a coherent Google-native architecture.

### Frontend

- React + Vite for the coordinator dashboard MVP
- Tailwind CSS
- Leaflet + OpenStreetMap
- Firebase Hosting or Cloud Run for deployment
- Optional upgrade for maximum challenge alignment: Flutter field app for volunteers and field workers

### Backend

- FastAPI on Cloud Run
- Background processing via Pub/Sub
- Optional Cloud Run Jobs for batch summarization or nightly reporting

### AI and Data Extraction

- Vertex AI `Gemini 2.5 Flash` for fast multimodal extraction and classification
- Vertex AI `Gemini 2.5 Pro` for report generation, reasoning-heavy triage, and polished impact summaries
- Google Cloud Speech-to-Text for reliable audio transcription
- Document AI OCR for handwritten survey sheets and scanned forms

### Data and Auth

- Cloud SQL for PostgreSQL
- `pgvector` for volunteer-task semantic similarity
- Firebase Authentication for login
- Cloud Storage for uploaded media

### Analytics and Reporting

- BigQuery for impact analytics and donor-facing aggregate reporting
- Looker Studio optional for stakeholder dashboards

## Why These Changes Matter

The original idea was already strong, but these changes make it more credible:

- `Gemini 3.1 Pro` is replaced with currently documented Vertex AI Gemini models.
- Handwritten extraction is routed through Document AI OCR first, because raw handwritten interpretation can be unreliable if you depend on a general multimodal prompt alone.
- Supabase is replaced with Cloud SQL + Firebase + GCP services so the system uses your credits strategically and tells a cleaner Google story.

## Google Challenge Alignment

To align strongly with the Solution Challenge preference to leverage Google technologies, present SEVA as:

- Firebase Authentication for identity
- Google Cloud Storage for media ingestion
- Pub/Sub for event-driven processing
- Speech-to-Text for voice notes
- Document AI for handwritten forms
- Vertex AI Gemini for structured extraction and reasoning
- Cloud SQL PostgreSQL for operational data
- Flutter as the future field app path, with the current web dashboard as the fastest MVP

## Team Split

### Person 1: AI ingestion pipeline

- Voice transcription flow
- OCR flow for survey photos
- Gemini extraction schema
- Need normalization and validation

### Person 2: Matching and prioritization engine

- Volunteer scoring
- Geo-proximity weighting
- Urgency calculation and decay logic
- Feedback learning from accept and reject actions

### Person 3: Data platform and backend

- Cloud SQL schema
- FastAPI endpoints
- Pub/Sub orchestration
- Firebase Auth integration

### Person 4: Frontend and demo UX

- Field worker submission flow
- Coordinator mission-control dashboard
- Live map and match cards
- Mobile responsiveness

## Submission Narrative

When you present this project, do not pitch it as "an NGO app." Pitch it as:

`SEVA converts chaotic community signals into coordinated humanitarian action.`

That sentence is memorable, ambitious, and grounded.

## What To Build First

If time gets tight, prioritize this order:

1. Voice note or image upload
2. Structured need extraction
3. Coordinator map with urgency cards
4. Volunteer matching
5. Completion logging
6. Impact reporting

If you only finish the first four cleanly, you still have a strong demo.

## Local Run

### Backend

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r backend\requirements.txt
.\.venv\Scripts\python -m uvicorn backend.app.main:app --reload
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Set `VITE_API_BASE_URL` if your backend is not running at `http://127.0.0.1:8000`.

## Current Build Status

Working now:

- FastAPI backend with seeded needs and volunteer matching
- React dashboard with map and intake form
- Multipart upload flow for text, image, and voice-style submissions
- Local file storage fallback when Cloud Storage is not configured
- Firebase-ready auth dependency with anonymous demo fallback
- Google service integration seams for Speech-to-Text, Document AI, and Vertex AI Gemini

Next implementation layer:

- configure `GOOGLE_APPLICATION_CREDENTIALS`
- set `UPLOAD_BUCKET`
- set `DOCUMENT_AI_PROCESSOR_ID`
- enable Firebase auth in the frontend
- connect real voice and image capture on the client

## Repo Structure

```text
backend/     FastAPI service and background workers
frontend/    React app for field workers and coordinators
infra/       Deployment notes and GCP setup
docs/        Architecture, sprint plan, and pitch assets
```

## Key Docs

- `docs/architecture.md`
- `docs/sprint-plan.md`
- `docs/pitch-deck-outline.md`

## Sources Used For Current GCP Recommendations

- [Google models on Vertex AI](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models)
- [Vertex AI documentation](https://cloud.google.com/vertex-ai/docs)
- [Speech-to-Text on Vertex AI](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/speech/speech-to-text)
- [Cloud Run documentation](https://cloud.google.com/run/docs)
- [Cloud SQL generative AI overview](https://docs.cloud.google.com/sql/docs/postgres/ai-overview)
- [Cloud SQL vector embeddings](https://cloud.google.com/sql/docs/postgres/work-with-vectors)
- [Firebase Authentication docs](https://firebase.google.com/docs/auth/)
- [Document understanding notes](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/document-understanding)

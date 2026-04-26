# Backend Starter

Recommended stack:

- FastAPI
- Cloud Run
- Cloud SQL PostgreSQL
- Firebase Auth verification
- Pub/Sub-triggered async processing

## Suggested Modules

```text
backend/
  app/
    api/
    core/
    db/
    models/
    schemas/
    services/
    workers/
```

## First APIs To Build

- `POST /uploads`
- `GET /needs`
- `GET /needs/{id}`
- `GET /volunteers`
- `POST /assignments`
- `POST /completions`
- `POST /api/reports/upload`

## Core Services

- transcription service
- OCR service
- need extraction service
- geocoding service
- matching service
- impact summary service
- Cloud Storage upload service
- Firebase token verification

## First Database Tables

- `users`
- `volunteers`
- `need_reports`
- `normalized_needs`
- `assignments`
- `completion_logs`

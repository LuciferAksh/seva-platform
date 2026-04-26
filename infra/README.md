# Infrastructure Notes

## Recommended Google Cloud Services

- Cloud Run for backend API
- Cloud Storage for uploaded files
- Pub/Sub for async event processing
- Cloud SQL PostgreSQL for operational data
- Firebase Authentication for user identity
- Vertex AI for Gemini inference
- Speech-to-Text for audio transcription
- Document AI for OCR
- BigQuery optional for analytics

## Minimum Viable Deployment

1. Deploy FastAPI backend to Cloud Run
2. Provision Cloud SQL PostgreSQL
3. Create Cloud Storage bucket for uploads
4. Create Pub/Sub topic for intake processing
5. Configure Firebase Auth
6. Add Vertex AI, Speech-to-Text, and Document AI credentials

## Environment Variables To Expect

```text
GOOGLE_CLOUD_PROJECT=
GCP_REGION=
CLOUD_SQL_INSTANCE=
DATABASE_URL=
FIREBASE_PROJECT_ID=
UPLOAD_BUCKET=
PUBSUB_TOPIC_INTAKE=
VERTEX_MODEL_FAST=gemini-2.5-flash
VERTEX_MODEL_PRO=gemini-2.5-pro
```

## Nice-To-Have Later

- Cloud Monitoring dashboards
- Looker Studio donor dashboard
- Cloud Run jobs for daily impact snapshots

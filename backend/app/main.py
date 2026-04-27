from __future__ import annotations

from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .auth import AuthContext, get_auth_context
from .config import Settings, get_settings
from .models import (
    AssignmentRecord,
    CompletionLog,
    MatchRecommendation,
    NeedReport,
    ReportSubmission,
    UploadReportResponse,
    Volunteer,
    VolunteerSignup,
)
from .services.intake import SubmissionProcessor
from .store import store

import logging
logger = logging.getLogger("api")

app = FastAPI(
    title="SEVA API",
    version="0.1.0",
    description="Starter API for the SEVA volunteer coordination platform.",
)

# Security: Explicitly allow the local and production origins to prevent CORS blocks.
# This allows 'allow_credentials=True' which is required for Firebase Auth headers.
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://seva-solution-challenge-2026.web.app",
    "https://seva-solution-challenge-2026.firebaseapp.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/summary")
def get_summary() -> dict:
    return store.summary().model_dump()


@app.get("/api/needs", response_model=list[NeedReport])
def list_needs() -> list[NeedReport]:
    return store.list_needs()


@app.get("/api/volunteers", response_model=list[Volunteer])
def list_volunteers() -> list[Volunteer]:
    return store.list_volunteers()


@app.post("/api/volunteers", response_model=Volunteer)
def create_volunteer(signup: VolunteerSignup) -> Volunteer:
    return store.create_volunteer(signup)


@app.get("/api/assignments", response_model=list[AssignmentRecord])
def list_assignments(volunteer_id: str | None = None) -> list[AssignmentRecord]:
    return store.list_assignments(volunteer_id=volunteer_id)


@app.post("/api/reports", response_model=NeedReport)
def create_report(submission: ReportSubmission) -> NeedReport:
    return store.submit_report(submission)


@app.post("/api/reports/upload", response_model=UploadReportResponse)
async def create_upload_report(
    reporter_name: str = Form("Field Worker"),
    source_type: str = Form("text"),
    text: str = Form(""),
    lat: float | None = Form(None),
    lng: float | None = Form(None),
    file: UploadFile | None = File(None),
    auth_context: AuthContext = Depends(get_auth_context),
    settings: Settings = Depends(get_settings),
) -> UploadReportResponse:
    if source_type in {"voice", "image"} and file is None and not text.strip():
        raise HTTPException(status_code=400, detail="Voice and image submissions need a file or fallback text")
    if source_type == "text" and not text.strip():
        raise HTTPException(status_code=400, detail="Text submissions require report text")

    processor = SubmissionProcessor(settings)
    processed = await processor.process(source_type=source_type, text=text, upload=file)
    report = store.submit_processed_report(
        source_type=source_type,
        text=processed.text or text,
        reporter_name=reporter_name,
        lat=lat,
        lng=lng,
        structured=processed.structured,
        media_uri=processed.media_uri,
        source_summary=processed.source_summary,
        processing_mode=processed.processing_mode,
    )
    return UploadReportResponse(report=report, auth_mode=auth_context.auth_mode)


@app.get("/api/needs/{need_id}/matches", response_model=list[MatchRecommendation])
def get_matches(need_id: str) -> list[MatchRecommendation]:
    matches = store.get_matches(need_id)
    if not matches:
        raise HTTPException(status_code=404, detail="Need not found")
    return matches


@app.post("/api/assignments", response_model=AssignmentRecord)
def assign_need(payload: dict[str, str | float], auth_context: AuthContext = Depends(get_auth_context)) -> AssignmentRecord:
    if not auth_context.is_admin:
        logger.warning(f"Unauthorized assignment attempt by {auth_context.email}")
        raise HTTPException(status_code=403, detail="Admin access required")
    assignment = store.assign_need(
        need_id=str(payload["need_id"]),
        volunteer_id=str(payload["volunteer_id"]),
        match_score=float(payload.get("match_score", 0)),
        match_reason=str(payload.get("match_reason", "")),
    )
    if assignment is None:
        raise HTTPException(status_code=404, detail="Need or volunteer not found")
    return assignment


@app.post("/api/completions", response_model=CompletionLog)
async def mark_complete(
    need_id: str = Form(...),
    volunteer_id: str = Form(...),
    notes: str = Form(""),
    file: UploadFile | None = File(None),
    auth_context: AuthContext = Depends(get_auth_context)
) -> CompletionLog:
    if not auth_context.is_admin:
        if auth_context.email is None:
            logger.warning(f"Unauthorized completion attempt with no email for volunteer {volunteer_id}")
            raise HTTPException(status_code=403, detail="Not authorized")
        vol = store.find_volunteer_by_email(auth_context.email)
        if vol is None or vol.id != volunteer_id:
            logger.warning(f"Unauthorized completion attempt by {auth_context.email} for volunteer {volunteer_id}")
            raise HTTPException(status_code=403, detail="Not authorized to complete this need for this volunteer")

    media_uri = None
    verified_people = None
    reasoning = None

    if file:
        file_bytes = await file.read()
        if file_bytes:
            from .services.storage import MediaStorageService
            from .services.google_pipeline import GoogleIntelligencePipeline
            settings = get_settings()
            storage = MediaStorageService(settings)
            pipeline = GoogleIntelligencePipeline(settings)
            
            stored = storage.save_bytes(
                data=file_bytes,
                source_type="image",
                filename=file.filename,
                content_type=file.content_type,
            )
            media_uri = stored.uri
            
            is_valid, verified_people, reasoning = pipeline.verify_completion_image(file_bytes, file.content_type or "image/jpeg")

            if not is_valid:
                raise HTTPException(status_code=400, detail=f"❌ AI Audit Failed: {reasoning}")

    completion = store.mark_complete(
        need_id=need_id,
        volunteer_id=volunteer_id,
        notes=notes,
        media_uri=media_uri,
        verified_people=verified_people,
        verification_reasoning=reasoning
    )
    if completion is None:
        raise HTTPException(status_code=404, detail="Need not found")
    return completion

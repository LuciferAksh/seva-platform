from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field


NeedCategory = Literal["food", "medical", "shelter", "education", "water", "other"]
SourceType = Literal["text", "voice", "image"]


class Coordinates(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)

class NearbyFacility(BaseModel):
    name: str
    lat: float
    lng: float
    distance_meters: int | None = None
    address: str | None = None

class NeedExtraction(BaseModel):
    category: NeedCategory
    urgency_level: int = Field(ge=1, le=10)
    people_affected: int = Field(ge=1)
    location_label: str
    required_skills: list[str]
    summary: str
    coordinates: Coordinates | None
    suggested_supplies: list[str] = Field(default_factory=list)
    facility_type_needed: str | None = None
    nearby_facilities: list[NearbyFacility] = Field(default_factory=list)


class NeedReport(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    source_type: SourceType
    original_text: str
    reporter_name: str
    extraction: NeedExtraction
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    priority_score: float
    status: Literal["new", "assigned", "pending_review", "completed"] = "new"
    media_uri: str | None = None
    source_summary: str | None = None
    processing_mode: Literal["demo", "google", "groq", "rules"] = "demo"
    submitted_by: str | None = None
    submission_id: str | None = None


class Volunteer(BaseModel):
    id: str
    name: str
    email: str | None = None
    phone: str | None = None
    locality: str
    coordinates: Coordinates
    skills: list[str]
    languages: list[str]
    availability: Literal["available", "busy", "offline"]
    reliability_score: float = Field(ge=0, le=1)


class VolunteerSignup(BaseModel):
    name: str = Field(min_length=1,max_length=100)
    email: str = Field(min_length=3,max_length=254)
    phone: str | None = Field(default=None,max_length=30)
    locality: str = Field(min_length=1,max_length=120)
    skills: list[str] = Field(min_length=1,max_length=20)
    languages: list[str] = Field(min_length=1,max_length=20)
    lat: float | None = Field(default=None,ge=-90,le=90)
    lng: float | None = Field(default=None,ge=-180,le=180)


class MatchRecommendation(BaseModel):
    volunteer_id: str
    volunteer_name: str
    score: float
    explanation: str


class CompletionLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    need_id: str
    volunteer_id: str
    notes: str
    media_uri: str | None = None
    verified_people: int | None = None
    verification_reasoning: str | None = None
    review_status: Literal['pending', 'approved', 'rejected'] = 'pending'
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AssignmentRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    need_id: str
    volunteer_id: str
    volunteer_name: str
    match_score: float
    match_reason: str
    status: Literal["assigned", "completed"] = "assigned"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ReportSubmission(BaseModel):
    source_type: SourceType = "text"
    text: str
    reporter_name: str = "Field Worker"
    lat: float | None = None
    lng: float | None = None


class UploadReportResponse(BaseModel):
    report: NeedReport
    auth_mode: Literal["demo", "supabase", "firebase"]


class DashboardSummary(BaseModel):
    active_needs: int
    assigned_needs: int
    completed_needs: int
    active_volunteers: int
    families_impacted: int
    people_helped: int = 0
    pending_reviews: int = 0

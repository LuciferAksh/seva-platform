from __future__ import annotations

from uuid import uuid4

from .extractor import extract_need
from .matching import score_volunteer
from .models import (
    AssignmentRecord,
    CompletionLog,
    DashboardSummary,
    MatchRecommendation,
    NeedExtraction,
    NeedReport,
    ReportSubmission,
    Volunteer,
    VolunteerSignup,
)


class DemoStore:
    def __init__(self) -> None:
        self.volunteers: list[Volunteer] = [
            Volunteer(
                id="vol-1",
                name="Asha Verma",
                email="asha@seva.org",
                phone="+91-987650001",
                locality="Adyar",
                coordinates={"lat": 13.0067, "lng": 80.2573},
                skills=["distribution", "community-outreach"],
                languages=["Hindi", "English", "Tamil"],
                availability="available",
                reliability_score=0.94,
            ),
            Volunteer(
                id="vol-2",
                name="Rohan Mehta",
                email="rohan@seva.org",
                phone="+91-987650002",
                locality="Chennai Central",
                coordinates={"lat": 13.0827, "lng": 80.2707},
                skills=["first-aid", "medical-support", "coordination"],
                languages=["Hindi", "English"],
                availability="available",
                reliability_score=0.91,
            ),
            Volunteer(
                id="vol-3",
                name="Priya Nair",
                email="priya@seva.org",
                phone="+91-987650003",
                locality="Rohini",
                coordinates={"lat": 28.7494, "lng": 77.0565},
                skills=["teaching", "coordination", "logistics"],
                languages=["Hindi", "English"],
                availability="busy",
                reliability_score=0.88,
            ),
        ]

        self.needs: list[NeedReport] = [
            NeedReport(
                source_type="voice",
                original_text="30 families in Adyar need food packets and clean drinking water after flooding.",
                reporter_name="Kavya",
                extraction=extract_need("30 families in Adyar need food packets and clean drinking water after flooding."),
                priority_score=8.4,
            ),
            NeedReport(
                source_type="text",
                original_text="There is a child with fever in Chennai and urgent medical support is needed.",
                reporter_name="Manoj",
                extraction=extract_need("There is a child with fever in Chennai and urgent medical support is needed."),
                priority_score=9.1,
            ),
        ]

        self.completions: list[CompletionLog] = []
        self.assignments: list[AssignmentRecord] = []

    def _build_priority_score(self, extraction: NeedReport | NeedExtraction) -> float:
        if isinstance(extraction, NeedReport):
            target = extraction.extraction
        else:
            target = extraction
        return round(
            target.urgency_level * 1.5
            + min(3.0, target.people_affected / 20)
            + (1.0 if target.category == "medical" else 0.0),
            2,
        )

    def submit_report(
        self,
        submission: ReportSubmission,
        *,
        structured: dict | None = None,
        media_uri: str | None = None,
        source_summary: str | None = None,
        processing_mode: str = "demo",
    ) -> NeedReport:
        extraction = extract_need(submission.text, submission.lat, submission.lng, structured=structured)
        priority_score = self._build_priority_score(extraction)

        report = NeedReport(
            source_type=submission.source_type,
            original_text=submission.text,
            reporter_name=submission.reporter_name,
            extraction=extraction,
            priority_score=priority_score,
            media_uri=media_uri,
            source_summary=source_summary,
            processing_mode="google" if processing_mode == "google" else "demo",
        )
        self.needs.insert(0, report)
        return report

    def submit_processed_report(
        self,
        *,
        source_type: str,
        text: str,
        reporter_name: str,
        lat: float | None = None,
        lng: float | None = None,
        structured: dict | None = None,
        media_uri: str | None = None,
        source_summary: str | None = None,
        processing_mode: str = "demo",
    ) -> NeedReport:
        submission = ReportSubmission(
            source_type=source_type,
            text=text,
            reporter_name=reporter_name,
            lat=lat,
            lng=lng,
        )
        return self.submit_report(
            submission,
            structured=structured,
            media_uri=media_uri,
            source_summary=source_summary,
            processing_mode=processing_mode,
        )

    def list_needs(self) -> list[NeedReport]:
        return self.needs

    def list_volunteers(self) -> list[Volunteer]:
        return self.volunteers

    def find_volunteer_by_email(self, email: str) -> Volunteer | None:
        lowered = email.strip().lower()
        return next((volunteer for volunteer in self.volunteers if (volunteer.email or "").lower() == lowered), None)

    def create_volunteer(self, signup: VolunteerSignup) -> Volunteer:
        existing = self.find_volunteer_by_email(signup.email)
        if existing is not None:
            return existing

        volunteer = Volunteer(
            id=f"vol-{uuid4().hex[:8]}",
            name=signup.name,
            email=signup.email,
            phone=signup.phone,
            locality=signup.locality,
            coordinates={
                "lat": signup.lat if signup.lat is not None else 28.6139,
                "lng": signup.lng if signup.lng is not None else 77.2090,
            },
            skills=signup.skills,
            languages=signup.languages,
            availability="available",
            reliability_score=0.8,
        )
        self.volunteers.append(volunteer)
        return volunteer

    def get_matches(self, need_id: str) -> list[MatchRecommendation]:
        need = next((item for item in self.needs if item.id == need_id), None)
        if need is None:
            return []

        matches = [score_volunteer(need, volunteer) for volunteer in self.volunteers]
        return sorted(matches, key=lambda item: item.score, reverse=True)

    def list_assignments(self, volunteer_id: str | None = None) -> list[AssignmentRecord]:
        if volunteer_id is None:
            return self.assignments
        return [assignment for assignment in self.assignments if assignment.volunteer_id == volunteer_id]

    def assign_need(
        self,
        *,
        need_id: str,
        volunteer_id: str,
        match_score: float,
        match_reason: str,
    ) -> AssignmentRecord | None:
        need = next((item for item in self.needs if item.id == need_id), None)
        volunteer = next((item for item in self.volunteers if item.id == volunteer_id), None)
        if need is None or volunteer is None:
            return None

        need.status = "assigned"
        existing = next((assignment for assignment in self.assignments if assignment.need_id == need_id), None)
        if existing is not None:
            existing.volunteer_id = volunteer_id
            existing.volunteer_name = volunteer.name
            existing.match_score = match_score
            existing.match_reason = match_reason
            existing.status = "assigned"
            return existing

        assignment = AssignmentRecord(
            need_id=need_id,
            volunteer_id=volunteer_id,
            volunteer_name=volunteer.name,
            match_score=match_score,
            match_reason=match_reason,
        )
        self.assignments.append(assignment)
        return assignment

    def mark_complete(self, need_id: str, volunteer_id: str, notes: str, media_uri: str | None = None, verified_people: int | None = None, verification_reasoning: str | None = None) -> CompletionLog | None:
        need = next((item for item in self.needs if item.id == need_id), None)
        if need is None:
            return None

        need.status = "completed"
        assignment = next(
            (
                item
                for item in self.assignments
                if item.need_id == need_id and item.volunteer_id == volunteer_id
            ),
            None,
        )
        if assignment is not None:
            assignment.status = "completed"
        completion = CompletionLog(need_id=need_id, volunteer_id=volunteer_id, notes=notes, media_uri=media_uri, verified_people=verified_people, verification_reasoning=verification_reasoning)
        self.completions.append(completion)
        return completion

    def summary(self) -> DashboardSummary:
        active = sum(1 for need in self.needs if need.status == "new")
        assigned = sum(1 for need in self.needs if need.status == "assigned")
        completed = sum(1 for need in self.needs if need.status == "completed")
        
        completions_by_need = {c.need_id: c for c in self.completions}
        families_impacted = 0
        for need in self.needs:
            if need.status == "completed":
                completion = completions_by_need.get(need.id)
                if completion and completion.verified_people is not None:
                    families_impacted += completion.verified_people
                else:
                    families_impacted += need.extraction.people_affected
                    
        active_volunteers = sum(1 for volunteer in self.volunteers if volunteer.availability == "available")

        return DashboardSummary(
            active_needs=active,
            assigned_needs=assigned,
            completed_needs=completed,
            active_volunteers=active_volunteers,
            families_impacted=families_impacted,
        )

from .config import get_settings

settings = get_settings()

if settings.firebase_enabled and settings.firebase_credentials_path:
    from google.cloud import firestore
    from .firestore_store import FirestoreStore
    db = firestore.Client.from_service_account_json(settings.firebase_credentials_path, project=settings.firebase_project_id)
    store = FirestoreStore(db)
else:
    store = DemoStore()

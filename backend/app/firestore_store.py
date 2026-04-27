import logging
from typing import List, Optional
from uuid import uuid4
from datetime import datetime, timezone
from google.cloud import firestore

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
    Coordinates
)

class FirestoreStore:
    def __init__(self, db: firestore.Client):
        self.db = db

    def _build_priority_score(self, extraction: NeedExtraction) -> float:
        return round(
            extraction.urgency_level * 1.5
            + min(3.0, extraction.people_affected / 20)
            + (1.0 if extraction.category == "medical" else 0.0),
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
        self.db.collection('needs').document(report.id).set(report.model_dump(mode='json'))
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
        docs = self.db.collection('needs').order_by('created_at', direction=firestore.Query.DESCENDING).stream()
        return [NeedReport(**doc.to_dict()) for doc in docs]

    def list_volunteers(self) -> list[Volunteer]:
        docs = self.db.collection('volunteers').stream()
        return [Volunteer(**doc.to_dict()) for doc in docs]

    def find_volunteer_by_email(self, email: str) -> Volunteer | None:
        lowered = email.strip().lower()
        docs = self.db.collection('volunteers').where('email', '==', lowered).limit(1).stream()
        for doc in docs:
            return Volunteer(**doc.to_dict())
        return None

    def create_volunteer(self, signup: VolunteerSignup) -> Volunteer:
        existing = self.find_volunteer_by_email(signup.email)
        if existing is not None:
            return existing

        volunteer = Volunteer(
            id=f"vol-{uuid4().hex[:8]}",
            name=signup.name,
            email=signup.email.lower(),
            phone=signup.phone,
            locality=signup.locality,
            coordinates=Coordinates(
                lat=signup.lat if signup.lat is not None else 28.6139,
                lng=signup.lng if signup.lng is not None else 77.2090,
            ),
            skills=signup.skills,
            languages=signup.languages,
            availability="available",
            reliability_score=0.8,
        )
        self.db.collection('volunteers').document(volunteer.id).set(volunteer.model_dump(mode='json'))
        return volunteer

    def get_matches(self, need_id: str) -> list[MatchRecommendation]:
        # 1. Check cache first
        match_ref = self.db.collection('need_matches').document(need_id)
        match_doc = match_ref.get()
        if match_doc.exists:
            data = match_doc.to_dict()
            if "matches" in data:
                from .models import MatchRecommendation
                return [MatchRecommendation(**m) for m in data["matches"]]

        # 2. Compute live if not cached
        doc = self.db.collection('needs').document(need_id).get()
        if not doc.exists:
            return []
        need = NeedReport(**doc.to_dict())

        volunteers = self.list_volunteers()
        from .matching import rank_volunteers
        matches = rank_volunteers(need, volunteers)
        
        # 3. Save to cache
        try:
            match_ref.set({"matches": [m.model_dump() for m in matches]})
        except Exception as e:
            import logging
            logging.error(f"Failed to cache matches: {e}")
            
        return matches

    def list_assignments(self, volunteer_id: str | None = None) -> list[AssignmentRecord]:
        if volunteer_id is None:
            docs = self.db.collection('assignments').order_by('created_at', direction=firestore.Query.DESCENDING).stream()
        else:
            docs = self.db.collection('assignments').where('volunteer_id', '==', volunteer_id).order_by('created_at', direction=firestore.Query.DESCENDING).stream()
        return [AssignmentRecord(**doc.to_dict()) for doc in docs]

    def assign_need(
        self,
        *,
        need_id: str,
        volunteer_id: str,
        match_score: float,
        match_reason: str,
    ) -> AssignmentRecord | None:
        need_ref = self.db.collection('needs').document(need_id)
        vol_ref = self.db.collection('volunteers').document(volunteer_id)
        
        need_doc = need_ref.get()
        vol_doc = vol_ref.get()
        if not need_doc.exists or not vol_doc.exists:
            return None

        # Update need status
        need_ref.update({'status': 'assigned'})

        # Check existing assignment
        docs = self.db.collection('assignments').where('need_id', '==', need_id).limit(1).stream()
        existing_doc = None
        for d in docs:
            existing_doc = d
            break
        
        if existing_doc is not None:
            assignment = AssignmentRecord(**existing_doc.to_dict())
            assignment.volunteer_id = volunteer_id
            assignment.volunteer_name = vol_doc.to_dict().get('name', 'Unknown')
            assignment.match_score = match_score
            assignment.match_reason = match_reason
            assignment.status = "assigned"
            existing_doc.reference.update(assignment.model_dump(mode='json'))
            return assignment

        assignment = AssignmentRecord(
            need_id=need_id,
            volunteer_id=volunteer_id,
            volunteer_name=vol_doc.to_dict().get('name', 'Unknown'),
            match_score=match_score,
            match_reason=match_reason,
        )
        self.db.collection('assignments').document(assignment.id).set(assignment.model_dump(mode='json'))

        # TRIGGER EMAIL: Mission Assigned
        try:
            vol_data = vol_doc.to_dict()
            self.db.collection('mail').add({
                "to": vol_data.get('email'),
                "message": {
                    "subject": f"🚨 SEVA Mission: {need_doc.to_dict().get('extraction',{}).get('location_label')}",
                    "html": f"""
                        <h3>New Mission Assigned</h3>
                        <p>Hello {vol_data.get('name')},</p>
                        <p>You have been assigned to a new emergency mission in <b>{need_doc.to_dict().get('extraction',{}).get('location_label')}</b>.</p>
                        <p><b>Summary:</b> {need_doc.to_dict().get('extraction',{}).get('summary')}</p>
                        <p>Please open the SEVA Console for details and navigation.</p>
                    """
                }
            })
        except Exception as e:
            logging.error(f"Failed to queue assignment email: {e}")

        return assignment

    def mark_complete(self, need_id: str, volunteer_id: str, notes: str, media_uri: str | None = None, verified_people: int | None = None, verification_reasoning: str | None = None) -> CompletionLog | None:
        need_ref = self.db.collection('needs').document(need_id)
        need_get = need_ref.get()
        if not need_get.exists:
            return None
        need_ref.update({'status': 'completed'})

        docs = self.db.collection('assignments').where('need_id', '==', need_id).where('volunteer_id', '==', volunteer_id).limit(1).stream()
        for doc in docs:
            doc.reference.update({'status': 'completed'})
            break

        completion = CompletionLog(need_id=need_id, volunteer_id=volunteer_id, notes=notes, media_uri=media_uri, verified_people=verified_people, verification_reasoning=verification_reasoning)
        self.db.collection('completions').document(completion.id).set(completion.model_dump(mode='json'))

        # TRIGGER EMAIL: Mission Acknowledged
        try:
            vol_doc = self.db.collection('volunteers').document(volunteer_id).get()
            if vol_doc.exists:
                vol_data = vol_doc.to_dict()
                self.db.collection('mail').add({
                    "to": vol_data.get('email'),
                    "message": {
                        "subject": "✅ SEVA Impact Verified",
                        "html": f"""
                            <h3>Thank You, {vol_data.get('name')}!</h3>
                            <p>Your mission completion has been successfully processed.</p>
                            <p><b>AI Verification:</b> {verified_people} people helped.</p>
                            <p><b>Reasoning:</b> {verification_reasoning}</p>
                            <p>Your contribution has been recorded in the Impact Dashboard.</p>
                        """
                    }
                })
        except Exception as e:
            logging.error(f"Failed to queue completion email: {e}")

        return completion

    def summary(self) -> DashboardSummary:
        needs_docs = list(self.db.collection('needs').stream())
        active = sum(1 for doc in needs_docs if doc.to_dict().get('status') == 'new')
        assigned = sum(1 for doc in needs_docs if doc.to_dict().get('status') == 'assigned')
        completed = sum(1 for doc in needs_docs if doc.to_dict().get('status') == 'completed')
        
        completions_docs = list(self.db.collection('completions').stream())
        completions_by_need = {c.to_dict()['need_id']: c.to_dict() for c in completions_docs}
        
        families_impacted = 0
        for doc in needs_docs:
            need_dict = doc.to_dict()
            if need_dict.get('status') == 'completed':
                need_id = need_dict.get('id')
                completion = completions_by_need.get(need_id, {})
                if completion.get('verified_people') is not None:
                    families_impacted += completion['verified_people']
                else:
                    families_impacted += need_dict.get('extraction', {}).get('people_affected', 0)
        
        volunteers_docs = list(self.db.collection('volunteers').stream())
        active_volunteers = sum(1 for doc in volunteers_docs if doc.to_dict().get('availability') == 'available')

        return DashboardSummary(
            active_needs=active,
            assigned_needs=assigned,
            completed_needs=completed,
            active_volunteers=active_volunteers,
            families_impacted=families_impacted,
        )
from __future__ import annotations
from datetime import datetime, timezone
from uuid import uuid4, uuid5, NAMESPACE_URL
from fastapi import HTTPException
from .config import get_settings
from .extractor import extract_need
from .matching import rank_volunteers
from .models import AssignmentRecord, CompletionLog, DashboardSummary, NeedReport, Volunteer
from .repository import MemoryRepository, SupabaseRepository, change

class Store:
    def __init__(self, repository):
        self.repo=repository
    def get_need(self,id):
        row=self.repo.get('needs',id)
        return NeedReport(**row['body']) if row else None
    def list_needs(self):
        return sorted([NeedReport(**r['body']) for r in self.repo.list('needs')],key=lambda n:n.created_at,reverse=True)
    def list_volunteers(self):
        return [Volunteer(**r['body']) for r in self.repo.list('volunteers')]
    def find_volunteer_by_email(self,email):
        rows=self.repo.list('volunteers',email=email.lower())
        return Volunteer(**rows[0]['body']) if rows else None
    def create_volunteer(self,signup,uid):
        record=Volunteer(id=uid,name=signup.name[:100],email=signup.email.lower(),phone=signup.phone,
            locality=signup.locality[:120],coordinates={'lat':signup.lat or 0,'lng':signup.lng or 0},
            skills=signup.skills,languages=signup.languages,availability='available',reliability_score=.8)
        existing=self.repo.get('volunteers',uid)
        if existing:return Volunteer(**existing['body'])
        self.repo.write([change('volunteers',record)])
        return record
    def submission_record_id(self,uid,submission_id):
        return str(uuid5(NAMESPACE_URL,uid+':'+submission_id))
    def find_submission(self,uid,submission_id):
        return self.get_need(self.submission_record_id(uid,submission_id))
    def submit_processed_report(self,*,uid,submission_id,source_type,text,reporter_name,lat,lng,structured,media_uri,source_summary,processing_mode):
        id=self.submission_record_id(uid,submission_id)
        extraction=extract_need(text,lat,lng,structured)
        need=NeedReport(id=id,source_type=source_type,original_text=text[:10000],reporter_name=reporter_name[:100],
            extraction=extraction,priority_score=round(extraction.urgency_level*1.5+min(3,extraction.people_affected/20),2),
            media_uri=media_uri,source_summary=source_summary,processing_mode=processing_mode,submitted_by=uid,submission_id=submission_id)
        try:self.repo.write([change('needs',need)])
        except HTTPException as exc:
            if exc.status_code!=409:raise
            existing=self.get_need(id)
            if existing:return existing
            raise
        return need
    def list_assignments(self,volunteer_id=None):
        rows=self.repo.list('assignments',**({'volunteer_id':volunteer_id} if volunteer_id else {}))
        return [AssignmentRecord(**r['body']) for r in rows]
    def get_matches(self,need_id):
        need=self.get_need(need_id)
        if not need:raise HTTPException(404,'Report not found')
        return rank_volunteers(need,self.list_volunteers())
    def assign_need(self,need_id,volunteer_id):
        need_row=self.repo.get('needs',need_id);vol_row=self.repo.get('volunteers',volunteer_id)
        if not need_row or not vol_row:raise HTTPException(404,'Report or volunteer not found')
        need=NeedReport(**need_row['body']);vol=Volunteer(**vol_row['body'])
        if need.status!='new' or vol.availability!='available':raise HTTPException(409,'Report or volunteer is already assigned')
        match=next((m for m in rank_volunteers(need,[vol])),None)
        assignment=AssignmentRecord(id=need_id,need_id=need_id,volunteer_id=volunteer_id,volunteer_name=vol.name,
            match_score=match.score,match_reason=match.explanation)
        need.status='assigned';vol.availability='busy'
        changes=[change('needs',need,need_row['version']),change('volunteers',vol,vol_row['version']),change('assignments',assignment)]
        if vol.email:changes.append(self.mail_record(vol.email,'New Seva mission',need.extraction.summary))
        self.repo.write(changes)
        return assignment
    def list_completions(self):
        return [CompletionLog(**r['body']) for r in self.repo.list('completions')]
    def mark_complete(self,need_id,volunteer_id,notes,media_uri,verified_people=None,verification_reasoning=None):
        nr=self.repo.get('needs',need_id);ar=self.repo.get('assignments',need_id)
        if not nr or not ar:raise HTTPException(409,'An active assignment is required')
        if nr['body']['status']!='assigned' or ar['body']['volunteer_id']!=volunteer_id or ar['body']['status']!='assigned':
            raise HTTPException(409,'This mission is not assigned to that volunteer or is already submitted')
        if not media_uri:raise HTTPException(422,'A completion photo is required')
        completion=CompletionLog(id=need_id,need_id=need_id,volunteer_id=volunteer_id,notes=notes[:3000],media_uri=media_uri,
            verified_people=verified_people,verification_reasoning=verification_reasoning,review_status='pending')
        prior=self.repo.get('completions',need_id)
        need=NeedReport(**nr['body']);need.status='pending_review'
        self.repo.write([change('needs',need,nr['version']),change('completions',completion,prior['version'] if prior else 0)])
        return completion
    def review_completion(self,need_id,approved,confirmed_people=None):
        nr=self.repo.get('needs',need_id);cr=self.repo.get('completions',need_id);ar=self.repo.get('assignments',need_id)
        if not nr or not cr or not ar or nr['body']['status']!='pending_review':raise HTTPException(409,'No pending review for this report')
        need=NeedReport(**nr['body']);completion=CompletionLog(**cr['body']);assignment=AssignmentRecord(**ar['body'])
        need.status='completed' if approved else 'assigned';completion.review_status='approved' if approved else 'rejected'
        if approved and confirmed_people is not None:completion.verified_people=confirmed_people
        changes=[change('needs',need,nr['version']),change('completions',completion,cr['version'])]
        if approved:
            assignment.status='completed';changes.append(change('assignments',assignment,ar['version']))
            vr=self.repo.get('volunteers',assignment.volunteer_id)
            if vr:
                volunteer=Volunteer(**vr['body']);volunteer.availability='available';changes.append(change('volunteers',volunteer,vr['version']))
                if volunteer.email:changes.append(self.mail_record(volunteer.email,'Seva mission reviewed','Your relief mission has been approved. Thank you.'))
        self.repo.write(changes)
        return completion
    def summary(self,needs=None,volunteers=None,completions=None):
        needs=self.list_needs() if needs is None else needs
        volunteers=self.list_volunteers() if volunteers is None else volunteers
        completions=self.list_completions() if completions is None else completions
        people=sum(c.verified_people or 0 for c in completions if c.review_status=='approved')
        return DashboardSummary(active_needs=sum(n.status=='new' for n in needs),assigned_needs=sum(n.status=='assigned' for n in needs),
            completed_needs=sum(n.status=='completed' for n in needs),active_volunteers=sum(v.availability=='available' for v in volunteers),
            families_impacted=0,people_helped=people,pending_reviews=sum(n.status=='pending_review' for n in needs))
    def mail_record(self,email,subject,text):
        id=str(uuid4())
        return change('email_outbox',{'id':id,'to':email,'subject':subject,'text':text,'status':'pending','created_at':datetime.now(timezone.utc).isoformat()})

settings=get_settings()
repository=MemoryRepository() if settings.demo else SupabaseRepository(settings)
store=Store(repository)
if settings.demo:
    from .seed import seed_demo
    seed_demo(repository)

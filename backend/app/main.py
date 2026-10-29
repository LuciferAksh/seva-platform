from __future__ import annotations
import logging
import time
from collections import defaultdict, deque
from threading import Lock
from typing import Literal
from uuid import UUID
import httpx
from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, HTTPException, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from pydantic import BaseModel, Field, ValidationError
from starlette.concurrency import run_in_threadpool
from .auth import AuthContext, demo_token, get_auth_context, require_admin
from .config import get_settings
from .models import Coordinates, VolunteerSignup
from .store import store
from .services.intelligence import Intelligence
from .services.media import read_upload, save_media, signed_media
from .request_limits import RequestBodyLimit

logger=logging.getLogger(__name__)
settings=get_settings()
app=FastAPI(title='Seva coordination API',version='0.2.0')
app.add_middleware(RequestBodyLimit)
app.add_middleware(CORSMiddleware,allow_origins=list(settings.allowed_origins),allow_credentials=False,allow_methods=['GET','POST'],allow_headers=['Authorization','Content-Type'])
lock=Lock();limits=defaultdict(deque)

def throttle(uid):
    now=time.monotonic()
    with lock:
        # Bound memory even if sessions churn.
        if len(limits)>5000:
            for key in list(limits):
                if not limits[key] or now-limits[key][-1]>60:limits.pop(key,None)
        events=limits[uid]
        while events and events[0]<now-60:events.popleft()
        if len(events)>=10:raise HTTPException(429,'Please wait a minute before submitting again',headers={'Retry-After':'60'})
        events.append(now)

def own_volunteer(context):
    vol=store.find_volunteer_by_email(context.email)
    if not vol:raise HTTPException(403,'Complete your volunteer profile first')
    return vol

def visible_needs(context):
    needs=store.list_needs()
    if context.is_admin:return needs
    vol=store.find_volunteer_by_email(context.email)
    ids={a.need_id for a in store.list_assignments(vol.id)} if vol else set()
    return [n for n in needs if n.id in ids or n.submitted_by==context.uid]

def deliver_outbox():
    if settings.demo or not settings.brevo_key or not settings.mail_sender:return
    for row in store.repo.list('email_outbox',status='pending')[:10]:
        body=row['body']
        try:
            response=httpx.post('https://api.brevo.com/v3/smtp/email',headers={'api-key':settings.brevo_key},json={
                'sender':{'name':'Seva','email':settings.mail_sender},'to':[{'email':body['to']}],
                'subject':body['subject'],'textContent':body['text']+'\n'+settings.frontend_url},timeout=12)
            response.raise_for_status()
            body['status']='sent'
            from .repository import change
            store.repo.write([change('email_outbox',body,row['version'])])
        except (httpx.HTTPError,HTTPException):logger.warning('Outbox email remains pending for retry')

@app.get('/health')
def health():return {'status':'ok','mode':settings.mode}

@app.get('/api/config')
def config():return {'mode':settings.mode,'ai_enabled':bool(settings.groq_key),'max_upload_mb':10}

@app.post('/api/public/reports/upload')
async def public_report(request:Request,source_type:Literal['text','voice','image']=Form('text'),
    text:str=Form('',max_length=10000),reporter_name:str=Form('Community member',max_length=100),
    submission_id:UUID=Form(...),lat:float|None=Form(None),lng:float|None=Form(None),
    file:UploadFile|None=File(None),turnstile_token:str=Form('',max_length=2048)):
    import hashlib
    from urllib.parse import urlparse
    # Network address is salted and held in memory only for request throttling.
    ip=request.client.host if request.client else 'unknown'
    throttle('public:'+hashlib.sha256((settings.demo_secret+ip).encode()).hexdigest())
    existing=await run_in_threadpool(store.find_submission,'public',str(submission_id))
    if existing:return {'reference':existing.id,'status':'received'}
    if not settings.demo:
        if not settings.turnstile_secret:raise HTTPException(503,'Public reporting is not connected yet. Contact your local response team directly.')
        try:
            async with httpx.AsyncClient(timeout=12) as client:
                response=await client.post('https://challenges.cloudflare.com/turnstile/v0/siteverify',json={
                    'secret':settings.turnstile_secret,'response':turnstile_token,'idempotency_key':str(submission_id)})
                response.raise_for_status();verification=response.json()
            allowed={urlparse(origin).hostname for origin in settings.allowed_origins}
            if not verification.get('success') or verification.get('action')!='public_report' or verification.get('hostname') not in allowed:
                raise HTTPException(403,'Please complete the security check again')
        except (httpx.HTTPError,ValueError):raise HTTPException(503,'Security check unavailable. Please retry.') from None
    context=AuthContext('public','',False,'demo' if settings.demo else 'supabase')
    result=await upload_report(source_type,text,reporter_name,submission_id,lat,lng,file,context)
    # Public callers receive a receipt only; there is no public read/list endpoint.
    return {'reference':result['report'].id,'status':'received'}

class DemoSession(BaseModel):
    role:Literal['admin','volunteer']='admin'

@app.post('/api/demo/session')
def demo_session(payload:DemoSession):
    return {'access_token':demo_token(payload.role),'role':payload.role}

@app.get('/api/me')
def me(context:AuthContext=Depends(get_auth_context)):
    return {'uid':context.uid,'email':context.email,'role':'admin' if context.is_admin else 'volunteer','mode':context.auth_mode}

@app.get('/api/dashboard')
def dashboard(context:AuthContext=Depends(get_auth_context)):
    needs=visible_needs(context)
    vols=store.list_volunteers() if context.is_admin else [v for v in store.list_volunteers() if v.email==context.email]
    assignments=store.list_assignments() if context.is_admin else store.list_assignments(vols[0].id) if vols else []
    completions=store.list_completions()
    if not context.is_admin:completions=[c for c in completions if vols and c.volunteer_id==vols[0].id]
    return {'needs':needs[:250],'volunteers':vols[:250],'assignments':assignments[:250],
        'completions':completions[:250],'summary':store.summary(needs,vols,completions),
        'mode':settings.mode,'total_needs':len(needs),'ai_enabled':bool(settings.groq_key)}

@app.get('/api/needs')
def needs(offset:int=0,limit:int=100,context:AuthContext=Depends(get_auth_context)):
    if offset<0 or not 1<=limit<=250:raise HTTPException(422,'Invalid page')
    return visible_needs(context)[offset:offset+limit]

@app.get('/api/volunteers')
def volunteers(context:AuthContext=Depends(require_admin)):return store.list_volunteers()[:250]

@app.get('/api/assignments')
def assignments(context:AuthContext=Depends(get_auth_context)):
    return store.list_assignments(None if context.is_admin else own_volunteer(context).id)[:250]

@app.get('/api/summary')
def summary(context:AuthContext=Depends(require_admin)):return store.summary()

@app.post('/api/volunteers')
def create_volunteer(signup:VolunteerSignup,context:AuthContext=Depends(get_auth_context)):
    if signup.email.lower()!=context.email:raise HTTPException(403,'Use your verified account email')
    if signup.lat is None or signup.lng is None:raise HTTPException(422,'Volunteer coordinates are required')
    Coordinates(lat=signup.lat,lng=signup.lng)
    return store.create_volunteer(signup,context.uid)

@app.post('/api/reports/upload')
async def upload_report(source_type:Literal['text','voice','image']=Form('text'),text:str=Form('',max_length=10000),
    reporter_name:str=Form('Field worker',max_length=100),submission_id:UUID=Form(...),lat:float|None=Form(None),lng:float|None=Form(None),
    file:UploadFile|None=File(None),context:AuthContext=Depends(get_auth_context)):
    existing=await run_in_threadpool(store.find_submission,context.uid,str(submission_id))
    if existing:return {'report':existing,'auth_mode':context.auth_mode}
    throttle(context.uid)
    if (lat is None)!=(lng is None):raise HTTPException(422,'Both latitude and longitude are required')
    if lat is not None:
        try:Coordinates(lat=lat,lng=lng)
        except ValidationError:raise HTTPException(422,'Invalid GPS coordinates') from None
    media_uri=None
    if file:
        data,mime,suffix=await read_upload(file,image_only=source_type=='image')
        if source_type=='voice' and not mime.startswith(('audio/','video/webm')):raise HTTPException(415,'Choose an audio recording')
        ai=Intelligence()
        if source_type=='voice' and not text.strip():text=await run_in_threadpool(ai.transcribe,data,file.filename or 'recording.webm',mime)
        if source_type=='image' and not text.strip():text=await run_in_threadpool(ai.read_image,data,mime)
        media_uri=await run_in_threadpool(save_media,data,mime,suffix,context.uid)
    if not text.strip():raise HTTPException(422,'Add a report description or supported recording/photo')
    structured,description,mode=await run_in_threadpool(Intelligence().structure,text)
    report=await run_in_threadpool(store.submit_processed_report,uid=context.uid,submission_id=str(submission_id),source_type=source_type,
        text=text,reporter_name=reporter_name,lat=lat,lng=lng,structured=structured,media_uri=media_uri,source_summary=description,processing_mode=mode)
    return {'report':report,'auth_mode':context.auth_mode}

@app.get('/api/needs/{need_id}/matches')
def matches(need_id:str,ai:bool=False,context:AuthContext=Depends(require_admin)):
    matches=store.get_matches(need_id)
    if ai and settings.groq_key:
        throttle(context.uid)
        need=store.get_need(need_id)
        return Intelligence().enhance_matches(need,matches,store.list_volunteers())
    return matches

@app.get('/api/needs/{need_id}/facilities')
def facilities(need_id:str,context:AuthContext=Depends(get_auth_context)):
    need=next((n for n in visible_needs(context) if n.id==need_id),None)
    if not need:raise HTTPException(404,'Report not found')
    if not need.extraction.coordinates:raise HTTPException(422,'Confirm a location before looking up facilities')
    throttle(context.uid)
    from .services.facilities import nearby_facilities
    return nearby_facilities(need.extraction.coordinates.lat,need.extraction.coordinates.lng)

class AssignRequest(BaseModel):
    need_id:str=Field(max_length=100)
    volunteer_id:str=Field(max_length=100)

@app.post('/api/assignments')
def assign(payload:AssignRequest,tasks:BackgroundTasks,context:AuthContext=Depends(require_admin)):
    result=store.assign_need(payload.need_id,payload.volunteer_id);tasks.add_task(deliver_outbox);return result

@app.post('/api/completions')
async def complete(need_id:str=Form(...),volunteer_id:str=Form(...),notes:str=Form('',max_length=3000),file:UploadFile=File(...),context:AuthContext=Depends(get_auth_context)):
    if not context.is_admin and own_volunteer(context).id!=volunteer_id:raise HTTPException(403,'You can only complete your own mission')
    assignment=await run_in_threadpool(store.repo.get,'assignments',need_id)
    need=await run_in_threadpool(store.get_need,need_id)
    if not assignment or assignment['body']['volunteer_id']!=volunteer_id or not need or need.status!='assigned':raise HTTPException(409,'An active assignment is required')
    data,mime,suffix=await read_upload(file,image_only=True)
    people,reason=await run_in_threadpool(Intelligence().audit,data,mime)
    uri=await run_in_threadpool(save_media,data,mime,suffix,context.uid)
    return await run_in_threadpool(store.mark_complete,need_id,volunteer_id,notes,uri,people,reason)

class ReviewRequest(BaseModel):
    approved:bool
    confirmed_people:int|None=Field(default=None,ge=0,le=100000)

@app.post('/api/completions/{need_id}/review')
def review(need_id:str,payload:ReviewRequest,tasks:BackgroundTasks,context:AuthContext=Depends(require_admin)):
    result=store.review_completion(need_id,payload.approved,payload.confirmed_people);tasks.add_task(deliver_outbox);return result

@app.get('/api/completions/{need_id}/photo')
def photo(need_id:str,context:AuthContext=Depends(get_auth_context)):
    completion=store.repo.get('completions',need_id)
    if not completion:raise HTTPException(404,'Completion not found')
    if not context.is_admin and own_volunteer(context).id!=completion['body']['volunteer_id']:raise HTTPException(403,'Not your completion')
    location=signed_media(completion['body']['media_uri'])
    return FileResponse(location) if settings.demo else RedirectResponse(location)

@app.get('/api/needs/{need_id}/media')
def report_media(need_id:str,context:AuthContext=Depends(get_auth_context)):
    need=next((n for n in visible_needs(context) if n.id==need_id),None)
    if not need or not need.media_uri:raise HTTPException(404,'Attachment not found')
    location=signed_media(need.media_uri)
    return FileResponse(location) if settings.demo else RedirectResponse(location)

@app.post('/api/email/retry')
def retry_email(context:AuthContext=Depends(require_admin)):
    deliver_outbox();return {'pending':len(store.repo.list('email_outbox',status='pending'))}

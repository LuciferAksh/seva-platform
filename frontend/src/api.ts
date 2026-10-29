import { get, set } from 'idb-keyval';
import { API_BASE, accessToken, connected, supabase } from './auth';
import { initialDemo } from './demo-data';
import type { Assignment, Completion, Match, Need, ReportInput, Role, Snapshot, Volunteer, VolunteerSignupInput } from './types';
const KEY='seva.demo.v2';
function demo(): Snapshot {
 try { const value=localStorage.getItem(KEY); if(value) return JSON.parse(value) as Snapshot; } catch { /* reset invalid demo state */ }
 return structuredClone(initialDemo);
}
function save(data: Snapshot) {
 data.summary={active_needs:data.needs.filter(n=>n.status==='new').length,assigned_needs:data.needs.filter(n=>n.status==='assigned').length,
 completed_needs:data.needs.filter(n=>n.status==='completed').length,active_volunteers:data.volunteers.filter(v=>v.availability==='available').length,
 families_impacted:0,people_helped:data.completions.filter(c=>c.review_status==='approved').reduce((s,c)=>s+(c.verified_people||0),0),pending_reviews:data.needs.filter(n=>n.status==='pending_review').length};
 data.total_needs=data.needs.length;localStorage.setItem(KEY,JSON.stringify(data));return data;
}
export async function request<T>(path:string, init:RequestInit={},expectedUid?:string):Promise<T> {
 const auth=await supabase?.auth.getSession();const token=auth?.data.session?.access_token;
 if(expectedUid&&auth?.data.session?.user.id!==expectedUid)throw new Error('The signed-in account changed. Your offline report remains saved for its owner.');
 if(!token)throw new Error('Sign in to continue.');
 const controller=new AbortController();const timeout=window.setTimeout(()=>controller.abort(),75000);
 try {
  const response=await fetch(API_BASE+path,{...init,signal:controller.signal,headers:{...init.headers,Authorization:`Bearer ${token}`}});
  if(!response.ok){const error=await response.json().catch(()=>({detail:'Service unavailable. The free server may be waking up; retry shortly.'}));throw new Error(typeof error.detail==='string'?error.detail:'Please check your submission and try again.');}
  return await response.json() as T;
 } catch(error){if(error instanceof DOMException && error.name==='AbortError')throw new Error('The server is taking longer to wake up. Your data has been kept; please retry.');throw error;}
 finally{window.clearTimeout(timeout);}
}
export async function fetchDashboard(role:Role='admin'):Promise<Snapshot> {
 if(connected)return request<Snapshot>('/api/dashboard');
 const data=save(demo());
 if(role==='volunteer'){
  const assignments=data.assignments.filter(a=>a.volunteer_id==='vol-asha');const ids=new Set(assignments.map(a=>a.need_id));
  return {...data,needs:data.needs.filter(n=>ids.has(n.id)||n.submitted_by==='demo-volunteer'),volunteers:data.volunteers.filter(v=>v.id==='vol-asha'),assignments,completions:data.completions.filter(c=>c.volunteer_id==='vol-asha')};
 }
 return data;
}
function distance(a:{lat:number;lng:number},b:{lat:number;lng:number}){
 const r=Math.PI/180;const p=Math.sin((b.lat-a.lat)*r/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin((b.lng-a.lng)*r/2)**2;
 return 6371*2*Math.asin(Math.min(1,Math.sqrt(p)));
}
export async function fetchMatches(id:string,ai=false):Promise<Match[]> {
 if(connected)return request(`/api/needs/${encodeURIComponent(id)}/matches?ai=${ai}`);
 const data=demo(),need=data.needs.find(n=>n.id===id);if(!need)throw new Error('Report not found');
 return data.volunteers.filter(v=>v.availability==='available').map(v=>{
 const fit=need.extraction.required_skills.filter(s=>v.skills.includes(s)).length/Math.max(1,need.extraction.required_skills.length);
 const km=need.extraction.coordinates?distance(need.extraction.coordinates,v.coordinates):null;
 return {volunteer_id:v.id,volunteer_name:v.name,score:.5*fit+.3*(km===null?0:Math.max(0,1-km/25))+.2*v.reliability_score,
 explanation:`${Math.round(fit*100)}% skill fit · ${km===null?'location unconfirmed':km.toFixed(1)+' km away'} · ${Math.round(v.reliability_score*100)}% reliability`};
 }).sort((a,b)=>b.score-a.score);
}
export async function createAssignment(payload:{need_id:string;volunteer_id:string}):Promise<Assignment>{
 if(connected)return request('/api/assignments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
 const data=demo(),need=data.needs.find(n=>n.id===payload.need_id),vol=data.volunteers.find(v=>v.id===payload.volunteer_id);
 if(!need||!vol||need.status!=='new'||vol.availability!=='available')throw new Error('This report or volunteer is already assigned.');
 const match=(await fetchMatches(need.id)).find(m=>m.volunteer_id===vol.id)!;
 const assignment:Assignment={id:need.id,need_id:need.id,volunteer_id:vol.id,volunteer_name:vol.name,match_score:match.score,match_reason:match.explanation,status:'assigned',created_at:new Date().toISOString()};
 need.status='assigned';vol.availability='busy';data.assignments.push(assignment);save(data);return assignment;
}
export async function createUploadReport(payload:ReportInput,uid='demo-admin'):Promise<Need>{
 if(connected){const body=new FormData();for(const [k,v] of Object.entries(payload)){if(v!==undefined&&v!==null)body.append(k,v instanceof File?v:String(v));}
 const result=await request<{report:Need}>('/api/reports/upload',{method:'POST',body},uid);return result.report;}
 const data=demo(),existing=data.needs.find(n=>n.submission_id===payload.submission_id);if(existing)return existing;
 if(!payload.text.trim())throw new Error('Add a description in demo mode. Connected mode can transcribe recordings and read photos.');
 const text=payload.text.toLowerCase();const category=(['medical','food','shelter','water','education'] as const).find(c=>text.includes(c))||'other';
 const urgency=/fire|trapped|collapse|unconscious/.test(text)?9:/urgent|emergency|critical/.test(text)?7:4;
 const skills:Record<string,string[]>={medical:['first-aid','medical-support'],food:['distribution'],water:['distribution'],shelter:['logistics'],education:['teaching'],other:['coordination']};
 const need:Need={id:crypto.randomUUID(),source_type:payload.source_type,original_text:payload.text,reporter_name:payload.reporter_name,
 extraction:{category,urgency_level:urgency,people_affected:Number(text.match(/(\d+)\s+(people|persons|residents|children)/)?.[1]||1),
 location_label:payload.lat!==undefined?'Pinned location':'Location needs confirmation',coordinates:payload.lat!==undefined&&payload.lng!==undefined?{lat:payload.lat,lng:payload.lng}:null,
 summary:payload.text.slice(0,180),required_skills:skills[category],suggested_supplies:[]},priority_score:urgency*1.5,status:'new',created_at:new Date().toISOString(),
 processing_mode:'demo',source_summary:'Demo rule extraction; no AI service called',submission_id:payload.submission_id,submitted_by:uid};
 if(payload.file){await set('seva.demo.report.'+need.id,payload.file);need.media_uri='browser-demo-report';}
 data.needs.unshift(need);save(data);return need;
}
export async function createCompletion(needId:string,volunteerId:string,notes:string,file:File):Promise<Completion>{
 if(connected){const body=new FormData();body.append('need_id',needId);body.append('volunteer_id',volunteerId);body.append('notes',notes);body.append('file',file);return request('/api/completions',{method:'POST',body});}
 const data=demo(),need=data.needs.find(n=>n.id===needId),assignment=data.assignments.find(a=>a.need_id===needId&&a.volunteer_id===volunteerId);
 if(!need||!assignment||need.status!=='assigned')throw new Error('An active assignment is required.');
 await set('seva.demo.photo.'+needId,file);
 const completion:Completion={id:needId,need_id:needId,volunteer_id:volunteerId,notes,media_uri:'browser-demo',verified_people:null,
 verification_reasoning:'Demo evidence. No AI audit was performed; requires coordinator review.',review_status:'pending',created_at:new Date().toISOString()};
 need.status='pending_review';data.completions=data.completions.filter(c=>c.need_id!==needId);data.completions.push(completion);save(data);return completion;
}
export async function reviewCompletion(id:string,approved:boolean,confirmedPeople?:number){
 if(connected)return request<Completion>(`/api/completions/${encodeURIComponent(id)}/review`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({approved,confirmed_people:confirmedPeople})});
 const data=demo(),need=data.needs.find(n=>n.id===id),completion=data.completions.find(c=>c.need_id===id),assignment=data.assignments.find(a=>a.need_id===id);
 if(!need||!completion||!assignment||need.status!=='pending_review')throw new Error('This review is no longer pending.');
 need.status=approved?'completed':'assigned';completion.review_status=approved?'approved':'rejected';
 if(approved&&confirmedPeople!==undefined)completion.verified_people=confirmedPeople;
 if(approved){assignment.status='completed';const vol=data.volunteers.find(v=>v.id===assignment.volunteer_id);if(vol)vol.availability='available';}
 save(data);return completion;
}
export async function completionPhoto(id:string):Promise<string>{
 if(!connected){const file=await get<File>('seva.demo.photo.'+id);if(!file)throw new Error('Demo photo is unavailable in this browser.');return URL.createObjectURL(file);}
 const token=await accessToken();const response=await fetch(`${API_BASE}/api/completions/${encodeURIComponent(id)}/photo`,{headers:{Authorization:`Bearer ${token}`}});
 if(!response.ok)throw new Error('Could not load the completion photo.');return URL.createObjectURL(await response.blob());
}
export async function createVolunteer(payload:VolunteerSignupInput):Promise<Volunteer>{return request('/api/volunteers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});}
export function resetDemo(){localStorage.removeItem(KEY);}
export async function fetchFacilities(id:string){
 if(!connected)throw new Error('Facility lookup is available in a connected workspace. No external location lookup runs in the browser demo.');
 return request<import('./types').NearbyFacility[]>(`/api/needs/${encodeURIComponent(id)}/facilities`);
}
export async function reportMedia(id:string):Promise<{url:string;type:string}>{
 if(!connected){const file=await get<File>('seva.demo.report.'+id);if(!file)throw new Error('This report attachment is unavailable in this browser.');return {url:URL.createObjectURL(file),type:file.type};}
 const token=await accessToken();const response=await fetch(`${API_BASE}/api/needs/${encodeURIComponent(id)}/media`,{headers:{Authorization:`Bearer ${token}`}});
 if(!response.ok)throw new Error('The report attachment is temporarily unavailable.');const blob=await response.blob();return {url:URL.createObjectURL(blob),type:blob.type};
}

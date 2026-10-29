import { useEffect, useState } from 'react';
import { ArrowRight, Check, CheckCircle2, Clock3, MapPin, Navigation, ShieldCheck, Sparkles, UploadCloud, Users, X } from 'lucide-react';
import { completionPhoto, createAssignment, createCompletion, fetchMatches, fetchFacilities, reviewCompletion, reportMedia } from '../api';
import type { Assignment, Completion, Match, Need, Session, NearbyFacility } from '../types';
import Modal from './Modal';
import { CategoryIcon, categoryLabels, initials, Status, timeAgo, Urgency } from './ui';

export default function IncidentDetail({ need, assignment, completion, session, onClose, onChange }: {
  need: Need; assignment?: Assignment; completion?: Completion; session: Session; onClose: () => void; onChange: (message: string) => Promise<void>;
}) {
  const [matches, setMatches] = useState<Match[]>([]); const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [choice, setChoice] = useState('');
  const [file, setFile] = useState<File | null>(null); const [notes, setNotes] = useState(''); const [photo, setPhoto] = useState('');
  const [confirmed,setConfirmed]=useState('');const [facilities,setFacilities]=useState<NearbyFacility[]|null>(null);const [finding,setFinding]=useState(false);
  const [attachment,setAttachment]=useState<{url:string;type:string}|null>(null);
  useEffect(()=>{
    if(!need.media_uri)return;let active=true;let url='';
    void reportMedia(need.id).then(media=>{url=media.url;if(active)setAttachment(media);else URL.revokeObjectURL(url);}).catch(e=>{if(active)setError(e.message);});
    return()=>{active=false;if(url)URL.revokeObjectURL(url);};
  },[need.id,need.media_uri]);
  useEffect(() => {
    if (need.status !== 'new' || session.role !== 'admin') return;
    let active = true; setLoading(true); setError('');
    fetchMatches(need.id).then(result => { if (active) { setMatches(result); setChoice(result[0]?.volunteer_id || ''); } }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [need.id, need.status, session.role]);
  useEffect(() => {
    if (!completion) return;
    let active = true; let objectUrl = '';
    completionPhoto(need.id).then(url => { objectUrl = url; if (active) setPhoto(url); else URL.revokeObjectURL(url); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [need.id, completion]);
  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true); setError('');
    try { await action(); await onChange(message); } catch (e) { setError(e instanceof Error ? e.message : 'Could not complete that action.'); } finally { setBusy(false); }
  }
  const coords = need.extraction.coordinates;
  return <Modal title={need.extraction.summary} onClose={busy ? () => undefined : onClose} wide>
    <div className="detail-tags"><CategoryIcon category={need.extraction.category} /><span>{categoryLabels[need.extraction.category]}</span><Urgency level={need.extraction.urgency_level} /><Status status={need.status} /></div>
    <div className="detail-meta"><span><MapPin size={15} />{need.extraction.location_label}</span><span><Users size={15} />{need.extraction.people_affected} people affected</span><span><Clock3 size={15} />{timeAgo(need.created_at)}</span></div>
    <div className="detail-grid"><div>
      <section className="detail-section"><h3>The field report</h3><p className="report-quote">{need.original_text}</p><span className="hint">Reported by {need.reporter_name} · {need.source_type === 'voice' ? 'Voice note' : need.source_type === 'image' ? 'Photo report' : 'Text report'}</span></section>
      {attachment&&(attachment.type.startsWith('image/')?<img className="evidence-photo" src={attachment.url} alt="Original field report attachment"/>:<audio className="report-audio" src={attachment.url} controls aria-label="Original field voice report"/>)}
      <section className="detail-section"><h3>What the response needs</h3><div className="supply-list">{(need.extraction.suggested_supplies?.length ? need.extraction.suggested_supplies : need.extraction.required_skills).map(item => <span key={item}><Check size={13} />{item.replace(/-/g, ' ')}</span>)}</div><p className="hint">Suggested resources are reviewed by a coordinator before dispatch.</p></section>
      <div className="insight-note"><Sparkles size={18} /><div><strong>Clear information. Human decisions.</strong><p>{need.source_summary || 'Review this field report before dispatching support.'}</p></div></div>
      {coords ? <a className="button secondary full" href={`https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`} target="_blank" rel="noreferrer"><Navigation size={15} />Open directions<ArrowRight size={15} /></a> : <p className="warning-note"><MapPin size={16} />Confirm the report’s location with the reporter before dispatch.</p>}
      {coords&&session.mode!=='demo'&&<section className="detail-section facilities-section"><button className="text-button" disabled={finding} onClick={()=>{setFinding(true);setError('');void fetchFacilities(need.id).then(setFacilities).catch(e=>setError(e.message)).finally(()=>setFinding(false));}}><MapPin size={14}/>{finding?'Looking up support…':'Find nearby hospitals & pharmacies'}</button><p className="hint">Looks up a coarse area using OpenStreetMap. Confirm availability locally.</p>{facilities&&<div className="facility-results">{facilities.length?facilities.map((f,i)=><a key={i} href={`https://www.google.com/maps/dir/?api=1&destination=${f.lat},${f.lng}`} target="_blank" rel="noreferrer">{f.name}<ArrowRight size={13}/></a>):<p className="hint">No named facilities found in this area.</p>}</div>}</section>}
    </div><div className="dispatch-panel">
      {need.status === 'new' && session.role === 'admin' ? <><div className="section-title"><span className="mini-icon"><Users size={17} /></span><div><h3>Find the right helping hand</h3><p>Ranked by skills, proximity and reliability</p></div></div>
        {loading ? <p className="hint">Finding available volunteers…</p> : matches.length ? <div className="match-list">{matches.slice(0, 5).map((m, i) => <label className={`match-option ${choice === m.volunteer_id ? 'selected' : ''}`} key={m.volunteer_id}><input type="radio" name="volunteer" value={m.volunteer_id} checked={choice === m.volunteer_id} onChange={() => setChoice(m.volunteer_id)} /><span className="avatar">{initials(m.volunteer_name)}</span><span className="match-copy"><strong>{m.volunteer_name}{i === 0 && <small>Best fit</small>}</strong><span>{m.explanation}</span></span><b>{Math.round(m.score * 100)}<small>%</small></b></label>)}</div> : <p className="empty-copy">No volunteers are available right now. Check the team directory for availability.</p>}
        {session.mode!=='demo'&&<button className="text-button ai-match-button" disabled={busy||loading} onClick={()=>{setLoading(true);void fetchMatches(need.id,true).then(result=>{setMatches(result);setChoice(result[0]?.volunteer_id||'');}).catch(e=>setError(e.message)).finally(()=>setLoading(false));}}><Sparkles size={14}/>Get AI-assisted suggestions</button>}
        <button className="button primary full" disabled={busy || loading || !choice} onClick={() => void run(() => createAssignment({ need_id: need.id, volunteer_id: choice }), 'Volunteer assigned. The response is moving forward.')}>{busy ? 'Assigning…' : 'Assign volunteer'}<ArrowRight size={16} /></button>
      </> : need.status === 'assigned' && assignment ? <><div className="section-title"><span className="mini-icon"><ShieldCheck size={18} /></span><div><h3>Mission in progress</h3><p>Assigned to {assignment.volunteer_name}</p></div></div><p className="hint">Upload a photo and a short field note when support has been delivered. A coordinator reviews the evidence.</p><label className="upload-box compact"><UploadCloud size={25} /><strong>{file ? file.name : 'Choose a completion photo'}</strong><span>JPG, PNG or WebP · up to 10 MB</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { const next = e.target.files?.[0]; if (next && next.size > 10 * 1024 * 1024) setError('Choose a photo smaller than 10 MB.'); else setFile(next || null); }} /></label><label className="field">Field notes<textarea rows={3} value={notes} maxLength={3000} onChange={e => setNotes(e.target.value)} placeholder="What support was delivered?" /></label><button className="button primary full" disabled={busy || !file} onClick={() => file && void run(() => createCompletion(need.id, assignment.volunteer_id, notes, file), 'Evidence submitted for coordinator review.')}>{busy ? 'Submitting evidence…' : 'Submit for review'}<ArrowRight size={16} /></button></> : need.status === 'pending_review' && completion ? <><div className="section-title"><span className="mini-icon"><ShieldCheck size={18} /></span><div><h3>Evidence ready for review</h3><p>Submitted by {assignment?.volunteer_name || 'the assigned volunteer'}</p></div></div>{photo && <img className="evidence-photo" src={photo} alt="Volunteer submitted relief-delivery evidence" />}<p className="body-copy">{completion.notes || 'No additional field notes.'}</p><p className="hint">{completion.verification_reasoning}</p>{session.role === 'admin' ? <><label className="field review-count">Confirmed people helped <span className="hint">Optional: enter a count you can confirm from the evidence.</span><input type="number" min="0" max="100000" step="1" value={confirmed} onChange={e=>setConfirmed(e.target.value)} placeholder={completion.verified_people===null?'Not counted':String(completion.verified_people)} /></label><div className="review-actions"><button className="button primary full" disabled={busy || !photo || (confirmed!==''&&(!Number.isInteger(Number(confirmed))||Number(confirmed)<0||Number(confirmed)>100000))} onClick={() => void run(() => reviewCompletion(need.id, true, confirmed===''?undefined:Number(confirmed)), 'Mission reviewed and marked complete.')}><CheckCircle2 size={16} />Approve completion</button><button className="button secondary full" disabled={busy} onClick={() => void run(() => reviewCompletion(need.id, false), 'Evidence returned. The mission remains in progress.')}><X size={16} />Request new evidence</button></div></> : <p className="success-message">Your coordinator will review this evidence.</p>}</> : <div className="completed-state"><CheckCircle2 size={40} /><h3>{need.status === 'completed' ? 'A response that made a difference.' : 'Report received.'}</h3><p>{need.status === 'completed' ? 'This mission has been reviewed and completed.' : 'Your report is with the coordination team.'}</p></div>}
    </div></div>
    {error && <p className="error-message" role="alert">{error}</p>}
  </Modal>;
}

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { get, set, del } from 'idb-keyval';
import { ArrowRight, Check, FileText, ImagePlus, LocateFixed, MapPin, Mic, Square, UploadCloud } from 'lucide-react';
import Modal from './Modal';
import type { ReportInput } from '../types';
import Turnstile from './Turnstile';

export default function ReportModal({ onClose, onSubmit, demo, publicIntake=false }: { onClose: () => void; onSubmit: (report: ReportInput) => Promise<void>; demo: boolean; publicIntake?:boolean }) {
  const [mode, setMode] = useState<'text'|'voice'|'image'>('text');
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [locating, setLocating] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const id = useRef<string>(crypto.randomUUID());
  const [token,setToken]=useState('');const [challenge,setChallenge]=useState(0);
  const [draftMessage,setDraftMessage]=useState('');
  useEffect(()=>{
    if(!publicIntake)return;let active=true;
    void get<{mode:'text'|'voice'|'image';text:string;name:string;lat:string;lng:string;file:File|null;id:string}>('seva.public.draft.v1').then(draft=>{
      if(!active||!draft)return;setMode(draft.mode);setText(draft.text);setName(draft.name);setLat(draft.lat);setLng(draft.lng);setFile(draft.file);id.current=draft.id;setDraftMessage('Restored your saved draft from this device.');
    }).catch(()=>undefined);
    return()=>{active=false;};
  },[publicIntake]);
  useEffect(() => () => { if (recorder.current?.state === 'recording') recorder.current.stop(); stream.current?.getTracks().forEach(t => t.stop()); }, []);
  useEffect(() => { if (!recording) return; const timer = window.setInterval(() => setSeconds(v => v + 1), 1000); return () => clearInterval(timer); }, [recording]);
  useEffect(()=>{if(recording&&seconds>=120)recorder.current?.stop();},[recording,seconds]);
  function chooseFile(next: File | undefined) {
    if (!next) return;
    if (next.size > 10 * 1024 * 1024) { setError('Choose a file smaller than 10 MB.'); return; }
    setError(''); setFile(next);
  }
  async function startRecording() {
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error('Recording is not supported in this browser. Upload an audio file instead.');
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      const next = new MediaRecorder(stream.current); recorder.current = next;
      const chunks: Blob[] = [];
      next.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      next.onstop = () => { const mime = next.mimeType || 'audio/webm'; chooseFile(new File(chunks, `field-recording.${mime.includes('mp4') ? 'm4a' : 'webm'}`, { type: mime.split(';')[0] })); stream.current?.getTracks().forEach(t => t.stop()); setRecording(false); };
      next.start(); setSeconds(0); setRecording(true); setError('');
    } catch (e) { stream.current?.getTracks().forEach(t=>t.stop());setRecording(false);setError(e instanceof Error ? e.message : 'Microphone unavailable.'); }
  }
  function locate() {
    if (!navigator.geolocation) { setError('Location is unavailable. Enter coordinates below.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(p => { setLat(p.coords.latitude.toFixed(6)); setLng(p.coords.longitude.toFixed(6)); setLocating(false); }, () => { setError('Location permission unavailable. Enter coordinates manually.'); setLocating(false); }, { timeout: 12000, enableHighAccuracy: true });
  }
  async function submit(e: FormEvent) {
    e.preventDefault(); setError('');
    if (recording) { setError('Stop the recording before submitting.'); return; }
    if ((lat === '') !== (lng === '')) { setError('Enter both latitude and longitude.'); return; }
    if (demo && !text.trim()) { setError('Add a description for the demo. AI transcription is available after connecting Groq.'); return; }
    setBusy(true);
    try { await onSubmit({ source_type: mode, text, reporter_name: name || 'Field worker', submission_id: id.current, file, turnstile_token:token, ...(lat !== '' ? { lat: Number(lat), lng: Number(lng) } : {}) });if(publicIntake)await del('seva.public.draft.v1').catch(()=>undefined);onClose(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not submit your report.');setToken('');setChallenge(v=>v+1); }
    finally { setBusy(false); }
  }
  return <Modal title="Make the first signal count." onClose={busy ? () => undefined : onClose}>
    <p className="modal-intro">Share what is happening. We’ll help turn it into a clear, actionable request.</p>
    <form onSubmit={submit} className="form-stack">
      <div className="intake-tabs" aria-label="Report format">{([{ key: 'text', label: 'Write a report', Icon: FileText }, { key: 'voice', label: 'Voice note', Icon: Mic }, { key: 'image', label: 'Upload a photo', Icon: ImagePlus }] as const).map(({ key, label, Icon }) => <button type="button" key={key} className={mode === key ? 'active' : ''} onClick={() => { setMode(key); setFile(null); }} disabled={recording}><Icon size={19} />{label}</button>)}</div>
      {mode !== 'text' && <div className="upload-box">
        {mode === 'voice' ? <><button type="button" className={`record-button ${recording ? 'recording' : ''}`} onClick={() => recording ? recorder.current?.stop() : void startRecording()} aria-label={recording ? 'Stop recording' : 'Start recording'}>{recording ? <Square size={20} /> : <Mic size={23} />}</button><strong>{recording ? `Recording · ${seconds}s` : file ? file.name : 'Let your voice carry the details'}</strong><span>Record a short note or choose an audio file.</span></> : <><UploadCloud size={30} /><strong>{file ? file.name : 'A little context goes a long way'}</strong><span>JPG, PNG or WebP · up to 10 MB</span></>}
        <label className="button secondary small">{file ? <Check size={14} /> : <ImagePlus size={14} />}{file ? 'Change file' : 'Choose file'}<input type="file" hidden accept={mode === 'image' ? 'image/jpeg,image/png,image/webp' : 'audio/*,video/webm'} onChange={e => chooseFile(e.target.files?.[0])} /></label>
      </div>}
      <label className="field">{mode === 'text' ? 'What is needed?' : 'Additional context' }<textarea required={mode === 'text' || demo} rows={4} maxLength={10000} placeholder="For example: 30 people in Adyar need clean drinking water after flooding. Volunteers can reach the community centre from the north entrance." value={text} onChange={e => setText(e.target.value)} /></label>
      <label className="field">Your name<input maxLength={100} placeholder="How should we refer to you?" value={name} onChange={e => setName(e.target.value)} /></label>
      <div className="location-heading"><span><MapPin size={16} />Location <small>optional, but helpful</small></span><button type="button" className="text-button" onClick={locate} disabled={locating}><LocateFixed size={14} />{locating ? 'Locating…' : 'Use my location'}</button></div>
      <div className="form-grid"><label className="field">Latitude<input type="number" step="any" min="-90" max="90" placeholder="13.0067" value={lat} onChange={e => setLat(e.target.value)} /></label><label className="field">Longitude<input type="number" step="any" min="-180" max="180" placeholder="80.2573" value={lng} onChange={e => setLng(e.target.value)} /></label></div>
      {demo && <p className="hint">Demo reports stay in this browser. Add a description; recordings and photos are not sent to an AI service.</p>}
      {publicIntake&&!demo&&<Turnstile onToken={setToken} onError={setError} resetKey={challenge}/>}
      {publicIntake&&<div className="draft-actions"><button type="button" className="text-button" disabled={busy||recording} onClick={()=>void set('seva.public.draft.v1',{mode,text,name,lat,lng,file,id:id.current}).then(()=>setDraftMessage('Draft saved on this device. Reopen this form when you can submit.')).catch(()=>setError('This browser could not save your draft. Keep the form open.'))}>Save draft on this device</button><span className="hint" role="status">{draftMessage||'Useful when your connection is unreliable. Drafts are not sent to the response team.'}</span></div>}
      {error && <p className="error-message" role="alert">{error}</p>}
      <div className="modal-footer"><span className="hint">Your report will be reviewed before dispatch.</span><button className="button primary" disabled={busy || recording || (publicIntake&&!demo&&!token)}>{busy ? 'Processing report…' : 'Submit report'}<ArrowRight size={16} /></button></div>
    </form>
  </Modal>;
}

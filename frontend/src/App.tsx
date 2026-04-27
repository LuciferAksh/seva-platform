import { FormEvent, useEffect, useRef, useState } from "react";
import { get, set } from 'idb-keyval';
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  createAssignment,
  createCompletion,
  createUploadReport,
  createVolunteer,
  fetchAssignments,
  fetchMatches,
  fetchNeeds,
  fetchSummary,
  fetchVolunteers,
} from "./api";
import {
  isAdminEmail,
  isFirebaseConfigured,
  observeAuthState,
  signInWithEmail,
  signOutUser,
  signUpVolunteerWithEmail,
} from "./firebase";
import type { Assignment, Match, Need, Summary, Volunteer, VolunteerSignupInput } from "./types";

// ═══════════════════════════════════════════════════════════
// DESIGN SYSTEM
// ═══════════════════════════════════════════════════════════
const C = {
  bg0: '#04080D', bg1: '#080F18', bg2: '#0C1520', bg3: '#111D2B',
  border: '#162130', borderBright: '#1E3247',
  accent: '#00E5A0', accentDim: 'rgba(0,229,160,0.08)', accentGlow: 'rgba(0,229,160,0.35)',
  danger: '#FF3A3A', dangerDim: 'rgba(255,58,58,0.1)',
  warn: '#FFAB00', warnDim: 'rgba(255,171,0,0.1)',
  info: '#38BDFF', infoDim: 'rgba(56,189,255,0.1)',
  ai: '#B47EFF', aiDim: 'rgba(180,126,255,0.1)',
  text: '#D8E8F2', text2: '#5E7A8E', text3: '#243343',
};

const CAT: Record<string, {label:string; color:string; bg:string; dot:string}> = {
  food:      { label: 'Food',      color: '#FFAB00', bg: 'rgba(255,171,0,0.12)',      dot: '#FFAB00' },
  medical:   { label: 'Medical',   color: '#FF3A3A', bg: 'rgba(255,58,58,0.12)',      dot: '#FF3A3A' },
  shelter:   { label: 'Shelter',   color: '#38BDFF', bg: 'rgba(56,189,255,0.12)',     dot: '#38BDFF' },
  education: { label: 'Education', color: '#B47EFF', bg: 'rgba(180,126,255,0.12)',    dot: '#B47EFF' },
  water:     { label: 'Water',     color: '#00E5A0', bg: 'rgba(0,229,160,0.12)',      dot: '#00E5A0' },
  other:     { label: 'Other',     color: '#5E7A8E', bg: 'rgba(94,122,142,0.12)',     dot: '#5E7A8E' },
};

function getCat(key: string) { return CAT[key] || CAT.other; }

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:${C.bg0};color:${C.text};font-family:'DM Sans',sans-serif;overflow:hidden;}
  ::-webkit-scrollbar{width:4px; height:4px;} ::-webkit-scrollbar-track{background:${C.bg1};} ::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px;}
  @keyframes pulse-ring { 0%{transform:scale(1);opacity:.8} 70%{transform:scale(2.4);opacity:0} 100%{transform:scale(2.4);opacity:0} }
  @keyframes pulse-dot  { 0%,100%{opacity:1} 50%{opacity:.5} }
  @keyframes fadeUp     { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn     { from{opacity:0} to{opacity:1} }
  @keyframes slideRight { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }
  @keyframes scanline   { 0%{top:-5%} 100%{top:105%} }
  @keyframes spin       { to{transform:rotate(360deg)} }
  @keyframes blink      { 0%,49%{opacity:1} 50%,100%{opacity:0} }
  .need-row:hover { background: ${C.bg3} !important; }
  button:disabled { opacity: 0.5; cursor: not-allowed !important; }

  /* Forms */
  input, textarea { background: rgba(255,255,255,0.04); border: 1px solid ${C.border}; color: ${C.text}; padding: 12px; border-radius: 8px; font-family: 'DM Sans', sans-serif; width: 100%; outline: none; }
  input:focus, textarea:focus { border-color: ${C.accent}; box-shadow: 0 0 0 2px ${C.accentDim}; }
  label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: ${C.text2}; margin-bottom: 12px; }
  
  /* Modal tabs */
  .auth-tab { flex:1; background:none; border:none; border-bottom:2px solid transparent; color:${C.text2}; padding:10px; cursor:pointer; font-family:'DM Sans'; font-size:13px; }
  .auth-tab.active { border-color:${C.accent}; color:${C.accent}; font-weight:600; }

      /* Heatmap */
  .heatmap-blob { filter: blur(35px); mix-blend-mode: screen; pointer-events: none; }
  .dark-tiles img.leaflet-tile { filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%) !important; }
  .dark-tiles .leaflet-container { background: #04080D !important; }
  .light-tiles img.leaflet-tile { filter: none !important; }
  
  @media (max-width: 768px) {
    .hide-mobile { display: none !important; }
    .grid-mobile-stack { grid-template-columns: 1fr !important; }
    .auth-modal-content { width: 95% !important; padding: 16px !important; }
    header { padding: 10px !important; height: auto !important; flex-wrap: wrap; }
    .header-left { margin-right: 0 !important; width: 100%; justify-content: space-between; margin-bottom: 10px; }
    .header-nav { width: 100%; justify-content: space-between; overflow-x: auto; padding-bottom: 4px; }
    .header-nav button { flex: 1; justify-content: center; }
    .desktop-only-text { display: none; }
  }
`;

// ═══════════════════════════════════════════════════════════
// SMALL COMPONENTS
// ═══════════════════════════════════════════════════════════
function LiveDot({ color = C.accent, size = 7 }: {color?:string; size?:number}) {
  return (
    <span style={{ position:'relative', display:'inline-flex', width:size, height:size, flexShrink:0 }}>
      <span style={{ position:'absolute', inset:0, borderRadius:'50%', background:color, animation:'pulse-ring 1.8s ease-out infinite' }} />
      <span style={{ position:'absolute', inset:0, borderRadius:'50%', background:color, animation:'pulse-dot 1.8s ease-in-out infinite' }} />
    </span>
  );
}

function Badge({ label, color, bg }: {label:string; color:string; bg:string}) {
  return <span style={{ fontSize:10, fontWeight:600, fontFamily:'Space Mono', letterSpacing:1, padding:'3px 9px', borderRadius:3, color, background:bg, textTransform:'uppercase' }}>{label}</span>;
}

function UrgencyBar({ value }: {value:number}) {
  const color = value >= 8 ? C.danger : value >= 6 ? C.warn : C.accent;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <div style={{ flex:1, height:3, background:C.bg3, borderRadius:2, overflow:'hidden' }}>
        <div style={{ width:`${value*10}%`, height:'100%', background:color, borderRadius:2, transition:'width .6s ease' }} />
      </div>
      <span style={{ fontSize:10, fontFamily:'Space Mono', color, minWidth:18 }}>{value}</span>
    </div>
  );
}

function Spinner() {
  return <div style={{ width:18, height:18, border:`2px solid ${C.border}`, borderTopColor:C.ai, borderRadius:'50%', animation:'spin .8s linear infinite' }} />;
}

function Toast({ msg, onClose }: {msg:string; onClose:()=>void}) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position:'fixed', top:72, right:20, zIndex:9999, display:'flex', alignItems:'center', gap:10,
      background:C.bg3, border:`1px solid ${C.accent}`, borderRadius:8, padding:'12px 18px',
      boxShadow:`0 4px 24px rgba(0,0,0,.4), 0 0 16px ${C.accentGlow}`,
      animation:'slideRight .3s ease', fontFamily:'DM Sans', fontSize:13, color:C.text, maxWidth:320 }}>
      <LiveDot /><span>{msg}</span>
      <button onClick={onClose} style={{ marginLeft:'auto', background:'none', border:'none', color:C.text2, cursor:'pointer', fontSize:16, lineHeight:1 }}>×</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SVG MAP
// ═══════════════════════════════════════════════════════════
function SevaMap({ needs, volunteers, onSelect, selected, newNeed, showAllFacilities=true }: any) {
  const [mapStyle, setMapStyle] = useState<'dark' | 'satellite' | 'heatmap'>('satellite');
  const [mapTheme, setMapTheme] = useState<'light' | 'dark'>('dark');

  // Dark mode is active if specifically chosen OR if heatmap is active and theme is set to dark
  const isDark = (mapStyle === 'dark') || (mapStyle === 'heatmap' && mapTheme === 'dark');

  const center: [number, number] = selected?.extraction?.coordinates 
    ? [selected.extraction.coordinates.lat, selected.extraction.coordinates.lng]
    : needs.length > 0 && needs[0].extraction?.coordinates
      ? [needs[0].extraction.coordinates.lat, needs[0].extraction.coordinates.lng]
      : [22.5937, 78.9629];
  
  const zoom = selected ? 14 : 5;

  return (
    <div className={isDark ? 'dark-tiles' : 'light-tiles'} style={{ position:'relative', background:C.bg1, borderRadius:10, overflow:'hidden', border:`1px solid ${C.border}`, height:'100%' }}>
      <div style={{ position:'absolute', top: 12, right: 12, zIndex: 1000, display: 'flex', gap: 6 }}>
        {/* Toggle only for heatmap as per user request */}
        {mapStyle === 'heatmap' && (
           <button onClick={() => setMapTheme(mapTheme === 'light' ? 'dark' : 'light')} style={{ fontSize: 10, padding: '4px 8px', background: C.bg2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: 'Space Mono' }}>
             {mapTheme === 'light' ? '🌙 DARK' : '☀️ LIGHT'}
           </button>
        )}
        <button onClick={() => setMapStyle('dark')} style={{ fontSize: 10, padding: '4px 8px', background: mapStyle === 'dark' ? C.accent : C.bg2, color: mapStyle === 'dark' ? '#000' : C.text, border: `1px solid ${C.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: 'Space Mono' }}>GOOGLE STREETS</button>
        <button onClick={() => setMapStyle('satellite')} style={{ fontSize: 10, padding: '4px 8px', background: mapStyle === 'satellite' ? C.accent : C.bg2, color: mapStyle === 'satellite' ? '#000' : C.text, border: `1px solid ${C.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: 'Space Mono' }}>SATELLITE</button>
        <button onClick={() => setMapStyle('heatmap')} style={{ fontSize: 10, padding: '4px 8px', background: mapStyle === 'heatmap' ? C.danger : C.bg2, color: mapStyle === 'heatmap' ? '#FFF' : C.text, border: `1px solid ${C.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: 'Space Mono', boxShadow: mapStyle==='heatmap' ? '0 0 10px red' : 'none' }}>AI HEATMAP</button>
      </div>

      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%', background: C.bg0 }} zoomControl={true}>
        <TileLayer 
          url={mapStyle === 'satellite' ? "https://mt1.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}&region=IN" : "https://mt1.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}&region=IN"}
          attribution="&copy; Google Maps"
        />

        {needs.filter((n:any)=>n.extraction?.coordinates?.lat && n.extraction?.coordinates?.lng).map((n:any) => {
          const isSelected = selected?.id === n.id;
          const cat = getCat(n.extraction.category);
          return (
            <CircleMarker
              key={n.id}
              center={[n.extraction.coordinates.lat, n.extraction.coordinates.lng]}
              radius={mapStyle === 'heatmap' ? 25 + (n.extraction.urgency_level * 5) : (isSelected ? 10 : 7)}
              className={mapStyle === 'heatmap' ? 'heatmap-blob' : ''}
              pathOptions={{
                color: cat.dot,
                fillColor: cat.dot,
                fillOpacity: mapStyle === 'heatmap' ? 0.2 : (n.status === 'completed' ? 0.3 : 0.8),
                weight: isSelected ? 3 : 1
              }}
              eventHandlers={{ click: () => onSelect(n) }}
            >
              <Popup>
                <div style={{ color: '#000', fontFamily: 'DM Sans', fontSize: 12 }}>
                  <strong>{cat.label} Need</strong><br/>
                  {n.extraction?.location_label}<br/>
                  Status: {n.status}<br/>
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${n.extraction.coordinates.lat},${n.extraction.coordinates.lng}`} target="_blank" rel="noopener noreferrer" style={{ display:'block', marginTop: 8, color: C.info, fontWeight: 700 }}>🚗 Navigate</a>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}


        {needs.filter((n:any)=>(showAllFacilities || selected?.id === n.id) && n.extraction?.nearby_facilities && n.extraction.nearby_facilities.length > 0).flatMap((n:any) => n.extraction.nearby_facilities).map((f:any, i:number) => (
          <CircleMarker
            key={'fac-'+i}
            center={[f.lat, f.lng]}
            radius={6}
            pathOptions={{ color: '#fff', fillColor: C.danger, fillOpacity: 1, weight: 2 }}
          >
            <Popup>
              <div style={{ color: '#000', fontFamily: 'DM Sans', fontSize: 12 }}>
                <strong>🏥 {f.name}</strong><br/>
                {f.address}<br/>
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${f.lat},${f.lng}`} target="_blank" rel="noopener noreferrer" style={{ display:'block', marginTop: 8, color: C.info, fontWeight: 700 }}>🚗 Navigate</a>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {volunteers.filter((v:any)=>v.availability==='available' && v.coordinates?.lat && v.coordinates?.lng).map((v:any) => (
          <CircleMarker
            key={v.id}
            center={[v.coordinates.lat, v.coordinates.lng]}
            radius={5}
            className={mapStyle === 'heatmap' ? 'heatmap-blob' : ''}
              pathOptions={{ color: C.accent, fillColor: C.accent, fillOpacity: 0.9, weight: 1 }}
          >
            <Popup>
              <div style={{ color: '#000', fontFamily: 'DM Sans', fontSize: 12 }}>
                <strong>Volunteer</strong><br/>
                {v.name}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
// ═══════════════════════════════════════════════════════════
// VIEW: FIELD WORKER
// ═══════════════════════════════════════════════════════════
function FieldView({ onSubmit }: { onSubmit:(text:string, file:File|null, mode:'text'|'voice'|'image', name:string)=>Promise<Need|null> }) {
  const [mode, setMode] = useState<'text'|'voice'|'image'|null>(null);
  const [text, setText] = useState('');
  const [reporterName, setReporterName] = useState('Field Worker');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Need|null>(null);
  const [error, setError] = useState<string|null>(null);
  
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [reportFile, setReportFile] = useState<File | null>(null);
  const isStartingVoiceRef = useRef(false);

  async function startVoice() {
    if (isStartingVoiceRef.current || recording || recorderRef.current) return;
    isStartingVoiceRef.current = true;
    
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Audio capture is not available in this browser.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioFile = new File([audioBlob], "seva-voice-note.webm", { type: "audio/webm" });
        setReportFile(audioFile);
        stream.getTracks().forEach((track) => track.stop());
        recorderRef.current = null;
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (err: any) {
      setError(err.message || "Microphone access denied or failed.");
    } finally {
      isStartingVoiceRef.current = false;
    }
  }

  function stopVoice() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    setRecording(false);
  }

  async function handleSubmit() {
    setLoading(true); setResult(null); setError(null);
    try {
      const need = await onSubmit(text, reportFile, mode || 'text', reporterName);
      if (need) setResult(need);
      else setError("AI extraction failed.");
    } catch(err:any) {
      setError(err.message || "Failed to process report");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    const cat = getCat(result.extraction.category);
    return (
      <div style={{ maxWidth:480, margin:'0 auto', animation:'fadeUp .4s ease' }}>
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ width:56, height:56, borderRadius:'50%', background:C.accentDim, border:`1.5px solid ${C.accent}`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px',
            boxShadow:`0 0 20px ${C.accentGlow}` }}>
            <span style={{ fontSize:22 }}>✓</span>
          </div>
          <h2 style={{ fontSize:18, fontWeight:600, fontFamily:'Syne', color:C.text }}>Need Logged</h2>
          <p style={{ fontSize:12, color:C.text2, marginTop:4 }}>AI extraction complete — visible on ops dashboard</p>
        </div>
        <div style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:10, padding:20, marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <Badge label={cat.label} color={cat.color} bg={cat.bg} />
            <span style={{ marginLeft:'auto', fontSize:11, fontFamily:'Space Mono', color: result.extraction.urgency_level>=8?C.danger:result.extraction.urgency_level>=6?C.warn:C.accent }}>
              URGENCY {result.extraction.urgency_level}/10
            </span>
          </div>
          <p style={{ fontSize:14, lineHeight:1.6, color:C.text, marginBottom:12 }}>{result.extraction.summary}</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:8 }}>
            {result.extraction.location_label && <div style={{ background:C.bg3, borderRadius:6, padding:'8px 10px' }}>
              <div style={{ fontSize:9, color:C.text2, fontFamily:'Space Mono', marginBottom:3 }}>LOCATION</div>
              <div style={{ fontSize:12, color:C.text }}>{result.extraction.location_label}</div>
            </div>}
            {result.extraction.people_affected && <div style={{ background:C.bg3, borderRadius:6, padding:'8px 10px' }}>
              <div style={{ fontSize:9, color:C.text2, fontFamily:'Space Mono', marginBottom:3 }}>PEOPLE</div>
              <div style={{ fontSize:12, color:C.text }}>{result.extraction.people_affected}</div>
            </div>}
          </div>
        </div>
        <button onClick={() => { setResult(null); setMode(null); setText(''); setReportFile(null); }}
          style={{ width:'100%', padding:12, borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', color:C.text2, fontSize:13, cursor:'pointer' }}>
          Report another need →
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth:480, margin:'0 auto' }}>
      <div style={{ marginBottom:28, animation:'fadeUp .3s ease' }}>
        <h2 style={{ fontSize:22, fontWeight:700, fontFamily:'Syne', color:C.text }}>Report a community need</h2>
        <p style={{ fontSize:13, color:C.text2, marginTop:6 }}>Voice note in Hindi or English · photo · typed report — AI understands all three</p>
      </div>
      
      <label>Reporter Name: <input value={reporterName} onChange={e=>setReporterName(e.target.value)} /></label>

      {!mode && !loading && (
        <div className="grid-mobile-stack" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(100px, 1fr))', gap:10, animation:'fadeUp .35s ease' }}>
          {[
            { id:'voice', emoji:'🎙️', label:'Voice note', sub:'Hindi / English' },
            { id:'text',  emoji:'✍️', label:'Type report', sub:'Any language'   },
            { id:'image', emoji:'📷', label:'Survey photo', sub:'Handwritten ok' },
          ].map(m => (
            <button key={m.id} onClick={() => { setMode(m.id as any); if(m.id==='image') imageInputRef.current?.click(); }}
              style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:10, padding:'22px 12px',
                cursor:'pointer', transition:'border-color .15s, box-shadow .15s', textAlign:'center',
                color: C.text }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=C.accent; e.currentTarget.style.boxShadow=`0 0 16px ${C.accentGlow}`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.boxShadow='none'; }}>
              <div style={{ fontSize:28, marginBottom:10 }}>{m.emoji}</div>
              <div style={{ fontSize:13, fontWeight:500, color:C.text, marginBottom:4 }}>{m.label}</div>
              <div style={{ fontSize:11, color:C.text2 }}>{m.sub}</div>
            </button>
          ))}
        </div>
      )}

      {/* VOICE MODE */}
      {mode==='voice' && !loading && (
        <div style={{ textAlign:'center', animation:'fadeUp .3s ease' }}>
          <div style={{ position:'relative', width:110, height:110, margin:'0 auto 24px' }}>
            {recording && <>
              <div style={{ position:'absolute', inset:-16, borderRadius:'50%', border:`1.5px solid ${C.danger}`, animation:'pulse-ring 1.2s ease-out infinite', pointerEvents:'none' }} />
              <div style={{ position:'absolute', inset:-8, borderRadius:'50%', border:`1.5px solid ${C.danger}`, animation:'pulse-ring 1.4s ease-out infinite .3s', pointerEvents:'none' }} />
            </>}
            <button onClick={recording ? stopVoice : startVoice}
              style={{ position:'relative', zIndex:10, width:110, height:110, borderRadius:'50%', border:'none',
                background: recording ? `radial-gradient(circle, ${C.danger}aa, ${C.danger}55)` : `radial-gradient(circle, ${C.accentDim}, ${C.bg3})`,
                boxShadow: recording ? `0 0 32px rgba(255,58,58,.5)` : `0 0 20px ${C.accentGlow}`,
                cursor:'pointer', fontSize:36, transition:'all .3s ease', color:'white' }}>
              🎙️
            </button>
          </div>
          {recording
            ? <p style={{ fontSize:13, color:C.danger, fontFamily:'Space Mono', animation:'pulse-dot 1s ease-in-out infinite' }}>● RECORDING — speak clearly...</p>
            : <p style={{ fontSize:13, color:C.text2 }}>Tap to start. Speak in Hindi or English.</p>
          }
          {reportFile && !recording && (
            <div style={{ margin:'20px 0', background:C.bg2, border:`1px solid ${C.border}`, borderRadius:8, padding:'12px 16px', textAlign:'left' }}>
              <div style={{ fontSize:9, color:C.text2, fontFamily:'Space Mono', marginBottom:6 }}>VOICE NOTE READY</div>
              <p style={{ fontSize:13, color:C.text }}>{reportFile.name}</p>
              <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Optional text context..." rows={2} style={{marginTop:10}}/>
              <button onClick={handleSubmit}
                style={{ marginTop:12, width:'100%', padding:'10px', borderRadius:7, border:'none', background:C.ai, color:'white', fontSize:13, cursor:'pointer', fontWeight:500 }}>
                Submit to SEVA AI →
              </button>
            </div>
          )}
          <button onClick={() => { setMode(null); setReportFile(null); }} style={{ marginTop:14, background:'none', border:'none', color:C.text2, fontSize:12, cursor:'pointer' }}>← Back</button>
        </div>
      )}

      {/* TEXT MODE */}
      {mode==='text' && !loading && (
        <div style={{ animation:'fadeUp .3s ease' }}>
          <textarea value={text} onChange={e=>setText(e.target.value)}
            placeholder="Example: Sector 14 mein 30 families hain, unhe khana chahiye aur ek bachche ko bukhar hai..."
            rows={5}
            style={{ width:'100%', background:C.bg2, border:`1px solid ${C.border}`, borderRadius:10, padding:'14px 16px',
              fontSize:13, color:C.text, resize:'vertical', fontFamily:'DM Sans', lineHeight:1.6, outline:'none' }} />
          <button onClick={handleSubmit} disabled={!text.trim()}
            style={{ width:'100%', marginTop:10, padding:'14px', borderRadius:9, border:'none',
              background: text.trim() ? `linear-gradient(135deg, ${C.ai}, #7C3AED)` : C.bg3,
              color: text.trim() ? 'white' : C.text2, fontSize:14, cursor: text.trim()?'pointer':'default', fontWeight:600,
              boxShadow: text.trim() ? `0 4px 16px rgba(180,126,255,.3)` : 'none', transition:'all .2s' }}>
            Extract need with AI →
          </button>
          <button onClick={() => setMode(null)} style={{ width:'100%', marginTop:8, background:'none', border:'none', color:C.text2, fontSize:12, cursor:'pointer' }}>← Back</button>
        </div>
      )}

      {/* IMAGE MODE */}
      <input type="file" accept="image/*,application/pdf" ref={imageInputRef} style={{ display:'none' }} onChange={e => {
        if (e.target.files?.[0]) setReportFile(e.target.files[0]);
      }}/>
      {mode==='image' && !loading && (
        <div style={{ textAlign:'center', animation:'fadeUp .3s ease' }}>
          {reportFile ? (
            <div style={{ margin:'20px 0', background:C.bg2, border:`1px solid ${C.border}`, borderRadius:8, padding:'12px 16px', textAlign:'left' }}>
              <p style={{ fontSize:13, color:C.text }}>Image attached: {reportFile.name}</p>
              <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Optional text context..." rows={2} style={{marginTop:10}}/>
              <button onClick={handleSubmit}
                style={{ marginTop:12, width:'100%', padding:'10px', borderRadius:7, border:'none', background:C.ai, color:'white', fontSize:13, cursor:'pointer', fontWeight:500 }}>
                Submit to SEVA AI →
              </button>
            </div>
          ) : (
            <label style={{ display:'block', border:`2px dashed ${C.border}`, borderRadius:12, padding:'48px 24px', cursor:'pointer',
              transition:'border-color .2s' }}
              onMouseEnter={e=>e.currentTarget.style.borderColor=C.accent}
              onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}
              onClick={(e)=>{e.preventDefault(); imageInputRef.current?.click();}}>
              <div style={{ fontSize:40, marginBottom:12 }}>📷</div>
              <p style={{ fontSize:13, color:C.text2 }}>Tap to capture or upload survey photo</p>
              <p style={{ fontSize:11, color:C.text3, marginTop:6 }}>Handwritten forms, printed surveys, field notes</p>
            </label>
          )}
          <button onClick={() => { setMode(null); setReportFile(null); }} style={{ marginTop:16, background:'none', border:'none', color:C.text2, fontSize:12, cursor:'pointer' }}>← Back</button>
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div style={{ textAlign:'center', padding:'40px 0', animation:'fadeIn .3s ease' }}>
          <Spinner />
          <p style={{ fontSize:13, color:C.ai, fontFamily:'Space Mono', marginTop:20 }}>SEVA AI PROCESSING REPORT...</p>
          <p style={{ fontSize:11, color:C.text2, marginTop:6 }}>Extracting location · category · urgency</p>
        </div>
      )}

      {error && (
        <div style={{ background:C.dangerDim, border:`1px solid ${C.danger}`, borderRadius:8, padding:'12px 16px', marginTop:16, fontSize:13, color:C.danger }}>
          {error}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// VIEW: OPS DASHBOARD
// ═══════════════════════════════════════════════════════════
function OpsView({ needs, volunteers, newNeed, loadMatchesForNeed, assignVolunteer }: any) {
  const [selected, setSelected] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [filterCat, setFilterCat] = useState('all');

  const stats = {
    open:     needs.filter((n:any)=>n.status==='new' || n.status==='open').length,
    assigned: needs.filter((n:any)=>n.status==='assigned').length,
    resolved: needs.filter((n:any)=>n.status==='completed').length,
    people:   needs.reduce((a:number,n:any)=>a+(n.extraction?.people_affected||0),0),
  };

  const filtered = filterCat==='all' ? needs : needs.filter((n:any)=>n.extraction?.category===filterCat);

  async function handleSelectNeed(need: any) {
    setSelected(need);
    setMatches([]);
    setLoadingMatch(true);
    try {
      const matchData = await loadMatchesForNeed(need.id);
      setMatches(matchData || []);
    } catch(e) {
      console.error(e);
    } finally {
      setLoadingMatch(false);
    }
  }

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(320px, 1fr))', gap:14, height:'calc(100vh - 112px)' }}>
      {/* LEFT: Map + stats */}
      <div style={{ display:'flex', flexDirection:'column', gap:10, overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(60px, 1fr))', gap:8 }}>
          {[
            { label:'OPEN', val:stats.open, color:C.danger, icon:'●' },
            { label:'ASSIGNED', val:stats.assigned, color:C.warn, icon:'◐' },
            { label:'RESOLVED', val:stats.resolved, color:C.accent, icon:'✓' },
            { label:'PEOPLE', val:stats.people, color:C.info, icon:'⬡' },
          ].map(s => (
            <div key={s.label} style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 14px' }}>
              <div style={{ fontSize:9, fontFamily:'Space Mono', color:C.text2, marginBottom:4, letterSpacing:1 }}>{s.icon} {s.label}</div>
              <div style={{ fontSize:22, fontWeight:700, fontFamily:'Syne', color:s.color }}>{s.val.toLocaleString()}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          <button onClick={()=>setFilterCat('all')}
            style={{ fontSize:10, padding:'4px 10px', borderRadius:4, border:`1px solid ${filterCat==='all'?C.accent:C.border}`, background: filterCat==='all'?C.accentDim:'transparent', color: filterCat==='all'?C.accent:C.text2, cursor:'pointer', fontFamily:'Space Mono' }}>
            ALL
          </button>
          {Object.entries(CAT).map(([k,v])=>(
            <button key={k} onClick={()=>setFilterCat(k==='all'?'all':k)}
              style={{ fontSize:10, padding:'4px 10px', borderRadius:4, border:`1px solid ${filterCat===k?v.color:C.border}`, background: filterCat===k?v.bg:'transparent', color: filterCat===k?v.color:C.text2, cursor:'pointer', fontFamily:'Space Mono' }}>
              {v.label.toUpperCase()}
            </button>
          ))}
        </div>

        <div style={{ flex:1, minHeight:0 }}>
          <SevaMap needs={filtered} volunteers={volunteers} onSelect={handleSelectNeed} selected={selected} newNeed={newNeed} />
        </div>
      </div>

      {/* RIGHT: Needs list + match panel */}
      <div style={{ background:C.bg1, border:`1px solid ${C.border}`, borderRadius:10, overflow:'hidden', display:'flex', flexDirection:'column' }}>
        {!selected ? (
          <>
            <div style={{ padding:'14px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:13, fontWeight:600, fontFamily:'Syne', color:C.text }}>Live Needs</span>
            </div>
            <div style={{ flex:1, overflow:'auto' }}>
              {filtered.sort((a:any,b:any)=>(b.extraction?.urgency_level||0)-(a.extraction?.urgency_level||0)).map((need:any, i:number) => {
                const cat = getCat(need.extraction?.category);
                return (
                  <div key={need.id} className="need-row" onClick={() => handleSelectNeed(need)}
                    style={{ padding:'12px 16px', borderBottom:`1px solid ${C.border}`, cursor:'pointer', transition:'background .12s',
                      animation:`fadeUp .3s ease ${i*0.04}s both`, background: need.status==='completed'?'transparent':C.bg1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                      <span style={{ width:8, height:8, borderRadius:'50%', background:cat.dot, flexShrink:0,
                        boxShadow: need.extraction?.urgency_level>=7 ? `0 0 5px ${cat.dot}` : 'none' }} />
                      <Badge label={cat.label} color={cat.color} bg={cat.bg} />
                      <span style={{ marginLeft:'auto', fontSize:10, fontFamily:'Space Mono',
                        color: need.status==='completed'?C.accent:need.status==='assigned'?C.warn:C.text2 }}>
                        {need.status.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ fontSize:12, color: need.status==='completed'?C.text2:C.text, lineHeight:1.5, marginBottom:6 }}>{need.extraction?.summary}</p>
                    <UrgencyBar value={need.extraction?.urgency_level || 1} />
                    <div style={{ display:'flex', gap:12, marginTop:6, fontSize:10, color:C.text2 }}>
                      <span>📍 {need.extraction?.location_label}</span>
                      {need.extraction?.people_affected && <span>👥 {need.extraction.people_affected}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div style={{ padding:'14px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:10 }}>
              <button onClick={()=>setSelected(null)} style={{ background:'none', border:'none', color:C.text2, cursor:'pointer', fontSize:16, lineHeight:1, padding:0 }}>←</button>
              <span style={{ fontSize:13, fontWeight:600, fontFamily:'Syne', color:C.text }}>Match Volunteers</span>
            </div>
            <div style={{ flex:1, overflow:'auto', display:'flex', flexDirection:'column' }}>
              <div style={{ padding:'14px 16px', borderBottom:`1px solid ${C.border}`, flexShrink: 0 }}>
              <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
                <Badge label={getCat(selected.extraction?.category).label} color={getCat(selected.extraction?.category).color} bg={getCat(selected.extraction?.category).bg} />
                <span style={{ fontSize:10, fontFamily:'Space Mono', color: selected.extraction?.urgency_level>=8?C.danger:C.warn }}>URGENCY {selected.extraction?.urgency_level}/10</span>
              </div>
              <p style={{ fontSize:13, color:C.text, lineHeight:1.5, marginBottom:8 }}>{selected.extraction?.summary}</p>
              <div style={{ display:'flex', gap:12, fontSize:11, color:C.text2, marginBottom:10 }}>
                <span>📍 {selected.extraction?.location_label}</span>
                {selected.extraction?.people_affected && <span>👥 {selected.extraction.people_affected} people</span>}
              </div>
              
              {selected.extraction?.required_skills && selected.extraction.required_skills.length > 0 && (
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10, alignItems:'center' }}>
                  <span style={{ fontSize:10, color:C.text2, padding:'3px 0' }}>🛠️ REQUIRED SKILLS:</span>
                  {selected.extraction.required_skills.map((s:string, i:number) => <span key={i} style={{ background:C.bg3, border:`1px solid ${C.ai}44`, color:C.ai, fontSize:10, padding:'2px 6px', borderRadius:4, fontFamily:'Space Mono' }}>{s}</span>)}
                </div>
              )}
              
              {selected.extraction?.suggested_supplies && selected.extraction.suggested_supplies.length > 0 && (
                <details style={{ background:C.bg2, borderRadius:6, marginBottom:10, border:`1px solid ${C.border}`, overflow:'hidden' }}>
                  <summary style={{ padding:'8px 10px', fontSize:9, color:C.ai, fontFamily:'Space Mono', cursor:'pointer', userSelect:'none', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span>AI · SUGGESTED SUPPLIES ({selected.extraction.suggested_supplies.length})</span>
                    <span style={{ fontSize:10 }}>▼</span>
                  </summary>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, padding:'0 10px 10px' }}>
                    {selected.extraction.suggested_supplies.map((s:string, i:number) => <span key={i} style={{ background:C.bg3, color:C.text, fontSize:10, padding:'2px 6px', borderRadius:4 }}>{s}</span>)}
                  </div>
                </details>
              )}
              {selected.extraction?.nearby_facilities && selected.extraction.nearby_facilities.length > 0 && (
                <div style={{ background:C.bg2, borderRadius:6, padding:'8px 10px', border:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:9, color:C.danger, fontFamily:'Space Mono', marginBottom:4 }}>NEARBY FACILITIES</div>
                  {selected.extraction.nearby_facilities.slice(0,2).map((f:any, i:number) => (
                    <div key={i} style={{ fontSize:11, color:C.text, marginBottom:2 }}>🏥 <strong>{f.name}</strong> <span style={{color:C.text2}}>({f.address?.substring(0, 20)}...)</span></div>
                  ))}
                </div>
              )}
              </div>
              <div style={{ padding:'10px 12px' }}>
              {loadingMatch && (
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'20px 0', justifyContent:'center' }}>
                  <Spinner /><span style={{ fontSize:12, color:C.ai }}>Finding best matches...</span>
                </div>
              )}
              {matches.map((match: any, i) => (
                  <div key={match.volunteer_id} style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:9, padding:'12px 14px', marginBottom:10,
                    animation:`fadeUp .3s ease ${i*.08}s both` }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                      <div style={{ width:36, height:36, borderRadius:'50%', background:C.aiDim, border:`1.5px solid ${C.ai}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:600, color:C.ai, flexShrink:0 }}>
                        {match.volunteer_name.substring(0,2).toUpperCase()}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:500, color:C.text }}>{match.volunteer_name}</div>
                        <div style={{ fontSize:10, color:C.text2, marginTop:1 }}>
                          <span style={{ fontFamily:'Space Mono', color:match.score>=0.6?C.accent:match.score>=0.4?C.warn:C.text2 }}>{Math.round(match.score*100)}%</span> match score
                        </div>
                      </div>
                      <button onClick={()=>assignVolunteer(selected, match)} style={{ padding:'6px 12px', borderRadius:6, border:`1px solid ${C.accent}44`, background:C.accentDim, color:C.accent, fontSize:11, cursor:'pointer', fontWeight:500, whiteSpace:'nowrap' }}>
                        Assign →
                      </button>
                    </div>
                    <div style={{ background:C.aiDim, borderRadius:6, padding:'8px 10px', borderLeft:`2px solid ${C.ai}44` }}>
                      <div style={{ fontSize:9, color:C.ai, fontFamily:'Space Mono', marginBottom:4 }}>AI · WHY THIS MATCH</div>
                      <p style={{ fontSize:11, color:C.text2, lineHeight:1.5, fontStyle:'italic' }}>
                        "{match.explanation}"
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// VIEW: IMPACT REPORT
// ═══════════════════════════════════════════════════════════
function ImpactView({ summary, needs, isAdmin }: { summary: Summary; needs: Need[]; isAdmin?: boolean }) {
  const BIG_STATS = [
    { val: summary.active_volunteers, label:'Volunteers Active',    color:C.accent, suffix:'' },
    { val: summary.families_impacted, label:'People Reached',       color:C.info,   suffix:'+' },
    { val: summary.completed_needs,   label:'Needs Resolved',       color:C.ai,     suffix:'' },
    { val: summary.active_needs,      label:'Active Needs',         color:C.warn,   suffix:'' },
  ];

  const handleExport = () => {
    const completed = needs.filter(n => n.status === 'completed');
    const headers = ['Need ID,Category,Urgency,Location,People Affected,Summary'];
    const rows = completed.map(n => {
      const ext = n.extraction;
      const summaryClean = ext?.summary ? `"${ext.summary.replace(/"/g, '""')}"` : '""';
      return `${n.id},${ext?.category||'N/A'},${ext?.urgency_level||0},"${ext?.location_label||'Unknown'}",${ext?.people_affected||0},${summaryClean}`;
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'seva-impact-report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ maxWidth:640, margin:'0 auto', animation:'fadeUp .3s ease' }}>
      <div style={{ marginBottom:28, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <h2 style={{ fontSize:22, fontWeight:700, fontFamily:'Syne', color:C.text }}>Impact Report</h2>
          <p style={{ fontSize:13, color:C.text2, marginTop:6 }}>Real-time operational summary from SEVA backend</p>
        </div>
        {isAdmin && (
          <button onClick={handleExport} style={{ background:C.accent, color:'#000', border:'none', padding:'8px 14px', borderRadius:6, fontSize:12, fontWeight:600, cursor:'pointer' }}>
            📥 Export Data (CSV)
          </button>
        )}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:10, marginBottom:20 }}>
        {BIG_STATS.map((s,i) => (
          <div key={s.label} style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:10, padding:'18px 20px',
            animation:`fadeUp .3s ease ${i*.06}s both` }}>
            <div style={{ fontSize:9, fontFamily:'Space Mono', color:C.text2, letterSpacing:1, marginBottom:8 }}>{s.label.toUpperCase()}</div>
            <div style={{ fontSize:38, fontWeight:800, fontFamily:'Syne', color:s.color, lineHeight:1 }}>
              {s.val.toLocaleString()}<span style={{ fontSize:22 }}>{s.suffix}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// VIEW: VOLUNTEER CONSOLE
// ═══════════════════════════════════════════════════════════
function VolunteerConsole({ missions, completeMission, volunteerName, volunteerStats, volunteers, session }: any) {
  const [note, setNote] = useState("Visited site and support delivered.");
  const [file, setFile] = useState<File | null>(null);

  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-IN';
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div style={{ maxWidth:640, margin:'0 auto', animation:'fadeUp .3s ease' }}>
      <div style={{ marginBottom:28, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h2 style={{ fontSize:22, fontWeight:700, fontFamily:'Syne', color:C.text }}>Hello, {volunteerName}</h2>
          <p style={{ fontSize:13, color:C.text2, marginTop:6 }}>Here are your active missions and recommendations</p>
        </div>
        {volunteerStats && (
          <div style={{ background:C.bg2, border:`1px solid ${C.accent}`, borderRadius:8, padding:'10px 14px', textAlign:'right', boxShadow:`0 0 10px ${C.accentDim}` }}>
            <div style={{ fontSize:10, color:C.accent, fontFamily:'Space Mono', marginBottom:4 }}>🏆 TOP RESPONDER</div>
            <div style={{ fontSize:14, color:C.text, fontWeight:600 }}>{volunteerStats.completedCount} Missions · {volunteerStats.peopleHelped} Lives Impacted</div>
          </div>
        )}
      </div>

      
      <div style={{ height:300, marginBottom:20, borderRadius:10, overflow:'hidden', border:`1px solid ${C.border}`, boxShadow:`0 0 16px ${C.accentGlow}` }}>
        <SevaMap needs={missions.map((m:any) => m.need)} volunteers={volunteers || []} onSelect={()=>{}} selected={null} newNeed={null} />
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {missions.length === 0 && <p style={{color:C.text2, fontSize:14}}>No missions available right now.</p>}
        {missions.map((m: any) => (
          <div key={m.need.id} style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:10, padding:18 }}>
             <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
               <Badge label={getCat(m.need.extraction.category).label} color={getCat(m.need.extraction.category).color} bg={getCat(m.need.extraction.category).bg} />
               <span style={{ fontSize:10, fontFamily:'Space Mono', color: m.assignment ? C.warn : C.text2 }}>{m.assignment ? 'ASSIGNED' : 'RECOMMENDED'}</span>
               <button onClick={() => handleSpeak(`Mission: ${m.need.extraction.summary}. Location: ${m.need.extraction.location_label}.`)} style={{ marginLeft:'auto', background:'none', border:'none', color:C.text2, cursor:'pointer', fontSize:16 }} title="Read Mission Aloud">🔊</button>
             </div>
             <p style={{ fontSize:15, color:C.text, marginBottom:8 }}>{m.need.extraction.summary}</p>
             <p style={{ fontSize:12, color:C.text2, marginBottom:14 }}>{m.assignment?.match_reason || m.match.explanation}</p>
             
             {m.assignment && m.need.extraction.suggested_supplies && m.need.extraction.suggested_supplies.length > 0 && (
               <details style={{ background:C.bg3, borderLeft:`3px solid ${C.ai}`, borderRadius:'0 6px 6px 0', marginBottom:14, overflow:'hidden' }}>
                 <summary style={{ padding:'10px', fontSize:10, color:C.ai, fontFamily:'Space Mono', cursor:'pointer', userSelect:'none', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span>📋 EMERGENCY LOGISTICS (AI)</span>
                    <span style={{ fontSize:10 }}>▼</span>
                 </summary>
                 <div style={{ padding:'0 10px 10px' }}>
                   <p style={{ fontSize:12, color:C.text, marginBottom:6 }}>Please grab the following before heading out:</p>
                   <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom: m.need.extraction.nearby_facilities?.length > 0 ? 10 : 0 }}>
                      {m.need.extraction.suggested_supplies.map((s:string, i:number) => <span key={i} style={{ background:C.bg2, border:`1px solid ${C.border}`, color:C.text, fontSize:11, padding:'3px 8px', borderRadius:4 }}>{s}</span>)}
                   </div>
                   {m.need.extraction.nearby_facilities && m.need.extraction.nearby_facilities.length > 0 && (
                     <>
                       <div style={{ fontSize:10, color:C.danger, fontFamily:'Space Mono', marginBottom:4, marginTop:8 }}>🏥 NEARBY MEDICAL/SHELTER</div>
                       {m.need.extraction.nearby_facilities.map((f:any, i:number) => (
                         <div key={i} style={{ fontSize:11, color:C.text, marginBottom:2 }}>• <strong>{f.name}</strong> <span style={{color:C.text2}}>{f.address}</span></div>
                       ))}
                     </>
                   )}
                 </div>
               </details>
             )}

             {m.assignment ? (
               <div style={{ display:'flex', flexDirection: 'column', gap:10 }}>
                 <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                   <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Completion note..." style={{flex:1, margin:0}} />
                 </div>
                 <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
                   <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ flex: 1, padding: 8, fontSize: 12, background: 'transparent', border: `1px dashed ${C.border}` }} />
                   <button 
                     disabled={!file}
                     onClick={() => {
                       completeMission(m.need.id, m.assignment.volunteer_id, note, file);
                       setFile(null);
                     }}
                     style={{ padding:'10px 16px', borderRadius:8, border:'none', background: file ? C.accent : C.bg3, color: file ? '#000' : C.text2, fontWeight:600, cursor: file ? 'pointer' : 'not-allowed' }}>
                     {file ? 'Mark Complete' : '📸 Photo Required'}
                   </button>
                 </div>
                 <a href={`https://www.google.com/maps/dir/?api=1&destination=${m.need.extraction.coordinates.lat},${m.need.extraction.coordinates.lng}`} target="_blank" rel="noopener noreferrer" style={{ display:'block', textAlign:'center', marginTop:10, padding:'10px 16px', borderRadius:8, background:C.info, color:'#000', fontWeight:600, textDecoration:'none' }}>🗺️ Navigate via Google Maps</a>
               </div>
             ) : (
               <div style={{ fontSize:11, color:C.text2, padding:'6px 12px', background:C.bg3, borderRadius:6, display:'inline-block' }}>Awaiting coordinator assignment</div>
             )}
          </div>
        ))}
      </div>
    </div>
  );
}
// ═══════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════
export default function App() {
  const [isAdminPath, setIsAdminPath] = useState(window.location.pathname === "/admin");
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingSync, setPendingSync] = useState(0);

  useEffect(() => {
    const handleLocationChange = () => {
      setIsAdminPath(window.location.pathname === "/admin");
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOffline(false);
      const queue: any[] = await get('offline-queue') || [];
      if (queue.length > 0) {
        setToast(`Syncing ${queue.length} offline reports...`);
        for (const req of queue) {
          try {
            await handleReporterSubmit(req.text, req.file, req.mode, req.reporterName, true);
          } catch(e) {}
        }
        await set('offline-queue', []);
        setPendingSync(0);
        setToast('Offline data synced successfully!');
      }
    };
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    get('offline-queue').then((q: any) => { if(q) setPendingSync(q.length); });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const [view, setView] = useState('ops');
  const [needs, setNeeds] = useState<Need[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [summary, setSummary] = useState<Summary>({ active_needs:0, assigned_needs:0, completed_needs:0, active_volunteers:0, families_impacted:0 });
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [matchesByNeed, setMatchesByNeed] = useState<Record<string, Match[]>>({});
  const [session, setSession] = useState<{role: 'admin'|'volunteer', name:string, email:string, volunteerId?:string} | null>(null);
  
  const [newNeed, setNewNeed] = useState<Need | null>(null);
  const [toast, setToast] = useState<string|null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [accessTab, setAccessTab] = useState<'admin'|'volunteer-login'|'volunteer-signup'>(window.location.pathname === "/admin" ? 'admin' : 'volunteer-login');
  
  const [volunteerMissions, setVolunteerMissions] = useState<any[]>([]);
  
  // Auth state mapping
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [volunteerEmail, setVolunteerEmail] = useState("");
  const [volunteerPassword, setVolunteerPassword] = useState("");
  const [signupForm, setSignupForm] = useState<VolunteerSignupInput>({ name:"", email:"", phone:"", locality:"", skills:[], languages:[] });
  const [signupPassword, setSignupPassword] = useState("");

  const [authUser, setAuthUser] = useState<any>(null);

  useEffect(() => {
    const unsub = observeAuthState((user) => {
      setAuthUser(user);
    });
    if (unsub) return () => unsub();
  }, []);

  useEffect(() => {
    if (!authUser) {
      setSession(null);
    } else {
      if (isAdminEmail(authUser.email||'')) {
        if (!isAdminPath) {
          setSession(null);
        } else {
          setSession({ role: 'admin', name: authUser.displayName || 'Admin', email: authUser.email||'' });
        }
      } else {
        if (isAdminPath) {
          // Volunteer trying to access /admin path.
          // Do not load their volunteer profile here.
          setSession(null);
        } else if (volunteers.length > 0) {
          const vol = volunteers.find(v => v.email?.toLowerCase() === authUser.email?.toLowerCase());
          if (vol) setSession({ role: 'volunteer', name: vol.name, email: vol.email||'', volunteerId: vol.id });
        }
      }
    }
  }, [authUser, volunteers, isAdminPath]);

  // Removed the other useEffect since logic is now handled above.

  async function refreshDashboard() {
    try {
      const [n, s, v, a] = await Promise.all([ fetchNeeds(), fetchSummary(), fetchVolunteers(), fetchAssignments() ]);
      setNeeds(n); setSummary(s); setVolunteers(v); setAssignments(a);
    } catch(e) { console.error(e); }
  }

  useEffect(() => { refreshDashboard(); const iv = setInterval(refreshDashboard, 30000); return ()=>clearInterval(iv); }, []);

  useEffect(() => {
    if (session && (session.role === 'volunteer' || session.role === 'admin') && needs.length) {
      const targetVolId = session.role === 'admin' ? volunteers[0]?.id : session.volunteerId;
      if (targetVolId) loadVolunteerMissions(targetVolId);
    }
  }, [session, needs, assignments, matchesByNeed, volunteers]);

  async function loadVolunteerMissions(volunteerId: string) {
    const activeNeeds = needs.filter((need) => need.status !== "completed");
    
    // Fast Path: Do not DDoSing the API from the volunteer view.
    // We only rely on assignments and cached matches from the admin.
    const missionCandidates = activeNeeds.map((need) => {
      const assignment = assignments.find((entry) => entry.need_id === need.id && entry.volunteer_id === volunteerId);
      const matches = matchesByNeed[need.id] || [];
      const match = matches.find((entry) => entry.volunteer_id === volunteerId);
      
      if (!match && !assignment) return null;
      return { need, match: match || { score: assignment ? 1.0 : 0, explanation: assignment ? "Assigned by Coordinator" : "Recommended for this mission" }, assignment };
    });

    const nextMissions = missionCandidates.filter(Boolean);
    nextMissions.sort((left:any, right:any) => {
      if (left.assignment && !right.assignment) return -1;
      if (!left.assignment && right.assignment) return 1;
      return right.match.score - left.match.score;
    });
    setVolunteerMissions(nextMissions);
  }

  async function handleReporterSubmit(text: string, file: File | null, mode: 'text'|'voice'|'image', reporterName: string, isAutoSync=false) {
    if (!navigator.onLine && !isAutoSync) {
      const queue: any[] = await get('offline-queue') || [];
      queue.push({ text, file, mode, reporterName, timestamp: Date.now() });
      await set('offline-queue', queue);
      setPendingSync(queue.length);
      setToast('Saved offline. Will sync automatically when internet returns.');
      return { 
        id: 'offline-' + Date.now(), 
        source_type: mode, 
        original_text: text, 
        reporter_name: reporterName, 
        status: 'new', 
        created_at: new Date().toISOString(),
        priority_score: 1.0,
        extraction: { category: 'other', urgency_level: 1, people_affected: 1, location_label: 'Pending sync', coordinates: null as any, required_skills: [], summary: 'Pending offline sync...', suggested_supplies: [], facility_type_needed: null, nearby_facilities: [] } 
      } as unknown as Need; // Mock response
    }
    const created = await createUploadReport({ source_type: mode, text, reporter_name: reporterName, file });
    setNeeds(prev => [created, ...prev]);
    setNewNeed(created);
    setTimeout(() => setNewNeed(null), 6000);
    setToast(`✓ Need logged: ${created.extraction.category} in ${created.extraction.location_label}. Visible on ops map.`);
    refreshDashboard();
    return created;
  }

  async function loadMatchesForNeed(needId: string) {
    const matches = await fetchMatches(needId);
    setMatchesByNeed(c => ({...c, [needId]: matches}));
    return matches;
  }

  async function assignVol(need: Need, match: Match) {
    await createAssignment({ need_id: need.id, volunteer_id: match.volunteer_id, match_score: match.score, match_reason: match.explanation });
    setToast(`Assigned ${match.volunteer_name} to ${need.extraction.location_label}`);
    refreshDashboard();
  }

  async function completeMission(needId: string, volunteerId: string, notes: string, file: File | null = null) {
    try {
      setToast("Submitting completion... AI is verifying photo.");
      const res = await createCompletion({ need_id: needId, volunteer_id: volunteerId, notes, file });
      if (res && res.verification_reasoning) {
        setToast(`Verified ${res.verified_people} people: ${res.verification_reasoning.substring(0, 60)}...`);
      } else {
        setToast("Mission marked complete.");
      }
      refreshDashboard();
    } catch (e: any) {
      setToast(`Error: ${e.message}`);
    }
  }

  async function handleLoginAdmin(e: FormEvent) {
    e.preventDefault();
    if (!isAdminEmail(adminEmail)) {
      alert("Unauthorized: This email is not registered as an administrator.");
      return;
    }
    try { await signInWithEmail(adminEmail, adminPassword); setShowAuthModal(false); } catch(err:any) { alert(err.message); }
  }
  async function handleLoginVolunteer(e: FormEvent) {
    e.preventDefault();
    if (isAdminEmail(volunteerEmail)) {
      alert("Please use the Admin Portal to log in with an administrator email.");
      return;
    }
    try { await signInWithEmail(volunteerEmail, volunteerPassword); setShowAuthModal(false); } catch(err:any) { alert(err.message); }
  }
  async function handleSignupVolunteer(e: FormEvent) {
    e.preventDefault();
    try {
      await signUpVolunteerWithEmail(signupForm.email, signupPassword, signupForm.name);
      await createVolunteer(signupForm);
      await refreshDashboard();
      setShowAuthModal(false);
      setToast("Verification email sent! Please check your inbox before logging in.");
    } catch(err:any) { alert(err.message); }
  }

  const TABS = [
    { id:'field', label:'Field Report', emoji:'📡' },
    ...(session?.role === 'admin' ? [{ id:'ops', label:'Ops Dashboard', emoji:'🗺️' }] : []),
    ...(session?.role === 'volunteer' ? [{ id:'volunteer', label:'Console', emoji:'✅' }] : []),
    { id:'impact',label:'Impact', emoji:'📊' },
  ];

  useEffect(() => {
    if (!TABS.find(t=>t.id===view)) setView(TABS[0].id);
  }, [session, view]);

  if (isAdminPath && !session) {
    return (
      <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:C.bg0 }}>
        <style>{STYLES}</style>
        <div style={{ background:C.bg1, border:`1px solid ${C.border}`, borderRadius:16, width:400, padding:32, animation:'fadeUp .3s ease' }}>
           <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24, justifyContent:'center' }}>
             <div style={{ width:40, height:40, borderRadius:10, background:`linear-gradient(135deg, ${C.accent}, #00B07A)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, boxShadow:`0 0 12px ${C.accentGlow}` }}>⬡</div>
             <span style={{ fontSize:22, fontWeight:800, fontFamily:'Syne', color:C.text }}>SEVA ADMIN</span>
           </div>
           <h3 style={{ fontSize:18, fontFamily:'Syne', marginBottom:20, color:C.text, textAlign:'center' }}>Internal Portal Access</h3>
           <form onSubmit={handleLoginAdmin}>
             <label>Admin Email <input value={adminEmail} onChange={e=>setAdminEmail(e.target.value)} /></label>
             <label>Password <input type="password" value={adminPassword} onChange={e=>setAdminPassword(e.target.value)} /></label>
             <button type="submit" style={{ width:'100%', padding:14, borderRadius:8, border:'none', background:C.accent, color:'#000', fontWeight:700, cursor:'pointer', marginTop:10 }}>Sign In to Ops Console</button>
           </form>
           <button onClick={() => { window.history.pushState({}, '', '/'); setIsAdminPath(false); }} style={{ width:'100%', marginTop:20, background:'none', border:'none', color:C.text2, fontSize:12, cursor:'pointer' }}>← Back to Public Site</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', background:C.bg0, fontFamily:'DM Sans,sans-serif' }}>
      <style>{STYLES}</style>
      
      {/* Header */}
      <header style={{ padding:'0 20px', background:C.bg1, borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', height:52, flexShrink:0 }}>
        <div className="header-left" style={{ display:'flex', alignItems:'center', gap:10, marginRight:32 }}>
          <div style={{ width:30, height:30, borderRadius:7, background:`linear-gradient(135deg, ${C.accent}, #00B07A)`,
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:14,
            boxShadow:`0 0 12px ${C.accentGlow}` }}>⬡</div>
          <span style={{ fontSize:16, fontWeight:800, fontFamily:'Syne', color:C.text, letterSpacing:.5 }}>SEVA</span>
          <span className="hide-mobile" style={{ fontSize:9, color:C.text2, fontFamily:'Space Mono', borderLeft:`1px solid ${C.border}`, paddingLeft:10, letterSpacing:.5 }}>SCALABLE EMERGENCY VOLUNTEER ACTIVATOR</span>
          {isOffline && <span style={{ marginLeft: 10, background: C.warn, color: '#000', fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 'bold' }}>OFFLINE</span>}
          {pendingSync > 0 && <span style={{ marginLeft: 10, background: C.ai, color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 'bold' }}>{pendingSync} PENDING SYNC</span>}
        </div>

        <div className="header-nav" style={{ display:'flex', gap:2, position:'relative' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setView(t.id)}
              style={{ display:'flex', alignItems:'center', gap:7, padding:'6px 14px', borderRadius:7, border:'none',
                background: view===t.id ? C.bg3 : 'transparent', color: view===t.id ? C.text : C.text2,
                cursor:'pointer', fontSize:13, fontWeight: view===t.id?500:400, transition:'all .15s' }}>
              <span>{t.emoji}</span>
              <span className={view===t.id ? '' : 'hide-mobile'}>{t.label}</span>
              {view===t.id && t.id==='ops' && <LiveDot size={6} />}
            </button>
          ))}
        </div>

        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:12 }}>
          {session ? (
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
               <span className="hide-mobile" style={{fontSize:12, color:C.text2}}>{session.name} ({session.role})</span>
               <button onClick={()=>signOutUser()} style={{background:'none', border:`1px solid ${C.border}`, color:C.text, padding:'4px 10px', borderRadius:6, fontSize:11, cursor:'pointer'}}>Logout</button>
            </div>
          ) : (
            <button onClick={() => { setShowAuthModal(true); setAccessTab('volunteer-login'); }} style={{background:`linear-gradient(135deg, ${C.accent}, ${C.accentDim})`, border:'none', color:'#000', padding:'6px 14px', borderRadius:6, fontSize:12, fontWeight:700, cursor:'pointer'}}>
              Login / Sign up
            </button>
          )}
        </div>
      </header>

      {/* Body */}
      <main style={{ flex:1, overflow:'auto', padding:16 }}>
        {toast && <Toast msg={toast} onClose={()=>setToast(null)} />}
        {view==='field'     && <FieldView onSubmit={handleReporterSubmit} />}
        {view==='ops'       && <OpsView needs={needs} volunteers={volunteers} newNeed={newNeed} loadMatchesForNeed={loadMatchesForNeed} assignVolunteer={assignVol} />}
        {view==='impact'    && <ImpactView summary={summary} needs={needs} isAdmin={session?.role === 'admin'} />}
        {view==='volunteer' && <VolunteerConsole missions={volunteerMissions} completeMission={completeMission} volunteerName={session?.name} session={session} volunteers={volunteers} volunteerStats={
          (session?.volunteerId || (session?.role === "admin" && volunteers.length > 0)) ? {
            completedCount: needs.filter(n => n.status === "completed" && assignments.some(a => a.need_id === n.id && a.volunteer_id === (session?.volunteerId || volunteers[0]?.id))).length,
            peopleHelped: needs.filter(n => n.status === "completed" && assignments.some(a => a.need_id === n.id && a.volunteer_id === (session?.volunteerId || volunteers[0]?.id))).reduce((sum, n) => sum + (n.extraction?.people_affected || 0), 0)
          } : null
        } />}
      </main>

      {/* Auth Modal */}
      {showAuthModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(8px)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onMouseDown={(e)=>{if(e.target===e.currentTarget) setShowAuthModal(false)}}>
          <div style={{ background:C.bg1, border:`1px solid ${C.border}`, borderRadius:16, width:400, maxWidth:'100%', padding:24, position:'relative', animation:'fadeUp .3s ease' }} onClick={e=>e.stopPropagation()}>
             <button onClick={()=>setShowAuthModal(false)} style={{ position:'absolute', top:16, right:16, background:'none', border:'none', color:C.text2, cursor:'pointer', fontSize:20 }}>×</button>
             <h3 style={{ fontSize:18, fontFamily:'Syne', marginBottom:16, color:C.text }}>Role Access</h3>
             
             <div style={{ display:'flex', borderBottom:`1px solid ${C.border}`, marginBottom:20 }}>
                {isAdminPath ? (
                  <button className="auth-tab active">Admin Login</button>
                ) : (
                  <>
                    <button className={`auth-tab ${accessTab==='volunteer-login'?'active':''}`} onClick={()=>setAccessTab('volunteer-login')}>Volunteer login</button>
                    <button className={`auth-tab ${accessTab==='volunteer-signup'?'active':''}`} onClick={()=>setAccessTab('volunteer-signup')}>Volunteer signup</button>
                  </>
                )}
             </div>

             {!isFirebaseConfigured() && <p style={{color:C.warn, fontSize:12, marginBottom:16}}>Firebase not configured.</p>}

             {accessTab === 'admin' && isAdminPath && (
               <form onSubmit={handleLoginAdmin}>
                 <label>Admin Email <input value={adminEmail} onChange={e=>setAdminEmail(e.target.value)} /></label>
                 <label>Password <input type="password" value={adminPassword} onChange={e=>setAdminPassword(e.target.value)} /></label>
                 <button type="submit" style={{ width:'100%', padding:12, borderRadius:8, border:'none', background:C.accent, color:'#000', fontWeight:600, cursor:'pointer', marginTop:8 }}>Enter Admin Panel</button>
               </form>
             )}

             {accessTab === 'volunteer-login' && !isAdminPath && (
               <form onSubmit={handleLoginVolunteer}>
                 <label>Volunteer Email <input value={volunteerEmail} onChange={e=>setVolunteerEmail(e.target.value)} /></label>
                 <label>Password <input type="password" value={volunteerPassword} onChange={e=>setVolunteerPassword(e.target.value)} /></label>
                 <button type="submit" style={{ width:'100%', padding:12, borderRadius:8, border:'none', background:C.accent, color:'#000', fontWeight:600, cursor:'pointer', marginTop:8 }}>Enter Volunteer Console</button>
               </form>
             )}

             {accessTab === 'volunteer-signup' && !isAdminPath && (
               <form onSubmit={handleSignupVolunteer}>
                 <label>Name <input value={signupForm.name} onChange={e=>setSignupForm({...signupForm, name:e.target.value})} /></label>
                 <label>Email <input type="email" value={signupForm.email} onChange={e=>setSignupForm({...signupForm, email:e.target.value})} /></label>
                 <label>Password <input type="password" value={signupPassword} onChange={e=>setSignupPassword(e.target.value)} /></label>
                 <label>Locality <input value={signupForm.locality} onChange={e=>setSignupForm({...signupForm, locality:e.target.value})} /></label>
                 <label>Skills (csv) <input value={signupForm.skills.join(',')} onChange={e=>setSignupForm({...signupForm, skills:e.target.value.split(',')})} /></label>
                 <button type="submit" style={{ width:'100%', padding:12, borderRadius:8, border:'none', background:C.accent, color:'#000', fontWeight:600, cursor:'pointer', marginTop:8 }}>Create Profile</button>
               </form>
             )}
          </div>
        </div>
      )}
    </div>
  );
}

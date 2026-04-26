import { useState, useEffect, useRef, useCallback } from "react";

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

const CAT = {
  food:      { label: 'Food',      color: '#FFAB00', bg: 'rgba(255,171,0,0.12)',      dot: '#FFAB00' },
  medical:   { label: 'Medical',   color: '#FF3A3A', bg: 'rgba(255,58,58,0.12)',      dot: '#FF3A3A' },
  shelter:   { label: 'Shelter',   color: '#38BDFF', bg: 'rgba(56,189,255,0.12)',     dot: '#38BDFF' },
  education: { label: 'Education', color: '#B47EFF', bg: 'rgba(180,126,255,0.12)',    dot: '#B47EFF' },
  water:     { label: 'Water',     color: '#00E5A0', bg: 'rgba(0,229,160,0.12)',      dot: '#00E5A0' },
  other:     { label: 'Other',     color: '#5E7A8E', bg: 'rgba(94,122,142,0.12)',     dot: '#5E7A8E' },
};

// ═══════════════════════════════════════════════════════════
// SEED DATA — Realistic Gurugram/NCR NGO scenario
// ═══════════════════════════════════════════════════════════
const MAP_BOUNDS = { latMin: 28.33, latMax: 28.55, lngMin: 76.93, lngMax: 77.18 };

function toSVG(lat, lng, W, H) {
  return {
    x: ((lng - MAP_BOUNDS.lngMin) / (MAP_BOUNDS.lngMax - MAP_BOUNDS.lngMin)) * W,
    y: ((MAP_BOUNDS.latMax - lat) / (MAP_BOUNDS.latMax - MAP_BOUNDS.latMin)) * H,
  };
}

const NEEDS = [
  { id:'n1', category:'medical',   description:'Child with severe dengue fever, family has no money for hospital', location:'Wazirabad Village', lat:28.418, lng:77.010, urgency:10, people_count:1,   status:'open'    },
  { id:'n2', category:'food',      description:'45 flood-displaced families need food packets and clean water',     location:'Sector 14',       lat:28.463, lng:77.031, urgency:9,  people_count:180, status:'open'    },
  { id:'n3', category:'water',     description:'Borewell failure — 200 residents without water for 3 days',         location:'Sector 57',       lat:28.415, lng:77.071, urgency:8,  people_count:200, status:'open'    },
  { id:'n4', category:'shelter',   description:'Fire destroyed 12 homes, families sleeping on street',              location:'Nathupur',        lat:28.504, lng:77.088, urgency:9,  people_count:52,  status:'assigned'},
  { id:'n5', category:'food',      description:'Elderly care home running critically low on food supplies',         location:'DLF Phase 2',     lat:28.490, lng:77.093, urgency:7,  people_count:40,  status:'open'    },
  { id:'n6', category:'education', description:'80 children need school supplies after flood destroyed classroom',  location:'Sector 31',       lat:28.441, lng:77.048, urgency:5,  people_count:80,  status:'open'    },
  { id:'n7', category:'medical',   description:'Dengue outbreak — 20+ residents, no access to healthcare',         location:'Palam Vihar',     lat:28.519, lng:77.001, urgency:8,  people_count:23,  status:'open'    },
  { id:'n8', category:'water',     description:'Contaminated water source causing illness in shanty community',     location:'Ghata Village',   lat:28.393, lng:77.061, urgency:7,  people_count:150, status:'resolved'},
  { id:'n9', category:'shelter',   description:'Monsoon roof collapse — 8 persons displaced, need tarpaulins',     location:'Sadar Bazar',     lat:28.470, lng:77.052, urgency:6,  people_count:8,   status:'open'    },
];

const VOLUNTEERS = [
  { id:'v1', name:'Priya Sharma',  initials:'PS', skills:['medical','first-aid','health-camps'],         lat:28.451, lng:77.034, available:true  },
  { id:'v2', name:'Rahul Gupta',   initials:'RG', skills:['transport','food-distribution','logistics'],  lat:28.478, lng:77.065, available:true  },
  { id:'v3', name:'Ananya Singh',  initials:'AS', skills:['education','counseling','child-welfare'],     lat:28.435, lng:77.049, available:true  },
  { id:'v4', name:'Vikram Nair',   initials:'VN', skills:['construction','shelter','plumbing'],          lat:28.509, lng:77.082, available:true  },
  { id:'v5', name:'Meera Patel',   initials:'MP', skills:['medical','water-sanitation','nursing'],       lat:28.411, lng:77.022, available:true  },
  { id:'v6', name:'Arjun Reddy',   initials:'AR', skills:['food-distribution','community-outreach'],    lat:28.462, lng:77.019, available:false },
];

// ═══════════════════════════════════════════════════════════
// AI — Claude API via Anthropic
// ═══════════════════════════════════════════════════════════
async function callClaude(system, user) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  const d = await r.json();
  return d.content[0].text;
}

async function extractNeed(text) {
  const raw = await callClaude(
    `You extract structured community needs from NGO field reports. Return ONLY valid JSON, no markdown, no extra text.
Schema: {"category":"food|medical|shelter|education|water|other","description":"one clear sentence","location":"area name","people_count":number_or_null,"urgency":1_to_10,"lat":number_or_null,"lng":number_or_null}
Urgency: 10=life-threatening, 8=no food/water today, 6=needs help soon, 4=important not urgent.
For lat/lng, use approximate coordinates for Gurugram NCR India area if location is recognizable, else null.`,
    `Field report: "${text}"`
  );
  try { return JSON.parse(raw.replace(/```json|```/g,'').trim()); }
  catch { return null; }
}

async function generateMatchReason(need, vol) {
  return await callClaude(
    `You write one-sentence volunteer match explanations for NGO coordinators. Be specific, warm, max 20 words.`,
    `Need: ${need.category} — ${need.description}\nVolunteer ${vol.name} skills: ${vol.skills.join(', ')}`
  );
}

async function generateImpactReport(stats) {
  return await callClaude(
    `You write inspiring 3-sentence NGO impact reports for donors. Be specific and warm. Use exact numbers.`,
    `Stats in last 24 hours: ${JSON.stringify(stats)}`
  );
}

// ═══════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════
function haversine(a, b) {
  const R = 6371, dLat = (b.lat-a.lat)*Math.PI/180, dLng = (b.lng-a.lng)*Math.PI/180;
  const x = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.asin(Math.sqrt(x));
}

function skillScore(need, vol) {
  const map = { food:['food-distribution','logistics','cooking'], medical:['medical','first-aid','nursing','health-camps'],
    shelter:['construction','shelter','plumbing','carpentry'], education:['education','counseling','child-welfare'],
    water:['water-sanitation','plumbing'], other:[] };
  const relevant = map[need.category] || [];
  const hits = vol.skills.filter(s => relevant.some(r => s.includes(r) || r.includes(s))).length;
  return hits / Math.max(relevant.length, 1);
}

function matchVolunteers(need, vols) {
  return vols
    .filter(v => v.available)
    .map(v => {
      const skill = skillScore(need, v);
      const dist = need.lat ? haversine({lat:need.lat,lng:need.lng},{lat:v.lat,lng:v.lng}) : 20;
      const geo = Math.max(0, 1 - dist/50);
      return { ...v, score: Math.round((0.65*skill + 0.35*geo)*100) };
    })
    .sort((a,b) => b.score - a.score)
    .slice(0,3);
}

// ═══════════════════════════════════════════════════════════
// GLOBAL STYLES
// ═══════════════════════════════════════════════════════════
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:${C.bg0};color:${C.text};font-family:'DM Sans',sans-serif;overflow:hidden;}
  ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-track{background:${C.bg1};} ::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px;}
  @keyframes pulse-ring { 0%{transform:scale(1);opacity:.8} 70%{transform:scale(2.4);opacity:0} 100%{transform:scale(2.4);opacity:0} }
  @keyframes pulse-dot  { 0%,100%{opacity:1} 50%{opacity:.5} }
  @keyframes fadeUp     { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn     { from{opacity:0} to{opacity:1} }
  @keyframes slideRight { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }
  @keyframes scanline   { 0%{top:-5%} 100%{top:105%} }
  @keyframes glow-pulse { 0%,100%{box-shadow:0 0 8px ${C.accentGlow}} 50%{box-shadow:0 0 22px ${C.accentGlow}, 0 0 40px rgba(0,229,160,0.15)} }
  @keyframes spin       { to{transform:rotate(360deg)} }
  @keyframes counter    { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
  @keyframes blink      { 0%,49%{opacity:1} 50%,100%{opacity:0} }
  @keyframes shimmer    { from{transform:translateX(-100%)} to{transform:translateX(200%)} }
  .tab-indicator { transition: left 0.3s cubic-bezier(.4,0,.2,1), width 0.3s cubic-bezier(.4,0,.2,1); }
  .need-row:hover { background: ${C.bg3} !important; }
`;

// ═══════════════════════════════════════════════════════════
// SMALL COMPONENTS
// ═══════════════════════════════════════════════════════════
function LiveDot({ color = C.accent, size = 7 }) {
  return (
    <span style={{ position:'relative', display:'inline-flex', width:size, height:size, flexShrink:0 }}>
      <span style={{ position:'absolute', inset:0, borderRadius:'50%', background:color, animation:`pulse-ring 1.8s ease-out infinite` }} />
      <span style={{ position:'absolute', inset:0, borderRadius:'50%', background:color, animation:`pulse-dot 1.8s ease-in-out infinite` }} />
    </span>
  );
}

function Badge({ label, color, bg }) {
  return <span style={{ fontSize:10, fontWeight:600, fontFamily:'Space Mono', letterSpacing:1, padding:'3px 9px', borderRadius:3, color, background:bg, textTransform:'uppercase' }}>{label}</span>;
}

function UrgencyBar({ value }) {
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

function TypewriterText({ text, speed = 18 }) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    setDisplayed('');
    if (!text) return;
    let i = 0;
    const iv = setInterval(() => {
      if (i < text.length) { setDisplayed(text.slice(0, ++i)); }
      else clearInterval(iv);
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed]);
  return (
    <span>
      {displayed}
      {displayed.length < text.length && (
        <span style={{ animation:'blink .7s step-end infinite', fontWeight:700, color:C.ai }}>▌</span>
      )}
    </span>
  );
}

function Spinner() {
  return <div style={{ width:18, height:18, border:`2px solid ${C.border}`, borderTopColor:C.ai, borderRadius:'50%', animation:'spin .8s linear infinite' }} />;
}

function Toast({ msg, onClose }) {
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
// SVG MAP — Stylized Gurugram NCR area
// ═══════════════════════════════════════════════════════════
const AREAS = [
  { name:'Sector 14', lat:28.463, lng:77.028 }, { name:'DLF Phase 2', lat:28.490, lng:77.092 },
  { name:'Palam Vihar', lat:28.519, lng:77.001 }, { name:'Sector 57', lat:28.415, lng:77.071 },
  { name:'Nathupur', lat:28.504, lng:77.087 }, { name:'Ghata', lat:28.393, lng:77.061 },
];

function SevaMap({ needs, onSelect, selected, newNeed }) {
  const W = 600, H = 400;
  const roads = [
    'M 30 200 L 570 200', 'M 300 30 L 300 370',
    'M 30 100 L 570 300', 'M 30 300 L 570 100',
    'M 100 30 L 100 370', 'M 500 30 L 500 370',
    'M 30 130 L 570 130', 'M 30 270 L 570 270',
  ];
  return (
    <div style={{ position:'relative', background:C.bg1, borderRadius:10, overflow:'hidden', border:`1px solid ${C.border}` }}>
      {/* Scanline effect */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:2, overflow:'hidden' }}>
        <div style={{ position:'absolute', left:0, right:0, height:'2px', background:'linear-gradient(90deg, transparent, rgba(0,229,160,0.06), transparent)', animation:'scanline 4s linear infinite' }} />
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:'100%', display:'block' }}>
        {/* Grid */}
        {Array.from({length:13}).map((_,i) => (
          <line key={`vg${i}`} x1={i*50} y1={0} x2={i*50} y2={H} stroke={C.text3} strokeWidth={.3} opacity={.4} />
        ))}
        {Array.from({length:9}).map((_,i) => (
          <line key={`hg${i}`} x1={0} y1={i*50} x2={W} y2={i*50} stroke={C.text3} strokeWidth={.3} opacity={.4} />
        ))}

        {/* Roads */}
        {roads.map((d,i) => (
          <line key={i} x1={d.split(' ')[1]} y1={d.split(' ')[2]} x2={d.split(' ')[4]} y2={d.split(' ')[5]}
            stroke={C.border} strokeWidth={1.5} opacity={0.6} />
        ))}

        {/* Area labels */}
        {AREAS.map(a => {
          const p = toSVG(a.lat, a.lng, W, H);
          return <text key={a.name} x={p.x} y={p.y-4} textAnchor="middle" fontSize={8} fill={C.text3} fontFamily="Space Mono">{a.name}</text>;
        })}

        {/* Need dots */}
        {needs.filter(n=>n.lat&&n.lng).map(n => {
          const p = toSVG(n.lat, n.lng, W, H);
          const cat = CAT[n.category] || CAT.other;
          const r = 6 + n.urgency * 0.5;
          const isSelected = selected?.id === n.id;
          const isNew = newNeed?.id === n.id;
          return (
            <g key={n.id} onClick={() => onSelect(n)} style={{ cursor:'pointer' }}>
              {/* Pulse ring — urgent or selected */}
              {(n.urgency >= 7 || isSelected || isNew) && (
                <circle cx={p.x} cy={p.y} r={r+4} fill="none" stroke={isNew?C.ai:cat.dot} strokeWidth={1.5}
                  opacity={0.5} style={{ animation:`pulse-ring ${isNew?'.8s':'2s'} ease-out infinite` }} />
              )}
              {isSelected && <circle cx={p.x} cy={p.y} r={r+9} fill="none" stroke={cat.dot} strokeWidth={1} opacity={0.25} />}
              {/* Main dot */}
              <circle cx={p.x} cy={p.y} r={r} fill={cat.dot}
                fillOpacity={n.status==='resolved'?.3:.85}
                stroke={isSelected?'white':cat.dot} strokeWidth={isSelected?2:1}
                style={{ filter:`drop-shadow(0 0 ${n.urgency>=8?6:3}px ${cat.dot})` }} />
              {/* Status indicator */}
              {n.status==='assigned' && <circle cx={p.x+r-2} cy={p.y-r+2} r={3} fill={C.warn} />}
              {n.status==='resolved' && <circle cx={p.x+r-2} cy={p.y-r+2} r={3} fill={C.accent} />}
            </g>
          );
        })}

        {/* Volunteer positions */}
        {VOLUNTEERS.filter(v=>v.available).map(v => {
          const p = toSVG(v.lat, v.lng, W, H);
          return (
            <g key={v.id}>
              <polygon points={`${p.x},${p.y-7} ${p.x-5},${p.y+4} ${p.x+5},${p.y+4}`}
                fill={C.accent} fillOpacity={.55} stroke={C.accent} strokeWidth={1} />
            </g>
          );
        })}

        {/* Legend */}
        <g transform="translate(10,10)">
          <rect width={110} height={60} rx={4} fill={C.bg2} fillOpacity={.92} />
          <circle cx={12} cy={14} r={5} fill={C.danger} style={{filter:`drop-shadow(0 0 3px ${C.danger})`}} />
          <text x={22} y={18} fontSize={8} fill={C.text2} fontFamily="DM Sans">High urgency need</text>
          <polygon points="12,28 7,38 17,38" fill={C.accent} fillOpacity={.7} />
          <text x={22} y={36} fontSize={8} fill={C.text2} fontFamily="DM Sans">Available volunteer</text>
          <circle cx={12} cy={50} r={4} fill={C.warn} />
          <text x={22} y={54} fontSize={8} fill={C.text2} fontFamily="DM Sans">Assigned</text>
        </g>
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// VIEW: FIELD WORKER
// ═══════════════════════════════════════════════════════════
function FieldView({ onSubmit }) {
  const [mode, setMode] = useState(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);

  function startVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Voice not supported in this browser. Use Chrome or Edge.'); return; }
    const r = new SR();
    r.lang = 'hi-IN'; r.interimResults = true; r.continuous = false;
    r.onresult = e => {
      const t = Array.from(e.results).map(r=>r[0].transcript).join('');
      setTranscript(t);
    };
    r.onend = () => { setListening(false); if (transcript) handleAIExtract(transcript); };
    recognitionRef.current = r;
    r.start(); setListening(true);
  }

  function stopVoice() { recognitionRef.current?.stop(); setListening(false); }

  async function handleAIExtract(input) {
    setLoading(true); setResult(null);
    try {
      const extracted = await extractNeed(input);
      if (!extracted) throw new Error('parse failed');
      const need = { ...extracted, id:`n${Date.now()}`, status:'open', raw: input };
      setResult(need);
      onSubmit(need);
    } catch {
      setResult({ error: true });
    } finally { setLoading(false); }
  }

  if (result && !result.error) {
    const cat = CAT[result.category] || CAT.other;
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
            <span style={{ marginLeft:'auto', fontSize:11, fontFamily:'Space Mono', color: result.urgency>=8?C.danger:result.urgency>=6?C.warn:C.accent }}>
              URGENCY {result.urgency}/10
            </span>
          </div>
          <p style={{ fontSize:14, lineHeight:1.6, color:C.text, marginBottom:12 }}>{result.description}</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {result.location && <div style={{ background:C.bg3, borderRadius:6, padding:'8px 10px' }}>
              <div style={{ fontSize:9, color:C.text2, fontFamily:'Space Mono', marginBottom:3 }}>LOCATION</div>
              <div style={{ fontSize:12, color:C.text }}>{result.location}</div>
            </div>}
            {result.people_count && <div style={{ background:C.bg3, borderRadius:6, padding:'8px 10px' }}>
              <div style={{ fontSize:9, color:C.text2, fontFamily:'Space Mono', marginBottom:3 }}>PEOPLE</div>
              <div style={{ fontSize:12, color:C.text }}>{result.people_count}</div>
            </div>}
          </div>
        </div>
        <button onClick={() => { setResult(null); setMode(null); setTranscript(''); setText(''); }}
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

      {!mode && !loading && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, animation:'fadeUp .35s ease' }}>
          {[
            { id:'voice', emoji:'🎙️', label:'Voice note', sub:'Hindi / English' },
            { id:'text',  emoji:'✍️', label:'Type report', sub:'Any language'   },
            { id:'image', emoji:'📷', label:'Survey photo', sub:'Handwritten ok' },
          ].map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:10, padding:'22px 12px',
                cursor:'pointer', transition:'border-color .15s, box-shadow .15s', textAlign:'center',
                ':hover':{ borderColor:C.accent } }}
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
            {listening && <>
              <div style={{ position:'absolute', inset:-16, borderRadius:'50%', border:`1.5px solid ${C.danger}`, animation:'pulse-ring 1.2s ease-out infinite' }} />
              <div style={{ position:'absolute', inset:-8, borderRadius:'50%', border:`1.5px solid ${C.danger}`, animation:'pulse-ring 1.4s ease-out infinite .3s' }} />
            </>}
            <button onClick={listening ? stopVoice : startVoice}
              style={{ width:110, height:110, borderRadius:'50%', border:'none',
                background: listening ? `radial-gradient(circle, ${C.danger}aa, ${C.danger}55)` : `radial-gradient(circle, ${C.accentDim}, ${C.bg3})`,
                boxShadow: listening ? `0 0 32px rgba(255,58,58,.5)` : `0 0 20px ${C.accentGlow}`,
                cursor:'pointer', fontSize:36, transition:'all .3s ease', color:'white' }}>
              🎙️
            </button>
          </div>
          {listening
            ? <p style={{ fontSize:13, color:C.danger, fontFamily:'Space Mono', animation:'pulse-dot 1s ease-in-out infinite' }}>● RECORDING — speak clearly...</p>
            : <p style={{ fontSize:13, color:C.text2 }}>Tap to start. Speak in Hindi or English.</p>
          }
          {transcript && !listening && (
            <div style={{ margin:'20px 0', background:C.bg2, border:`1px solid ${C.border}`, borderRadius:8, padding:'12px 16px', textAlign:'left' }}>
              <div style={{ fontSize:9, color:C.text2, fontFamily:'Space Mono', marginBottom:6 }}>TRANSCRIPT</div>
              <p style={{ fontSize:13, color:C.text, lineHeight:1.6 }}>{transcript}</p>
              <button onClick={() => handleAIExtract(transcript)}
                style={{ marginTop:12, width:'100%', padding:'10px', borderRadius:7, border:'none', background:C.ai, color:'white', fontSize:13, cursor:'pointer', fontWeight:500 }}>
                Extract with AI →
              </button>
            </div>
          )}
          <button onClick={() => setMode(null)} style={{ marginTop:14, background:'none', border:'none', color:C.text2, fontSize:12, cursor:'pointer' }}>← Back</button>
        </div>
      )}

      {/* TEXT MODE */}
      {mode==='text' && !loading && (
        <div style={{ animation:'fadeUp .3s ease' }}>
          <textarea value={text} onChange={e=>setText(e.target.value)}
            placeholder="Example: Sector 14 mein 30 families hain, unhe khana chahiye aur ek bachche ko bukhar hai (30 families in Sector 14 need food and a child has fever)..."
            rows={5}
            style={{ width:'100%', background:C.bg2, border:`1px solid ${C.border}`, borderRadius:10, padding:'14px 16px',
              fontSize:13, color:C.text, resize:'vertical', fontFamily:'DM Sans', lineHeight:1.6, outline:'none' }} />
          <button onClick={() => handleAIExtract(text)} disabled={!text.trim()}
            style={{ width:'100%', marginTop:10, padding:'14px', borderRadius:9, border:'none',
              background: text.trim() ? `linear-gradient(135deg, ${C.ai}, #7C3AED)` : C.bg3,
              color: text.trim() ? 'white' : C.text2, fontSize:14, cursor: text.trim()?'pointer':'default', fontWeight:600,
              boxShadow: text.trim() ? `0 4px 16px rgba(180,126,255,.3)` : 'none', transition:'all .2s' }}>
            Extract need with AI →
          </button>
          <button onClick={() => setMode(null)} style={{ width:'100%', marginTop:8, background:'none', border:'none', color:C.text2, fontSize:12, cursor:'pointer' }}>← Back</button>
        </div>
      )}

      {/* IMAGE MODE — simulated */}
      {mode==='image' && !loading && (
        <div style={{ textAlign:'center', animation:'fadeUp .3s ease' }}>
          <label style={{ display:'block', border:`2px dashed ${C.border}`, borderRadius:12, padding:'48px 24px', cursor:'pointer',
            transition:'border-color .2s' }}
            onMouseEnter={e=>e.currentTarget.style.borderColor=C.accent}
            onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
            <div style={{ fontSize:40, marginBottom:12 }}>📷</div>
            <p style={{ fontSize:13, color:C.text2 }}>Tap to capture or upload survey photo</p>
            <p style={{ fontSize:11, color:C.text3, marginTop:6 }}>Handwritten forms, printed surveys, field notes</p>
            <input type="file" accept="image/*" style={{ display:'none' }}
              onChange={e => {
                const file = e.target.files[0];
                if (file) handleAIExtract(`Field survey photo uploaded: ${file.name}. Assume it shows a community need in a Gurugram NGO context with families requiring assistance.`);
              }} />
          </label>
          <button onClick={() => setMode(null)} style={{ marginTop:16, background:'none', border:'none', color:C.text2, fontSize:12, cursor:'pointer' }}>← Back</button>
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div style={{ textAlign:'center', padding:'40px 0', animation:'fadeIn .3s ease' }}>
          <div style={{ position:'relative', width:60, height:60, margin:'0 auto 20px' }}>
            <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:`2px solid ${C.aiDim}` }} />
            <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:`2px solid transparent`, borderTopColor:C.ai, animation:'spin .9s linear infinite' }} />
            <div style={{ position:'absolute', inset:8, borderRadius:'50%', border:`1.5px solid transparent`, borderTopColor:C.accent, animation:'spin .7s linear infinite reverse' }} />
          </div>
          <p style={{ fontSize:13, color:C.ai, fontFamily:'Space Mono' }}>SEVA AI READING REPORT...</p>
          <p style={{ fontSize:11, color:C.text2, marginTop:6 }}>Extracting location · category · urgency</p>
        </div>
      )}

      {result?.error && (
        <div style={{ background:C.dangerDim, border:`1px solid ${C.danger}`, borderRadius:8, padding:'12px 16px', marginTop:16, fontSize:13, color:C.danger }}>
          AI extraction failed. Please try again with more detail.
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// VIEW: OPS DASHBOARD
// ═══════════════════════════════════════════════════════════
function OpsView({ needs, newNeed }) {
  const [selected, setSelected] = useState(null);
  const [matches, setMatches] = useState([]);
  const [matchReasons, setMatchReasons] = useState({});
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [filterCat, setFilterCat] = useState('all');

  const stats = {
    open:     needs.filter(n=>n.status==='open').length,
    assigned: needs.filter(n=>n.status==='assigned').length,
    resolved: needs.filter(n=>n.status==='resolved').length,
    people:   needs.reduce((a,n)=>a+(n.people_count||0),0),
  };

  const filtered = filterCat==='all' ? needs : needs.filter(n=>n.category===filterCat);

  async function handleSelectNeed(need) {
    setSelected(need);
    setMatches([]);
    setMatchReasons({});
    setLoadingMatch(true);
    const ranked = matchVolunteers(need, VOLUNTEERS);
    setMatches(ranked);
    setLoadingMatch(false);
    // Generate AI reasons in background
    for (const vol of ranked) {
      generateMatchReason(need, vol).then(reason => {
        setMatchReasons(prev => ({ ...prev, [vol.id]: reason }));
      });
    }
  }

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:14, height:'calc(100vh - 112px)' }}>
      {/* LEFT: Map + stats */}
      <div style={{ display:'flex', flexDirection:'column', gap:10, overflow:'hidden' }}>
        {/* Stats bar */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
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

        {/* Category filter */}
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

        {/* Map */}
        <div style={{ flex:1, minHeight:0 }}>
          <SevaMap needs={filtered} onSelect={handleSelectNeed} selected={selected} newNeed={newNeed} />
        </div>

        {/* LIVE indicator */}
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0' }}>
          <LiveDot />
          <span style={{ fontSize:10, fontFamily:'Space Mono', color:C.text2, letterSpacing:.5 }}>LIVE — auto-updates as field reports come in</span>
        </div>
      </div>

      {/* RIGHT: Needs list + match panel */}
      <div style={{ background:C.bg1, border:`1px solid ${C.border}`, borderRadius:10, overflow:'hidden', display:'flex', flexDirection:'column' }}>
        {!selected ? (
          <>
            <div style={{ padding:'14px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:13, fontWeight:600, fontFamily:'Syne', color:C.text }}>Live Needs</span>
              <span style={{ marginLeft:'auto', fontSize:10, fontFamily:'Space Mono', color:C.text2 }}>{filtered.filter(n=>n.status==='open').length} OPEN</span>
            </div>
            <div style={{ flex:1, overflow:'auto' }}>
              {filtered.sort((a,b)=>b.urgency-a.urgency).map((need, i) => {
                const cat = CAT[need.category] || CAT.other;
                return (
                  <div key={need.id} className="need-row" onClick={() => handleSelectNeed(need)}
                    style={{ padding:'12px 16px', borderBottom:`1px solid ${C.border}`, cursor:'pointer', transition:'background .12s',
                      animation:`fadeUp .3s ease ${i*0.04}s both`, background: need.status==='resolved'?'transparent':C.bg1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                      <span style={{ width:8, height:8, borderRadius:'50%', background:cat.dot, flexShrink:0,
                        boxShadow: need.urgency>=7 ? `0 0 5px ${cat.dot}` : 'none' }} />
                      <Badge label={cat.label} color={cat.color} bg={cat.bg} />
                      <span style={{ marginLeft:'auto', fontSize:10, fontFamily:'Space Mono',
                        color: need.status==='resolved'?C.accent:need.status==='assigned'?C.warn:C.text2 }}>
                        {need.status.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ fontSize:12, color: need.status==='resolved'?C.text2:C.text, lineHeight:1.5, marginBottom:6 }}>{need.description}</p>
                    <UrgencyBar value={need.urgency} />
                    <div style={{ display:'flex', gap:12, marginTop:6, fontSize:10, color:C.text2 }}>
                      <span>📍 {need.location}</span>
                      {need.people_count && <span>👥 {need.people_count}</span>}
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

            {/* Selected need */}
            <div style={{ padding:'14px 16px', borderBottom:`1px solid ${C.border}` }}>
              <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
                <Badge label={(CAT[selected.category]||CAT.other).label} color={(CAT[selected.category]||CAT.other).color} bg={(CAT[selected.category]||CAT.other).bg} />
                <span style={{ fontSize:10, fontFamily:'Space Mono', color: selected.urgency>=8?C.danger:C.warn }}>URGENCY {selected.urgency}/10</span>
              </div>
              <p style={{ fontSize:13, color:C.text, lineHeight:1.5, marginBottom:8 }}>{selected.description}</p>
              <div style={{ display:'flex', gap:12, fontSize:11, color:C.text2 }}>
                <span>📍 {selected.location}</span>
                {selected.people_count && <span>👥 {selected.people_count} people</span>}
              </div>
            </div>

            {/* Matches */}
            <div style={{ flex:1, overflow:'auto', padding:'10px 12px' }}>
              {loadingMatch && (
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'20px 0', justifyContent:'center' }}>
                  <Spinner /><span style={{ fontSize:12, color:C.ai }}>Finding best matches...</span>
                </div>
              )}
              {matches.map((vol, i) => {
                const reason = matchReasons[vol.id];
                return (
                  <div key={vol.id} style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:9, padding:'12px 14px', marginBottom:10,
                    animation:`fadeUp .3s ease ${i*.08}s both` }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                      <div style={{ width:36, height:36, borderRadius:'50%', background:C.aiDim, border:`1.5px solid ${C.ai}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:600, color:C.ai, flexShrink:0 }}>
                        {vol.initials}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:500, color:C.text }}>{vol.name}</div>
                        <div style={{ fontSize:10, color:C.text2, marginTop:1 }}>
                          <span style={{ fontFamily:'Space Mono', color:vol.score>=60?C.accent:vol.score>=40?C.warn:C.text2 }}>{vol.score}%</span> match score
                        </div>
                      </div>
                      <button style={{ padding:'6px 12px', borderRadius:6, border:`1px solid ${C.accent}44`, background:C.accentDim, color:C.accent, fontSize:11, cursor:'pointer', fontWeight:500, whiteSpace:'nowrap' }}>
                        Assign →
                      </button>
                    </div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:8 }}>
                      {vol.skills.map(s => (
                        <span key={s} style={{ fontSize:9, padding:'2px 7px', background:C.bg3, color:C.text2, borderRadius:3, fontFamily:'Space Mono' }}>{s}</span>
                      ))}
                    </div>
                    {/* AI reason */}
                    <div style={{ background:C.aiDim, borderRadius:6, padding:'8px 10px', borderLeft:`2px solid ${C.ai}44` }}>
                      <div style={{ fontSize:9, color:C.ai, fontFamily:'Space Mono', marginBottom:4 }}>AI · WHY THIS MATCH</div>
                      <p style={{ fontSize:11, color:C.text2, lineHeight:1.5, fontStyle:'italic' }}>
                        {reason ? <TypewriterText text={`"${reason}"`} speed={14} /> : <span style={{ opacity:.4 }}>Generating explanation...</span>}
                      </p>
                    </div>
                  </div>
                );
              })}
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
function ImpactView({ needs }) {
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);

  const stats = {
    volunteers_deployed: 31,
    families_served: needs.reduce((a,n)=>a+(n.people_count||0),0),
    needs_resolved: needs.filter(n=>n.status==='resolved').length,
    needs_active: needs.filter(n=>n.status==='open').length,
    areas_covered: 8,
    response_time_min: 23,
  };

  async function generate() {
    setLoading(true); setReport('');
    const text = await generateImpactReport(stats);
    setReport(text);
    setLoading(false);
  }

  const BIG_STATS = [
    { val: stats.volunteers_deployed, label:'Volunteers Active',    color:C.accent, suffix:'' },
    { val: stats.families_served,     label:'People Reached',       color:C.info,   suffix:'+' },
    { val: stats.needs_resolved,      label:'Needs Resolved',       color:C.ai,     suffix:'' },
    { val: stats.response_time_min,   label:'Avg Response (min)',   color:C.warn,   suffix:'' },
  ];

  return (
    <div style={{ maxWidth:640, margin:'0 auto', animation:'fadeUp .3s ease' }}>
      <div style={{ marginBottom:28 }}>
        <h2 style={{ fontSize:22, fontWeight:700, fontFamily:'Syne', color:C.text }}>Impact Report</h2>
        <p style={{ fontSize:13, color:C.text2, marginTop:6 }}>Real-time operational summary — AI-generated donor report</p>
      </div>

      {/* Big stat grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
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

      {/* Category breakdown */}
      <div style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:10, padding:'16px 20px', marginBottom:16 }}>
        <div style={{ fontSize:10, fontFamily:'Space Mono', color:C.text2, marginBottom:14 }}>NEEDS BY CATEGORY</div>
        {Object.entries(CAT).map(([k,v]) => {
          const count = needs.filter(n=>n.category===k).length;
          const pct = Math.round(count/needs.length*100);
          if (!count) return null;
          return (
            <div key={k} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <span style={{ fontSize:11, color:v.color, width:70, fontFamily:'Space Mono' }}>{v.label}</span>
              <div style={{ flex:1, height:4, background:C.bg3, borderRadius:2, overflow:'hidden' }}>
                <div style={{ width:`${pct}%`, height:'100%', background:v.color, borderRadius:2, boxShadow:`0 0 6px ${v.color}66` }} />
              </div>
              <span style={{ fontSize:10, color:C.text2, width:24, textAlign:'right', fontFamily:'Space Mono' }}>{count}</span>
            </div>
          );
        })}
      </div>

      {/* AI Report generator */}
      <div style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:10, padding:'16px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
          <div style={{ fontSize:10, fontFamily:'Space Mono', color:C.ai }}>✦ AI DONOR REPORT</div>
          <button onClick={generate} disabled={loading}
            style={{ marginLeft:'auto', padding:'7px 14px', borderRadius:6, border:`1px solid ${C.ai}66`, background:C.aiDim, color:C.ai, fontSize:11, cursor: loading?'default':'pointer', fontFamily:'Space Mono' }}>
            {loading ? '...' : 'GENERATE →'}
          </button>
        </div>
        {loading && (
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <Spinner /><span style={{ fontSize:12, color:C.ai }}>SEVA AI composing report...</span>
          </div>
        )}
        {report && !loading && (
          <div style={{ borderLeft:`2px solid ${C.ai}66`, paddingLeft:14, animation:'fadeUp .3s ease' }}>
            <p style={{ fontSize:14, color:C.text, lineHeight:1.8, fontStyle:'italic' }}>
              <TypewriterText text={`"${report}"`} speed={22} />
            </p>
          </div>
        )}
        {!report && !loading && (
          <p style={{ fontSize:12, color:C.text3 }}>Click Generate to create a donor-ready impact paragraph using Claude AI</p>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════
const TABS = [
  { id:'field', label:'Field Report', emoji:'📡', sub:'Submit need' },
  { id:'ops',   label:'Ops Dashboard', emoji:'🗺️', sub:'Live map'   },
  { id:'impact',label:'Impact',       emoji:'📊', sub:'Analytics'  },
];

export default function App() {
  const [view, setView] = useState('ops');
  const [needs, setNeeds] = useState(NEEDS);
  const [newNeed, setNewNeed] = useState(null);
  const [toast, setToast] = useState(null);
  const tabRefs = useRef({});

  function handleSubmit(need) {
    const full = { ...need, id: need.id||`n${Date.now()}`, status:'open' };
    setNeeds(prev => [full, ...prev]);
    setNewNeed(full);
    setTimeout(() => setNewNeed(null), 6000);
    setToast(`✓ Need logged: ${full.category} in ${full.location || 'field'}. Visible on ops map.`);
    setTimeout(() => setView('ops'), 2200);
  }

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', background:C.bg0, fontFamily:'DM Sans,sans-serif' }}>
      <style>{STYLES}</style>

      {/* Header */}
      <header style={{ padding:'0 20px', background:C.bg1, borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', height:52, flexShrink:0 }}>
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginRight:32 }}>
          <div style={{ width:30, height:30, borderRadius:7, background:`linear-gradient(135deg, ${C.accent}, #00B07A)`,
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:14,
            boxShadow:`0 0 12px ${C.accentGlow}` }}>⬡</div>
          <span style={{ fontSize:16, fontWeight:800, fontFamily:'Syne', color:C.text, letterSpacing:.5 }}>SEVA</span>
          <span style={{ fontSize:9, color:C.text2, fontFamily:'Space Mono', borderLeft:`1px solid ${C.border}`, paddingLeft:10, letterSpacing:.5 }}>SCALABLE EMERGENCY VOLUNTEER ACTIVATOR</span>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:2, position:'relative' }}>
          {TABS.map(t => (
            <button key={t.id} ref={el=>tabRefs.current[t.id]=el} onClick={() => setView(t.id)}
              style={{ display:'flex', alignItems:'center', gap:7, padding:'6px 14px', borderRadius:7, border:'none',
                background: view===t.id ? C.bg3 : 'transparent',
                color: view===t.id ? C.text : C.text2,
                cursor:'pointer', fontSize:13, fontWeight: view===t.id?500:400, transition:'all .15s' }}>
              <span>{t.emoji}</span>
              <span>{t.label}</span>
              {view===t.id && t.id==='ops' && <LiveDot size={6} />}
            </button>
          ))}
        </div>

        {/* Right */}
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:C.accent, fontFamily:'Space Mono' }}>
            <LiveDot size={6} /><span>LIVE</span>
          </div>
          <div style={{ background:C.bg3, border:`1px solid ${C.border}`, borderRadius:6, padding:'5px 12px', fontSize:11, color:C.text2, fontFamily:'Space Mono' }}>
            NCR · Gurugram
          </div>
        </div>
      </header>

      {/* Body */}
      <main style={{ flex:1, overflow:'auto', padding:16 }}>
        {toast && <Toast msg={toast} onClose={()=>setToast(null)} />}
        {view==='field'  && <FieldView onSubmit={handleSubmit} />}
        {view==='ops'    && <OpsView needs={needs} newNeed={newNeed} />}
        {view==='impact' && <ImpactView needs={needs} />}
      </main>
    </div>
  );
}

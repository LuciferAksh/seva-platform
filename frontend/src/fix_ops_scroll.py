import sys
import re

with open('C:/Solution Codex/frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace OpsView selected rendering to include the scrolling wrapper
old_str = """        ) : (
          <>
            <div style={{ padding:'14px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:10 }}>
              <button onClick={()=>setSelected(null)} style={{ background:'none', border:'none', color:C.text2, cursor:'pointer', fontSize:16, lineHeight:1, padding:0 }}>←</button>
              <span style={{ fontSize:13, fontWeight:600, fontFamily:'Syne', color:C.text }}>Match Volunteers</span>
            </div>
            <div style={{ padding:'14px 16px', borderBottom:`1px solid ${C.border}` }}>
              <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
                <Badge label={getCat(selected.extraction?.category).label} color={getCat(selected.extraction?.category).color} bg={getCat(selected.extraction?.category).bg} />
                <span style={{ fontSize:10, fontFamily:'Space Mono', color: selected.extraction?.urgency_level>=8?C.danger:C.warn }}>URGENCY {selected.extraction?.urgency_level}/10</span>
              </div>
              <p style={{ fontSize:13, color:C.text, lineHeight:1.5, marginBottom:8 }}>{selected.extraction?.summary}</p>
              <div style={{ display:'flex', gap:12, fontSize:11, color:C.text2, marginBottom:10 }}>
                <span>📍 {selected.extraction?.location_label}</span>
                {selected.extraction?.people_affected && <span>👥 {selected.extraction.people_affected} people</span>}
              </div>

              {selected.extraction?.suggested_supplies && selected.extraction.suggested_supplies.length > 0 && (
                <div style={{ background:C.bg2, borderRadius:6, padding:'8px 10px', marginBottom:10, border:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:9, color:C.ai, fontFamily:'Space Mono', marginBottom:4 }}>AI · SUGGESTED SUPPLIES</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {selected.extraction.suggested_supplies.map((s:string, i:number) => <span key={i} style={{ background:C.bg3, color:C.text, fontSize:10, padding:'2px 6px', borderRadius:4 }}>{s}</span>)}
                  </div>
                </div>
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
          </>"""

new_str = """        ) : (
          <>
            <div style={{ padding:'14px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
              <button onClick={()=>setSelected(null)} style={{ background:'none', border:'none', color:C.text2, cursor:'pointer', fontSize:16, lineHeight:1, padding:0 }}>←</button>
              <span style={{ fontSize:13, fontWeight:600, fontFamily:'Syne', color:C.text }}>Match Volunteers</span>
            </div>
            
            <div style={{ flex:1, overflow:'auto', display:'flex', flexDirection:'column' }}>
              <div style={{ padding:'14px 16px', borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
                <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
                  <Badge label={getCat(selected.extraction?.category).label} color={getCat(selected.extraction?.category).color} bg={getCat(selected.extraction?.category).bg} />
                  <span style={{ fontSize:10, fontFamily:'Space Mono', color: selected.extraction?.urgency_level>=8?C.danger:C.warn }}>URGENCY {selected.extraction?.urgency_level}/10</span>
                </div>
                <p style={{ fontSize:13, color:C.text, lineHeight:1.5, marginBottom:8 }}>{selected.extraction?.summary}</p>
                <div style={{ display:'flex', gap:12, fontSize:11, color:C.text2, marginBottom:10 }}>
                  <span>📍 {selected.extraction?.location_label}</span>
                  {selected.extraction?.people_affected && <span>👥 {selected.extraction.people_affected} people</span>}
                </div>

                {selected.extraction?.suggested_supplies && selected.extraction.suggested_supplies.length > 0 && (
                  <div style={{ background:C.bg2, borderRadius:6, padding:'8px 10px', marginBottom:10, border:`1px solid ${C.border}` }}>
                    <div style={{ fontSize:9, color:C.ai, fontFamily:'Space Mono', marginBottom:4 }}>AI · SUGGESTED SUPPLIES</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                      {selected.extraction.suggested_supplies.map((s:string, i:number) => <span key={i} style={{ background:C.bg3, color:C.text, fontSize:10, padding:'2px 6px', borderRadius:4 }}>{s}</span>)}
                    </div>
                  </div>
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

              <div style={{ flex:1, padding:'10px 12px' }}>
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
          </>"""

if old_str in content:
    content = content.replace(old_str, new_str)
    with open('C:/Solution Codex/frontend/src/App.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("FAILED TO MATCH")

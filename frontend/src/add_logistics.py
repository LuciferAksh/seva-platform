import sys
import re

with open('C:/Solution Codex/frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add markers to SevaMap for facilities
old_marker = "        {volunteers.filter((v:any)=>v.availability==='available' && v.coordinates?.lat && v.coordinates?.lng).map((v:any) => ("
new_marker = """
        {needs.filter((n:any)=>n.extraction?.nearby_facilities && n.extraction.nearby_facilities.length > 0).flatMap((n:any) => n.extraction.nearby_facilities).map((f:any, i:number) => (
          <CircleMarker
            key={'fac-'+i}
            center={[f.lat, f.lng]}
            radius={6}
            pathOptions={{ color: '#fff', fillColor: C.danger, fillOpacity: 1, weight: 2 }}
          >
            <Popup>
              <div style={{ color: '#000', fontFamily: 'DM Sans', fontSize: 12 }}>
                <strong>🏥 {f.name}</strong><br/>
                {f.address}
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {volunteers.filter((v:any)=>v.availability==='available' && v.coordinates?.lat && v.coordinates?.lng).map((v:any) => ("""
if "🏥" not in content:
    content = content.replace(old_marker, new_marker)

# 2. Add OpsView details panel
old_ops = """              <div style={{ display:'flex', gap:12, fontSize:11, color:C.text2 }}>
                <span>📍 {selected.extraction?.location_label}</span>
                {selected.extraction?.people_affected && <span>👥 {selected.extraction.people_affected} people</span>}
              </div>
            </div>"""

new_ops = """              <div style={{ display:'flex', gap:12, fontSize:11, color:C.text2, marginBottom:10 }}>
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
            </div>"""
if "AI · SUGGESTED SUPPLIES" not in content:
    content = content.replace(old_ops, new_ops)

# 3. Add VolunteerConsole details panel
old_vol = """             <p style={{ fontSize:15, color:C.text, marginBottom:8 }}>{m.need.extraction.summary}</p>
             <p style={{ fontSize:12, color:C.text2, marginBottom:14 }}>{m.assignment?.match_reason || m.match.explanation}</p>

             {m.assignment ? ("""

new_vol = """             <p style={{ fontSize:15, color:C.text, marginBottom:8 }}>{m.need.extraction.summary}</p>
             <p style={{ fontSize:12, color:C.text2, marginBottom:14 }}>{m.assignment?.match_reason || m.match.explanation}</p>
             
             {m.assignment && m.need.extraction.suggested_supplies && m.need.extraction.suggested_supplies.length > 0 && (
               <div style={{ background:C.bg3, borderLeft:`3px solid ${C.ai}`, borderRadius:'0 6px 6px 0', padding:'10px', marginBottom:14 }}>
                 <div style={{ fontSize:10, color:C.ai, fontFamily:'Space Mono', marginBottom:6 }}>📋 EMERGENCY LOGISTICS (AI)</div>
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
             )}

             {m.assignment ? ("""
if "📋 EMERGENCY LOGISTICS (AI)" not in content:
    content = content.replace(old_vol, new_vol)


# 4. Fix App.tsx dummy submission mock
old_mock = "extraction: { category: 'other', urgency_level: 1, people_affected: 1, location_label: 'Pending sync', coordinates: null, required_skills: [], summary: 'Pending offline sync...' }"
new_mock = "extraction: { category: 'other', urgency_level: 1, people_affected: 1, location_label: 'Pending sync', coordinates: null as any, required_skills: [], summary: 'Pending offline sync...', suggested_supplies: [], facility_type_needed: null, nearby_facilities: [] }"
content = content.replace(old_mock, new_mock)


with open('C:/Solution Codex/frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Frontend successfully updated")

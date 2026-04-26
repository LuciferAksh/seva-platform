import sys

with open('C:/Solution Codex/frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update OpsView (Admin side)
old_ops_supplies = """              {selected.extraction?.suggested_supplies && selected.extraction.suggested_supplies.length > 0 && (
                <div style={{ background:C.bg2, borderRadius:6, padding:'8px 10px', marginBottom:10, border:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:9, color:C.ai, fontFamily:'Space Mono', marginBottom:4 }}>AI · SUGGESTED SUPPLIES</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {selected.extraction.suggested_supplies.map((s:string, i:number) => <span key={i} style={{ background:C.bg3, color:C.text, fontSize:10, padding:'2px 6px', borderRadius:4 }}>{s}</span>)}
                  </div>
                </div>
              )}"""

new_ops_supplies = """              {selected.extraction?.suggested_supplies && selected.extraction.suggested_supplies.length > 0 && (
                <details style={{ background:C.bg2, borderRadius:6, marginBottom:10, border:`1px solid ${C.border}`, overflow:'hidden' }}>
                  <summary style={{ padding:'8px 10px', fontSize:9, color:C.ai, fontFamily:'Space Mono', cursor:'pointer', userSelect:'none', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span>AI · SUGGESTED SUPPLIES ({selected.extraction.suggested_supplies.length})</span>
                    <span style={{ fontSize:10 }}>▼</span>
                  </summary>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, padding:'0 10px 10px' }}>
                    {selected.extraction.suggested_supplies.map((s:string, i:number) => <span key={i} style={{ background:C.bg3, color:C.text, fontSize:10, padding:'2px 6px', borderRadius:4 }}>{s}</span>)}
                  </div>
                </details>
              )}"""

content = content.replace(old_ops_supplies, new_ops_supplies)

# 2. Update VolunteerConsole (Volunteer side)
old_vol_supplies = """             {m.assignment && m.need.extraction.suggested_supplies && m.need.extraction.suggested_supplies.length > 0 && (
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
             )}"""

new_vol_supplies = """             {m.assignment && m.need.extraction.suggested_supplies && m.need.extraction.suggested_supplies.length > 0 && (
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
             )}"""

content = content.replace(old_vol_supplies, new_vol_supplies)

with open('C:/Solution Codex/frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS")

import re

with open('C:/Solution Codex/frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Pass volunteers to VolunteerConsole
old_render = "volunteerStats={"
new_render = "volunteers={volunteers} volunteerStats={"
content = content.replace(old_render, new_render)

# 2. Update VolunteerConsole signature to accept volunteers and session
old_sig = "function VolunteerConsole({ missions, completeMission, volunteerName, volunteerStats }: any) {"
new_sig = "function VolunteerConsole({ missions, completeMission, volunteerName, volunteerStats, volunteers, session }: any) {"
content = content.replace(old_sig, new_sig)

# 3. Add SevaMap to VolunteerConsole and navigation button
old_vol_map = "<div style={{ display:'flex', flexDirection:'column', gap:14 }}>"
new_vol_map = """
      <div style={{ height:300, marginBottom:20, borderRadius:10, overflow:'hidden', border:`1px solid ${C.border}`, boxShadow:`0 0 16px ${C.accentGlow}` }}>
        <SevaMap needs={missions.map((m:any) => m.need)} volunteers={volunteers || []} onSelect={()=>{}} selected={null} newNeed={null} />
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>"""
if "<SevaMap needs={missions" not in content:
    content = content.replace(old_vol_map, new_vol_map)

old_nav_button = """                   <button onClick={() => {
                     completeMission(m.need.id, m.assignment.volunteer_id, note, file);
                     setFile(null);
                   }}
                     style={{ padding:'10px 16px', borderRadius:8, border:'none', background:C.accent, color:'#000', fontWeight:600, cursor:'pointer' }}>
                     Mark Complete
                   </button>
                 </div>
               </div>"""
new_nav_button = """                   <button onClick={() => {
                     completeMission(m.need.id, m.assignment.volunteer_id, note, file);
                     setFile(null);
                   }}
                     style={{ padding:'10px 16px', borderRadius:8, border:'none', background:C.accent, color:'#000', fontWeight:600, cursor:'pointer' }}>
                     Mark Complete
                   </button>
                 </div>
                 <a href={`https://www.google.com/maps/dir/?api=1&destination=${m.need.extraction.coordinates.lat},${m.need.extraction.coordinates.lng}`} target="_blank" rel="noopener noreferrer" style={{ display:'block', textAlign:'center', marginTop:10, padding:'10px 16px', borderRadius:8, background:C.info, color:'#000', fontWeight:600, textDecoration:'none' }}>🗺️ Navigate via Google Maps</a>
               </div>"""
if "🗺️ Navigate via Google Maps" not in content:
    content = content.replace(old_nav_button, new_nav_button)


# Make sure session is passed to VolunteerConsole
old_app_render = "<VolunteerConsole missions={volunteerMissions} completeMission={completeMission} volunteerName={session?.name} volunteers={volunteers} volunteerStats={"
new_app_render = "<VolunteerConsole missions={volunteerMissions} completeMission={completeMission} volunteerName={session?.name} session={session} volunteers={volunteers} volunteerStats={"
content = content.replace(old_app_render, new_app_render)

with open('C:/Solution Codex/frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)


# Update google_pipeline.py
with open('C:/Solution Codex/backend/app/services/google_pipeline.py', 'r', encoding='utf-8') as f:
    pipe_content = f.read()

old_prompt = '''            "best locality label, exact GPS coordinates (lat and lng) for that location as floats, required volunteer skills, and a short operational summary. "
            "Also provide a detailed list of 'suggested_supplies' (e.g. ['Burn cream', 'Sterile bandages', 'Water purification tablets']) and if a specific facility is needed, provide 'facility_type_needed' (must be exactly 'hospital', 'pharmacy', 'medical_clinic', or null).\\n\\n"'''

new_prompt = '''            "best locality label, exact GPS coordinates (lat and lng) for that location as floats, required volunteer skills, and a short operational summary. "
            "Also deeply analyze the incident and provide an EXTENSIVE, hyper-specific list of 'suggested_supplies' (e.g., instead of just 'medical', specify exactly: 'Burn cream', 'Sterile bandages', 'Antibiotics', 'Fire extinguisher', 'Blankets', 'Water purification tablets', etc.). "
            "If a specific facility is needed, strictly provide 'facility_type_needed' (must be exactly 'hospital', 'pharmacy', 'medical_clinic', 'police', 'fire_station', or null).\\n\\n"'''

pipe_content = pipe_content.replace(old_prompt, new_prompt)

with open('C:/Solution Codex/backend/app/services/google_pipeline.py', 'w', encoding='utf-8') as f:
    f.write(pipe_content)

print("Updated App.tsx and google_pipeline.py")

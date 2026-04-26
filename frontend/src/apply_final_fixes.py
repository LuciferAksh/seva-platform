import sys
import re

file_path = 'C:/Solution Codex/frontend/src/App.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update STYLES with the most robust Dark Mode filter possible
# We target the tile container directly from a parent class
styles_pattern = r'/\* Heatmap \*/.*?`;'
new_styles = """  /* Heatmap */
  .heatmap-blob { filter: blur(35px); mix-blend-mode: screen; pointer-events: none; }
  .dark-tiles img.leaflet-tile { filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%) !important; }
  .dark-tiles .leaflet-container { background: #04080D !important; }
  .light-tiles img.leaflet-tile { filter: none !important; }
`;"""
content = re.sub(styles_pattern, new_styles, content, flags=re.DOTALL)

# 2. Rewrite SevaMap to use a Wrapper Div for the theme
# This forces the CSS to apply even if Leaflet doesn't re-render
sevamap_pattern = r'function SevaMap\(.*?}\n// ═'
new_sevamap = """function SevaMap({ needs, volunteers, onSelect, selected, newNeed, showAllFacilities=true }: any) {
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
// ═"""
content = re.sub(sevamap_pattern, new_sevamap, content, flags=re.DOTALL)

# 3. Fix the volunteerStats logic to support Admin test mode correctly
stats_pattern = r'volunteerStats=\{.*?session\?\.volunteerId \? \{.*?\}.*?\}'
new_stats = """volunteerStats={
          (session?.volunteerId || (session?.role === "admin" && volunteers.length > 0)) ? {
            completedCount: needs.filter(n => n.status === "completed" && assignments.some(a => a.need_id === n.id && a.volunteer_id === (session?.volunteerId || volunteers[0]?.id))).length,
            peopleHelped: needs.filter(n => n.status === "completed" && assignments.some(a => a.need_id === n.id && a.volunteer_id === (session?.volunteerId || volunteers[0]?.id))).reduce((sum, n) => sum + (n.extraction?.people_affected || 0), 0)
          } : null
        }"""
content = re.sub(stats_pattern, new_stats, content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS")

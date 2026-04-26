import sys
import re

with open('C:/Solution Codex/frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix SevaMap: Add navigation to popup, fix emojis, improve zoom/center
# We use a more robust regex or exact match based on the previous read
old_sevamap = """function SevaMap({ needs, volunteers, onSelect, selected, newNeed }: any) {
  const [mapStyle, setMapStyle] = useState<'dark' | 'satellite' | 'heatmap'>('satellite');

  const center: [number, number] = [22.5937, 78.9629];
  const zoom = 4;

  return (
    <div style={{ position:'relative', background:C.bg1, borderRadius:10, overflow:'hidden', border:`1px solid ${C.border}`, height:'100%' }}>
      <div style={{ position:'absolute', top: 12, right: 12, zIndex: 1000, display: 'flex', gap: 6 }}>
        <button onClick={() => setMapStyle('dark')} style={{ fontSize: 10, padding: '4px 8px', background: mapStyle === 'dark' ? C.accent : C.bg2, color: mapStyle === 'dark' ? '#000' : C.text, border: `1px solid ${C.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: 'Space Mono' }}>DARK MAP</button>
        <button onClick={() => setMapStyle('satellite')} style={{ fontSize: 10, padding: '4px 8px', background: mapStyle === 'satellite' ? C.accent : C.bg2, color: mapStyle === 'satellite' ? '#000' : C.text, border: `1px solid ${C.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: 'Space Mono' }}>SATELLITE</button>
        <button onClick={() => setMapStyle('heatmap')} style={{ fontSize: 10, padding: '4px 8px', background: mapStyle === 'heatmap' ? C.danger : C.bg2, color: mapStyle === 'heatmap' ? '#FFF' : C.text, border: `1px solid ${C.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: 'Space Mono', boxShadow: mapStyle==='heatmap' ? '0 0 10px red' : 'none' }}>AI HEATMAP</button>
      </div>

      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%', background: C.bg1 }} zoomControl={true}>
        {mapStyle === 'dark' || mapStyle === 'heatmap' ? (
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="&copy; CartoDB" />
        ) : (
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Tiles &copy; Esri" />
        )}

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
                  Status: {n.status}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}


        {needs.filter((n:any)=>n.extraction?.nearby_facilities && n.extraction.nearby_facilities.length > 0).flatMap((n:any) => n.extraction.nearby_facilities).map((f:any, i:number) => (
          <CircleMarker
            key={'fac-'+i}
            center={[f.lat, f.lng]}
            radius={6}
            pathOptions={{ color: '#fff', fillColor: C.danger, fillOpacity: 1, weight: 2 }}
          >
            <Popup>
              <div style={{ color: '#000', fontFamily: 'DM Sans', fontSize: 12 }}>
                <strong>ðŸ¥ {f.name}</strong><br/>
                {f.address}
              </div>
            </Popup>
          </CircleMarker>
        ))}"""

new_sevamap = """function SevaMap({ needs, volunteers, onSelect, selected, newNeed, showAllFacilities=true }: any) {
  const [mapStyle, setMapStyle] = useState<'dark' | 'satellite' | 'heatmap'>('satellite');

  // Dynamic center: use selected node or first need or India
  const center: [number, number] = selected?.extraction?.coordinates 
    ? [selected.extraction.coordinates.lat, selected.extraction.coordinates.lng]
    : needs.length > 0 && needs[0].extraction?.coordinates
      ? [needs[0].extraction.coordinates.lat, needs[0].extraction.coordinates.lng]
      : [22.5937, 78.9629];
  
  const zoom = selected ? 14 : 5;

  return (
    <div style={{ position:'relative', background:C.bg1, borderRadius:10, overflow:'hidden', border:`1px solid ${C.border}`, height:'100%' }}>
      <div style={{ position:'absolute', top: 12, right: 12, zIndex: 1000, display: 'flex', gap: 6 }}>
        <button onClick={() => setMapStyle('dark')} style={{ fontSize: 10, padding: '4px 8px', background: mapStyle === 'dark' ? C.accent : C.bg2, color: mapStyle === 'dark' ? '#000' : C.text, border: `1px solid ${C.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: 'Space Mono' }}>DARK MAP</button>
        <button onClick={() => setMapStyle('satellite')} style={{ fontSize: 10, padding: '4px 8px', background: mapStyle === 'satellite' ? C.accent : C.bg2, color: mapStyle === 'satellite' ? '#000' : C.text, border: `1px solid ${C.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: 'Space Mono' }}>SATELLITE</button>
        <button onClick={() => setMapStyle('heatmap')} style={{ fontSize: 10, padding: '4px 8px', background: mapStyle === 'heatmap' ? C.danger : C.bg2, color: mapStyle === 'heatmap' ? '#FFF' : C.text, border: `1px solid ${C.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: 'Space Mono', boxShadow: mapStyle==='heatmap' ? '0 0 10px red' : 'none' }}>AI HEATMAP</button>
      </div>

      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%', background: C.bg1 }} zoomControl={true}>
        {mapStyle === 'dark' || mapStyle === 'heatmap' ? (
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="&copy; CartoDB" />
        ) : (
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Tiles &copy; Esri" />
        )}

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
        ))}"""

if old_sevamap in content:
    content = content.replace(old_sevamap, new_sevamap)
    with open('C:/Solution Codex/frontend/src/App.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("FAILED TO MATCH")

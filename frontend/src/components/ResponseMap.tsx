import { useEffect, useState } from 'react';
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { Expand, Layers, LocateFixed } from 'lucide-react';
import type { Need, Volunteer } from '../types';
import 'leaflet/dist/leaflet.css';

function Focus({ needs, selected }: { needs: Need[]; selected?: string }) {
  const map = useMap();
  useEffect(() => {
    const location = needs.find(n => n.id === selected)?.extraction.coordinates;
    if (location) {
      if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)map.setView([location.lat,location.lng],13);
      else map.flyTo([location.lat, location.lng], 13, { duration: .7 });
    }
  }, [selected, needs, map]);
  return null;
}
function Fit({ needs, reset }: { needs: Need[]; reset: number }) {
  const map = useMap();
  const pointsKey=needs.flatMap(n=>n.extraction.coordinates?[`${n.extraction.coordinates.lat},${n.extraction.coordinates.lng}`]:[]).join(';');
  useEffect(() => {
    const points = pointsKey?pointsKey.split(';').map(p=>p.split(',').map(Number) as [number,number]):[];
    if (points.length > 1) map.fitBounds(points, { padding: [48, 48], maxZoom: 12 });
    else if (points.length) map.setView(points[0], 12);
  }, [pointsKey, reset, map]);
  return null;
}
export default function ResponseMap({ needs, volunteers, selected, onSelect }: {
  needs: Need[]; volunteers: Volunteer[]; selected?: string; onSelect: (need: Need) => void;
}) {
  const [layer, setLayer] = useState<'needs'|'volunteers'|'density'>('needs');
  const [reset, setReset] = useState(0);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (!expanded) return;
    const close = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpanded(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [expanded]);
  return <div className={`response-map ${expanded ? 'map-expanded' : ''}`}>
    <MapContainer key={String(expanded)} center={[13.015, 80.246]} zoom={12} zoomControl={false} scrollWheelZoom={false}>
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
      <Fit needs={needs} reset={reset} /><Focus needs={needs} selected={selected} />
      {layer !== 'volunteers' && needs.filter(n => n.status !== 'completed').map(need => {
        const point = need.extraction.coordinates;
        if (!point) return null;
        const color = need.extraction.urgency_level >= 8 ? '#dc684b' : need.extraction.urgency_level >= 6 ? '#d7a443' : '#318377';
        return layer === 'density'
          ? <Circle key={need.id} center={[point.lat, point.lng]} radius={need.extraction.urgency_level * 100} pathOptions={{ color, fillColor: color, fillOpacity: .2, weight: 1 }} eventHandlers={{ click: () => onSelect(need) }}><Tooltip>{need.extraction.summary}</Tooltip></Circle>
          : <CircleMarker key={need.id} center={[point.lat, point.lng]} radius={selected === need.id ? 13 : 9} pathOptions={{ color: '#fff', weight: 3, fillColor: color, fillOpacity: 1 }} eventHandlers={{ click: () => onSelect(need) }}><Tooltip direction="top"><strong>{need.extraction.location_label}</strong><br />{need.extraction.summary}</Tooltip></CircleMarker>;
      })}
      {layer === 'volunteers' && volunteers.map(v => <CircleMarker key={v.id} center={[v.coordinates.lat, v.coordinates.lng]} radius={8} pathOptions={{ color: '#fff', weight: 3, fillColor: v.availability === 'available' ? '#247661' : '#98a49d', fillOpacity: 1 }}><Tooltip>{v.name} · {v.availability}</Tooltip></CircleMarker>)}
    </MapContainer>
    <div className="map-controls"><button className="map-icon" aria-label="Fit all reports" onClick={() => setReset(v => v + 1)}><LocateFixed size={17} /></button><button className="map-icon" aria-label={expanded ? 'Close expanded map' : 'Expand map'} onClick={() => setExpanded(v => !v)}><Expand size={17} /></button></div>
    <div className="map-layers" aria-label="Map layers"><Layers size={14} />{(['needs','volunteers','density'] as const).map(value => <button key={value} className={layer === value ? 'active' : ''} onClick={() => setLayer(value)}>{value === 'needs' ? 'Reports' : value === 'density' ? 'Intensity' : 'Volunteers'}</button>)}</div>
    <div className="map-key"><span><i style={{ background: '#dc684b' }} />Critical</span><span><i style={{ background: '#d7a443' }} />Urgent</span><span><i style={{ background: '#318377' }} />Routine</span></div>
  </div>;
}

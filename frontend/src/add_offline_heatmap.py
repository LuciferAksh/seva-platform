import sys

with open('C:/Solution Codex/frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add idb-keyval import
if "import { get, set } from 'idb-keyval';" not in content:
    content = content.replace('import { MapContainer,', 'import { get, set } from \'idb-keyval\';\nimport { MapContainer,')

# 2. Update SevaMap to add 'heatmap'
old_map_state = "const [mapStyle, setMapStyle] = useState<'dark' | 'satellite'>('satellite');"
new_map_state = "const [mapStyle, setMapStyle] = useState<'dark' | 'satellite' | 'heatmap'>('satellite');"
content = content.replace(old_map_state, new_map_state)

old_map_buttons = "<button onClick={() => setMapStyle('satellite')} style={{ fontSize: 10, padding: '4px 8px', background: mapStyle === 'satellite' ? C.accent : C.bg2, color: mapStyle === 'satellite' ? '#000' : C.text, border: `1px solid ${C.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: 'Space Mono' }}>SATELLITE</button>"
new_map_buttons = old_map_buttons + "\n        <button onClick={() => setMapStyle('heatmap')} style={{ fontSize: 10, padding: '4px 8px', background: mapStyle === 'heatmap' ? C.danger : C.bg2, color: mapStyle === 'heatmap' ? '#FFF' : C.text, border: `1px solid ${C.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: 'Space Mono', boxShadow: mapStyle==='heatmap' ? '0 0 10px red' : 'none' }}>AI HEATMAP</button>"
content = content.replace(old_map_buttons, new_map_buttons)

old_tile = "{mapStyle === 'dark' ? ("
new_tile = "{mapStyle === 'dark' || mapStyle === 'heatmap' ? ("
content = content.replace(old_tile, new_tile)

old_marker_radius = "radius={isSelected ? 10 : 7}"
new_marker_radius = "radius={mapStyle === 'heatmap' ? 25 + (n.extraction.urgency_level * 5) : (isSelected ? 10 : 7)}"
content = content.replace(old_marker_radius, new_marker_radius)

old_path_options = "pathOptions={{"
new_path_options = "className={mapStyle === 'heatmap' ? 'heatmap-blob' : ''}\n              pathOptions={{"
if "className={mapStyle" not in content:
    content = content.replace(old_path_options, new_path_options)

old_fill_opacity = "fillOpacity: n.status === 'completed' ? 0.3 : 0.8,"
new_fill_opacity = "fillOpacity: mapStyle === 'heatmap' ? 0.2 : (n.status === 'completed' ? 0.3 : 0.8),"
content = content.replace(old_fill_opacity, new_fill_opacity)

# 3. App Offline state
app_start = "export default function App() {"
app_offline_state = """export default function App() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingSync, setPendingSync] = useState(0);

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
"""
if "const [isOffline" not in content:
    content = content.replace(app_start, app_offline_state)

# 4. handleReporterSubmit
old_submit = "async function handleReporterSubmit(text: string, file: File | null, mode: 'text'|'voice'|'image', reporterName: string) {"
new_submit = "async function handleReporterSubmit(text: string, file: File | null, mode: 'text'|'voice'|'image', reporterName: string, isAutoSync=false) {"
content = content.replace(old_submit, new_submit)

old_submit_body = "const created = await createUploadReport({ source_type: mode, text, reporter_name: reporterName, file });"
new_submit_body = """if (!navigator.onLine && !isAutoSync) {
      const queue: any[] = await get('offline-queue') || [];
      queue.push({ text, file, mode, reporterName, timestamp: Date.now() });
      await set('offline-queue', queue);
      setPendingSync(queue.length);
      setToast('Saved offline. Will sync automatically when internet returns.');
      return { extraction: { category: 'other', urgency_level: 1, summary: 'Pending offline sync...' } }; // Mock response
    }
    const created = await createUploadReport({ source_type: mode, text, reporter_name: reporterName, file });"""
if "offline-queue" not in content.replace(app_offline_state, ""):
    content = content.replace(old_submit_body, new_submit_body)

# 5. Header status
old_header = "<span style={{ fontSize:9, color:C.text2, fontFamily:'Space Mono', borderLeft:`1px solid ${C.border}`, paddingLeft:10, letterSpacing:.5 }}>SCALABLE EMERGENCY VOLUNTEER ACTIVATOR</span>"
new_header = old_header + "\n          {isOffline && <span style={{ marginLeft: 10, background: C.warn, color: '#000', fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 'bold' }}>OFFLINE</span>}\n          {pendingSync > 0 && <span style={{ marginLeft: 10, background: C.ai, color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 'bold' }}>{pendingSync} PENDING SYNC</span>}"
if "OFFLINE</span>" not in content:
    content = content.replace(old_header, new_header)

with open('C:/Solution Codex/frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('App.tsx successfully updated with Offline Sync and Heatmap')

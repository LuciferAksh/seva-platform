import { useState } from 'react';
import { Check } from 'lucide-react';
import { createVolunteer } from '../api';
import Modal from './Modal';
export default function ProfileModal({ email,onClose,onSave }: { email:string; onClose:()=>void; onSave:()=>Promise<void> }) {
  const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  return <Modal title="How can you lend a hand?" onClose={onClose}><form className="form-stack" onSubmit={async e=>{
    e.preventDefault();setBusy(true);setError('');const values=new FormData(e.currentTarget);
    try { await createVolunteer({email,name:String(values.get('name')),locality:String(values.get('locality')),skills:String(values.get('skills')).split(',').map(s=>s.trim()).filter(Boolean),languages:String(values.get('languages')).split(',').map(s=>s.trim()).filter(Boolean),lat:Number(values.get('lat')),lng:Number(values.get('lng'))});await onSave(); }
    catch(e){setError(e instanceof Error?e.message:'Could not save profile.');}finally{setBusy(false);}
  }}><label className="field">Name<input name="name" required maxLength={100}/></label><label className="field">Locality<input name="locality" required maxLength={120}/></label><label className="field">Skills (separate with commas)<input name="skills" required placeholder="first-aid, logistics, distribution"/></label><label className="field">Languages<input name="languages" required placeholder="English, Tamil"/></label><div className="form-grid"><label className="field">Latitude<input name="lat" type="number" step="any" min="-90" max="90" required/></label><label className="field">Longitude<input name="lng" type="number" step="any" min="-180" max="180" required/></label></div>{error&&<p className="error-message" role="alert">{error}</p>}<button className="button primary full" disabled={busy}>{busy?'Saving…':'Join the response network'}<Check size={16}/></button></form></Modal>;
}

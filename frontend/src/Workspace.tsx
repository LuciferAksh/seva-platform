import { useCallback, useEffect, useRef, useState } from 'react';
import { get, set } from 'idb-keyval';
import { Activity, ArrowRight, ArrowUpRight, Bell, CheckCircle2, ChevronDown, ChevronRight, CircleHelp, ClipboardList, Compass, Globe2, Heart, LayoutDashboard, LogIn, LogOut, Menu, Plus, Radio, RefreshCw, Search, Settings2, ShieldCheck, Sprout, WifiOff, X } from 'lucide-react';
import { connected, fetchIdentity, signOut, supabase } from './auth';
import { createUploadReport, fetchDashboard, resetDemo } from './api';
import type { ReportInput, Role, Session, Snapshot } from './types';
import Modal from './components/Modal';
import ReportModal from './components/ReportModal';
import IncidentDetail from './components/IncidentDetail';
import AuthModal from './components/AuthModal';
import ProfileModal from './components/ProfileModal';
import WorkspaceViews from './components/WorkspaceViews';

export type View = 'overview'|'reports'|'volunteers'|'missions'|'impact';
const navigation = [
  { key:'overview' as const, label:'Overview', Icon:LayoutDashboard },
  { key:'reports' as const, label:'Field reports', Icon:ClipboardList },
  { key:'volunteers' as const, label:'Volunteers', Icon:Globe2 },
  { key:'missions' as const, label:'Missions', Icon:Compass },
  { key:'impact' as const, label:'Impact & insights', Icon:Activity },
];
const titles: Record<View,[string,string]> = {
  overview:['Good people. Coordinated action.','A clearer picture of where help is needed, and who can get it there.'],
  reports:['Every response starts with a signal.','Review field reports, understand the need and take the next step.'],
  volunteers:['The people who make it possible.','Bring the right skills and the right helping hands together.'],
  missions:['From a signal to support.','Follow every mission from assignment to reviewed completion.'],
  impact:['Small actions. Meaningful impact.','See what your response has achieved, with evidence behind every completion.'],
};
const demoSession = (role:Role):Session => ({ uid:role==='admin'?'demo-admin':'demo-volunteer', email:role==='admin'?'coordinator@example.org':'asha@example.org', role, mode:'demo' });
interface QueuedReport { report:ReportInput; uid:string }

export default function Workspace() {
  const [view,setView]=useState<View>('overview');
  const coordinatorPath=location.pathname.startsWith('/admin');
  const [session,setSession]=useState<Session|null>(()=>connected?null:demoSession(coordinatorPath?'admin':'volunteer'));
  const [data,setData]=useState<Snapshot|null>(null);
  const [loading,setLoading]=useState(true); const [error,setError]=useState(''); const [toast,setToast]=useState('');
  const [search,setSearch]=useState(''); const [reportOpen,setReportOpen]=useState(false); const [authOpen,setAuthOpen]=useState(false);
  const [selected,setSelected]=useState<string>(); const [settingsOpen,setSettingsOpen]=useState(false); const [helpOpen,setHelpOpen]=useState(false);
  const [notifications,setNotifications]=useState(false); const [mobileNav,setMobileNav]=useState(false); const [pending,setPending]=useState(0);
  const [synced,setSynced]=useState<Date|null>(null); const [profileOpen,setProfileOpen]=useState(false); const [online,setOnline]=useState(navigator.onLine);
  const searchRef=useRef<HTMLInputElement>(null); const refreshing=useRef(false);
  const currentSession=useRef(session);currentSession.current=session;
  const refresh=useCallback(async()=>{
    if(!session||refreshing.current)return;
    refreshing.current=true;
    try { const next=await fetchDashboard(session.role);if(currentSession.current?.uid!==session.uid||currentSession.current?.role!==session.role)return;setData(next); setError(''); setSynced(new Date()); }
    catch(e) { setError(e instanceof Error?e.message:'Could not load the workspace.'); }
    finally { setLoading(false); refreshing.current=false; }
  },[session]);
  const identity=useCallback(async()=>{
    const next=await fetchIdentity();
    if(next&&location.pathname.startsWith('/admin')&&next.role!=='admin'){
      setError('This account is a volunteer. Open the volunteer portal to view your missions.');setSession(null);setData(null);setLoading(false);return;
    }
    if(currentSession.current?.uid!==next?.uid){setData(null);setSelected(undefined);}
    setSession(next);
    if(!next){setData(null);setLoading(false);}
  },[]);
  useEffect(()=>{
    if(!connected)return;
    void identity().catch(e=>{setError(e.message);setLoading(false);});
    const listener=supabase?.auth.onAuthStateChange(()=>{window.setTimeout(()=>void identity().catch(e=>setError(e.message)),0);});
    return()=>listener?.data.subscription.unsubscribe();
  },[identity]);
  useEffect(()=>{if(session){setLoading(true);void refresh();}},[refresh,session]);
  useEffect(()=>{
    if(!connected||!session)return;
    const timer=window.setInterval(()=>{if(document.visibilityState==='visible'&&navigator.onLine)void refresh();},60000);
    return()=>clearInterval(timer);
  },[refresh,session]);
  useEffect(()=>{if(!toast)return;const timer=window.setTimeout(()=>setToast(''),5500);return()=>clearTimeout(timer);},[toast]);
  useEffect(()=>{
    const on=()=>setOnline(true),off=()=>setOnline(false);
    window.addEventListener('online',on);window.addEventListener('offline',off);
    return()=>{window.removeEventListener('online',on);window.removeEventListener('offline',off);};
  },[]);
  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{
      if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes((e.target as HTMLElement).tagName)&&!document.querySelector('dialog[open]')){e.preventDefault();searchRef.current?.focus();}
      if(e.key==='Escape'){setNotifications(false);setMobileNav(false);}
    };
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[]);
  useEffect(()=>{
    if(!connected||!session)return;
    let cancelled=false;
    const sync=async()=>{
      const queue=await get<QueuedReport[]>('seva.queue.v2')||[];
      if(cancelled)return;
      setPending(queue.filter(q=>q.uid===session.uid).length);
      if(!online)return;
      for(const item of queue.filter(q=>q.uid===session.uid)){
        if(cancelled)return;
        try {
          await createUploadReport(item.report,session.uid);
          const latest=await get<QueuedReport[]>('seva.queue.v2')||[];
          await set('seva.queue.v2',latest.filter(q=>!(q.uid===item.uid&&q.report.submission_id===item.report.submission_id)));
        } catch { return; }
      }
      const remaining=await get<QueuedReport[]>('seva.queue.v2')||[];
      if(!cancelled){setPending(remaining.filter(q=>q.uid===session.uid).length);if(queue.length)await refresh();}
    };
    void sync();return()=>{cancelled=true;};
  },[online,session,refresh]);
  async function changed(message:string){await refresh();setToast(message);}
  async function submitReport(report:ReportInput){
    if(!session)throw new Error('Sign in before submitting.');
    if(connected&&!online){
      const queue=await get<QueuedReport[]>('seva.queue.v2')||[];
      if(!queue.some(q=>q.uid===session.uid&&q.report.submission_id===report.submission_id))queue.push({report,uid:session.uid});
      await set('seva.queue.v2',queue);setPending(queue.filter(q=>q.uid===session.uid).length);
      setToast('Saved on this device. Reopen the app after reconnecting to sync.');return;
    }
    const need=await createUploadReport(report,session.uid);
    await changed('Report received. Your coordination team can take it from here.');setSelected(need.id);
  }
  function go(next:View){setView(next);setMobileNav(false);setSearch('');}
  const admin=session?.role==='admin';
  const selectedNeed=data?.needs.find(n=>n.id===selected);
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    {mobileNav&&<button className="nav-scrim" aria-label="Close navigation" onClick={()=>setMobileNav(false)}/>}
    <aside className={`sidebar ${mobileNav?'open':''}`}>
      <a className="brand" href="/" aria-label="Seva home"><span className="brand-symbol"><Sprout size={25}/></span><span>seva<span className="brand-dot">.</span></span><small>HUMANITY, COORDINATED</small></a>
      <div className="workspace-label">YOUR WORKSPACE</div>
      <nav aria-label="Main navigation">{navigation.filter(n=>admin||!['volunteers','impact'].includes(n.key)).map(({key,label,Icon})=><button key={key} className={`nav-item ${view===key?'active':''}`} aria-current={view===key?'page':undefined} onClick={()=>go(key)}><Icon size={19}/><span>{label}</span>{key==='reports'&&data&&<b>{data.needs.filter(n=>n.status==='new').length}</b>}{key==='missions'&&Boolean(data?.summary.pending_reviews)&&<i className="nav-dot"/>}</button>)}</nav>
      <div className="sidebar-note"><div className="note-art"><Heart size={23}/><span/><span/></div><strong>Someone is counting on us.</strong><p>Every report is a chance to turn compassion into action.</p><button onClick={()=>setReportOpen(true)} disabled={!session}>Make a field report<ArrowUpRight size={15}/></button></div>
      <div className="sidebar-bottom"><button className="nav-item" onClick={()=>setHelpOpen(true)}><CircleHelp size={18}/><span>How Seva works</span></button><button className="nav-item" onClick={()=>setSettingsOpen(true)}><Settings2 size={18}/><span>Workspace settings</span></button><div className="sidebar-footer"><span className="avatar forest">{admin?'SC':'AV'}</span><div><strong>{session?admin?'Seva coordinator':'Volunteer workspace':'Welcome to Seva'}</strong><small>{connected?'Community response team':'Chennai demo workspace'}</small></div><button className="icon-button" aria-label={connected?'Sign out':'Workspace options'} onClick={()=>{if(connected)void signOut().catch(e=>setError(e.message));else setSettingsOpen(true);}}>{connected?<LogOut size={16}/>:<ChevronDown size={16}/>}</button></div></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={()=>setMobileNav(true)}><Menu size={21}/></button><span>Workspace</span><ChevronRight size={14}/><strong>{navigation.find(n=>n.key===view)?.label}</strong></div><div className="topbar-actions"><label className="global-search"><Search size={16}/><input ref={searchRef} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search your workspace" aria-label="Search workspace"/><kbd>/</kbd></label><div className="notification-wrapper"><button className="icon-button notification-button" aria-label="Notifications" aria-expanded={notifications} onClick={()=>setNotifications(v=>!v)}><Bell size={19}/>{Boolean(data?.summary.pending_reviews)&&<i/>}</button>{notifications&&<div className="notification-popover"><h3>Workspace updates</h3>{data?.summary.pending_reviews?<button onClick={()=>{go('missions');setNotifications(false);}}><ShieldCheck size={18}/><span>{data.summary.pending_reviews} completion{data.summary.pending_reviews===1?'':'s'} waiting for review</span><ArrowRight size={15}/></button>:<p>You’re all caught up. New completion reviews will appear here.</p>}</div>}</div><span className="topbar-divider"/><span className="avatar top-avatar">{admin?'SC':'AV'}</span></div></header>
      <main id="main-content">
        <div className={`mode-banner ${!online?'offline':''}`}><span>{!online?<WifiOff size={14}/>:connected?<ShieldCheck size={14}/>:<Radio size={14}/>}<strong>{!online?'You’re offline':connected?'Connected workspace':'Interactive demo'}</strong><span>{!online?`${pending} report(s) waiting to sync. Reopen the app after reconnecting.`:connected?'A shared workspace for your response team.':'Synthetic Chennai scenario. Changes are saved only in this browser.'}</span></span><a className="text-button" href="/">Open public reporting site<ArrowRight size={13}/></a></div>
        <div className="page-heading"><div><div className="page-eyebrow"><i/>COMMUNITY RESPONSE, TOGETHER</div><h1>{titles[view][0]}</h1><p>{titles[view][1]}</p></div><button className="button primary" disabled={!session} onClick={()=>setReportOpen(true)}><Plus size={17}/>Create report</button></div>
        {error&&<div className="error-banner" role="alert"><span>{error}</span><button onClick={()=>void refresh()}><RefreshCw size={14}/>Retry</button></div>}
        {!session?<section className="welcome-card"><span className="welcome-icon"><Sprout size={42}/></span><span className="eyebrow">A LITTLE HELP GOES A LONG WAY</span><h2>The right help.<br/>Where it matters.</h2><p>Connect field reports with local volunteers, coordinate a response and bring every mission to a reviewed completion.</p><button className="button primary" onClick={()=>setAuthOpen(true)}><LogIn size={16}/>Sign in to your workspace<ArrowRight size={16}/></button><span className="hint">Private reports. Verified accounts. Human decisions.</span></section>:loading&&!data?<div className="workspace-loading"><div className="loading-orbit"><Sprout size={30}/></div><h3>Bringing your workspace together…</h3><p>Free servers may need a moment to wake up.</p></div>:data&&<WorkspaceViews view={view} data={data} session={session} search={search} setSearch={setSearch} onSelect={setSelected} go={go} synced={synced} online={online} refresh={refresh} notify={setToast}/>}
        {session?.role==='volunteer'&&data&&!data.volunteers.length&&<div className="profile-prompt"><Globe2 size={20}/><div><strong>Tell your coordinator how you can help.</strong><p>Complete your volunteer profile to receive assignments.</p></div><button className="button primary" onClick={()=>setProfileOpen(true)}>Complete profile<ArrowRight size={15}/></button></div>}
        <footer className="page-footer"><span><Sprout size={14}/>Built for people. Powered by community.</span><span>SEVA · {new Date().getFullYear()}<span>Kindness, with a plan.</span></span></footer>
      </main>
    </div>
    {toast&&<div className="toast" role="status"><CheckCircle2 size={19}/><span>{toast}</span><button className="icon-button" aria-label="Dismiss notification" onClick={()=>setToast('')}><X size={15}/></button></div>}
    {reportOpen&&<ReportModal demo={!connected} onClose={()=>setReportOpen(false)} onSubmit={submitReport}/>}
    {selectedNeed&&session&&<IncidentDetail key={selectedNeed.id} need={selectedNeed} assignment={data?.assignments.find(a=>a.need_id===selectedNeed.id)} completion={data?.completions.find(c=>c.need_id===selectedNeed.id)} session={session} onClose={()=>setSelected(undefined)} onChange={changed}/>}
    {authOpen&&<AuthModal onClose={()=>setAuthOpen(false)} onSuccess={identity}/>}
    {helpOpen&&<Modal title="A helping hand, with a plan." onClose={()=>setHelpOpen(false)}><div className="help-steps">{[{Icon:Radio,title:'01. Listen to the field',text:'Submit text, a voice note or a photo. Add a confirmed location so support reaches the right place.'},{Icon:Globe2,title:'02. Bring the right people together',text:'Coordinators review urgency and match available volunteers by skills, distance and reliability.'},{Icon:ShieldCheck,title:'03. Close the loop',text:'Volunteers submit delivery evidence. A coordinator reviews the photo before marking the mission complete.'}].map(({Icon,title,text})=><div key={title}><span className="mini-icon"><Icon size={21}/></span><div><h3>{title}</h3><p>{text}</p></div></div>)}</div><p className="hint">For an immediate threat to life, contact local emergency services directly.</p></Modal>}
    {settingsOpen&&<Modal title="Your workspace, at a glance." onClose={()=>setSettingsOpen(false)}><div className="settings-list"><div><span>Workspace mode</span><strong>{connected?'Connected services':'Browser demo · synthetic data'}</strong></div><div><span>Data storage</span><strong>{connected?'Supabase':'This browser only'}</strong></div><div><span>AI processing</span><strong>{data?.ai_enabled?'Groq configured':'Not active in this workspace'}</strong></div><div><span>Updates</span><strong>{connected?'Every minute while this tab is visible':'On changes and manual refresh'}</strong></div><div><span>Signed in as</span><strong>{session?.email||'Not signed in'}</strong></div></div>{!connected&&<><p className="hint">Reset clears synthetic scenario changes in this browser. Connected workspaces are unaffected.</p><button className="button secondary full" onClick={()=>{resetDemo();setSelected(undefined);setSettingsOpen(false);void changed('Demo restored to the starting scenario.');}}><RefreshCw size={16}/>Reset demo scenario</button></>}</Modal>}
    {profileOpen&&session&&<ProfileModal email={session.email} onClose={()=>setProfileOpen(false)} onSave={async()=>{setProfileOpen(false);await changed('Profile saved. Your coordinator can now assign missions.');}}/>}
  </div>;
}

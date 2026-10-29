import { useEffect, useRef } from 'react';
declare global {
  interface Window { turnstile?: {
    render:(element:HTMLElement,options:Record<string,unknown>)=>string;
    remove:(id:string)=>void;
  } }
}
let scriptPromise:Promise<void>|undefined;
function loadWidget(){
  if(window.turnstile)return Promise.resolve();
  if(!scriptPromise)scriptPromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;
    script.onload=()=>resolve();script.onerror=()=>{scriptPromise=undefined;reject(new Error('Bot protection could not load.'));};document.head.appendChild(script);
  });
  return scriptPromise;
}
export default function Turnstile({onToken,onError,resetKey}:{onToken:(token:string)=>void;onError:(message:string)=>void;resetKey:number}){
  const ref=useRef<HTMLDivElement>(null);const callbacks=useRef({onToken,onError});callbacks.current={onToken,onError};
  useEffect(()=>{
    let active=true;let id:string|undefined;
    const sitekey=import.meta.env.VITE_TURNSTILE_SITE_KEY;
    if(!sitekey){callbacks.current.onError('Public reporting is not connected yet. Please contact your local response team directly.');return;}
    void loadWidget().then(()=>{
      if(active&&ref.current)id=window.turnstile!.render(ref.current,{sitekey,theme:'light',action:'public_report',callback:(token:string)=>callbacks.current.onToken(token),'expired-callback':()=>callbacks.current.onToken(''),'error-callback':()=>callbacks.current.onError('Please retry the security check.')});
    }).catch(e=>{if(active)callbacks.current.onError(e.message);});
    return()=>{active=false;if(id)window.turnstile?.remove(id);};
  },[resetKey]);
  return <div ref={ref} className="turnstile-container"/>;
}

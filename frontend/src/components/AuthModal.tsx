import { useState, type FormEvent } from 'react';
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react';
import { signIn, signUp, supabase } from '../auth';
import Modal from './Modal';

export default function AuthModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => Promise<void> }) {
  const [mode, setMode] = useState<'login'|'signup'|'reset'>('login');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [name, setName] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      if (mode === 'login') { await signIn(email, password); await onSuccess(); onClose(); }
      else if (mode === 'signup') { await signUp(email, password, name); setMessage('Check your inbox to verify your email. Then return here to sign in.'); }
      else { if (!supabase) throw new Error('Supabase is not configured.'); const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/verify-email?recovery=1` }); if (error) throw error; setMessage('If an account exists, a reset link is on its way.'); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not sign in.'); } finally { setBusy(false); }
  }
  return <Modal title={mode === 'login' ? 'Welcome back.' : mode === 'signup' ? 'Be someone’s helping hand.' : 'Reset your password.'} onClose={onClose}>
    <p className="modal-intro">{mode === 'login' ? 'Sign in to your Seva workspace. Your role is verified securely by the server.' : mode === 'signup' ? 'Create your volunteer account. We’ll verify your email before you join the response.' : 'We’ll send a secure link to your email address.'}</p>
    <form className="form-stack" onSubmit={submit}>
      {mode === 'signup' && <label className="field">Full name<input autoComplete="name" value={name} onChange={e => setName(e.target.value)} required /></label>}
      <label className="field"><span><Mail size={14} />Email address</span><input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@organization.org" /></label>
      {mode !== 'reset' && <label className="field"><span><LockKeyhole size={14} />Password</span><input type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={mode === 'signup' ? 10 : 1} required value={password} onChange={e => setPassword(e.target.value)} /></label>}
      {error && <p className="error-message" role="alert">{error}</p>}{message && <p className="success-message" role="status">{message}</p>}
      <button className="button primary full" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in to workspace' : mode === 'signup' ? 'Create account' : 'Send reset link'}<ArrowRight size={16} /></button>
      <div className="auth-actions"><button type="button" className="text-button" onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(''); setMessage(''); }}>{mode === 'signup' ? 'Already a volunteer? Sign in' : 'New here? Join as a volunteer'}</button><button type="button" className="text-button muted" onClick={() => { setMode(mode === 'reset' ? 'login' : 'reset'); setError(''); setMessage(''); }}>{mode === 'reset' ? 'Back to sign in' : 'Forgot password?'}</button></div>
    </form>
  </Modal>;
}

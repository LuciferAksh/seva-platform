import { createClient } from '@supabase/supabase-js';
import type { Session } from './types';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const connected = import.meta.env.VITE_APP_MODE === 'connected';
export const supabase = connected && url && key ? createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
}) : null;
export const API_BASE = connected ? (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '') : '';

export async function accessToken(): Promise<string | null> {
  const result = await supabase?.auth.getSession();
  return result?.data.session?.access_token || null;
}

export async function fetchIdentity(): Promise<Session | null> {
  const token = await accessToken();
  if (!token) return null;
  const response = await fetch(`${API_BASE}/api/me`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error('Your session could not be verified. Try signing in again.');
  return response.json();
}

export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error('Supabase configuration is missing.');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUp(email: string, password: string, name: string) {
  if (!supabase) throw new Error('Supabase configuration is missing.');
  const { error } = await supabase.auth.signUp({ email, password,
    options: { data: { display_name: name }, emailRedirectTo: `${window.location.origin}/verify-email` },
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase!.auth.signOut();
  if (error) throw error;
}

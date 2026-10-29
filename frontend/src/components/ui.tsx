import { BookOpen, Droplets, HandHeart, HeartPulse, Home, Utensils } from 'lucide-react';
import type { NeedCategory, Need } from '../types';
export const categoryLabels: Record<NeedCategory, string> = { food: 'Food & nutrition', medical: 'Medical support', shelter: 'Shelter', water: 'Clean water', education: 'Education', other: 'Community support' };
export const categoryShort: Record<NeedCategory, string> = { food: 'Food', medical: 'Medical', shelter: 'Shelter', water: 'Water', education: 'Education', other: 'Other' };
export function CategoryIcon({ category, size = 18 }: { category: NeedCategory; size?: number }) {
  const Icon = { food: Utensils, medical: HeartPulse, shelter: Home, water: Droplets, education: BookOpen, other: HandHeart }[category];
  return <span className={`category-icon ${category}`}><Icon size={size} strokeWidth={1.8} /></span>;
}
export function Urgency({ level }: { level: number }) { return <span className={`badge ${level >= 8 ? 'critical' : level >= 6 ? 'urgent' : 'routine'}`}><i />{level >= 8 ? 'Critical' : level >= 6 ? 'Urgent' : 'Routine'}</span>; }
export function Status({ status }: { status: Need['status'] }) { return <span className={`status ${status}`}><i />{{ new: 'Awaiting response', assigned: 'In progress', pending_review: 'Needs review', completed: 'Completed' }[status]}</span>; }
export function timeAgo(value: string) { const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000)); return minutes < 1 ? 'Just now' : minutes < 60 ? `${minutes}m ago` : minutes < 1440 ? `${Math.floor(minutes / 60)}h ago` : `${Math.floor(minutes / 1440)}d ago`; }
export function initials(value: string) { return value.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase(); }

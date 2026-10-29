export type NeedCategory = 'food' | 'medical' | 'shelter' | 'education' | 'water' | 'other';
export type Role = 'admin' | 'volunteer';
export interface Coordinates { lat: number; lng: number }
export interface NearbyFacility { name: string; lat: number; lng: number; address?: string; distance_meters?: number }
export interface Need {
 id: string; source_type: 'text'|'voice'|'image'; original_text: string; reporter_name: string;
 extraction: { category: NeedCategory; urgency_level: number; people_affected: number; location_label: string;
 required_skills: string[]; summary: string; coordinates: Coordinates|null; suggested_supplies?: string[];
 facility_type_needed?: string|null; nearby_facilities?: NearbyFacility[] };
 priority_score: number; status: 'new'|'assigned'|'pending_review'|'completed'; created_at: string;
 media_uri?: string|null; source_summary?: string|null; processing_mode?: 'demo'|'rules'|'groq'|'google';
 submitted_by?: string|null; submission_id?: string|null;
}
export interface Match { volunteer_id: string; volunteer_name: string; score: number; explanation: string }
export interface Volunteer { id: string; name: string; email?: string|null; phone?: string|null; locality: string;
 coordinates: Coordinates; skills: string[]; languages: string[]; availability: 'available'|'busy'|'offline'; reliability_score: number }
export interface VolunteerSignupInput { name: string; email: string; phone?: string; locality: string; skills: string[]; languages: string[]; lat?: number; lng?: number }
export interface Assignment { id: string; need_id: string; volunteer_id: string; volunteer_name: string;
 match_score: number; match_reason: string; status: 'assigned'|'completed'; created_at: string }
export interface Completion { id: string; need_id: string; volunteer_id: string; notes: string; media_uri: string;
 verified_people: number|null; verification_reasoning: string|null; review_status: 'pending'|'approved'|'rejected'; created_at: string }
export interface Summary { active_needs: number; assigned_needs: number; completed_needs: number; active_volunteers: number;
 families_impacted: number; people_helped: number; pending_reviews: number }
export interface Snapshot { needs: Need[]; volunteers: Volunteer[]; assignments: Assignment[]; completions: Completion[];
 summary: Summary; mode: 'demo'|'connected'; ai_enabled: boolean; total_needs: number }
export interface Session { uid: string; email: string; role: Role; mode: 'demo'|'supabase' }
export interface ReportInput { source_type: 'text'|'voice'|'image'; text: string; reporter_name: string; submission_id: string; lat?: number; lng?: number; file?: File|null; turnstile_token?: string }

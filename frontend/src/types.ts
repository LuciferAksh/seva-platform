export type NeedCategory = "food" | "medical" | "shelter" | "education" | "water" | "other";

export interface NearbyFacility {
  name: string;
  lat: number;
  lng: number;
  distance_meters?: number;
  address?: string;
}

export interface Need {
  id: string;
  source_type: "text" | "voice" | "image";
  original_text: string;
  reporter_name: string;
  extraction: {
    category: NeedCategory;
    urgency_level: number;
    people_affected: number;
    location_label: string;
    required_skills: string[];
    summary: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    suggested_supplies?: string[];
    facility_type_needed?: string | null;
    nearby_facilities?: NearbyFacility[];
  };
  priority_score: number;
  status: "new" | "assigned" | "completed";
  media_uri?: string | null;
  source_summary?: string | null;
  processing_mode?: "demo" | "google";
}

export interface Match {
  volunteer_id: string;
  volunteer_name: string;
  score: number;
  explanation: string;
}

export interface Volunteer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  locality: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  skills: string[];
  languages: string[];
  availability: "available" | "busy" | "offline";
  reliability_score: number;
}

export interface VolunteerSignupInput {
  name: string;
  email: string;
  phone?: string;
  locality: string;
  skills: string[];
  languages: string[];
  lat?: number;
  lng?: number;
}

export interface Assignment {
  id: string;
  need_id: string;
  volunteer_id: string;
  volunteer_name: string;
  match_score: number;
  match_reason: string;
  status: "assigned" | "completed";
  created_at: string;
}

export interface Summary {
  active_needs: number;
  assigned_needs: number;
  completed_needs: number;
  active_volunteers: number;
  families_impacted: number;
}

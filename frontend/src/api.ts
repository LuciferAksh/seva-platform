import type { Assignment, Match, Need, Summary, Volunteer, VolunteerSignupInput } from "./types";
import { getFirebaseIdToken } from "./firebase";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

async function buildHeaders(extra?: HeadersInit): Promise<HeadersInit> {
  const token = await getFirebaseIdToken();
  return {
    ...(extra ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchNeeds(): Promise<Need[]> {
  const response = await fetch(`${API_BASE}/api/needs`, {
    headers: await buildHeaders(),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch needs");
  }
  return response.json();
}

export async function fetchSummary(): Promise<Summary> {
  const response = await fetch(`${API_BASE}/api/summary`, {
    headers: await buildHeaders(),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch summary");
  }
  return response.json();
}

export async function fetchVolunteers(): Promise<Volunteer[]> {
  const response = await fetch(`${API_BASE}/api/volunteers`, {
    headers: await buildHeaders(),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch volunteers");
  }
  return response.json();
}

export async function createVolunteer(payload: VolunteerSignupInput): Promise<Volunteer> {
  const response = await fetch(`${API_BASE}/api/volunteers`, {
    method: "POST",
    headers: await buildHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("Failed to create volunteer");
  }
  return response.json();
}

export async function fetchAssignments(volunteerId?: string): Promise<Assignment[]> {
  const suffix = volunteerId ? `?volunteer_id=${encodeURIComponent(volunteerId)}` : "";
  const response = await fetch(`${API_BASE}/api/assignments${suffix}`, {
    headers: await buildHeaders(),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch assignments");
  }
  return response.json();
}

export async function createUploadReport(payload: {
  source_type: "text" | "voice" | "image";
  text: string;
  reporter_name: string;
  file?: File | null;
  lat?: number;
  lng?: number;
}): Promise<Need> {
  const formData = new FormData();
  formData.append("source_type", payload.source_type);
  formData.append("text", payload.text);
  formData.append("reporter_name", payload.reporter_name);
  if (typeof payload.lat === "number") {
    formData.append("lat", String(payload.lat));
  }
  if (typeof payload.lng === "number") {
    formData.append("lng", String(payload.lng));
  }
  if (payload.file) {
    formData.append("file", payload.file);
  }

  const response = await fetch(`${API_BASE}/api/reports/upload`, {
    method: "POST",
    headers: await buildHeaders(),
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to upload report");
  }

  const data = await response.json();
  return data.report;
}

export async function fetchMatches(needId: string): Promise<Match[]> {
  const response = await fetch(`${API_BASE}/api/needs/${needId}/matches`, {
    headers: await buildHeaders(),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch matches");
  }
  return response.json();
}

export async function createAssignment(payload: {
  need_id: string;
  volunteer_id: string;
  match_score: number;
  match_reason: string;
}): Promise<Assignment> {
  const response = await fetch(`${API_BASE}/api/assignments`, {
    method: "POST",
    headers: await buildHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to create assignment");
  }

  return response.json();
}

export async function createCompletion(payload: {
  need_id: string;
  volunteer_id: string;
  notes: string;
  file?: File | null;
}): Promise<any> {
  const formData = new FormData();
  formData.append("need_id", payload.need_id);
  formData.append("volunteer_id", payload.volunteer_id);
  formData.append("notes", payload.notes);
  if (payload.file) {
    formData.append("file", payload.file);
  }

  const response = await fetch(`${API_BASE}/api/completions`, {
    method: "POST",
    headers: await buildHeaders(),
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to mark task complete");
  }
  return response.json();
}

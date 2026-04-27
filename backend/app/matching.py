from __future__ import annotations

import json
import logging
from math import asin, cos, radians, sin, sqrt

from .models import MatchRecommendation, NeedReport, Volunteer
from .config import get_settings

logger = logging.getLogger("matching")


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    radius_km = 6371.0

    d_lat = radians(lat2 - lat1)
    d_lng = radians(lng2 - lng1)
    lat1 = radians(lat1)
    lat2 = radians(lat2)

    a = sin(d_lat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(d_lng / 2) ** 2
    c = 2 * asin(sqrt(a))
    return radius_km * c


def score_volunteer(need: NeedReport, volunteer: Volunteer) -> MatchRecommendation:
    required = set(skill.lower() for skill in need.extraction.required_skills)
    available_skills = set(skill.lower() for skill in volunteer.skills)
    skill_overlap = len(required & available_skills)
    skill_score = min(1.0, skill_overlap / max(1, len(required)))

    distance_km = haversine_km(
        need.extraction.coordinates.lat,
        need.extraction.coordinates.lng,
        volunteer.coordinates.lat,
        volunteer.coordinates.lng,
    )
    proximity_score = max(0.0, 1 - (distance_km / 25))
    availability_score = 1.0 if volunteer.availability == "available" else 0.25
    language_score = 1.0 if {"hindi", "english"} & set(lang.lower() for lang in volunteer.languages) else 0.5

    score = (
        0.35 * skill_score
        + 0.25 * proximity_score
        + 0.15 * availability_score
        + 0.15 * volunteer.reliability_score
        + 0.10 * language_score
    )

    explanation = (
        f"Skill fit {skill_score:.0%}, about {distance_km:.1f} km away, "
        f"{volunteer.availability}, reliability {volunteer.reliability_score:.0%}."
    )

    return MatchRecommendation(
        volunteer_id=volunteer.id,
        volunteer_name=volunteer.name,
        score=round(score, 3),
        explanation=explanation,
    )

def rank_volunteers(need: NeedReport, volunteers: list[Volunteer]) -> list[MatchRecommendation]:
    settings = get_settings()
    
    if not volunteers:
        return []
    
    if not settings.google_cloud_project:
        matches = [score_volunteer(need, v) for v in volunteers]
        return sorted(matches, key=lambda x: x.score, reverse=True)
        
    try:
        import os
        from google import genai
        os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "True"
        if settings.google_cloud_project:
            os.environ["GOOGLE_CLOUD_PROJECT"] = settings.google_cloud_project
        os.environ["GOOGLE_CLOUD_LOCATION"] = settings.google_cloud_location
        client = genai.Client(vertexai=True, project=settings.google_cloud_project, location=settings.google_cloud_location)
    except Exception as e:
        logger.error(f"Failed to initialize GenAI client: {e}")
        matches = [score_volunteer(need, v) for v in volunteers]
        return sorted(matches, key=lambda x: x.score, reverse=True)
        
    vol_data = []
    for v in volunteers:
        dist = haversine_km(need.extraction.coordinates.lat, need.extraction.coordinates.lng, v.coordinates.lat, v.coordinates.lng)
        vol_data.append({
            "volunteer_id": v.id,
            "name": v.name,
            "skills": v.skills,
            "availability": v.availability,
            "distance_km": round(dist, 1),
            "reliability_score": v.reliability_score
        })
        
    vol_data.sort(key=lambda x: x["distance_km"])
    top_candidates = vol_data[:10]
    
    schema = {
        "type": "ARRAY",
        "items": {
            "type": "OBJECT",
            "properties": {
                "volunteer_id": {"type": "STRING"},
                "score": {"type": "NUMBER", "description": "Float between 0.0 and 1.0 representing the match score."},
                "explanation": {"type": "STRING", "description": "One short sentence explaining why they are a good or bad fit based on their exact skills and distance."}
            },
            "required": ["volunteer_id", "score", "explanation"]
        }
    }
    
    prompt = (
        f"You are an expert emergency dispatcher.\n"
        f"Incident: {need.extraction.summary}\n"
        f"Required Skills: {', '.join(need.extraction.required_skills)}\n\n"
        f"Top Candidates:\n{json.dumps(top_candidates, indent=2)}\n\n"
        "Evaluate each candidate based on how closely their skills match the required skills, and their distance to the incident. "
        "A volunteer does not need an exact keyword match; if their skills are highly relevant (e.g., 'nurse' for a 'first aid' need), score them highly. "
        "Distance is also a factor (closer is better). "
        "Return a JSON list assigning each volunteer a 'score' (0.0 to 1.0) and an 'explanation' (e.g., 'Perfect skill fit (nurse) and only 2.1km away.')."
    )
    
    try:
        response = client.models.generate_content(
            model=settings.vertex_fast_model,
            contents=prompt,
            config={
                "temperature": 0,
                "response_mime_type": "application/json",
                "response_schema": schema,
            }
        )
        parsed = json.loads(response.text)
        
        results = []
        for item in parsed:
            vol = next((v for v in volunteers if v.id == item["volunteer_id"]), None)
            if vol:
                results.append(MatchRecommendation(
                    volunteer_id=vol.id,
                    volunteer_name=vol.name,
                    score=item["score"],
                    explanation=item["explanation"]
                ))
        
        # Add fallback for volunteers not ranked by AI
        for v in volunteers:
            if not any(r.volunteer_id == v.id for r in results):
                results.append(score_volunteer(need, v))
                
        return sorted(results, key=lambda x: x.score, reverse=True)
    except Exception as e:
        logger.error(f"Gemini matching failed: {e}")
        matches = [score_volunteer(need, v) for v in volunteers]
        return sorted(matches, key=lambda x: x.score, reverse=True)

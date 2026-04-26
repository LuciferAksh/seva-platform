from __future__ import annotations

from math import asin, cos, radians, sin, sqrt

from .models import MatchRecommendation, NeedReport, Volunteer


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


from __future__ import annotations

import re

from .models import Coordinates, NeedCategory, NeedExtraction


CATEGORY_KEYWORDS: dict[NeedCategory, tuple[str, ...]] = {
    "food": ("food", "meal", "ration", "hungry"),
    "medical": ("medical", "medicine", "fever", "doctor", "injured"),
    "shelter": ("shelter", "tent", "housing", "roof"),
    "education": ("school", "education", "books", "class"),
    "water": ("water", "drinking water", "hydration"),
    "other": (),
}

SKILL_MAP: dict[NeedCategory, list[str]] = {
    "food": ["distribution", "coordination"],
    "medical": ["first-aid", "medical-support"],
    "shelter": ["logistics", "coordination"],
    "education": ["teaching", "community-outreach"],
    "water": ["distribution", "community-outreach"],
    "other": ["coordination"],
}

LOCATION_HINTS: dict[str, Coordinates] = {
    "sector 14": Coordinates(lat=28.6139, lng=77.2090),
    "chennai": Coordinates(lat=13.0827, lng=80.2707),
    "adyar": Coordinates(lat=13.0067, lng=80.2573),
    "delhi": Coordinates(lat=28.7041, lng=77.1025),
    "rohini": Coordinates(lat=28.7494, lng=77.0565),
}


def infer_category(text: str) -> NeedCategory:
    lowered = text.lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(keyword in lowered for keyword in keywords):
            return category
    return "other"


def coerce_category(value: str | None) -> NeedCategory | None:
    if not value:
        return None

    lowered = value.strip().lower()
    valid: set[NeedCategory] = {"food", "medical", "shelter", "education", "water", "other"}
    return lowered if lowered in valid else None


def infer_urgency(text: str, category: NeedCategory) -> int:
    lowered = text.lower()
    score = 2
    if any(token in lowered for token in ("urgent", "immediately", "critical", "emergency")):
        score += 2
    if category == "medical":
        score += 1
    if any(token in lowered for token in ("child", "children", "elderly", "fever")):
        score += 1
    return min(score, 5)


def infer_people_affected(text: str) -> int:
    match = re.search(r"(\d+)\s+(families|people|persons|children|kids)", text.lower())
    if match:
        return int(match.group(1))

    numbers = re.findall(r"\d+", text)
    return int(numbers[0]) if numbers else 10


def infer_location(
    text: str,
    lat: float | None,
    lng: float | None,
    explicit_label: str | None = None,
) -> tuple[str, Coordinates]:
    if lat is not None and lng is not None:
        return explicit_label or "Pinned location", Coordinates(lat=lat, lng=lng)

    lowered = text.lower()
    for label, coordinates in LOCATION_HINTS.items():
        if label in lowered:
            return label.title(), coordinates

    if explicit_label:
        return explicit_label.strip(), Coordinates(lat=28.6139, lng=77.2090)

    return "Unknown locality", Coordinates(lat=28.6139, lng=77.2090)


def extract_need(
    text: str,
    lat: float | None = None,
    lng: float | None = None,
    structured: dict | None = None,
) -> NeedExtraction:
    structured = structured or {}

    category = coerce_category(structured.get("category")) or infer_category(text)

    urgency_value = structured.get("urgency_level")
    urgency = urgency_value if isinstance(urgency_value, int) and 1 <= urgency_value <= 5 else infer_urgency(text, category)

    people_value = structured.get("people_affected")
    people = people_value if isinstance(people_value, int) and people_value > 0 else infer_people_affected(text)

    explicit_location = structured.get("location_label") if isinstance(structured.get("location_label"), str) else None
    search_text = " ".join(part for part in [text, explicit_location] if part)

    struct_coords = structured.get("coordinates")
    if lat is None and lng is None and isinstance(struct_coords, dict):
        try:
            if "lat" in struct_coords and "lng" in struct_coords:
                lat = float(struct_coords["lat"])
                lng = float(struct_coords["lng"])
        except (TypeError, ValueError):
            pass

    location_label, coordinates = infer_location(search_text, lat, lng, explicit_location)

    skills_value = structured.get("required_skills")
    if isinstance(skills_value, list):
        skills = [str(skill).strip() for skill in skills_value if str(skill).strip()]
    else:
        skills = []
    if not skills:
        skills = SKILL_MAP[category]

    summary_value = structured.get("summary") if isinstance(structured.get("summary"), str) else None
    summary = (summary_value or text).strip()
    if len(summary) > 180:
        summary = summary[:177] + "..."

    return NeedExtraction(
        category=category,
        urgency_level=urgency,
        people_affected=people,
        location_label=location_label,
        required_skills=skills,
        summary=summary,
        coordinates=coordinates,
        suggested_supplies=structured.get("suggested_supplies", []),
        facility_type_needed=structured.get("facility_type_needed"),
        nearby_facilities=structured.get("nearby_facilities", []),
    )

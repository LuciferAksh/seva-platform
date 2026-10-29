from __future__ import annotations
from math import asin, cos, radians, sin, sqrt
from .models import MatchRecommendation, NeedReport, Volunteer

def haversine_km(lat1, lng1, lat2, lng2):
    dlat,dlng = radians(lat2-lat1),radians(lng2-lng1)
    a=sin(dlat/2)**2+cos(radians(lat1))*cos(radians(lat2))*sin(dlng/2)**2
    return 6371*2*asin(min(1,sqrt(a)))

def score_volunteer(need: NeedReport, volunteer: Volunteer) -> MatchRecommendation:
    synonyms={'nurse':'medical-support','doctor':'medical-support','first aid':'first-aid','driver':'logistics','food distribution':'distribution'}
    normalize=lambda s:synonyms.get(s.lower(),s.lower())
    required={normalize(s) for s in need.extraction.required_skills}
    skills={normalize(s) for s in volunteer.skills}
    fit=len(required & skills)/max(1,len(required))
    coords=need.extraction.coordinates
    distance=haversine_km(coords.lat,coords.lng,volunteer.coordinates.lat,volunteer.coordinates.lng) if coords else None
    proximity=max(0,1-distance/25) if distance is not None else 0
    score=.5*fit+.3*proximity+.2*volunteer.reliability_score
    explanation=f'{fit:.0%} skill fit; ' + (f'{distance:.1f} km away' if distance is not None else 'location needs confirmation') + f'; {volunteer.reliability_score:.0%} reliability.'
    return MatchRecommendation(volunteer_id=volunteer.id,volunteer_name=volunteer.name,score=round(score,3),explanation=explanation)

def rank_volunteers(need, volunteers):
    return sorted([score_volunteer(need,v) for v in volunteers if v.availability=='available'],key=lambda m:m.score,reverse=True)

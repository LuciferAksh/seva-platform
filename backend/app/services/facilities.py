from functools import lru_cache
import time
import httpx
from fastapi import HTTPException


@lru_cache(maxsize=128)
def _lookup(lat, lng, window):
    query=f'[out:json][timeout:12];nwr(around:3500,{lat},{lng})["amenity"~"^(hospital|clinic|pharmacy)$"];out center 60;'
    try:
        response=httpx.post('https://overpass-api.de/api/interpreter',data={'data':query},
            headers={'User-Agent':'SevaCommunityCoordination/0.2'},timeout=18)
        response.raise_for_status();items=[]
        for item in response.json().get('elements',[]):
            tags=item.get('tags',{});point=item.get('center',item)
            if not tags.get('name') or 'lat' not in point or 'lon' not in point:continue
            items.append({'name':str(tags['name'])[:200],'lat':point['lat'],'lng':point['lon'],
                'address':str(tags.get('addr:street',''))[:200] or None})
        return items
    except (httpx.HTTPError,ValueError):raise HTTPException(503,'Facility lookup is unavailable. Confirm nearby support locally.') from None


def nearby_facilities(lat,lng):
    # Cache by a coarse area, not an exact household location. No per-dashboard lookup.
    from ..matching import haversine_km
    items=_lookup(round(lat,2),round(lng,2),int(time.time()//3600))
    ranked=[dict(item,distance_meters=round(haversine_km(lat,lng,item['lat'],item['lng'])*1000)) for item in items]
    return sorted(ranked,key=lambda item:item['distance_meters'])[:3]

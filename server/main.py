import os
import time
from typing import Dict, Any

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
from cachetools import TTLCache

OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
GROQ_API_KEY = os.getenv('GROQ_API_KEY', '')

app = FastAPI(title='Travel Wake Alarm Backend')

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple in-memory caches and rate limiter
places_cache = TTLCache(maxsize=1000, ttl=60 * 60)
ai_cache = TTLCache(maxsize=2000, ttl=60 * 60)
rate_store: Dict[str, list] = {}
RATE_WINDOW = 60  # seconds
RATE_LIMIT = 60  # requests per window per IP


def get_client_ip(request: Request) -> str:
    client = request.client
    if client:
        return client.host
    return 'unknown'


@app.middleware("http")
async def simple_rate_limit(request: Request, call_next):
    ip = get_client_ip(request)
    now = time.time()
    hits = rate_store.get(ip, [])
    # prune
    hits = [t for t in hits if t > now - RATE_WINDOW]
    if len(hits) >= RATE_LIMIT:
        raise HTTPException(status_code=429, detail='Too many requests')
    hits.append(now)
    rate_store[ip] = hits
    response = await call_next(request)
    return response


@app.get('/places')
async def get_places(lat: float = None, lng: float = None, radius: int = 500, q: str = ''):
    if lat is None or lng is None:
        raise HTTPException(status_code=400, detail='lat & lng required')

    cache_key = f"places:{lat}:{lng}:{radius}:{q}"
    if cache_key in places_cache:
        return places_cache[cache_key]

    # Build Overpass QL
    query = f"""
    [out:json][timeout:25];
    (
      node(around:{radius},{lat},{lng})[amenity];
      node(around:{radius},{lat},{lng})[shop];
      node(around:{radius},{lat},{lng})[tourism];
    );
    out center 100;
    """

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            r = await client.post(OVERPASS_URL, content=query.encode('utf-8'), headers={'Content-Type': 'text/plain'})
            r.raise_for_status()
            data = r.json()
            elements = data.get('elements', [])
            places = []
            for el in elements:
                name = None
                tags = el.get('tags', {})
                if tags:
                    name = tags.get('name') or tags.get('name:en')
                if not name:
                    # fallback to first tag value
                    name = next(iter(tags.values()), 'Unknown') if tags else 'Unknown'
                latv = el.get('lat') or (el.get('center') and el['center'].get('lat'))
                lonv = el.get('lon') or (el.get('center') and el['center'].get('lon'))
                places.append({
                    'id': f"osm:{el.get('type')}:{el.get('id')}",
                    'name': name,
                    'lat': latv,
                    'lng': lonv,
                    'tags': tags,
                    'source': 'overpass',
                })

            places_cache[cache_key] = places
            return places
        except Exception as e:
            raise HTTPException(status_code=500, detail='failed to fetch places')


@app.post('/ai/describe')
async def ai_describe(body: Dict[str, Any]):
    place = body.get('place')
    if not place:
        raise HTTPException(status_code=400, detail='place required')

    cache_key = f"ai:{place.get('id')}"
    if cache_key in ai_cache:
        return ai_cache[cache_key]

    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail='GROQ_API_KEY not configured on server')

    # Build prompt and call GROQ
    prompt = (
        "You are a concise travel assistant. Given the following place metadata, return a JSON object with keys: "
        "summary (1-2 sentences), tips (array of 3 short tips), safety (short note or empty), sources (array).\n" 
        f"Place: {place}"
    )

    payload = {
        'model': 'gpt-4o-mini',
        'prompt': prompt,
        'max_tokens': 300,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.post('https://api.groq.ai/v1/queries', json=payload, headers={'Authorization': f'Bearer {GROQ_API_KEY}'})
            resp.raise_for_status()
            data = resp.json()
            # try to extract text
            text = data.get('text') if isinstance(data, dict) else str(data)
            result = {'summary': text, 'tips': [], 'safety': '', 'sources': []}
            try:
                import json as _json
                parsed = _json.loads(text)
                result = parsed
            except Exception:
                # keep raw text
                result['summary'] = text

            ai_cache[cache_key] = result
            return result
        except Exception as e:
            raise HTTPException(status_code=500, detail='failed to call ai')


@app.get('/')
async def root():
    return {'status': 'ok'}


if __name__ == '__main__':
    import uvicorn
    uvicorn.run('main:app', host='0.0.0.0', port=int(os.getenv('PORT', 3000)), reload=False)

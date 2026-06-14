import os
import time
import json
from typing import Dict, Any

import httpx
from cachetools import TTLCache
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# ==========================
# CONFIG
# ==========================

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

app = FastAPI(title="Travel Wake Alarm Backend")

# ==========================
# CORS
# ==========================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================
# CACHE
# ==========================

places_cache = TTLCache(maxsize=1000, ttl=3600)
ai_cache = TTLCache(maxsize=2000, ttl=3600)

# ==========================
# RATE LIMIT
# ==========================

rate_store: Dict[str, list] = {}

RATE_WINDOW = 60
RATE_LIMIT = 60


def get_client_ip(request: Request):
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()

    if request.client:
        return request.client.host

    return "unknown"


@app.middleware("http")
async def simple_rate_limit(request: Request, call_next):
    ip = get_client_ip(request)

    now = time.time()

    hits = rate_store.get(ip, [])

    # remove old hits
    hits = [t for t in hits if t > now - RATE_WINDOW]

    if len(hits) >= RATE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail="Too many requests"
        )

    hits.append(now)
    rate_store[ip] = hits

    response = await call_next(request)

    return response


# ==========================
# ROOT
# ==========================

@app.get("/")
async def root():
    return {"status": "ok"}


# ==========================
# PLACES API
# ==========================

@app.get("/places")
async def get_places(
    lat: float = None,
    lng: float = None,
    radius: int = 500,
    q: str = ""
):
    if lat is None or lng is None:
        raise HTTPException(
            status_code=400,
            detail="lat and lng required"
        )

    cache_key = f"{lat}:{lng}:{radius}:{q}"

    if cache_key in places_cache:
        return places_cache[cache_key]

    overpass_query = f"""
    [out:json][timeout:25];
    (
      node(around:{radius},{lat},{lng})[amenity];
      node(around:{radius},{lat},{lng})[shop];
      node(around:{radius},{lat},{lng})[tourism];
      way(around:{radius},{lat},{lng})[tourism];
    );
    out center;
    """

    try:
        async with httpx.AsyncClient(timeout=30) as client:

            response = await client.post(
                OVERPASS_URL,
                data={"data": overpass_query},
                headers={
                    "Accept": "application/json",
                    "User-Agent": "travel-wake-alarm/1.0"
                }
            )

            response.raise_for_status()

            data = response.json()

            elements = data.get("elements", [])

            places = []

            for el in elements:

                tags = el.get("tags", {})

                name = (
                    tags.get("name")
                    or tags.get("name:en")
                    or "Unknown Place"
                )

                lat_value = el.get("lat")
                lng_value = el.get("lon")

                if not lat_value and el.get("center"):
                    lat_value = el["center"].get("lat")

                if not lng_value and el.get("center"):
                    lng_value = el["center"].get("lon")

                place = {
                    "id": f"osm:{el.get('type')}:{el.get('id')}",
                    "name": name,
                    "lat": lat_value,
                    "lng": lng_value,
                    "tags": tags,
                    "source": "overpass",
                }

                # search filtering
                if q and q.lower() not in name.lower():
                    continue

                places.append(place)

            places_cache[cache_key] = places

            return places

    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Overpass API error: {e.response.text}"
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch places: {str(e)}"
        )


# ==========================
# AI DESCRIPTION API
# ==========================

@app.post("/ai/describe")
async def ai_describe(body: Dict[str, Any]):

    place = body.get("place")

    if not place:
        raise HTTPException(
            status_code=400,
            detail="place required"
        )

    cache_key = f"ai:{place.get('id')}"

    # cache
    if cache_key in ai_cache:
        return ai_cache[cache_key]

    # env validation
    if not GROQ_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="GROQ_API_KEY missing"
        )

    prompt = f"""
You are a travel assistant.

Return ONLY valid JSON.
Do not return markdown.
Do not use triple backticks.
Do not explain anything.

Format:

{{
    "summary": "1-2 sentence description",
    "tips": [
        "tip1",
        "tip2",
        "tip3"
    ],
    "safety": "short safety note",
    "sources": []
}}

Place:
{json.dumps(place)}
"""

    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {
                "role": "system",
                "content": "You only return valid JSON."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.2,
        "max_tokens": 300,
        "response_format": {
            "type": "json_object"
        }
    }

    try:
        async with httpx.AsyncClient(timeout=40) as client:

            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                json=payload,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json"
                }
            )

            response.raise_for_status()

            data = response.json()

            text = data["choices"][0]["message"]["content"]

            # cleanup markdown if model still returns it
            text = text.strip()

            if text.startswith("```json"):
                text = text.replace("```json", "", 1)

            if text.startswith("```"):
                text = text.replace("```", "", 1)

            if text.endswith("```"):
                text = text[:-3]

            text = text.strip()

            try:
                result = json.loads(text)

            except json.JSONDecodeError:
                result = {
                    "summary": text,
                    "tips": [],
                    "safety": "",
                    "sources": []
                }

            ai_cache[cache_key] = result

            return result

    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Groq API failed: {e.response.text}"
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI service failed: {str(e)}"
        )


# ==========================
# LOCAL RUN
# ==========================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 3000)),
        reload=False
    )
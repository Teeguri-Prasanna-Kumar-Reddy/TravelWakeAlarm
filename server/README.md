# Travel Wake Alarm - FastAPI Backend

This backend provides POI discovery and LLM enrichment for the Travel Wake Alarm mobile app.

Endpoints:

- `GET /places?lat=...&lng=...&radius=...` — returns POIs from Overpass API
- `POST /ai/describe` — proxies calls to GROQ LLM (requires `GROQ_API_KEY` env var)

Run locally:

```bash
cd server
python -m venv .venv
.venv\Scripts\activate    # Windows
pip install -r requirements.txt
set GROQ_API_KEY=your_key  # Windows
uvicorn main:app --reload --port 3000
```

Deploying:

- Vercel (serverless):
	1. Push the repo to GitHub.
	2. Import the project in Vercel and select the repository.
	3. Vercel will use `vercel.json` (root) to build `server/main.py` with the Python runtime.
	4. In the Vercel dashboard, set the environment variable `GROQ_API_KEY` (Project → Settings → Environment Variables).
	5. Deploy; after deployment the API will be available at `https://<your-vercel>.vercel.app/places` and `/ai/describe`.

- Render / Heroku (recommended for long-running FastAPI):
	- Create a new Web Service using the `server` folder as the repo root. Set the start command to `uvicorn main:app --host 0.0.0.0 --port $PORT`.
	- Add `GROQ_API_KEY` as an environment variable and deploy.

## Vercel import step-by-step (detailed)

1. Push your changes to GitHub (example):

```bash
git add .
git commit -m "Add FastAPI backend"
git push origin main
```

2. In Vercel (https://vercel.com):
- Click **New Project** → **Import Git Repository** → select your repository.
- For **Root Directory** use the repository root (leave blank) — `vercel.json` at repo root will route requests to `server/main.py`.
- For **Framework Preset** select **Other**.
- Leave Build & Install commands empty (Vercel will use the Python runtime defined in `vercel.json`).

3. Add environment variables (you can add the `GROQ_API_KEY` later):
- After importing, go to the Project → Settings → Environment Variables.
- Add `GROQ_API_KEY` with the value you will provide later and set it for `Production` (and `Preview` if desired).

4. Deploy and test:
- Click **Deploy**. When deployment finishes, note the project URL (e.g. `https://travel-wake-alarm.vercel.app`).
- Test endpoints:

```bash
curl https://<your-vercel>.vercel.app/places?lat=12.34\&lng=56.78
curl -X POST https://<your-vercel>.vercel.app/ai/describe -H 'Content-Type: application/json' -d '{"place": {"id":"test","name":"Test"}}'
```

5. Add the `GROQ_API_KEY` later (via dashboard or CLI):

Dashboard: Project → Settings → Environment Variables → Add → Name: `GROQ_API_KEY` → Value: <your_key> → Save → Redeploy.

CLI (Vercel CLI):

```bash
vercel env add GROQ_API_KEY production
# follow prompts to paste the key
vercel --prod --confirm
```

After redeploy the `/ai/describe` endpoint will use your GROQ key.



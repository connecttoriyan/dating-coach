# Dating Coach — Python Backend (FastAPI)

The brain of the app. Handles Claude streaming, Supabase persistence,
rate limiting, and voice-call review.

## Endpoints

| Method | Path                     | Purpose                                          |
|--------|--------------------------|--------------------------------------------------|
| POST   | `/api/coach`             | Streams Claude's reply, persists session         |
| GET    | `/api/sessions`          | Lists a user's past sessions                     |
| POST   | `/api/voice-session`     | Saves a finished Vapi call transcript            |
| POST   | `/api/voice-feedback`    | Generates + saves coach feedback for a call      |
| GET    | `/api/voice-limit`       | Pre-check daily voice quota                      |

## Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # fill in your keys
uvicorn main:app --reload --port 8000
```

Backend will be live at **http://localhost:8000**. The Next.js frontend
reads `NEXT_PUBLIC_API_BASE` to know where to call.

## Environment

```
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ALLOWED_ORIGINS=http://localhost:3000          # comma-separated for prod
```

## Layout

```
backend/
├── main.py              # FastAPI app, CORS, router wiring
├── requirements.txt
├── .env.example
├── lib/
│   ├── supabase_client.py   # Supabase admin client (service-role)
│   ├── rate_limit.py        # Per-user_token daily caps
│   └── prompts.py           # Coach + feedback system prompts
└── routes/
    ├── coach.py         # POST /api/coach (streaming)
    ├── sessions.py      # GET  /api/sessions
    └── voice.py         # voice-session, voice-feedback, voice-limit
```

## Why FastAPI

- Native async/await — fits Claude's streaming API cleanly.
- Auto-generated OpenAPI docs at `/docs` (great for sharing with collaborators).
- Pydantic on the way for request validation when this scales.
- Production-deploys cleanly to Render, Railway, Fly.io.

## Deploy (later)

Recommended: **Render** or **Railway** — both auto-detect Python via
`requirements.txt`. Start command:

```
uvicorn main:app --host 0.0.0.0 --port $PORT
```

Set the same env vars + `ALLOWED_ORIGINS=https://your-frontend.vercel.app`.

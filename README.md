# Dating Coach

An AI dating coach for guys who struggle with conversations on dating apps. Two surfaces:

- **Text Coach** — paste a stalled chat or describe a situation. Get coaching in natural language.
- **Voice Practice** — a live voice call with "Sarah," an AI playing a first match. Practice talking out loud. After the call, the coach reviews the transcript.

## Architecture

Hybrid:

```
   ┌─────────────────────┐
   │  Next.js frontend   │   React + Tailwind, editorial design
   │  (TypeScript)       │
   └──────────┬──────────┘
              │ fetch + Vapi browser SDK
   ┌──────────▼──────────┐
   │  FastAPI backend    │   ← the "AI engineer" surface
   │  (Python)           │
   └──┬──────┬──────────┬┘
      │      │          │
  Claude  Supabase   Vapi (voice)
```

The frontend stays Next.js (React + Tailwind, fast UI iteration). The
backend is FastAPI (Python) — calls Claude, persists to Supabase, enforces
rate limits, generates post-call feedback. Vapi runs in the browser via
its JS SDK.

## Stack

| Layer       | Tech                                  |
|-------------|---------------------------------------|
| Frontend    | Next.js 16 (App Router) + Tailwind v4 |
| Backend     | FastAPI + Python 3.11+                |
| LLM         | Claude Sonnet 4.6 (Anthropic SDK)     |
| Database    | Supabase (Postgres + JSONB)           |
| Voice       | Vapi (browser SDK)                    |
| Hosting     | Vercel (frontend) + Render/Railway (backend) — recommended |

## Run locally

You need **two** terminals running.

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                # fill in keys
uvicorn main:app --reload --port 8000
```

Backend at http://localhost:8000

### 2. Frontend

```bash
# From project root
cp .env.example .env.local          # set NEXT_PUBLIC_API_BASE=http://localhost:8000
npm install
npm run dev
```

Frontend at http://localhost:3000

## Database schema (Supabase)

```sql
create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_token text not null,
  type text not null check (type in ('chat', 'voice')),
  transcript jsonb not null default '[]'::jsonb,
  feedback text,
  created_at timestamptz not null default now()
);
create index sessions_user_token_idx on sessions (user_token);
```

## Project layout

```
.
├── app/                    # Next.js frontend (React)
│   ├── coach/              #   The text coach UI
│   ├── practice/           #   The voice practice UI
│   └── sessions/           #   Past sessions list
├── lib/api.ts              # Helper: points frontend at backend URL
├── backend/                # Python FastAPI backend
│   ├── main.py             #   App entry + CORS
│   ├── lib/                #   Supabase, rate-limit, prompts
│   └── routes/             #   coach, sessions, voice
├── PROJECT_MEMORY.md       # Build journal (paste into LLMs for posts)
└── linkedin_carousel.html  # 7-slide LinkedIn carousel
```

## Build journal

Built Day 1 as a TypeScript-only Next.js app (Anthropic SDK in API routes).
Day 2: pivoted to a hybrid architecture — moved the AI logic to a Python
FastAPI backend to better reflect the day-to-day AI engineering toolchain
(Python is the lingua franca there). The frontend stayed React.

See `PROJECT_MEMORY.md` for full detail.

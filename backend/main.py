"""
Dating Coach — FastAPI backend.

Mirrors the surface of the original Next.js API routes:
  POST /api/coach           — streaming coach replies (Claude)
  GET  /api/sessions        — list a user's past sessions
  POST /api/voice-session   — save a finished voice call
  POST /api/voice-feedback  — generate + persist coach feedback
  GET  /api/voice-limit     — pre-check daily voice quota

Run locally:
    cd backend
    python -m venv .venv
    source .venv/bin/activate   # (Windows: .venv\Scripts\activate)
    pip install -r requirements.txt
    cp .env.example .env        # fill in keys
    uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load .env before importing route modules (they read env at import time).
load_dotenv()

from routes import coach, sessions, voice  # noqa: E402

app = FastAPI(title="Dating Coach API", version="1.0.0")

# CORS — in dev the Next.js dev server is at :3000; in prod set
# ALLOWED_ORIGINS to your real frontend URL (comma-separated).
allowed = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in allowed],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # The frontend reads X-Session-Id from the streaming response.
    expose_headers=["X-Session-Id"],
)

app.include_router(coach.router, prefix="/api")
app.include_router(sessions.router, prefix="/api")
app.include_router(voice.router, prefix="/api")


@app.get("/")
def root() -> dict[str, str]:
    """Health check."""
    return {"status": "ok", "service": "dating-coach-api"}

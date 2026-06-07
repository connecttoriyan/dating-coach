"""
Voice-call endpoints.

GET  /api/voice-limit     — pre-check: can the user start another call today?
POST /api/voice-session   — save a finished call's transcript
POST /api/voice-feedback  — generate + persist coach feedback for a saved call
"""

from __future__ import annotations

import os
from typing import Any

from anthropic import Anthropic
from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse

from lib.prompts import FEEDBACK_PROMPT
from lib.rate_limit import check_voice_limit
from lib.supabase_client import supabase_admin

router = APIRouter()
anthropic = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])


@router.get("/voice-limit")
def voice_limit(userToken: str = Query(...)) -> dict:
    limit = check_voice_limit(userToken)
    return {
        "allowed": limit["allowed"],
        "used": limit["used"],
        "limit": limit["limit"],
        "remaining": limit["remaining"],
        "message": (
            None
            if limit["allowed"]
            else (
                f"You've used today's {limit['limit']} practice calls. "
                f"Try again tomorrow."
            )
        ),
    }


@router.post("/voice-session")
async def voice_session(request: Request) -> Any:
    body = await request.json()
    user_token = body.get("userToken")
    transcript = body.get("transcript")

    if not user_token:
        return JSONResponse(status_code=400, content={"error": "missing userToken"})
    if not isinstance(transcript, list):
        return JSONResponse(status_code=400, content={"error": "missing transcript"})

    # Post-call rate limit — already used a call, but block save + feedback
    # so a runaway script can't pile up DB rows + feedback generations.
    limit = check_voice_limit(user_token)
    if not limit["allowed"]:
        return JSONResponse(
            status_code=429,
            content={
                "error": "rate_limit",
                "message": (
                    f"You've used today's {limit['limit']} practice calls."
                ),
                "used": limit["used"],
                "limit": limit["limit"],
            },
        )

    # Normalize Vapi's {role, text} -> our {role, content}
    normalized = [
        {"role": t["role"], "content": t["text"]} for t in transcript
    ]

    ins = (
        supabase_admin.table("sessions")
        .insert(
            {
                "user_token": user_token,
                "type": "voice",
                "transcript": normalized,
            }
        )
        .execute()
    )
    if not ins.data:
        return JSONResponse(status_code=500, content={"error": "insert failed"})

    return {"sessionId": ins.data[0]["id"]}


@router.post("/voice-feedback")
async def voice_feedback(request: Request) -> Any:
    body = await request.json()
    session_id = body.get("sessionId")
    if not session_id:
        return JSONResponse(status_code=400, content={"error": "missing sessionId"})

    res = (
        supabase_admin.table("sessions")
        .select("id, type, transcript, feedback")
        .eq("id", session_id)
        .single()
        .execute()
    )
    session = res.data
    if not session:
        return JSONResponse(status_code=404, content={"error": "session not found"})
    if session["type"] != "voice":
        return JSONResponse(
            status_code=400, content={"error": "feedback only for voice sessions"}
        )

    # Idempotent — return cached feedback on refresh
    if session.get("feedback"):
        return {"feedback": session["feedback"]}

    transcript = session["transcript"] or []
    readable = "\n".join(
        f"{'HIM' if t['role'] == 'user' else 'SARAH'}: {t['content']}"
        for t in transcript
    )

    msg = anthropic.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=800,
        system=FEEDBACK_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"Here's the call transcript:\n\n{readable}",
            }
        ],
    )

    feedback = msg.content[0].text if msg.content else "(no feedback generated)"

    (
        supabase_admin.table("sessions")
        .update({"feedback": feedback})
        .eq("id", session_id)
        .execute()
    )

    return {"feedback": feedback}

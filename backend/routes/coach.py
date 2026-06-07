"""
POST /api/coach

Receives chat history + user_token + (optional) session_id.
1. Rate-limits per user_token.
2. Creates/updates the session row in Supabase.
3. Streams Claude's reply back token-by-token.
4. After stream ends, saves the final assistant message.

Returns the session id in the X-Session-Id response header so the client
can pass it back on subsequent turns.
"""

from __future__ import annotations

import os
from typing import Any

from anthropic import Anthropic
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse

from lib.prompts import COACH_SYSTEM_PROMPT
from lib.rate_limit import check_chat_limit
from lib.supabase_client import supabase_admin

router = APIRouter()
anthropic = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])


@router.post("/coach")
async def coach(request: Request) -> Any:
    body = await request.json()
    messages = body.get("messages")
    user_token = body.get("userToken")
    session_id = body.get("sessionId")

    if not isinstance(messages, list) or not messages:
        raise HTTPException(status_code=400, detail="missing messages")
    if not user_token:
        raise HTTPException(status_code=400, detail="missing userToken")

    # 1) Rate limit
    limit = check_chat_limit(user_token)
    if not limit["allowed"]:
        return JSONResponse(
            status_code=429,
            content={
                "error": "rate_limit",
                "message": (
                    f"You've used today's {limit['limit']} coaching messages. "
                    f"Come back tomorrow — fresh quota then."
                ),
                "used": limit["used"],
                "limit": limit["limit"],
            },
        )

    # 2) Ensure a session row exists
    if not session_id:
        ins = (
            supabase_admin.table("sessions")
            .insert(
                {
                    "user_token": user_token,
                    "type": "chat",
                    "transcript": messages,
                }
            )
            .execute()
        )
        if not ins.data:
            raise HTTPException(status_code=500, detail="supabase insert failed")
        session_id = ins.data[0]["id"]
    else:
        (
            supabase_admin.table("sessions")
            .update({"transcript": messages})
            .eq("id", session_id)
            .execute()
        )

    # 3) Stream Claude's response
    def generate():
        nonlocal session_id
        assistant_text = ""

        with anthropic.messages.stream(
            model="claude-sonnet-4-6",
            max_tokens=1200,
            system=COACH_SYSTEM_PROMPT,
            messages=messages,
        ) as stream:
            for chunk in stream.text_stream:
                assistant_text += chunk
                yield chunk

        # 4) Persist final transcript with the assistant's reply
        final_transcript = messages + [
            {"role": "assistant", "content": assistant_text}
        ]
        (
            supabase_admin.table("sessions")
            .update({"transcript": final_transcript})
            .eq("id", session_id)
            .execute()
        )

    return StreamingResponse(
        generate(),
        media_type="text/plain; charset=utf-8",
        headers={
            "X-Session-Id": str(session_id),
            "Cache-Control": "no-cache, no-transform",
        },
    )

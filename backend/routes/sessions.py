"""
GET /api/sessions?userToken=xxx

Returns the user's sessions (newest first, capped at 50).
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from lib.supabase_client import supabase_admin

router = APIRouter()


@router.get("/sessions")
def list_sessions(userToken: str = Query(...)) -> dict:
    if not userToken:
        raise HTTPException(status_code=400, detail="missing userToken")

    res = (
        supabase_admin.table("sessions")
        .select("id, type, transcript, feedback, created_at")
        .eq("user_token", userToken)
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    return {"sessions": res.data or []}

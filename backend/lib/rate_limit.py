"""
Per-user_token daily caps using the existing `sessions` table.

Mirrors lib/rate-limit.ts from the original Next.js version exactly,
so behavior is identical across stacks.

Caps:
  - chat:  30 user messages per 24h
  - voice: 3  voice calls per 24h
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import TypedDict

from .supabase_client import supabase_admin

DAILY_LIMITS = {
    "chat": 30,   # user messages per 24h
    "voice": 3,   # voice calls per 24h
}


class LimitResult(TypedDict):
    allowed: bool
    used: int
    limit: int
    remaining: int


def _day_ago_iso() -> str:
    return (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()


def check_chat_limit(user_token: str) -> LimitResult:
    """Sum user-role messages across all chat sessions in last 24h."""
    res = (
        supabase_admin.table("sessions")
        .select("transcript")
        .eq("user_token", user_token)
        .eq("type", "chat")
        .gte("created_at", _day_ago_iso())
        .execute()
    )

    used = 0
    for row in (res.data or []):
        transcript = row.get("transcript") or []
        used += sum(1 for m in transcript if m.get("role") == "user")

    limit = DAILY_LIMITS["chat"]
    return LimitResult(
        allowed=used < limit,
        used=used,
        limit=limit,
        remaining=max(0, limit - used),
    )


def check_voice_limit(user_token: str) -> LimitResult:
    """Count voice sessions in last 24h."""
    res = (
        supabase_admin.table("sessions")
        .select("id", count="exact")
        .eq("user_token", user_token)
        .eq("type", "voice")
        .gte("created_at", _day_ago_iso())
        .execute()
    )

    used = res.count or 0
    limit = DAILY_LIMITS["voice"]
    return LimitResult(
        allowed=used < limit,
        used=used,
        limit=limit,
        remaining=max(0, limit - used),
    )

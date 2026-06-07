"""
Supabase admin client.

Server-side ONLY — uses the service-role key which bypasses Row Level
Security. Never expose this client (or its key) to the browser.
"""

from __future__ import annotations

import os

from supabase import Client, create_client

_url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not _url or not _key:
    raise RuntimeError(
        "Missing Supabase env vars: set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) "
        "and SUPABASE_SERVICE_ROLE_KEY in backend/.env"
    )

supabase_admin: Client = create_client(_url, _key)

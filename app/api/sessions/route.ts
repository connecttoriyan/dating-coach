// app/api/sessions/route.ts
// ---------------------------------------------------------------
// GET /api/sessions?userToken=xxx
// Returns all sessions for the given user_token, newest first.
// Server-side only — uses the Supabase service role key.
// ---------------------------------------------------------------
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userToken = url.searchParams.get("userToken");

  if (!userToken) {
    return Response.json({ error: "missing userToken" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select("id, type, transcript, feedback, created_at")
    .eq("user_token", userToken)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ sessions: data ?? [] });
}

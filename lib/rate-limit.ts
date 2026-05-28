// lib/rate-limit.ts
// ---------------------------------------------------------------
// Per-user_token daily caps. Uses our existing Supabase sessions
// table — no new dependencies, no new signups.
//
// Caps (tweak in DAILY_LIMITS):
// - chat:  30 user messages per 24h
// - voice: 3  calls per 24h
//
// These caps are intentionally generous for real use but cap the
// downside if your demo URL gets posted somewhere and 200 people
// hit it. Worst case per-user/day: ~$0.50 chat + ~$1.50 voice.
// ---------------------------------------------------------------
import { supabaseAdmin, type ChatMessage } from "./supabase";

export const DAILY_LIMITS = {
  chat: 30,   // user messages per 24h
  voice: 3,   // voice calls per 24h
};

type LimitResult = {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
};

function dayAgoISO() {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
}

export async function checkChatLimit(userToken: string): Promise<LimitResult> {
  // Sum user-role messages across all chat sessions in last 24h.
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select("transcript")
    .eq("user_token", userToken)
    .eq("type", "chat")
    .gte("created_at", dayAgoISO());

  if (error) throw new Error(`rate-limit query failed: ${error.message}`);

  let used = 0;
  for (const row of data ?? []) {
    const transcript = (row.transcript as ChatMessage[]) ?? [];
    used += transcript.filter((m) => m.role === "user").length;
  }

  const limit = DAILY_LIMITS.chat;
  return {
    allowed: used < limit,
    used,
    limit,
    remaining: Math.max(0, limit - used),
  };
}

export async function checkVoiceLimit(userToken: string): Promise<LimitResult> {
  const { count, error } = await supabaseAdmin
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_token", userToken)
    .eq("type", "voice")
    .gte("created_at", dayAgoISO());

  if (error) throw new Error(`rate-limit query failed: ${error.message}`);

  const used = count ?? 0;
  const limit = DAILY_LIMITS.voice;
  return {
    allowed: used < limit,
    used,
    limit,
    remaining: Math.max(0, limit - used),
  };
}

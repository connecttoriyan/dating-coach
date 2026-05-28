// lib/supabase.ts
// ---------------------------------------------------------------
// Server-side Supabase client using the SERVICE ROLE key.
// This bypasses Row Level Security — only import this from API
// routes / server components, NEVER from a "use client" file.
//
// For a browser-side Supabase client you'd export a separate
// instance using the anon key. We don't need that yet for Day 1.
// ---------------------------------------------------------------
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  // This fires at import time on the server — fail loudly so you
  // notice during local dev instead of at runtime in prod.
  throw new Error(
    "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
  );
}

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Type for one chat message (matches what the UI sends).
export type ChatMessage = { role: "user" | "assistant"; content: string };

// Type for one row in the `sessions` table.
export type SessionRow = {
  id: string;
  user_token: string;
  type: "chat" | "voice";
  transcript: ChatMessage[];
  feedback: string | null;
  created_at: string;
};

// app/api/voice-session/route.ts — rate-limited voice save
import { supabaseAdmin, type ChatMessage } from "@/lib/supabase";
import { checkVoiceLimit } from "@/lib/rate-limit";

type VoiceTurn = { role: "user" | "assistant"; text: string };

export async function POST(req: Request) {
  try {
    const { userToken, transcript } = await req.json();
    if (!userToken) {
      return Response.json({ error: "missing userToken" }, { status: 400 });
    }
    if (!Array.isArray(transcript)) {
      return Response.json({ error: "missing transcript" }, { status: 400 });
    }

    // Rate limit (post-call check — already used a call, but block save+feedback).
    const limit = await checkVoiceLimit(userToken);
    if (!limit.allowed) {
      return Response.json(
        {
          error: "rate_limit",
          message: `You've used today's ${limit.limit} practice calls. Try again tomorrow.`,
          used: limit.used,
          limit: limit.limit,
        },
        { status: 429 }
      );
    }

    const normalized: ChatMessage[] = (transcript as VoiceTurn[]).map((t) => ({
      role: t.role,
      content: t.text,
    }));

    const { data, error } = await supabaseAdmin
      .from("sessions")
      .insert({
        user_token: userToken,
        type: "voice",
        transcript: normalized,
      })
      .select("id")
      .single();

    if (error) throw new Error(`Supabase insert failed: ${error.message}`);
    return Response.json({ sessionId: data.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/voice-session] error:", err);
    return Response.json({ error: message }, { status: 500 });
  }
}

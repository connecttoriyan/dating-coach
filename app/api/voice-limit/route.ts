// app/api/voice-limit/route.ts — GET pre-check before starting a voice call
import { checkVoiceLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userToken = url.searchParams.get("userToken");
  if (!userToken) {
    return Response.json({ error: "missing userToken" }, { status: 400 });
  }
  const limit = await checkVoiceLimit(userToken);
  return Response.json({
    allowed: limit.allowed,
    used: limit.used,
    limit: limit.limit,
    remaining: limit.remaining,
    message: limit.allowed
      ? null
      : `You've used today's ${limit.limit} practice calls. Try again tomorrow.`,
  });
}

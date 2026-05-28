// app/api/voice-feedback/route.ts
// ---------------------------------------------------------------
// POST /api/voice-feedback
// Body: { sessionId }
// 1) Loads the voice session's transcript from Supabase.
// 2) Sends it to Claude with a "review this practice call" prompt.
// 3) Saves the feedback back onto the session row.
// 4) Returns the feedback text.
// ---------------------------------------------------------------
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin, type ChatMessage } from "@/lib/supabase";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Feedback prompt — different voice from the coach. This one is
// reviewing a recorded practice call, not chatting with the user.
const FEEDBACK_PROMPT = `You are a dating coach reviewing a mock voice date a user just practiced. You will see a transcript where:
- "assistant" = Sarah, the AI playing the date
- "user" = the person practicing

Your job is to give him honest, friendly, useful feedback. Talk to him like an experienced friend who was listening in.

Cover (briefly, in flowing prose — no headings, no bullet points):
- What worked well — specific moments, not generic praise.
- What didn't land — moments where the energy dropped or he missed an opening.
- One pattern to watch — something he does repeatedly that's costing him.
- One concrete thing to try in the next call.

Tone: warm, direct, never harsh. Like the elder brother coach he's been chatting with — same voice.

Length: 200-350 words. Conversational paragraphs. No analysis frameworks. No "Step 1." Just talk to him.

If the transcript is very short (under 4 turns), be gentle — call out that it's hard to grade much from so little, then point to one thing you noticed.`;

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json();
    if (!sessionId) {
      return Response.json({ error: "missing sessionId" }, { status: 400 });
    }

    // Fetch the session
    const { data: session, error: fetchErr } = await supabaseAdmin
      .from("sessions")
      .select("id, type, transcript, feedback")
      .eq("id", sessionId)
      .single();

    if (fetchErr || !session) {
      throw new Error(`Session not found: ${fetchErr?.message}`);
    }
    if (session.type !== "voice") {
      return Response.json(
        { error: "feedback is only available for voice sessions" },
        { status: 400 }
      );
    }
    if (session.feedback) {
      // Already generated — return it (saves a Claude call on refresh).
      return Response.json({ feedback: session.feedback });
    }

    // Format the transcript as a readable conversation for Claude.
    const transcript = session.transcript as ChatMessage[];
    const readable = transcript
      .map((t) => `${t.role === "user" ? "HIM" : "SARAH"}: ${t.content}`)
      .join("\n");

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      system: FEEDBACK_PROMPT,
      messages: [{ role: "user", content: `Here's the call transcript:\n\n${readable}` }],
    });

    const feedback =
      msg.content[0].type === "text" ? msg.content[0].text : "(no feedback generated)";

    // Save it
    await supabaseAdmin
      .from("sessions")
      .update({ feedback })
      .eq("id", sessionId);

    return Response.json({ feedback });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/voice-feedback] error:", err);
    return Response.json({ error: message }, { status: 500 });
  }
}

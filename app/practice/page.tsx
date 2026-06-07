// app/practice/page.tsx — voice practice (calls Python backend for save + feedback)
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Vapi from "@vapi-ai/web";
import { apiUrl } from "@/lib/api";

const TOKEN_KEY = "dating_coach_user_token";
type Status = "idle" | "connecting" | "live" | "ended";
type Turn = { role: "user" | "assistant"; text: string };

export default function PracticePage() {
  const [status, setStatus] = useState<Status>("idle");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [limitMsg, setLimitMsg] = useState<string | null>(null);
  const [speaker, setSpeaker] = useState<"none" | "user" | "sarah">("none");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const vapiRef = useRef<Vapi | null>(null);
  const userTokenRef = useRef<string | null>(null);
  const turnsRef = useRef<Turn[]>([]);

  useEffect(() => { turnsRef.current = turns; }, [turns]);

  useEffect(() => {
    let token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      token = crypto.randomUUID();
      localStorage.setItem(TOKEN_KEY, token);
    }
    userTokenRef.current = token;

    const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    if (!publicKey) { setError("Missing NEXT_PUBLIC_VAPI_PUBLIC_KEY"); return; }

    const vapi = new Vapi(publicKey);
    vapiRef.current = vapi;

    vapi.on("call-start", () => { setStatus("live"); setError(null); });
    vapi.on("call-end", () => {
      setStatus("ended");
      setSpeaker("none");
      void saveAndGetFeedback();
    });
    vapi.on("speech-start", () => setSpeaker("sarah"));
    vapi.on("speech-end", () => setSpeaker("none"));

    vapi.on("message", (msg: unknown) => {
      const m = msg as { type?: string; transcriptType?: string; role?: "user" | "assistant"; transcript?: string };
      if (m?.type === "transcript" && m.transcriptType === "final" &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.transcript === "string" && m.transcript.trim().length > 0) {
        const turn = { role: m.role, text: m.transcript.trim() };
        setTurns((prev) => [...prev, turn]);
        if (m.role === "user") setSpeaker("user");
      }
    });

    vapi.on("error", (e: unknown) => {
      const msg = (e as { errorMsg?: string; message?: string })?.errorMsg
        ?? (e as { message?: string })?.message ?? "Unknown Vapi error";
      setError(msg);
      setStatus("idle");
    });

    return () => { try { vapi.stop(); } catch {} };
  }, []);

  async function startCall() {
    setError(null); setLimitMsg(null); setTurns([]); setFeedback(null);

    try {
      const r = await fetch(apiUrl(`/api/voice-limit?userToken=${encodeURIComponent(userTokenRef.current!)}`));
      const j = await r.json();
      if (!j.allowed) { setLimitMsg(j.message || "Daily practice limit reached."); return; }
    } catch { /* non-fatal — proceed */ }

    setStatus("connecting");
    const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
    if (!assistantId) { setError("Missing NEXT_PUBLIC_VAPI_ASSISTANT_ID"); setStatus("idle"); return; }
    try {
      await vapiRef.current?.start(assistantId);
    } catch (e) {
      setError((e as Error).message); setStatus("idle");
    }
  }

  function endCall() { vapiRef.current?.stop(); }

  async function saveAndGetFeedback() {
    try {
      const saveRes = await fetch(apiUrl("/api/voice-session"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userToken: userTokenRef.current, transcript: turnsRef.current }),
      });
      const saveJson = await saveRes.json();
      if (saveRes.status === 429) { setLimitMsg(saveJson.message || "Daily practice limit reached."); return; }
      if (!saveRes.ok) throw new Error(saveJson.error || "save failed");

      setFeedbackLoading(true);
      const fbRes = await fetch(apiUrl("/api/voice-feedback"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: saveJson.sessionId }),
      });
      const fbJson = await fbRes.json();
      if (!fbRes.ok) throw new Error(fbJson.error || "feedback failed");
      setFeedback(fbJson.feedback);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setFeedbackLoading(false);
    }
  }

  const live = status === "live";

  return (
    <div className="min-h-screen bg-cream text-ink flex flex-col">
      <header className="px-6 md:px-10 py-5 border-b border-line">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="text-[11px] tracking-[0.2em] uppercase text-ink-soft hover:text-ink transition">
            ← Dating&nbsp;Coach
          </Link>
        </div>
      </header>

      <div className="px-6 md:px-10 pt-10 pb-4">
        <div className="max-w-3xl mx-auto">
          <p className="text-[10px] tracking-[0.25em] uppercase text-ink-fade mb-2">The Call</p>
          <h1 className="font-display text-4xl md:text-5xl">A first call with <em className="text-accent">Sarah</em>.</h1>
          <p className="text-ink-soft mt-3 text-[15px] max-w-xl">
            Talk like it&apos;s a real first phone call. End it whenever you want — the coach will tell you what worked.
          </p>
        </div>
      </div>

      <section className="px-6 md:px-10 py-12">
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-6">
          <MicOrb status={status} speaker={speaker} />
          <StatusLabel status={status} speaker={speaker} />

          {status === "idle" && !limitMsg && (
            <button onClick={startCall} className="bg-ink text-cream rounded-full px-8 py-4 text-sm font-medium hover:bg-accent transition mt-2">
              Start the call
            </button>
          )}
          {status === "connecting" && <div className="text-ink-fade text-sm">Dialing…</div>}
          {live && (
            <button onClick={endCall} className="bg-accent text-cream rounded-full px-8 py-4 text-sm font-medium hover:bg-ink transition">
              End call
            </button>
          )}
          {status === "ended" && (
            <button onClick={startCall} className="border border-ink/20 hover:border-ink/60 rounded-full px-8 py-4 text-sm font-medium transition">
              Practice again
            </button>
          )}
        </div>
      </section>

      <main className="flex-1 px-6 md:px-10 pb-16">
        <div className="max-w-3xl mx-auto">
          {limitMsg && (
            <div className="border border-accent/30 bg-accent-soft rounded-2xl p-5 mb-8">
              <div className="text-[10px] uppercase tracking-[0.2em] text-accent mb-2">Daily limit</div>
              <div className="text-ink text-[15px]">{limitMsg}</div>
            </div>
          )}
          {error && (
            <div className="border border-accent/30 bg-accent-soft rounded-2xl p-5 mb-8 text-[14px] text-ink">{error}</div>
          )}

          {turns.length > 0 && (
            <div className="bg-paper border border-line rounded-2xl p-6 md:p-8 mb-8">
              <div className="text-[10px] tracking-[0.25em] uppercase text-ink-fade mb-5">Transcript</div>
              <div className="space-y-4">
                {turns.map((t, i) => (
                  <div key={i} className="flex gap-4">
                    <div className={`text-[10px] uppercase tracking-[0.2em] mt-1.5 shrink-0 w-14 ${
                      t.role === "user" ? "text-ink" : "text-accent"
                    }`}>{t.role === "user" ? "You" : "Sarah"}</div>
                    <div className="text-[15px] leading-relaxed text-ink-soft flex-1">{t.text}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {status === "ended" && (
            <div className="bg-paper border border-line rounded-2xl p-6 md:p-8">
              <div className="text-[10px] tracking-[0.25em] uppercase text-accent mb-5">Coach Feedback</div>
              {feedbackLoading && <div className="text-ink-fade italic">Coach is listening back…</div>}
              {!feedbackLoading && feedback && (
                <div className="font-display text-lg md:text-xl leading-[1.6] text-ink whitespace-pre-wrap">{feedback}</div>
              )}
              {!feedbackLoading && !feedback && !error && (
                <div className="text-ink-fade text-sm">No feedback yet — the call may have been too short.</div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function MicOrb({ status, speaker }: { status: Status; speaker: "none" | "user" | "sarah" }) {
  const live = status === "live";
  return (
    <div className="relative">
      {live && (
        <>
          <span className={`absolute inset-0 rounded-full ${
            speaker === "sarah" ? "bg-accent/20 animate-ping"
              : speaker === "user" ? "bg-ink/10 animate-ping" : ""
          }`} />
          <span className="absolute inset-0 rounded-full bg-ink/[0.03]" />
        </>
      )}
      <div className={`relative w-40 h-40 rounded-full flex items-center justify-center transition-all duration-300 ${
        live
          ? speaker === "sarah"
            ? "bg-accent text-cream scale-105 shadow-[0_0_60px_-15px_rgba(189,59,15,0.5)]"
            : speaker === "user"
            ? "bg-ink text-cream"
            : "bg-paper border border-line-strong text-ink"
          : status === "ended"
          ? "bg-paper border border-line text-ink-fade"
          : "bg-paper border border-line-strong text-ink"
      }`}>
        <svg viewBox="0 0 24 24" className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="9" y="3" width="6" height="12" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0M12 18v3" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

function StatusLabel({ status, speaker }: { status: Status; speaker: "none" | "user" | "sarah" }) {
  let text = "Ready when you are.";
  let cls = "text-ink-fade";
  if (status === "connecting") text = "Dialing…";
  else if (status === "live") {
    if (speaker === "sarah") { text = "Sarah is talking"; cls = "text-accent"; }
    else if (speaker === "user") { text = "She's listening"; cls = "text-ink"; }
    else { text = "Live"; cls = "text-ok"; }
  } else if (status === "ended") { text = "Call ended"; cls = "text-ink-soft"; }
  return <div className={`text-[11px] tracking-[0.25em] uppercase ${cls}`}>· {text} ·</div>;
}

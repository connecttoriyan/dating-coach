// app/sessions/page.tsx — past sessions list (calls Python backend)
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiUrl } from "@/lib/api";

type Message = { role: "user" | "assistant"; content: string };
type Session = {
  id: string;
  type: "chat" | "voice";
  transcript: Message[];
  feedback: string | null;
  created_at: string;
};

const TOKEN_KEY = "dating_coach_user_token";

export default function SessionsPage() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(apiUrl(`/api/sessions?userToken=${encodeURIComponent(token)}`))
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setSessions(data.sessions ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-cream text-ink flex flex-col">
      <header className="px-6 md:px-10 py-5 border-b border-line">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/"
            className="text-[11px] tracking-[0.2em] uppercase text-ink-soft hover:text-ink transition"
          >
            ← Dating&nbsp;Coach
          </Link>
        </div>
      </header>

      <div className="px-6 md:px-10 pt-10 pb-6">
        <div className="max-w-3xl mx-auto">
          <p className="text-[10px] tracking-[0.25em] uppercase text-ink-fade mb-2">The Replay</p>
          <h1 className="font-display text-4xl md:text-5xl">Everything you&apos;ve worked through.</h1>
        </div>
      </div>

      <main className="flex-1 px-6 md:px-10 pb-16">
        <div className="max-w-3xl mx-auto">
          {loading && <Empty>Loading your sessions…</Empty>}
          {!loading && error && <Empty><span className="text-accent">{error}</span></Empty>}
          {!loading && !error && sessions.length === 0 && (
            <Empty>
              Nothing here yet.{" "}
              <Link href="/coach" className="underline hover:text-accent">Start a conversation →</Link>
            </Empty>
          )}
          {!loading && sessions.length > 0 && (
            <div className="space-y-3">
              {sessions.map((s) => {
                const isOpen = expanded === s.id;
                const firstMsg = s.transcript.find((m) => m.role === "user")?.content ?? "(empty)";
                const dt = new Date(s.created_at);
                const dateStr = dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
                const timeStr = dt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
                return (
                  <div key={s.id} className="bg-paper border border-line rounded-2xl overflow-hidden transition hover:border-line-strong">
                    <button onClick={() => setExpanded(isOpen ? null : s.id)} className="w-full text-left p-5 md:p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`text-[10px] tracking-[0.2em] uppercase px-2 py-0.5 rounded ${
                          s.type === "voice" ? "bg-accent-soft text-accent" : "bg-cream text-ink-soft border border-line"
                        }`}>{s.type}</span>
                        <span className="text-[11px] tracking-wide text-ink-fade">
                          {dateStr} · {timeStr} · {s.transcript.length} turns
                        </span>
                      </div>
                      <div className="text-[15px] text-ink leading-relaxed line-clamp-2">{firstMsg}</div>
                      <div className="text-[11px] text-ink-fade mt-3">
                        {isOpen ? "Collapse —" : "Read full session →"}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t border-line bg-cream/40 p-5 md:p-6 space-y-4">
                        {s.transcript.map((m, i) => (
                          <div key={i} className="flex gap-4 text-[14px] leading-relaxed">
                            <div className={`text-[10px] uppercase tracking-[0.2em] mt-1 shrink-0 w-16 ${
                              m.role === "user" ? "text-ink" : "text-accent"
                            }`}>
                              {m.role === "user" ? "You" : s.type === "voice" ? "Sarah" : "Coach"}
                            </div>
                            <div className="text-ink-soft whitespace-pre-wrap flex-1">{m.content}</div>
                          </div>
                        ))}
                        {s.feedback && (
                          <div className="mt-5 pt-5 border-t border-line">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-accent mb-3">Coach feedback</div>
                            <div className="font-display text-[17px] leading-[1.6] text-ink whitespace-pre-wrap">{s.feedback}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-ink-soft text-[15px] border border-line bg-paper rounded-2xl p-10 text-center">
      {children}
    </div>
  );
}

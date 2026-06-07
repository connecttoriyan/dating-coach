// app/coach/page.tsx — Editorial chat UI
// (Frontend only — calls the Python FastAPI backend via apiUrl)
"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { apiUrl } from "@/lib/api";

type Message = { role: "user" | "assistant"; content: string };
const TOKEN_KEY = "dating_coach_user_token";

export default function CoachPage() {
  const [userToken, setUserToken] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [limitMsg, setLimitMsg] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      token = crypto.randomUUID();
      localStorage.setItem(TOKEN_KEY, token);
    }
    setUserToken(token);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function newConversation() {
    setMessages([]);
    setSessionId(null);
    setLimitMsg(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function send() {
    if (!input.trim() || streaming || !userToken) return;

    const userMsg: Message = { role: "user", content: input };
    const nextMessages = [...messages, userMsg];

    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);
    setLimitMsg(null);

    try {
      // Talks to the Python FastAPI backend.
      const res = await fetch(apiUrl("/api/coach"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, userToken, sessionId }),
      });

      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        setMessages((prev) => prev.slice(0, -1));
        setLimitMsg(data.message || "Daily limit reached. Try again tomorrow.");
        setStreaming(false);
        return;
      }

      if (!res.ok || !res.body) throw new Error(`API returned ${res.status}`);

      const newSessionId = res.headers.get("X-Session-Id");
      if (newSessionId && newSessionId !== sessionId) setSessionId(newSessionId);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: "assistant", content: `Error: ${msg}` };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream text-ink flex flex-col">
      <header className="px-6 md:px-10 py-5 border-b border-line">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="text-[11px] tracking-[0.2em] uppercase text-ink-soft hover:text-ink transition"
          >
            ← Dating&nbsp;Coach
          </Link>
          <button
            onClick={newConversation}
            disabled={streaming || messages.length === 0}
            className="text-xs text-ink-soft hover:text-accent disabled:opacity-30 disabled:hover:text-ink-soft transition"
          >
            + New conversation
          </button>
        </div>
      </header>

      <div className="px-6 md:px-10 pt-10 pb-6">
        <div className="max-w-3xl mx-auto">
          <p className="text-[10px] tracking-[0.25em] uppercase text-ink-fade mb-2">The Chat</p>
          <h1 className="font-display text-4xl md:text-5xl">What&apos;s on your mind?</h1>
        </div>
      </div>

      <main className="flex-1 px-6 md:px-10 pb-6">
        <div className="max-w-3xl mx-auto">
          {messages.length === 0 && !limitMsg && (
            <div className="text-ink-soft text-[15px] leading-relaxed border-l-2 border-line pl-5 my-8">
              Tell me what&apos;s going on. A stalled chat, an opener you&apos;re
              second-guessing, a date that felt off — anything.
            </div>
          )}

          {limitMsg && (
            <div className="my-8 border border-accent/30 bg-accent-soft rounded-2xl p-5">
              <div className="text-[10px] uppercase tracking-[0.2em] text-accent mb-2">Daily limit</div>
              <div className="text-ink text-[15px]">{limitMsg}</div>
            </div>
          )}

          <div className="space-y-6 mt-6">
            {messages.map((m, i) => (
              <Bubble
                key={i}
                role={m.role}
                content={m.content}
                isStreaming={streaming && i === messages.length - 1}
              />
            ))}
            <div ref={endRef} />
          </div>
        </div>
      </main>

      <footer className="px-6 md:px-10 py-5 border-t border-line bg-paper">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-3 bg-cream border border-line-strong rounded-2xl p-2 focus-within:border-ink/40 transition">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder={userToken ? "What's the situation?" : "Loading…"}
              disabled={streaming || !userToken}
              className="flex-1 bg-transparent px-3 py-2 text-[15px] outline-none resize-none disabled:opacity-50 max-h-40"
              style={{ minHeight: "2.5rem" }}
            />
            <button
              onClick={send}
              disabled={streaming || !input.trim() || !userToken}
              className="bg-ink text-cream rounded-xl px-5 py-2.5 text-sm font-medium disabled:opacity-30 hover:bg-accent transition shrink-0"
            >
              Send
            </button>
          </div>
          <div className="text-[11px] text-ink-fade mt-2 text-center">
            Enter to send · Shift+Enter for a new line
          </div>
        </div>
      </footer>
    </div>
  );
}

function Bubble({
  role, content, isStreaming,
}: { role: "user" | "assistant"; content: string; isStreaming: boolean }) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="bg-ink text-cream rounded-2xl rounded-br-md px-5 py-3 max-w-[80%] text-[15px] leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      </div>
    );
  }
  return (
    <div className="max-w-[95%]">
      <div className="text-[10px] uppercase tracking-[0.2em] text-ink-fade mb-2">Coach</div>
      <div className="text-ink text-[15px] leading-[1.7] whitespace-pre-wrap">
        {content || <span className="text-ink-fade italic">listening…</span>}
        {isStreaming && content && (
          <span className="inline-block w-2 h-4 ml-1 bg-accent align-text-bottom animate-pulse" />
        )}
      </div>
    </div>
  );
}

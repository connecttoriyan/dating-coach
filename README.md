# Dating Coach

An AI dating coach for guys who struggle with conversations on dating apps. Two surfaces:

- **Text Coach** — paste a stalled chat or describe a situation, get coaching in natural language. Powered by Claude Sonnet 4.6 with a custom "elder brother" system prompt.
- **Voice Practice** — a live voice call with "Sarah," an AI playing the role of a first match. Practice talking out loud. After the call, the coach reviews the transcript and gives feedback.

## Stack

- **Next.js 16** (App Router) + Tailwind + TypeScript
- **Anthropic Claude** for all reasoning (coach + persona + post-call review)
- **Vapi** for real-time voice (STT, TTS, turn-taking)
- **Supabase** for session persistence (no auth — sessions scoped to a per-browser token)
- **Vercel** for hosting

## Run locally

```bash
cp .env.example .env.local   # fill in your keys
npm install
npm run dev
```

You'll need keys from: console.anthropic.com, supabase.com, vapi.ai.

## Schema (Supabase)

```sql
create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_token text not null,
  type text not null check (type in ('chat', 'voice')),
  transcript jsonb not null default '[]'::jsonb,
  feedback text,
  created_at timestamptz not null default now()
);
create index sessions_user_token_idx on sessions (user_token);
```

## Day 1 build

Built start-to-finish in one day as a build-in-public project. See `/app/api/coach/route.ts` for the system prompt — that's where most of the product lives.

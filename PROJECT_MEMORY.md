# Dating Coach — Project Memory

> A complete reference of what was built, decisions made, and learnings discovered.
> Designed to be pasted into any LLM as context for generating LinkedIn posts, follow-ups, or threads.

---

## TL;DR (for an LLM)

I (Riyan) built an AI dating coach in two passes.

**Day 1 (May 28, 2026)** — shipped a Next.js + TypeScript app end-to-end:
text coach (Claude), voice practice (Vapi), post-call feedback, sessions
persistence (Supabase), rate limiting, editorial UI.

**Day 2 (June 8, 2026)** — pivoted to a **hybrid architecture**: rewrote
the backend as **FastAPI + Python** to better reflect the AI engineering
day-job stack (Python is the lingua franca). Frontend stayed Next.js
(React + Tailwind, the editorial design). Vapi stayed in the browser.

Code on GitHub. Not deployed yet — public launch later. Use this doc as
ground truth when drafting any LinkedIn post.

---

## WHAT IT IS

A web app that helps men get better at dating-app conversations — not by giving pickup lines, but by helping them *read* what's happening socially. Three things it does:

1. **The Chat** — User types a situation (stalled chat, a confusing reply, a date that felt off). Coach Claude responds in a warm, elder-brother voice. Streams in real time. Saves to history.
2. **The Call** — User clicks "Start" and has an actual voice conversation with "Sarah," a 27-year-old marketing person from Bangalore who acts like a real first-call match. After hanging up, the coach reviews the transcript and gives feedback.
3. **The Replay** — Every session (chat + voice) saved per user. Expandable in a clean editorial UI. Feedback embedded inline.

No login. A random UUID per browser (in localStorage) is the "user."

## ARCHITECTURE (Day 2: hybrid)

```
   Browser (React/Tailwind)
       │ HTTP + Vapi SDK
       ▼
   FastAPI backend (Python)  ← rate limits + Claude + Supabase
       │
       ├── Anthropic Claude
       ├── Supabase (Postgres)
       └── (Vapi runs browser-side only)
```

**Why hybrid not full Python?**
- The frontend is already polished and screenshot-worthy — no reason to rebuild it in Streamlit/Gradio just to say "100% Python."
- The "AI engineer" signal lives in the backend. That's now Python.
- Vapi's only client SDK is JS. Forcing it through Python would mean reimplementing real-time WebRTC ourselves — wrong trade-off for Day 2.

## THE STACK

| Layer | Tech | Why |
|---|---|---|
| Frontend | Next.js 16 (App Router) + Tailwind v4 + TypeScript | Editorial design preserved from Day 1, screenshot-worthy. |
| **Backend** | **FastAPI + Python 3.11+** | The AI engineering surface. Async-native, OpenAPI docs free, deploys cleanly to Render/Railway. |
| LLM | Claude Sonnet 4.6 via `anthropic` Python SDK | Same model powers coach + voice persona (via Vapi) + post-call review. |
| Database | Supabase (Postgres + JSONB) via `supabase-py` | One table (`sessions`), JSONB transcript column. Same schema across Day 1 and Day 2. |
| Voice | Vapi (browser JS SDK) | Real-time WebRTC, STT (Deepgram), TTS (11labs), turn-taking. |
| Design | Instrument Serif + Inter, cream/coral editorial palette | Distinct from generic SaaS dashboards. |

## REPO LAYOUT

```
.
├── app/                       # Next.js frontend
│   ├── coach/page.tsx
│   ├── practice/page.tsx
│   ├── sessions/page.tsx
│   ├── page.tsx               # Landing
│   ├── layout.tsx
│   └── globals.css            # Editorial design tokens (Tailwind v4 @theme)
├── lib/api.ts                 # Frontend → backend URL helper
├── backend/                   # FastAPI Python backend
│   ├── main.py                # App entry + CORS
│   ├── lib/
│   │   ├── supabase_client.py # supabase-py admin client
│   │   ├── rate_limit.py      # Daily caps per user_token
│   │   └── prompts.py         # Coach + feedback system prompts
│   └── routes/
│       ├── coach.py           # POST /api/coach (streaming)
│       ├── sessions.py        # GET  /api/sessions
│       └── voice.py           # voice-session, voice-feedback, voice-limit
├── README.md
├── PROJECT_MEMORY.md
├── linkedin_carousel.html     # 7-slide LinkedIn carousel
└── .env.local                 # Frontend env (NEXT_PUBLIC_*)
```

## THE PROMPT ITERATION STORY (LinkedIn gold)

The system prompt for the text coach went through **three rewrites** before it felt right.

**V1 — "Coach Cam, the older brother"** — short prompt with structured output (read situation → 3 options → one principle). Worked. Felt like ChatGPT with character.

**V2 — "Production-grade master prompt"** — detailed internal analysis framework + 5-step response structure. More thoughtful. But responses came out feeling like coaching worksheets with headings.

**V3 — "Conversational Elder Brother"** (the one that shipped) — long prompt that kept the internal analysis but added: **"NEVER expose the analysis as a checklist. The user receives only natural conversation."** Heavy emphasis on what NOT to sound like (corporate, therapist, pickup coach). Examples of good tone ("Hmm... this feels pretty early-stage") and bad tone ("Signal Interpretation").

**Lesson:** Negation in prompts is underrated. Telling the model what NOT to sound like is often more powerful than telling it what to sound like. The prompt is the product.

## THE DAY 2 PIVOT (new LinkedIn material)

After shipping the TS version, I rewrote the backend in Python because:
1. Python is the AI engineering day-job lingua franca — almost every AI/ML role wants it.
2. The FastAPI patterns (async streaming, Pydantic, dependency injection) are what most AI startups look for.
3. Wanted to show I can take the same product and own both stacks.

**What stayed the same**: the database schema, the system prompts, the frontend UX, the editorial design.
**What changed**: the API layer — TypeScript Anthropic SDK + Supabase client → Python equivalents. CORS. Two-process local dev.

**Lesson worth posting**: when you have a working product, a rewrite isn't waste — it's *evidence*. Same outcome, two stacks, demonstrates fluency without starting over.

## ARCHITECTURE PATTERNS WORTH POSTING

**BFF (Backend for Frontend).** Browser → Python API → AI providers. Keys stay server-side. Logic centralized. Add observability/auth without touching the UI.

**Streaming responses in FastAPI:**
```python
def generate():
    with anthropic.messages.stream(...) as stream:
        for chunk in stream.text_stream:
            yield chunk
return StreamingResponse(generate(), media_type="text/plain")
```
Same pattern as the TS version, just Pythonic.

**Two-prompt architecture for voice.** Persona prompt drives the live call. A *different* prompt reviews the saved transcript and grades it. Interactive prompt + review prompt = chat → product.

**Per-user state without auth.** Browser generates a UUID, stores in localStorage. Sessions in Supabase scoped to that UUID. Good enough for v1.

**Rate limiting without Redis.** Query the existing sessions table per user_token for the last 24h. No new dependencies.

## WHAT WENT WRONG (the honest stuff)

- **Local file syncing issues** on Windows kept truncating `.env.local`. Switched to bash heredocs.
- **First system prompt wasn't right.** Three iterations.
- **No deploy on Day 1.** Skipped to ship the LinkedIn moment faster — deploy follows.
- **Day 2 rewrite was non-trivial** — even though it's "just a port," CORS, async patterns, and DB SDK differences all required care.

## QUOTABLE LINES

- "The hardest part wasn't the code. It was teaching the AI not to *sound* like AI."
- "V1 sounded like ChatGPT in a wig. V2 read like a coaching worksheet. V3 — written like a smart elder brother who's seen this a thousand times — was the one that worked."
- "The prompt is the product. Everything else is plumbing."
- "Telling the model what NOT to sound like is often more powerful than telling it what to sound like."
- "Most dating advice teaches you what to send. This one teaches you what to notice."
- "Two-prompt architectures (interactive prompt + review prompt) are how chat turns into a product."
- "A rewrite isn't waste. It's evidence."
- "Same product, two stacks, in two days. The signal isn't that I can build it once — it's that I can hold the whole shape in my head."

## WHAT'S NOT BUILT YET

- Multi-language voice (Hindi, Tamil, Spanish, etc.)
- Profile reviewer (upload bio + photos, get critique)
- Authentication + persistent identity across devices
- Real evals — how do you measure "good coaching"? Build a rubric, score outputs.
- Multiple voice personas (Sarah → different match personalities)
- Memory across sessions ("you said last week she ghosted — how did the next one go?")
- Deployment (frontend → Vercel, backend → Render)

## PROJECT STATUS — END OF DAY 2

- ✅ Text coach (Python FastAPI + Claude streaming, v3 prompt)
- ✅ Voice practice (Vapi + Sarah persona)
- ✅ Post-call feedback (Python route, separate Claude prompt)
- ✅ Per-user session persistence (Supabase via supabase-py)
- ✅ Rate limiting (30 chat/day, 3 voice/day per user_token, Python)
- ✅ Editorial design system (unchanged from Day 1)
- ✅ Hybrid architecture: Next.js frontend + FastAPI backend
- ✅ Code on GitHub: `github.com/connecttoriyan/dating-coach`
- ⏭ Not deployed (Day 3+)
- ⏭ No multi-language (Day 3+)
- ⏭ No evals (Day 3+)

## HOW TO USE THIS DOC

Paste any or all of this into Claude/ChatGPT/etc. with a prompt like:
- "Write a LinkedIn post about pivoting from TypeScript to Python."
- "Draft a thread about the prompt iteration story."
- "Write a Day 7 build-in-public update where I've now added multi-language."

The doc is the ground truth. Don't let any LLM hallucinate features that aren't here.

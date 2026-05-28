// app/page.tsx — Landing page. Editorial layout.
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-cream text-ink">
      {/* HEADER */}
      <header className="px-6 md:px-10 py-6 border-b border-line">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="text-[11px] tracking-[0.2em] font-medium uppercase">
            Dating&nbsp;Coach
          </div>
          <Link
            href="/sessions"
            className="text-xs text-ink-soft hover:text-ink transition border-b border-transparent hover:border-ink"
          >
            Past sessions
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="px-6 md:px-10 pt-20 md:pt-32 pb-24">
        <div className="max-w-4xl mx-auto">
          <p className="text-[11px] uppercase tracking-[0.2em] text-accent font-medium mb-8">
            For the conversation that&apos;s about to die
          </p>

          <h1 className="font-display text-[44px] md:text-[80px] leading-[1.05] tracking-tight mb-8">
            The dating coach <br />
            that <em className="italic text-accent">actually</em> listens.
          </h1>

          <p className="text-lg md:text-xl text-ink-soft max-w-2xl leading-relaxed mb-12">
            Talk through any situation. Practice out loud with a real voice.
            Get feedback from someone who&apos;s seen every bad first
            message ever sent.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/coach"
              className="bg-ink text-cream rounded-full px-7 py-4 text-sm font-medium hover:bg-accent transition w-fit"
            >
              Chat with the coach →
            </Link>
            <Link
              href="/practice"
              className="border border-ink/20 hover:border-ink/60 rounded-full px-7 py-4 text-sm font-medium transition w-fit"
            >
              Try a voice date →
            </Link>
          </div>
        </div>
      </section>

      {/* THREE COLUMNS */}
      <section className="px-6 md:px-10 py-20 border-t border-line bg-paper">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-16 md:gap-12">
            <Feature
              num="01"
              kicker="The chat"
              title="Paste a stalled conversation."
              body="Get the read on what she&apos;s actually saying, then three replies — each labeled with what it&apos;s trying to do."
            />
            <Feature
              num="02"
              kicker="The call"
              title="Practice out loud."
              body="A real voice call with Sarah, a match who talks like a person. Get used to thinking on your feet."
            />
            <Feature
              num="03"
              kicker="The replay"
              title="See what you&apos;re repeating."
              body="Every session saved. Every pattern surfaced. The same thing keeps killing your matches — find out what."
            />
          </div>
        </div>
      </section>

      {/* PHILOSOPHY QUOTE */}
      <section className="px-6 md:px-10 py-24 border-t border-line">
        <div className="max-w-3xl mx-auto text-center">
          <p className="font-display italic text-2xl md:text-3xl leading-relaxed text-ink-soft">
            &ldquo;Most dating advice teaches you what to send.
            <br />
            <span className="text-ink">This one teaches you what to notice.</span>&rdquo;
          </p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-6 md:px-10 py-20 border-t border-line bg-paper">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-5xl mb-6">
            Start with one conversation.
          </h2>
          <p className="text-ink-soft mb-8 max-w-xl mx-auto">
            Free during the public preview. No login. No app to download.
            Just a tab in your browser.
          </p>
          <Link
            href="/coach"
            className="inline-block bg-accent text-cream rounded-full px-8 py-4 text-sm font-medium hover:bg-ink transition"
          >
            Open the coach →
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-6 md:px-10 py-8 border-t border-line text-[11px] tracking-wide text-ink-fade">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between gap-2">
          <div>Built with Claude · Next.js · Vapi · Supabase</div>
          <div>Day 1, shipped in public</div>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  num,
  kicker,
  title,
  body,
}: {
  num: string;
  kicker: string;
  title: string;
  body: string;
}) {
  return (
    <div>
      <div className="text-[10px] tracking-[0.25em] uppercase text-ink-fade mb-4">
        {num} &nbsp;/&nbsp; {kicker}
      </div>
      <h3 className="font-display text-2xl md:text-3xl mb-3 leading-snug">
        {title}
      </h3>
      <p className="text-ink-soft leading-relaxed text-[15px]">{body}</p>
    </div>
  );
}

import { getUser } from '@/lib/auth'
import Link from 'next/link'
import Image from 'next/image'

const features = [
  {
    icon: '🔍',
    title: 'Scans Vinted & Gumtree',
    desc: 'Automatically checks both platforms every few minutes so you never miss a deal.',
  },
  {
    icon: '⚡',
    title: 'Instant Discord Alerts',
    desc: 'Get a rich embed straight into your Discord server the moment a match appears.',
  },
  {
    icon: '🎯',
    title: 'Smart Filtering',
    desc: 'Set keywords, excluded words, and price ranges — only get notified for what matters.',
  },
  {
    icon: '🔁',
    title: 'Duplicate-free',
    desc: "Every listing is tracked so you'll never be alerted about the same item twice.",
  },
  {
    icon: '⏸️',
    title: 'Pause & resume',
    desc: 'Easily pause any watch from the dashboard or straight from Discord with /pause.',
  },
  {
    icon: '📊',
    title: 'Alert history',
    desc: 'Browse every alert ever sent, with images, prices, and listing dates in one place.',
  },
]

export default async function HomePage() {
  const user = await getUser()

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">

      {/* Navbar */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-bold tracking-tight text-white">
            Resale<span className="text-teal-400">Watch</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-zinc-400 md:flex">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="flex items-center gap-2">
                  {user.user_metadata?.avatar_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.user_metadata.avatar_url}
                      alt="avatar"
                      className="h-7 w-7 rounded-full"
                    />
                  )}
                  <span className="hidden text-sm text-zinc-300 sm:block">
                    {user.user_metadata?.full_name ?? user.email}
                  </span>
                </div>
                <Link
                  href="/dashboard/watches"
                  className="rounded-lg bg-teal-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-teal-400 transition-colors"
                >
                  Dashboard →
                </Link>
              </>
            ) : (
              <Link
                href="/login"
                className="rounded-lg bg-teal-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-teal-400 transition-colors"
              >
                Sign in with Discord
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16">
        {/* Background image */}
        <div className="absolute inset-0">
          <Image
            src="/Gemini_Generated_Image_56e32b56e32b56e3.avif"
            alt="Hero background"
            fill
            className="object-cover object-center"
            priority
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/60 via-zinc-950/50 to-zinc-950" />
        </div>

        {/* Hero content */}
        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-1.5 text-sm text-teal-300">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
            Now scanning Vinted & Gumtree
          </div>
          <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight text-white md:text-6xl">
            Never miss a
            <br />
            <span className="text-teal-400">resale deal</span> again
          </h1>
          <p className="mb-10 text-lg leading-relaxed text-zinc-300">
            Set up a watch, connect your Discord, and get instant alerts when
            new listings match your search — automatically, 24/7.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href={user ? '/dashboard/watches' : '/login'}
              className="rounded-xl bg-teal-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-teal-500/20 hover:bg-teal-400 transition-colors"
            >
              {user ? 'Go to dashboard →' : 'Start free — sign in with Discord'}
            </Link>
            <a
              href="#features"
              className="rounded-xl border border-white/20 px-8 py-3.5 text-base font-medium text-zinc-300 hover:border-white/40 hover:text-white transition-colors"
            >
              See how it works
            </a>
          </div>
          <p className="mt-5 text-sm text-zinc-500">No credit card required · 30-day free trial</p>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-zinc-500">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-14 text-center">
          <h2 className="mb-3 text-3xl font-bold text-white">Everything you need</h2>
          <p className="text-zinc-400">Built for resellers who can't afford to miss a listing.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(f => (
            <div
              key={f.title}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 hover:border-zinc-700 transition-colors"
            >
              <div className="mb-3 text-2xl">{f.icon}</div>
              <h3 className="mb-2 font-semibold text-white">{f.title}</h3>
              <p className="text-sm leading-relaxed text-zinc-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-zinc-800 bg-zinc-900/50 py-24">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="mb-14 text-center text-3xl font-bold text-white">How it works</h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { step: '01', title: 'Create a watch', desc: 'Enter a search query, set price limits and keywords, pick your source.' },
              { step: '02', title: 'Connect Discord', desc: 'Add the bot to your server and choose which channel gets the alerts.' },
              { step: '03', title: 'Get notified', desc: 'The worker scans continuously and sends a rich embed the moment a match appears.' },
            ].map(s => (
              <div key={s.step} className="flex flex-col gap-3">
                <span className="text-4xl font-black text-teal-500/30">{s.step}</span>
                <h3 className="font-semibold text-white">{s.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-5xl px-6 py-24">
        <div className="mb-14 text-center">
          <h2 className="mb-3 text-3xl font-bold text-white">Simple pricing</h2>
          <p className="text-zinc-400">Start free. Upgrade when you're ready.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Free trial */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
            <p className="mb-1 text-sm font-medium text-zinc-400">Free trial</p>
            <p className="mb-6 text-4xl font-bold text-white">£0 <span className="text-lg font-normal text-zinc-500">/ 30 days</span></p>
            <ul className="mb-8 space-y-3 text-sm text-zinc-300">
              {['1 active watch', 'Vinted + Gumtree scanning', 'Discord alerts', 'Alert history'].map(item => (
                <li key={item} className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-teal-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/login"
              className="block w-full rounded-xl border border-zinc-700 py-3 text-center text-sm font-medium text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors"
            >
              Start free trial
            </Link>
          </div>

          {/* Pro */}
          <div className="relative rounded-2xl border border-teal-500/40 bg-zinc-900 p-8 shadow-xl shadow-teal-500/10">
            <div className="absolute -top-3 left-6 rounded-full bg-teal-500 px-3 py-0.5 text-xs font-semibold text-white">
              Most popular
            </div>
            <p className="mb-1 text-sm font-medium text-teal-400">Pro</p>
            <p className="mb-6 text-4xl font-bold text-white">£9 <span className="text-lg font-normal text-zinc-500">/ month</span></p>
            <ul className="mb-8 space-y-3 text-sm text-zinc-300">
              {[
                'Unlimited watches',
                'Vinted + Gumtree scanning',
                'Discord alerts',
                'Alert history',
                'Keyword & price filters',
                'Pause / resume anytime',
              ].map(item => (
                <li key={item} className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-teal-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href={user ? '/dashboard/billing' : '/login'}
              className="block w-full rounded-xl bg-teal-500 py-3 text-center text-sm font-semibold text-white hover:bg-teal-400 transition-colors"
            >
              {user ? 'Upgrade to Pro' : 'Get started'}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-zinc-500 sm:flex-row">
          <span>ResaleWatch</span>
          <div className="flex gap-6">
            <a href="#features" className="hover:text-zinc-300 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-zinc-300 transition-colors">Pricing</a>
            <Link href="/login" className="hover:text-zinc-300 transition-colors">Sign in</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}

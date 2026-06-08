import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Smartphone } from 'lucide-react'
import { TrimlyLogo } from '@/components/TrimlyLogo'
import { Reveal } from '@/components/Reveal'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// Barbershop hero, Unsplash License (free for commercial use, no attribution required).
// Verified to resolve. Given a teal editorial overlay in the markup below.
const HERO_IMAGE =
  'https://images.unsplash.com/photo-1641318175316-795cd2db99f8?auto=format&fit=crop&w=1400&q=80'

// Android app — APK published on the GitHub release. Tapping it downloads the .apk.
const ANDROID_APK_URL =
  'https://github.com/fiblagcc/Trimly/releases/download/demo-apk-20260608-005534/Trimly.apk'

const STEPS = [
  { n: '01', title: 'Search your ZIP', body: 'See the barbers near you who are open for bookings right now.' },
  { n: '02', title: 'Pick a time', body: 'Choose an open slot and the service you want, then confirm in a tap.' },
  { n: '03', title: 'Show up sharp', body: 'Get directions on the day and walk in without the wait.' },
]

export function LandingPage() {
  const navigate = useNavigate()
  const [zip, setZip] = React.useState('')

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault()
    navigate(zip.trim() ? `/login?zip=${encodeURIComponent(zip.trim())}` : '/login')
  }

  return (
    <div className="min-h-screen bg-sand">
      {/* Nav */}
      <header className="mx-auto flex h-20 max-w-[1200px] items-center justify-between px-6">
        <TrimlyLogo size="nav" />
        <Link to="/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          Sign in
        </Link>
      </header>

      {/* Hero: text + search left, a real barbershop photo right. */}
      <section className="mx-auto max-w-[1200px] px-6 pb-20 pt-10 lg:pb-28 lg:pt-16">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h1 className="heading-hero text-balance">Find a barber near you.</h1>
            <p className="mt-5 max-w-md text-lg text-ink/70">
              Book online and skip the wait. Enter your ZIP to see the barbers taking
              appointments today.
            </p>

            <form onSubmit={onSearch} className="mt-8 flex max-w-md gap-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/70" />
                <Input
                  aria-label="ZIP code"
                  placeholder="Enter your ZIP code"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  inputMode="numeric"
                  className="h-12 pl-10 text-base"
                />
              </div>
              <Button type="submit" size="lg">
                Search
              </Button>
            </form>
            <p className="mt-3 text-sm text-ink/70">
              Trying the demo? Search <span className="font-semibold text-primary-dark">10001</span>.
            </p>

            {/* Android app download — app-store-style pill. The one device moment. */}
            <div className="mt-8 border-t border-ink/10 pt-6">
              <a
                href={ANDROID_APK_URL}
                className="group inline-flex items-center gap-3 rounded-xl bg-dark-anchor px-5 py-3 text-white transition-all duration-150 hover:bg-dark-anchor/90 active:scale-[0.98]"
              >
                <Smartphone className="h-6 w-6 shrink-0" />
                <span className="flex flex-col text-left leading-tight">
                  <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/60">
                    Download to your phone now
                  </span>
                  <span className="text-[15px] font-semibold">Get the Android app</span>
                </span>
              </a>
            </div>
          </div>

          {/* Hero image with a teal editorial overlay. */}
          <div className="relative overflow-hidden rounded-card-lg">
            <img
              src={HERO_IMAGE}
              alt="A barber giving a client a fresh cut in the chair"
              width={1400}
              height={1050}
              loading="eager"
              className="h-[360px] w-full object-cover sm:h-[460px] lg:h-[540px]"
            />
            <div
              className="absolute inset-0 bg-primary-dark/30 mix-blend-multiply"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute inset-0 rounded-card-lg ring-1 ring-inset ring-ink/10"
              aria-hidden="true"
            />
          </div>
        </div>
      </section>

      {/* How it works: a genuine three-step sequence. */}
      <section className="mx-auto max-w-[1200px] px-6 py-20 lg:py-28">
        <Reveal>
          <h2 className="heading-page max-w-xl text-balance">Booking takes about a minute.</h2>
        </Reveal>
        <div className="mt-12 grid gap-x-10 gap-y-12 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 90}>
              <div className="font-display text-5xl font-semibold text-primary lg:text-6xl">
                {s.n}
              </div>
              <h3 className="heading-section mt-4">{s.title}</h3>
              <p className="mt-2 max-w-xs text-ink/70">{s.body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* For barbers: the one dark surface, the one amber moment. */}
      <section className="bg-dark-anchor">
        <div className="mx-auto flex max-w-[1200px] flex-col items-start gap-10 px-6 py-20 lg:flex-row lg:items-center lg:justify-between lg:py-28">
          <div className="max-w-xl">
            <h2 className="font-display text-4xl font-semibold leading-tight text-white lg:text-5xl">
              Run the chair, not the phone.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-white/70">
              Set your availability, switch your subscription on, and you are listed for
              everyone searching your area. Bookings arrive in real time, and there is no
              app to install.
            </p>
          </div>
          <Link
            to="/login"
            className="inline-flex h-12 shrink-0 items-center justify-center rounded-xl bg-accent px-7 text-base font-semibold text-ink transition-all duration-150 hover:bg-accent/90 active:scale-[0.98]"
          >
            List your shop
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark-anchor">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-6 border-t border-white/10 px-6 py-10 sm:flex-row">
          <TrimlyLogo size="footer" tone="light" />
          <div className="flex items-center gap-6 text-sm text-white/60">
            <Link to="/login" className="transition-colors hover:text-white">
              Sign in
            </Link>
            <span>&copy; 2026 Trimly</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

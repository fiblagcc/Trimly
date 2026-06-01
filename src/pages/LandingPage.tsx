import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Scissors, CalendarClock, MapPin } from 'lucide-react'
import { TrimlyLogo } from '@/components/TrimlyLogo'
import { TrimlyMark } from '@/components/TrimlyMark'
import { Reveal } from '@/components/Reveal'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const STEPS = [
  { n: '01', title: 'Search your ZIP', body: 'See the barbers near you who are taking bookings right now.' },
  { n: '02', title: 'Pick a time', body: 'Choose an open slot and the service you want. Confirm in a tap.' },
  { n: '03', title: 'Show up sharp', body: 'Get directions on the day, and skip the wait when you arrive.' },
]

const VALUES = [
  { icon: CalendarClock, title: 'Real open times', body: 'You only see slots a barber has actually opened — no phone tag.' },
  { icon: MapPin, title: 'Directions built in', body: 'Every upcoming booking links straight to the shop on the map.' },
  { icon: Scissors, title: 'Made for local shops', body: 'Independent barbers list their chair and manage it themselves.' },
]

export function LandingPage() {
  const navigate = useNavigate()
  const [zip, setZip] = React.useState('')

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Search needs an account — carry the ZIP through sign-in to the client search.
    navigate(zip.trim() ? `/login?zip=${encodeURIComponent(zip.trim())}` : '/login')
  }

  return (
    <div className="min-h-screen bg-sand">
      {/* Nav */}
      <header className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
        <TrimlyLogo size="nav" />
        <Link to="/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          Sign in
        </Link>
      </header>

      {/* Hero — asymmetric: text + search left, art-directed panel right. */}
      <section className="mx-auto max-w-[1200px] px-6 pt-12 pb-20 lg:pt-20 lg:pb-32">
        <div className="grid items-center gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h1 className="heading-hero">
              Find a barber
              <br />
              near you.
            </h1>
            <p className="mt-5 max-w-md text-lg text-ink/60">
              Book online and skip the wait. Enter your ZIP to see who’s taking
              appointments today.
            </p>

            <form onSubmit={onSearch} className="mt-8 flex max-w-md gap-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
                <Input
                  aria-label="ZIP code"
                  placeholder="Enter your ZIP code"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  inputMode="numeric"
                  className="h-12 pl-10"
                />
              </div>
              <Button type="submit" size="lg">
                Search
              </Button>
            </form>
            <p className="mt-3 text-sm text-ink/45">
              Trying the demo? Search <span className="font-medium text-ink/70">10001</span>.
            </p>
          </div>

          {/* The single dark anchor on this view — an art-directed block, no stock photo. */}
          <div className="lg:col-span-5">
            <div className="relative overflow-hidden rounded-card-lg bg-dark-anchor p-8 lg:translate-y-6 lg:-mb-16">
              <TrimlyMark
                size={220}
                className="pointer-events-none absolute -right-10 -top-10 opacity-10"
              />
              <p className="label-section !text-white/40">Trimly</p>
              <p className="mt-3 max-w-[18ch] font-display text-3xl leading-tight text-white">
                Your chair, fully booked.
              </p>
              {/* the one deliberate amber moment on this screen */}
              <span className="mt-5 block h-1 w-16 rounded-full bg-accent" />
              <p className="mt-5 text-sm text-white/55">
                Barbers list their shop, set their hours, and watch bookings land in
                real time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-[1200px] px-6 py-24 lg:py-28">
        <Reveal>
          <p className="label-section">How it works</p>
          <h2 className="heading-page mt-2 max-w-xl">Three steps, no phone calls.</h2>
        </Reveal>
        <div className="mt-12 grid gap-10 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 80}>
              <div className="font-display text-6xl font-semibold text-primary/25">{s.n}</div>
              <h3 className="heading-section mt-3">{s.title}</h3>
              <p className="mt-2 text-ink/60">{s.body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Value trio — honest, specific, no stats or ratings */}
      <section className="mx-auto max-w-[1200px] px-6 pb-24">
        <div className="grid gap-4 md:grid-cols-3">
          {VALUES.map((v, i) => (
            <Reveal key={v.title} delay={i * 80}>
              <div className="editorial-card h-full">
                <v.icon className="h-6 w-6 text-primary" />
                <h3 className="mt-4 font-medium text-ink">{v.title}</h3>
                <p className="mt-1.5 text-sm text-ink/60">{v.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* For barbers — dark band, mid-page color shift */}
      <section className="bg-dark-anchor">
        <div className="mx-auto flex max-w-[1200px] flex-col items-start gap-8 px-6 py-20 lg:flex-row lg:items-center lg:justify-between lg:py-24">
          <div className="max-w-xl">
            <p className="label-section !text-accent/80">For barbers</p>
            <h2 className="mt-3 font-display text-4xl font-semibold leading-tight text-white">
              List your shop. Fill your chair.
            </h2>
            <p className="mt-4 text-white/60">
              Set your availability, flip your subscription on, and you’re visible to
              everyone searching your area. Bookings arrive live — no app to install.
            </p>
          </div>
          <Link
            to="/login"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-accent px-7 text-base font-medium text-ink transition-all duration-150 hover:bg-accent/90 active:scale-[0.98]"
          >
            Get listed
          </Link>
        </div>
      </section>

      {/* Footer — dark surface */}
      <footer className="bg-dark-anchor">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-6 border-t border-white/10 px-6 py-10 sm:flex-row">
          <TrimlyLogo size="footer" tone="light" />
          <div className="flex items-center gap-6 text-sm text-white/50">
            <Link to="/login" className="hover:text-white">
              Sign in
            </Link>
            <span>Built for a systems analysis project</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react'
import { Search, Smartphone, MapPin, CalendarCheck } from 'lucide-react'
import { TrimlyLogo } from '@/components/TrimlyLogo'
import { Reveal, Stagger, StaggerItem } from '@/components/Reveal'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// Barbershop hero, Unsplash License (free for commercial use, no attribution required).
const HERO_IMAGE =
  'https://images.unsplash.com/photo-1641318175316-795cd2db99f8?auto=format&fit=crop&w=1400&q=80'

// Android app - APK published on the GitHub release. Tapping it downloads the .apk.
const ANDROID_APK_URL =
  'https://github.com/fiblagcc/Trimly/releases/download/demo-apk-20260608-005534/Trimly.apk'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

const STEPS = [
  { n: '01', icon: Search, title: 'Search your ZIP', body: 'See the barbers near you who are open for bookings right now.' },
  { n: '02', icon: CalendarCheck, title: 'Pick a time', body: 'Choose an open slot and the service you want, then confirm in a tap.' },
  { n: '03', icon: MapPin, title: 'Show up sharp', body: 'Get directions on the day and walk in without the wait.' },
]

export function LandingPage() {
  const navigate = useNavigate()
  const [zip, setZip] = React.useState('')
  const reduce = useReducedMotion()
  const heroRef = React.useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const imgY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, 44])

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault()
    navigate(zip.trim() ? `/login?zip=${encodeURIComponent(zip.trim())}` : '/login')
  }

  return (
    <div className="min-h-screen bg-sand">
      {/* Sticky, blurred nav */}
      <header className="sticky top-0 z-50 border-b border-ink/8 bg-sand/75 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5 sm:px-6">
          <TrimlyLogo size="nav" />
          <Link to="/login" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section ref={heroRef} className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: 'var(--gradient-hero)' }}
        />
        <div className="relative mx-auto grid max-w-[1200px] items-center gap-9 px-5 pb-14 pt-8 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:pb-20 lg:pt-14">
          <div>
            <motion.h1
              className="heading-hero text-balance"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE }}
            >
              Find a barber near you.
            </motion.h1>
            <motion.p
              className="mt-4 max-w-md text-lg text-ink/70"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12, ease: EASE }}
            >
              Book online and skip the wait. Enter your ZIP to see the barbers taking
              appointments today.
            </motion.p>

            <motion.form
              onSubmit={onSearch}
              className="mt-6 flex max-w-md gap-3"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: EASE }}
            >
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
            </motion.form>
            <motion.p
              className="mt-3 text-sm text-ink/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              Trying the demo? Search <span className="font-semibold text-primary-dark">10001</span>.
            </motion.p>

            {/* Android app download - app-store-style pill. */}
            <motion.div
              className="mt-7 border-t border-ink/10 pt-5"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.38, ease: EASE }}
            >
              <a
                href={ANDROID_APK_URL}
                className="surface-anchor group inline-flex items-center gap-3 rounded-xl px-5 py-3 text-white shadow-soft transition-all duration-200 ease-out-expo hover:-translate-y-px hover:shadow-pop active:translate-y-0 active:scale-[0.98]"
              >
                <Smartphone className="h-6 w-6 shrink-0" />
                <span className="flex flex-col text-left leading-tight">
                  <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/60">
                    Download to your phone now
                  </span>
                  <span className="text-[15px] font-semibold">Get the Android app</span>
                </span>
              </a>
            </motion.div>
          </div>

          {/* Hero image with a subtle scroll parallax + teal editorial overlay. */}
          <motion.div
            className="relative h-[340px] overflow-hidden rounded-card-lg shadow-pop sm:h-[440px] lg:h-[500px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.1, ease: EASE }}
          >
            <motion.img
              style={{ y: imgY, scale: 1.18 }}
              src={HERO_IMAGE}
              alt="A barber giving a client a fresh cut in the chair"
              loading="eager"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-primary-dark/25 mix-blend-multiply" aria-hidden="true" />
            <div
              className="pointer-events-none absolute inset-0 rounded-card-lg ring-1 ring-inset ring-ink/10"
              aria-hidden="true"
            />
          </motion.div>
        </div>
      </section>

      {/* How it works: a genuine three-step sequence, staggered in. */}
      <section className="mx-auto max-w-[1200px] px-5 py-14 sm:px-6 lg:py-20">
        <Reveal>
          <h2 className="heading-page max-w-xl text-balance">Booking takes about a minute.</h2>
        </Reveal>
        <Stagger className="mt-10 grid gap-x-8 gap-y-9 sm:grid-cols-3">
          {STEPS.map((s) => (
            <StaggerItem key={s.n}>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-badge-active-bg text-primary-dark">
                  <s.icon className="h-5 w-5" />
                </span>
                <span className="font-display text-2xl font-semibold text-primary/40">{s.n}</span>
              </div>
              <h3 className="heading-section mt-4">{s.title}</h3>
              <p className="mt-2 max-w-xs text-ink/70">{s.body}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* For barbers: the one dark surface, the one amber moment. */}
      <section className="surface-anchor">
        <div className="mx-auto flex max-w-[1200px] flex-col items-start gap-8 px-5 py-14 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:py-20">
          <Reveal className="max-w-xl">
            <h2 className="font-display text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
              Run the chair, not the phone.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-white/70">
              Set your availability, switch your subscription on, and you are listed for
              everyone searching your area. Bookings arrive in real time, right in your browser.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <Link
              to="/login"
              className="inline-flex h-12 shrink-0 items-center justify-center rounded-xl bg-accent px-7 text-base font-semibold text-ink shadow-soft transition-all duration-200 ease-out-expo hover:-translate-y-px hover:shadow-pop active:translate-y-0 active:scale-[0.98]"
            >
              List your shop
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark-anchor">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-5 border-t border-white/10 px-5 py-9 sm:flex-row sm:px-6">
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

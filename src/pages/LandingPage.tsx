import { Link } from 'react-router-dom'
import { TrimlyLogo } from '@/components/TrimlyLogo'
import { buttonVariants } from '@/components/ui/button'

// Minimal placeholder — the full editorial showcase is built in Step 9.
export function LandingPage() {
  return (
    <div className="min-h-screen bg-sand">
      <header className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
        <TrimlyLogo size="nav" />
        <Link to="/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          Sign in
        </Link>
      </header>
      <section className="mx-auto max-w-[1200px] px-6 py-24">
        <h1 className="heading-hero max-w-2xl">Find a barber near you.</h1>
        <p className="mt-5 max-w-md text-lg text-ink/60">
          Book online and skip the wait.
        </p>
        <div className="mt-8">
          <Link to="/login" className={buttonVariants({ size: 'lg' })}>
            Get started
          </Link>
        </div>
      </section>
    </div>
  )
}

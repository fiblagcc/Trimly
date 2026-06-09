import * as React from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth, dashboardPath } from '@/lib/auth'
import { TrimlyLogo } from '@/components/TrimlyLogo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Role } from '@/lib/types'

type Mode = 'login' | 'signup'

const ROLE_OPTIONS: { value: Role; label: string; hint: string }[] = [
  { value: 'client', label: 'Client', hint: 'Find and book a barber' },
  { value: 'barber', label: 'Barber', hint: 'List your shop, take bookings' },
  { value: 'admin', label: 'Admin', hint: 'Support and reporting' },
]

// Barbershop brand panel image (Unsplash License, verified). Same shot as the landing.
const LOGIN_IMAGE =
  'https://images.unsplash.com/photo-1641318175316-795cd2db99f8?auto=format&fit=crop&w=1200&q=80'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

// Never let an auth call hang the form forever. If the network or auth lock stalls,
// reject after a bounded wait so the button recovers and shows a clear message.
function withTimeout<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ])
}

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { session, profile, loading } = useAuth()
  const [mode, setMode] = React.useState<Mode>('login')

  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [fullName, setFullName] = React.useState('')
  const [role, setRole] = React.useState<Role>('client')
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [submitting, setSubmitting] = React.useState(false)

  // Already authenticated → bounce to the right dashboard. A client arriving from the
  // landing hero carries a ?zip= which we forward into their search.
  React.useEffect(() => {
    if (!loading && session && profile) {
      const zip = searchParams.get('zip')
      const dest =
        profile.role === 'client' && zip
          ? `/client?zip=${encodeURIComponent(zip)}`
          : dashboardPath(profile.role)
      navigate(dest, { replace: true })
    }
  }, [loading, session, profile, navigate, searchParams])

  const validate = () => {
    const next: Record<string, string> = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter a valid email address.'
    if (password.length < 6) next.password = 'Password must be at least 6 characters.'
    if (mode === 'signup' && !fullName.trim()) next.fullName = 'Tell us your name.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      if (mode === 'signup') {
        const { data, error } = await withTimeout(
          supabase.auth.signUp({
            email,
            password,
            options: { data: { role, full_name: fullName.trim() } },
          }),
          15000,
          'Sign up is taking too long. Check your connection and try again.'
        )
        if (error) throw error
        // If email confirmation is off, a session is returned and onAuthStateChange
        // will redirect. If it's on, prompt the user to confirm.
        if (!data.session) {
          toast.success('Account created. Check your email to confirm, then sign in.')
          setMode('login')
        }
      } else {
        const { error } = await withTimeout(
          supabase.auth.signInWithPassword({ email, password }),
          12000,
          'Sign in is taking too long. Check your connection and try again.'
        )
        if (error) throw error
        // Redirect handled by the effect once the profile resolves.
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.'
      setErrors({ form: message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left: the form */}
      <div className="flex items-center justify-center bg-sand px-6 py-12">
        <div className="w-full max-w-md">
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <Link to="/" aria-label="Trimly home">
              <TrimlyLogo size="auth" />
            </Link>
          </motion.div>

          <motion.div
            className="editorial-card p-8"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease: EASE }}
          >
          <div className="mb-6">
            <h1 className="heading-page">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="mt-1 text-sm text-ink/70">
              {mode === 'login'
                ? 'Sign in to manage your bookings.'
                : 'Pick the kind of account you need.'}
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  aria-invalid={!!errors.fullName}
                />
                {errors.fullName && <p className="text-xs text-red-600">{errors.fullName}</p>}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                aria-invalid={!!errors.email}
              />
              {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                aria-invalid={!!errors.password}
              />
              {errors.password && <p className="text-xs text-red-600">{errors.password}</p>}
            </div>

            {mode === 'signup' && (
              <fieldset className="space-y-1.5">
                <legend className="mb-1.5 block text-sm font-medium text-ink/80">
                  I am a…
                </legend>
                <div className="grid grid-cols-3 gap-2">
                  {ROLE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRole(opt.value)}
                      aria-pressed={role === opt.value}
                      className="relative rounded-xl border border-ink/15 px-3 py-2.5 text-left transition-colors duration-150 hover:border-ink/30"
                    >
                      {role === opt.value && (
                        <motion.span
                          layoutId="rolePill"
                          className="absolute inset-0 rounded-xl border border-primary bg-badge-active-bg"
                          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                        />
                      )}
                      <span className="relative block text-sm font-medium text-ink">{opt.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-ink/70">
                  {ROLE_OPTIONS.find((o) => o.value === role)?.hint}
                </p>
              </fieldset>
            )}

            {errors.form && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</p>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-ink/70">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              className="font-medium text-primary hover:underline"
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login')
                setErrors({})
              }}
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
          </motion.div>
        </div>
      </div>

      {/* Right: brand panel, the one dark surface for this layout. */}
      <aside className="relative hidden overflow-hidden lg:block">
        <motion.img
          src={LOGIN_IMAGE}
          alt="A barber at work in the chair"
          className="absolute inset-0 h-full w-full object-cover"
          initial={{ scale: 1.12 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.6, ease: EASE }}
        />
        <div className="absolute inset-0 bg-primary-dark/40 mix-blend-multiply" aria-hidden="true" />
        <div className="absolute inset-0 bg-dark-anchor/40" aria-hidden="true" />
        <div className="relative flex h-full flex-col justify-end p-12">
          <motion.p
            className="max-w-sm font-display text-4xl font-semibold leading-tight text-white"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
          >
            Book a barber near you, skip the wait.
          </motion.p>
          <motion.p
            className="mt-4 max-w-xs text-white/70"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35, ease: EASE }}
          >
            Real open times from real shops, confirmed in a tap.
          </motion.p>
        </div>
      </aside>
    </div>
  )
}

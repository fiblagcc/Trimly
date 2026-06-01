/* eslint-disable react-refresh/only-export-components -- provider, hook, and helper live together by design */
import * as React from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile, Role } from '@/lib/types'

interface AuthState {
  session: Session | null
  profile: Profile | null
  loading: boolean
  refreshProfile: () => void
  signOut: () => Promise<void>
}

const AuthContext = React.createContext<AuthState | null>(null)

const DASHBOARD_BY_ROLE: Record<Role, string> = {
  client: '/client',
  barber: '/barber',
  admin: '/admin',
}
export const dashboardPath = (role: Role | undefined) =>
  role ? DASHBOARD_BY_ROLE[role] : '/login'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null)
  const [profile, setProfile] = React.useState<Profile | null>(null)
  const [authReady, setAuthReady] = React.useState(false)
  const [profileReady, setProfileReady] = React.useState(false)
  const [nonce, setNonce] = React.useState(0)

  // Track the auth session. CRITICAL: never await a Supabase query inside this
  // callback. supabase-js holds an auth lock while it emits SIGNED_IN, and a query
  // here re-enters that lock and can hang signInWithPassword (the "Please wait..."
  // that never resolves). We only set state here; the profile loads in the effect
  // below, off this callback's stack.
  React.useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setAuthReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  // Load the profile whenever the signed-in user changes (or on manual refresh).
  const uid = session?.user?.id
  React.useEffect(() => {
    if (!uid) {
      setProfile(null)
      setProfileReady(true)
      return
    }
    let active = true
    setProfileReady(false)
    supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return
        setProfile((data as Profile) ?? null)
        setProfileReady(true)
      })
    return () => {
      active = false
    }
  }, [uid, nonce])

  // Loading until we know the auth state, and (when signed in) until the profile resolves.
  const loading = !authReady || (!!uid && !profileReady)

  const value: AuthState = {
    session,
    profile,
    loading,
    refreshProfile: () => setNonce((n) => n + 1),
    signOut: async () => {
      // Local scope clears the stored session right away and does not depend on a
      // server round-trip succeeding, so sign-out is reliable even with a stale token.
      try {
        await supabase.auth.signOut({ scope: 'local' })
      } catch {
        // Ignore: we clear local state below regardless of the network result.
      }
      setSession(null)
      setProfile(null)
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}

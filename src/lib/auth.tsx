/* eslint-disable react-refresh/only-export-components -- provider, hook, and helper live together by design */
import * as React from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile, Role } from '@/lib/types'

interface AuthState {
  session: Session | null
  profile: Profile | null
  loading: boolean
  refreshProfile: () => Promise<void>
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
  const [loading, setLoading] = React.useState(true)

  const loadProfile = React.useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null)
      return
    }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    setProfile((data as Profile) ?? null)
  }, [])

  React.useEffect(() => {
    let active = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      await loadProfile(data.session?.user.id)
      if (active) setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, next) => {
      setSession(next)
      await loadProfile(next?.user.id)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  const value: AuthState = {
    session,
    profile,
    loading,
    refreshProfile: () => loadProfile(session?.user.id),
    signOut: async () => {
      await supabase.auth.signOut()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}

import { Navigate, useLocation } from 'react-router-dom'
import { useAuth, dashboardPath } from '@/lib/auth'
import type { Role } from '@/lib/types'
import { TrimlyMark } from '@/components/TrimlyMark'

// Route guard keyed on profiles.role (NOT on hiding links - SPEC §7):
//   • logged out                  → /login
//   • logged in, wrong role       → redirected to their own dashboard
//   • profile row not ready yet   → brief loading state
export function RoleRoute({ allow, children }: { allow: Role; children: React.ReactNode }) {
  const { session, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sand">
        <TrimlyMark size={40} className="animate-pulse" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  // Session exists but the profile role doesn't match this route.
  if (profile && profile.role !== allow) {
    return <Navigate to={dashboardPath(profile.role)} replace />
  }

  // Session but no profile yet (rare trigger lag) - send to login to re-resolve.
  if (!profile) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

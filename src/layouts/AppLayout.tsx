import * as React from 'react'
import { Outlet, useNavigate, Link } from 'react-router-dom'
import { TrimlyLogo } from '@/components/TrimlyLogo'
import { NotificationBell } from '@/components/NotificationBell'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { LogOut } from 'lucide-react'

// Shown while a code-split dashboard chunk loads.
function RouteFallback() {
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
      <div className="shimmer h-9 w-48 rounded-lg" />
      <div className="shimmer mt-6 h-72 w-full rounded-card-lg" />
    </div>
  )
}

export function AppLayout() {
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()

  const handleSignOut = async () => {
    // Navigate no matter what so a failed network revoke can never strand the user.
    try {
      await signOut()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-sand">
      <header className="sticky top-0 z-40 border-b border-ink/8 bg-sand/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="Trimly home">
            <TrimlyLogo size="nav" />
          </Link>
          <div className="flex items-center gap-3">
            <NotificationBell />
            {profile?.full_name && (
              <span className="hidden text-sm text-ink/70 sm:inline">{profile.full_name}</span>
            )}
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main>
        <React.Suspense fallback={<RouteFallback />}>
          <Outlet />
        </React.Suspense>
      </main>
    </div>
  )
}

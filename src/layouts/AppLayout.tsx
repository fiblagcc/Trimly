import { Outlet, useNavigate, Link } from 'react-router-dom'
import { TrimlyLogo } from '@/components/TrimlyLogo'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { LogOut } from 'lucide-react'

export function AppLayout() {
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-sand">
      <header className="sticky top-0 z-40 border-b border-ink/8 bg-sand/85 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
          <Link to="/" aria-label="Trimly home">
            <TrimlyLogo size="nav" />
          </Link>
          <div className="flex items-center gap-4">
            {profile?.full_name && (
              <span className="hidden text-sm text-ink/60 sm:inline">
                {profile.full_name}
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}

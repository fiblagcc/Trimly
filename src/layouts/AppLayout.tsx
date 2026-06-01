import { Outlet, useNavigate } from 'react-router-dom'
import { TrimlyLogo } from '@/components/TrimlyLogo'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { LogOut } from 'lucide-react'

export function AppLayout() {
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-sand">
      <header className="sticky top-0 z-50 border-b border-ink/8 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
          <TrimlyLogo size="nav" />
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}

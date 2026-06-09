import * as React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/lib/auth'
import { AppLayout } from '@/layouts/AppLayout'
import { RoleRoute } from '@/components/RoleRoute'
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/LoginPage'

// Dashboards are code-split: the landing and login load without the heavier
// authenticated bundles (calendar, motion-rich dashboards) coming along for the ride.
const ClientDashboard = React.lazy(() =>
  import('@/pages/ClientDashboard').then((m) => ({ default: m.ClientDashboard }))
)
const BarberDashboard = React.lazy(() =>
  import('@/pages/BarberDashboard').then((m) => ({ default: m.BarberDashboard }))
)
const AdminDashboard = React.lazy(() =>
  import('@/pages/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    // reducedMotion="user" makes every Motion animation honor prefers-reduced-motion
    // (transforms/layout collapse to a crossfade) without per-component guards.
    <MotionConfig reducedMotion="user">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />

              <Route element={<AppLayout />}>
                <Route
                  path="/client"
                  element={
                    <RoleRoute allow="client">
                      <ClientDashboard />
                    </RoleRoute>
                  }
                />
                <Route
                  path="/barber"
                  element={
                    <RoleRoute allow="barber">
                      <BarberDashboard />
                    </RoleRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <RoleRoute allow="admin">
                      <AdminDashboard />
                    </RoleRoute>
                  }
                />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                borderRadius: '0.75rem',
                border: '1px solid rgba(26,26,26,0.08)',
                fontFamily: 'var(--font-sans)',
              },
            }}
          />
        </AuthProvider>
      </QueryClientProvider>
    </MotionConfig>
  )
}

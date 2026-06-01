import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/lib/auth'
import { AppLayout } from '@/layouts/AppLayout'
import { RoleRoute } from '@/components/RoleRoute'
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/LoginPage'
import { ClientDashboard } from '@/pages/ClientDashboard'
import { BarberDashboard } from '@/pages/BarberDashboard'
import { AdminDashboard } from '@/pages/AdminDashboard'

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
  )
}

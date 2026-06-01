import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppLayout } from '@/layouts/AppLayout'
import { LoginPage } from '@/pages/LoginPage'
import { ClientDashboard } from '@/pages/ClientDashboard'
import { BarberDashboard } from '@/pages/BarberDashboard'
import { AdminDashboard } from '@/pages/AdminDashboard'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes — guards added in Step 2 */}
          <Route element={<AppLayout />}>
            <Route path="/client" element={<ClientDashboard />} />
            <Route path="/barber" element={<BarberDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>

          {/* Catch-all → login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

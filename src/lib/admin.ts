import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { SupportTicket, TicketStatus, Profile } from '@/lib/types'

// ── Support tickets (admin reads all) ────────────────────────────────────────
export type TicketRow = SupportTicket & {
  opener: Pick<Profile, 'full_name'> | null
}

export function useTickets() {
  return useQuery({
    queryKey: ['admin-tickets'],
    queryFn: async (): Promise<TicketRow[]> => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select(
          'id, opened_by, subject, body, status, created_at,' +
            'opener:profiles!support_tickets_opened_by_fkey(full_name)'
        )
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as TicketRow[]
    },
  })
}

export function useUpdateTicketStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; status: TicketStatus }) => {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: input.status })
        .eq('id', input.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-tickets'] }),
  })
}

// ── Report: real counts via head/count queries ───────────────────────────────
export interface Report {
  totalBookings: number
  activeShops: number
  totalUsers: number
  openTickets: number
}

export function useReport(enabled: boolean) {
  return useQuery({
    queryKey: ['admin-report'],
    enabled,
    queryFn: async (): Promise<Report> => {
      const head = { count: 'exact' as const, head: true }
      const [bookings, shops, users, tickets] = await Promise.all([
        supabase.from('appointments').select('*', head),
        supabase.from('barbershops').select('*', head).eq('is_active', true),
        supabase.from('profiles').select('*', head),
        supabase.from('support_tickets').select('*', head).eq('status', 'open'),
      ])
      const firstError = bookings.error || shops.error || users.error || tickets.error
      if (firstError) throw firstError
      return {
        totalBookings: bookings.count ?? 0,
        activeShops: shops.count ?? 0,
        totalUsers: users.count ?? 0,
        openTickets: tickets.count ?? 0,
      }
    },
  })
}

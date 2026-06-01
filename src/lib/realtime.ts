import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { formatDateTime } from '@/lib/format'

// Step 6: subscribe to NEW appointments for this barber's shop. On insert, show a
// toast ("New booking from {client} at {time}") and refresh the bookings list.
// This stands in for the planned mobile push in the web demo. The channel is torn
// down on unmount / when the shop changes.
export function useBookingRealtime(shopId: string | undefined) {
  const qc = useQueryClient()

  React.useEffect(() => {
    if (!shopId) return

    // Ensure the realtime socket carries the user's JWT so RLS-gated changes flow.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) supabase.realtime.setAuth(data.session.access_token)
    })

    const channel = supabase
      .channel(`appointments:${shopId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments',
          filter: `barbershop_id=eq.${shopId}`,
        },
        async (payload) => {
          qc.invalidateQueries({ queryKey: ['incoming-bookings', shopId] })

          // Enrich the toast with the client name + slot time (barber can read both).
          const id = (payload.new as { id?: string }).id
          let who = 'a client'
          let when = ''
          if (id) {
            const { data } = await supabase
              .from('appointments')
              .select(
                'service, client:profiles!appointments_client_id_fkey(full_name), slot:availability_slots(starts_at)'
              )
              .eq('id', id)
              .maybeSingle()
            const row = data as
              | { service: string; client: { full_name: string | null } | null; slot: { starts_at: string } | null }
              | null
            if (row?.client?.full_name) who = row.client.full_name
            if (row?.slot?.starts_at) when = ` · ${formatDateTime(row.slot.starts_at)}`
          }
          toast(`New booking from ${who}`, { description: `Just came in${when}` })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [shopId, qc])
}

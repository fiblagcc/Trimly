import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AvailabilitySlot, Barbershop, Appointment } from '@/lib/types'

// ── Search active shops by ZIP ───────────────────────────────────────────────
export function useSearchShops(zip: string | null) {
  return useQuery({
    queryKey: ['search-shops', zip],
    enabled: !!zip,
    queryFn: async (): Promise<Barbershop[]> => {
      const { data, error } = await supabase
        .from('barbershops')
        .select('*')
        .eq('zip', zip!.trim())
        .eq('is_active', true)
        .order('shop_name', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })
}

// ── A shop's open, future slots (for the booking view) ───────────────────────
export function useShopOpenSlots(shopId: string | undefined) {
  return useQuery({
    queryKey: ['shop-open-slots', shopId],
    enabled: !!shopId,
    queryFn: async (): Promise<AvailabilitySlot[]> => {
      const { data, error } = await supabase
        .from('availability_slots')
        .select('*')
        .eq('barbershop_id', shopId!)
        .eq('is_booked', false)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })
}

// ── Book a slot (atomic RPC; race returns a friendly "just taken") ───────────
export class SlotTakenError extends Error {}

export function useBookSlot(clientId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { slotId: string; shopId: string; service: string }) => {
      const { data, error } = await supabase.rpc('book_slot', {
        p_slot_id: input.slotId,
        p_service: input.service,
      })
      if (error) {
        if (/already booked/i.test(error.message)) {
          throw new SlotTakenError('That slot was just taken. Please pick another.')
        }
        throw error
      }
      return data as Appointment
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['shop-open-slots', vars.shopId] })
      qc.invalidateQueries({ queryKey: ['my-bookings', clientId] })
    },
  })
}

// ── My bookings (with shop name, coords, slot time) ──────────────────────────
export type MyBooking = Appointment & {
  barbershop: Pick<Barbershop, 'shop_name' | 'address' | 'latitude' | 'longitude'> | null
  slot: Pick<AvailabilitySlot, 'starts_at' | 'duration_min'> | null
}

export function useMyBookings(clientId: string | undefined) {
  return useQuery({
    queryKey: ['my-bookings', clientId],
    enabled: !!clientId,
    queryFn: async (): Promise<MyBooking[]> => {
      const { data, error } = await supabase
        .from('appointments')
        .select(
          'id, slot_id, client_id, barbershop_id, service, status, created_at,' +
            'barbershop:barbershops(shop_name, address, latitude, longitude),' +
            'slot:availability_slots(starts_at, duration_min)'
        )
        .eq('client_id', clientId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as MyBooking[]
    },
  })
}

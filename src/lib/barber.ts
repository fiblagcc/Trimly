import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Appointment, AvailabilitySlot, Barbershop, Profile } from '@/lib/types'

// ── The barber's own shop (one per barber) ──────────────────────────────────
export function useMyShop(ownerId: string | undefined) {
  return useQuery({
    queryKey: ['my-shop', ownerId],
    enabled: !!ownerId,
    queryFn: async (): Promise<Barbershop | null> => {
      const { data, error } = await supabase
        .from('barbershops')
        .select('*')
        .eq('owner_id', ownerId!)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export type ShopFormValues = Pick<
  Barbershop,
  'shop_name' | 'bio' | 'zip' | 'address' | 'latitude' | 'longitude'
>

export function useSaveShop(ownerId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { existing: Barbershop | null; values: ShopFormValues }) => {
      const { existing, values } = input
      if (existing) {
        const { data, error } = await supabase
          .from('barbershops')
          .update(values)
          .eq('id', existing.id)
          .select()
          .single()
        if (error) throw error
        return data as Barbershop
      }
      // First save creates the shop, owned by this barber, inactive until subscribed.
      const { data, error } = await supabase
        .from('barbershops')
        .insert({ ...values, owner_id: ownerId })
        .select()
        .single()
      if (error) throw error
      return data as Barbershop
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-shop', ownerId] }),
  })
}

// ── Subscription toggle: flips is_active AND subscription_status together ─────
// NOTE: there is no real billing here. This is the single gate that makes a shop
// visible to clients. A real build would hand off to Stripe Checkout/Billing
// before flipping these flags - that integration would hook in right here.
export function useToggleSubscription(ownerId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { shopId: string; active: boolean }) => {
      const { error } = await supabase
        .from('barbershops')
        .update({
          is_active: input.active,
          subscription_status: input.active ? 'active' : 'inactive',
        })
        .eq('id', input.shopId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-shop', ownerId] }),
  })
}

// ── Availability slots ───────────────────────────────────────────────────────
export function useShopSlots(shopId: string | undefined) {
  return useQuery({
    queryKey: ['shop-slots', shopId],
    enabled: !!shopId,
    queryFn: async (): Promise<AvailabilitySlot[]> => {
      const { data, error } = await supabase
        .from('availability_slots')
        .select('*')
        .eq('barbershop_id', shopId!)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useAddSlot(shopId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { startsAt: string; durationMin: number }) => {
      const { error } = await supabase.from('availability_slots').insert({
        barbershop_id: shopId,
        starts_at: input.startsAt,
        duration_min: input.durationMin,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shop-slots', shopId] }),
  })
}

export function useDeleteSlot(shopId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (slotId: string) => {
      const { error } = await supabase.from('availability_slots').delete().eq('id', slotId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shop-slots', shopId] }),
  })
}

// ── Incoming bookings for this shop (with client name + slot time) ───────────
export type IncomingBooking = Appointment & {
  client: Pick<Profile, 'full_name'> | null
  slot: Pick<AvailabilitySlot, 'starts_at' | 'duration_min'> | null
}

export function useIncomingBookings(shopId: string | undefined) {
  return useQuery({
    queryKey: ['incoming-bookings', shopId],
    enabled: !!shopId,
    queryFn: async (): Promise<IncomingBooking[]> => {
      const { data, error } = await supabase
        .from('appointments')
        .select(
          'id, slot_id, client_id, barbershop_id, service, status, created_at,' +
            'client:profiles!appointments_client_id_fkey(full_name),' +
            'slot:availability_slots(starts_at, duration_min)'
        )
        .eq('barbershop_id', shopId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as IncomingBooking[]
    },
  })
}

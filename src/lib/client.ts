import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  AvailabilitySlot,
  Barbershop,
  Appointment,
  BarbershopRating,
  BusinessHour,
  Review,
  Service,
} from '@/lib/types'

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
    mutationFn: async (input: {
      slotId: string
      shopId: string
      service: string
      serviceId?: string | null
    }) => {
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
      const appt = data as Appointment
      // Link the chosen service row so its price shows on both sides. Best-effort: a
      // failure here returns an error in the response (not a throw), so the booking stands.
      if (input.serviceId) {
        await supabase.from('appointments').update({ service_id: input.serviceId }).eq('id', appt.id)
      }
      return appt
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['shop-open-slots', vars.shopId] })
      qc.invalidateQueries({ queryKey: ['my-bookings', clientId] })
    },
  })
}

// ── My bookings (with shop name, address, slot time) ─────────────────────────
export type MyBooking = Appointment & {
  barbershop: Pick<Barbershop, 'shop_name' | 'address' | 'zip'> | null
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
            'barbershop:barbershops(shop_name, address, zip),' +
            'slot:availability_slots(starts_at, duration_min)'
        )
        .eq('client_id', clientId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as MyBooking[]
    },
  })
}

// ── A shop's public service menu (active only), cheapest first ────────────────
export function useShopMenu(shopId: string | undefined) {
  return useQuery({
    queryKey: ['shop-menu', shopId],
    enabled: !!shopId,
    queryFn: async (): Promise<Service[]> => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('barbershop_id', shopId!)
        .eq('is_active', true)
        .order('price_cents', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })
}

// ── A shop's weekly hours + "open now" ────────────────────────────────────────
export function useShopHours(shopId: string | undefined) {
  return useQuery({
    queryKey: ['shop-hours', shopId],
    enabled: !!shopId,
    queryFn: async (): Promise<BusinessHour[]> => {
      const { data, error } = await supabase
        .from('business_hours')
        .select('*')
        .eq('barbershop_id', shopId!)
        .order('day_of_week', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useShopOpenNow(shopId: string | undefined) {
  return useQuery({
    queryKey: ['shop-open-now', shopId],
    enabled: !!shopId,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase.rpc('shop_open_now', { shop_id: shopId })
      if (error) throw error
      return !!data
    },
  })
}

// ── Ratings + reviews ─────────────────────────────────────────────────────────
export function useShopRating(shopId: string | undefined) {
  return useQuery({
    queryKey: ['shop-rating', shopId],
    enabled: !!shopId,
    queryFn: async (): Promise<BarbershopRating | null> => {
      const { data, error } = await supabase
        .from('barbershop_ratings')
        .select('*')
        .eq('barbershop_id', shopId!)
        .maybeSingle()
      if (error) throw error
      return (data as BarbershopRating | null) ?? null
    },
  })
}

export function useShopReviews(shopId: string | undefined) {
  return useQuery({
    queryKey: ['shop-reviews', shopId],
    enabled: !!shopId,
    queryFn: async (): Promise<Review[]> => {
      const { data, error } = await supabase
        .from('reviews')
        .select('id, barbershop_id, client_id, appointment_id, rating, comment, created_at')
        .eq('barbershop_id', shopId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Review[]
    },
  })
}

// The set of appointment ids the current client has already reviewed (to hide the
// "leave a review" prompt once used). RLS lets a client read their own review rows.
export function useMyReviews(clientId: string | undefined) {
  return useQuery({
    queryKey: ['my-reviews', clientId],
    enabled: !!clientId,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from('reviews')
        .select('appointment_id')
        .eq('client_id', clientId!)
      if (error) throw error
      const ids = (data ?? [])
        .map((r: { appointment_id: string | null }) => r.appointment_id)
        .filter((x): x is string => !!x)
      return new Set(ids)
    },
  })
}

export class AlreadyReviewedError extends Error {}

export function useLeaveReview(clientId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      shopId: string
      appointmentId: string
      rating: number
      comment: string
    }) => {
      const { error } = await supabase.from('reviews').insert({
        barbershop_id: input.shopId,
        appointment_id: input.appointmentId,
        rating: input.rating,
        comment: input.comment.trim() || null,
      })
      if (error) {
        if (error.code === '23505') throw new AlreadyReviewedError('You already reviewed this visit.')
        throw error
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['shop-reviews', vars.shopId] })
      qc.invalidateQueries({ queryKey: ['shop-rating', vars.shopId] })
      qc.invalidateQueries({ queryKey: ['my-reviews', clientId] })
    },
  })
}

// ── Favorites (saved shops) ───────────────────────────────────────────────────
export function useFavorites(userId: string | undefined) {
  return useQuery({
    queryKey: ['favorites', userId],
    enabled: !!userId,
    queryFn: async (): Promise<Barbershop[]> => {
      const { data, error } = await supabase
        .from('favorites')
        .select('created_at, barbershop:barbershops(*)')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      const rows = (data ?? []) as unknown as { barbershop: Barbershop | null }[]
      return rows.map((r) => r.barbershop).filter((s): s is Barbershop => !!s)
    },
  })
}

export function useToggleFavorite(userId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { shopId: string; on: boolean }) => {
      if (input.on) {
        const { error } = await supabase
          .from('favorites')
          .insert({ user_id: userId, barbershop_id: input.shopId })
        if (error && error.code !== '23505') throw error // ignore "already saved"
      } else {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', userId!)
          .eq('barbershop_id', input.shopId)
        if (error) throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorites', userId] }),
  })
}

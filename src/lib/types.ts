// Shared row types mirroring the Postgres schema (docs/SPEC.md §4).

export type Role = 'client' | 'barber' | 'admin'

export interface Profile {
  id: string
  role: Role
  full_name: string | null
  phone: string | null
  email: string | null
  created_at: string
}

export interface Barbershop {
  id: string
  owner_id: string
  shop_name: string
  bio: string | null
  zip: string
  address: string | null
  latitude: number | null
  longitude: number | null
  is_active: boolean
  subscription_status: 'active' | 'inactive'
  timezone: string
  created_at: string
}

export interface AvailabilitySlot {
  id: string
  barbershop_id: string
  starts_at: string
  duration_min: number
  is_booked: boolean
  created_at: string
}

export type AppointmentStatus = 'confirmed' | 'cancelled' | 'completed'

export interface Appointment {
  id: string
  slot_id: string
  client_id: string
  barbershop_id: string
  service: string
  service_id: string | null
  status: AppointmentStatus
  created_at: string
}

export type TicketStatus = 'open' | 'in_progress' | 'closed'

export interface SupportTicket {
  id: string
  opened_by: string
  subject: string
  body: string | null
  status: TicketStatus
  created_at: string
}

// Fallback service list, used only when a shop has not defined its own `services`
// rows yet. Real menus live in the `services` table (added by the phone team).
export const SERVICES = [
  'Haircut',
  'Beard trim',
  'Haircut + beard',
  'Kids cut',
  'Hot towel shave',
] as const

// ── Phone-app additions (live since migration 0002). See docs + SPEC. ───────────

// A shop's bookable service with price (cents) and duration.
export interface Service {
  id: string
  barbershop_id: string
  name: string
  price_cents: number
  duration_min: number
  is_active: boolean
  created_at: string
}

// Weekly opening hours. day_of_week: 0 = Sunday .. 6 = Saturday. Times are 'HH:MM:SS'.
export interface BusinessHour {
  id: string
  barbershop_id: string
  day_of_week: number
  open_time: string
  close_time: string
  is_closed: boolean
  created_at: string
}

// A client's rating (1..5) of a shop, optionally tied to one appointment.
export interface Review {
  id: string
  barbershop_id: string
  client_id: string
  appointment_id: string | null
  rating: number
  comment: string | null
  created_at: string
}

// In-app notification row. Written by the appointment trigger, read by the recipient.
export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  related_id: string | null
  is_read: boolean
  created_at: string
}

// Aggregate ratings per shop (from the `barbershop_ratings` view).
export interface BarbershopRating {
  barbershop_id: string
  avg_rating: number | null
  review_count: number
}

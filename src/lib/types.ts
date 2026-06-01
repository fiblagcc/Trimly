// Shared row types mirroring the Postgres schema (docs/SPEC.md §4).

export type Role = 'client' | 'barber' | 'admin'

export interface Profile {
  id: string
  role: Role
  full_name: string | null
  phone: string | null
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

// The list of services a client can pick when booking. Kept here so the booking
// dialog and any future barber-defined services share one source.
export const SERVICES = [
  'Haircut',
  'Beard trim',
  'Haircut + beard',
  'Kids cut',
  'Hot towel shave',
] as const

// Shared, locale-aware formatting for slot times and dates.

const dateTimeFmt = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

const dateFmt = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

const timeFmt = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
})

export const formatDateTime = (iso: string) => dateTimeFmt.format(new Date(iso))
export const formatDate = (iso: string) => dateFmt.format(new Date(iso))
export const formatTime = (iso: string) => timeFmt.format(new Date(iso))

// Google Maps directions deep link. Destination is the shop's plain address (plus ZIP
// for accuracy), so barbers never have to deal with coordinates.
export const directionsUrl = (address: string, zip?: string | null) => {
  const destination = [address, zip].filter(Boolean).join(', ')
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
}

// Prices are stored as integer cents. Show a clean "$25" or "$24.50".
export const formatPrice = (cents: number) =>
  cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`

// Weekday labels. day_of_week is 0 = Sunday .. 6 = Saturday (Postgres `extract(dow)`).
export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
export const DAY_NAMES_LONG = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
] as const

// 'HH:MM:SS' (a Postgres time) -> '9:00 AM', in the viewer's locale.
export const formatClock = (hms: string) => {
  const [h, m] = hms.split(':').map(Number)
  const d = new Date()
  d.setHours(h ?? 0, m ?? 0, 0, 0)
  return timeFmt.format(d)
}

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

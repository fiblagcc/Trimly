import * as React from 'react'
import { toast } from 'sonner'
import { Search, MapPin, ArrowLeft, Navigation, CalendarCheck } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import {
  useSearchShops,
  useShopOpenSlots,
  useBookSlot,
  useMyBookings,
  SlotTakenError,
  type MyBooking,
} from '@/lib/client'
import type { AvailabilitySlot, Barbershop } from '@/lib/types'
import { SERVICES } from '@/lib/types'
import { formatDateTime, directionsUrl } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

export function ClientDashboard() {
  const [selectedShop, setSelectedShop] = React.useState<Barbershop | null>(null)

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-10">
      <Tabs defaultValue="find">
        <TabsList className="mb-8">
          <TabsTrigger value="find">Find a barber</TabsTrigger>
          <TabsTrigger value="bookings">My bookings</TabsTrigger>
        </TabsList>

        <TabsContent value="find">
          {selectedShop ? (
            <ShopDetail shop={selectedShop} onBack={() => setSelectedShop(null)} />
          ) : (
            <SearchView onSelect={setSelectedShop} />
          )}
        </TabsContent>

        <TabsContent value="bookings">
          <MyBookingsView />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── Search ───────────────────────────────────────────────────────────────────
function SearchView({ onSelect }: { onSelect: (s: Barbershop) => void }) {
  const [zipInput, setZipInput] = React.useState('')
  const [zip, setZip] = React.useState<string | null>(null)
  const { data: shops, isFetching, isError, refetch } = useSearchShops(zip)

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setZip(zipInput.trim() || null)
  }

  return (
    <div>
      {/* Search hero — big type, asymmetric (left-aligned, not centered). */}
      <div className="max-w-2xl">
        <h1 className="heading-hero">Find a barber near you.</h1>
        <p className="mt-4 text-lg text-ink/60">
          Enter your ZIP code to see barbers taking bookings in your area.
        </p>
        <form onSubmit={onSearch} className="mt-6 flex max-w-md gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
            <Input
              aria-label="ZIP code"
              placeholder="e.g. 10001"
              value={zipInput}
              onChange={(e) => setZipInput(e.target.value)}
              inputMode="numeric"
              className="pl-10"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>
      </div>

      <div className="mt-12">
        {zip === null ? null : isFetching ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : isError ? (
          <div className="editorial-card max-w-md">
            <p className="text-ink/70">Something went wrong searching.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : !shops || shops.length === 0 ? (
          <div className="editorial-card max-w-md">
            <p className="font-medium text-ink">No barbers found in {zip}.</p>
            <p className="mt-1 text-sm text-ink/60">
              Try another ZIP — in the demo, <span className="font-medium">10001</span> has an active shop.
            </p>
          </div>
        ) : (
          <>
            <p className="label-section mb-4">
              {shops.length} barber{shops.length > 1 ? 's' : ''} in {zip}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shops.map((shop) => (
                <button
                  key={shop.id}
                  type="button"
                  onClick={() => onSelect(shop)}
                  className="editorial-card text-left transition-transform duration-150 hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="heading-section">{shop.shop_name}</h3>
                    <Badge variant="active">Active</Badge>
                  </div>
                  {shop.bio && <p className="mt-2 line-clamp-3 text-sm text-ink/60">{shop.bio}</p>}
                  {shop.address && (
                    <p className="mt-4 flex items-center gap-1.5 text-sm text-ink/50">
                      <MapPin className="h-3.5 w-3.5" /> {shop.address}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Shop detail + booking ─────────────────────────────────────────────────────
function ShopDetail({ shop, onBack }: { shop: Barbershop; onBack: () => void }) {
  const { session } = useAuth()
  const { data: slots, isLoading } = useShopOpenSlots(shop.id)
  const book = useBookSlot(session?.user.id)
  const [pending, setPending] = React.useState<AvailabilitySlot | null>(null)
  const [service, setService] = React.useState<string>(SERVICES[0])

  const confirm = async () => {
    if (!pending) return
    try {
      await book.mutateAsync({ slotId: pending.id, shopId: shop.id, service })
      toast.success('Booked! See it under “My bookings”.')
      setPending(null)
    } catch (err) {
      if (err instanceof SlotTakenError) {
        toast.error(err.message)
        setPending(null)
      } else {
        toast.error(err instanceof Error ? err.message : 'Could not book.')
      }
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink/60 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back to results
      </button>

      <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        {/* Shop info */}
        <div>
          <Badge variant="active">Active</Badge>
          <h1 className="heading-page mt-3">{shop.shop_name}</h1>
          {shop.bio && <p className="mt-3 text-ink/70">{shop.bio}</p>}
          {shop.address && (
            <p className="mt-4 flex items-center gap-1.5 text-sm text-ink/60">
              <MapPin className="h-4 w-4" /> {shop.address}
              {shop.zip ? `, ${shop.zip}` : ''}
            </p>
          )}
        </div>

        {/* Open slots */}
        <div className="editorial-card">
          <p className="label-section mb-4">Open times</p>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
            </div>
          ) : !slots || slots.length === 0 ? (
            <p className="text-sm text-ink/60">No open slots right now — check back soon.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {slots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => {
                    setService(SERVICES[0])
                    setPending(slot)
                  }}
                  className="rounded-xl border border-ink/15 px-4 py-3 text-left text-sm font-medium text-ink transition-colors duration-150 hover:border-primary hover:bg-badge-active-bg"
                >
                  {formatDateTime(slot.starts_at)}
                  <span className="ml-1 font-normal text-ink/50">· {slot.duration_min} min</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Booking confirmation */}
      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogHeader>
          <DialogTitle>Confirm booking</DialogTitle>
          <DialogDescription>
            {shop.shop_name}
            {pending ? ` · ${formatDateTime(pending.starts_at)}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="service">Service</Label>
          <Select id="service" value={service} onChange={(e) => setService(e.target.value)}>
            {SERVICES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setPending(null)} disabled={book.isPending}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={book.isPending}>
            {book.isPending ? 'Booking…' : 'Confirm booking'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}

// ── My bookings ───────────────────────────────────────────────────────────────
function MyBookingsView() {
  const { session } = useAuth()
  const { data: bookings, isLoading } = useMyBookings(session?.user.id)

  return (
    <div>
      <h1 className="heading-page">My bookings</h1>
      <p className="mt-1 text-ink/60">Your appointments, newest first.</p>

      <div className="mt-6">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full max-w-2xl" />
            <Skeleton className="h-24 w-full max-w-2xl" />
          </div>
        ) : !bookings || bookings.length === 0 ? (
          <div className="editorial-card max-w-md">
            <p className="font-medium text-ink">No bookings yet.</p>
            <p className="mt-1 text-sm text-ink/60">Find a barber and book your first slot.</p>
          </div>
        ) : (
          <ul className="max-w-2xl space-y-3">
            {bookings.map((b) => (
              <BookingRow key={b.id} booking={b} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function BookingRow({ booking: b }: { booking: MyBooking }) {
  const upcoming = b.slot ? new Date(b.slot.starts_at) > new Date() : false
  const canNavigate =
    b.status === 'confirmed' &&
    upcoming &&
    b.barbershop?.latitude != null &&
    b.barbershop?.longitude != null

  const statusVariant =
    b.status === 'confirmed' ? 'active' : b.status === 'completed' ? 'neutral' : 'inactive'

  return (
    <li className="editorial-card flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-badge-active-bg text-primary-dark">
          <CalendarCheck className="h-5 w-5" />
        </span>
        <div>
          <p className="font-medium text-ink">{b.barbershop?.shop_name ?? 'Barbershop'}</p>
          <p className="text-sm text-ink/60">
            {b.service}
            {b.slot ? ` · ${formatDateTime(b.slot.starts_at)}` : ''}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant={statusVariant}>{b.status}</Badge>
        {canNavigate && (
          <a
            href={directionsUrl(b.barbershop!.latitude!, b.barbershop!.longitude!)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-ink/15 px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-primary hover:text-primary-dark"
          >
            <Navigation className="h-3.5 w-3.5" /> Get directions
          </a>
        )}
      </div>
    </li>
  )
}

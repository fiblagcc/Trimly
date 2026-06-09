import * as React from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Search, MapPin, ArrowLeft, Navigation, CalendarCheck, Heart, Star, Clock } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import {
  useSearchShops,
  useShopOpenSlots,
  useBookSlot,
  useMyBookings,
  SlotTakenError,
  useShopMenu,
  useShopHours,
  useShopOpenNow,
  useShopRating,
  useShopReviews,
  useMyReviews,
  useLeaveReview,
  AlreadyReviewedError,
  useFavorites,
  useToggleFavorite,
  type MyBooking,
} from '@/lib/client'
import type { AvailabilitySlot, Barbershop, BusinessHour, Review } from '@/lib/types'
import { SERVICES } from '@/lib/types'
import { formatDateTime, formatPrice, formatClock, DAY_NAMES_LONG, directionsUrl } from '@/lib/format'
import { Reveal, Stagger, StaggerItem } from '@/components/Reveal'
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

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] // Monday-first

export function ClientDashboard() {
  const [selectedShop, setSelectedShop] = React.useState<Barbershop | null>(null)

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-10">
      <Tabs defaultValue="find">
        <TabsList className="mb-8">
          <TabsTrigger value="find">Find a barber</TabsTrigger>
          <TabsTrigger value="saved">Saved</TabsTrigger>
          <TabsTrigger value="bookings">My bookings</TabsTrigger>
        </TabsList>

        <TabsContent value="find">
          {selectedShop ? (
            <ShopDetail shop={selectedShop} onBack={() => setSelectedShop(null)} />
          ) : (
            <SearchView onSelect={setSelectedShop} />
          )}
        </TabsContent>

        <TabsContent value="saved">
          {selectedShop ? (
            <ShopDetail shop={selectedShop} onBack={() => setSelectedShop(null)} />
          ) : (
            <SavedView onSelect={setSelectedShop} />
          )}
        </TabsContent>

        <TabsContent value="bookings">
          <MyBookingsView />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── Small shared display bits ─────────────────────────────────────────────────
function Stars({ value, className = 'h-4 w-4' }: { value: number; className?: string }) {
  return (
    <span className="inline-flex" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={className + ' ' + (i <= Math.round(value) ? 'fill-accent text-accent' : 'text-ink/20')}
        />
      ))}
    </span>
  )
}

function RatingInline({ shopId }: { shopId: string }) {
  const { data } = useShopRating(shopId)
  if (!data || !data.review_count) return <span className="text-xs text-ink/45">No reviews yet</span>
  return (
    <span className="inline-flex items-center gap-1 text-sm text-ink/70">
      <Star className="h-3.5 w-3.5 fill-accent text-accent" />
      <span className="font-medium text-ink">{Number(data.avg_rating).toFixed(1)}</span>
      <span className="text-ink/55">({data.review_count})</span>
    </span>
  )
}

function FavHeart({
  shopId,
  size = 'md',
  className = '',
}: {
  shopId: string
  size?: 'sm' | 'md'
  className?: string
}) {
  const { session } = useAuth()
  const userId = session?.user.id
  const { data: favs } = useFavorites(userId)
  const toggle = useToggleFavorite(userId)
  const on = !!favs?.some((s) => s.id === shopId)
  const px = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9'
  return (
    <button
      type="button"
      aria-label={on ? 'Remove from saved' : 'Save shop'}
      aria-pressed={on}
      onClick={(e) => {
        e.stopPropagation()
        toggle.mutate({ shopId, on: !on })
      }}
      className={
        'inline-flex shrink-0 items-center justify-center rounded-full border border-ink/10 bg-white/70 transition-colors hover:border-primary/40 active:scale-95 ' +
        px +
        ' ' +
        className
      }
    >
      <Heart className={'h-4 w-4 ' + (on ? 'fill-primary text-primary' : 'text-ink/45')} />
    </button>
  )
}

// A shop result card. The whole card is the click target (a stretched overlay
// button), while the save-heart sits above it as its own control - no nested
// buttons, valid HTML, and both are keyboard reachable.
function ShopCard({ shop, onSelect }: { shop: Barbershop; onSelect: (s: Barbershop) => void }) {
  return (
    <StaggerItem className="editorial-card group relative flex flex-col transition-transform duration-150 hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="heading-section">
          <button
            type="button"
            onClick={() => onSelect(shop)}
            className="rounded-sm text-left outline-none after:absolute after:inset-0 after:rounded-card-lg after:content-[''] focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {shop.shop_name}
          </button>
        </h3>
        <FavHeart shopId={shop.id} size="sm" className="relative z-10" />
      </div>
      <div className="mt-2">
        <RatingInline shopId={shop.id} />
      </div>
      {shop.bio && <p className="mt-2 line-clamp-2 text-sm text-ink/70">{shop.bio}</p>}
      {shop.address && (
        <p className="mt-4 flex items-center gap-1.5 text-sm text-ink/70">
          <MapPin className="h-3.5 w-3.5 shrink-0" /> {shop.address}
        </p>
      )}
    </StaggerItem>
  )
}

// ── Search ───────────────────────────────────────────────────────────────────
function SearchView({ onSelect }: { onSelect: (s: Barbershop) => void }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialZip = searchParams.get('zip') ?? ''
  const [zipInput, setZipInput] = React.useState(initialZip)
  const [zip, setZip] = React.useState<string | null>(initialZip ? initialZip.trim() : null)
  const { data: shops, isFetching, isError, refetch } = useSearchShops(zip)

  React.useEffect(() => {
    if (searchParams.has('zip')) {
      const next = new URLSearchParams(searchParams)
      next.delete('zip')
      setSearchParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setZip(zipInput.trim() || null)
  }

  const runDemo = () => {
    setZipInput('10001')
    setZip('10001')
  }

  return (
    <div>
      <div className="max-w-2xl">
        <h1 className="heading-page text-balance">Find a barber near you.</h1>
        <p className="mt-3 text-lg text-ink/70">
          Enter your ZIP code to see barbers taking bookings in your area.
        </p>
        <form onSubmit={onSearch} className="mt-6 flex max-w-xl gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/55" />
            <Input
              aria-label="ZIP code"
              placeholder="Enter your ZIP code"
              value={zipInput}
              onChange={(e) => setZipInput(e.target.value)}
              inputMode="numeric"
              className="h-14 pl-12 text-base"
            />
          </div>
          <Button type="submit" size="lg" className="h-14 px-7">
            Search
          </Button>
        </form>
        <p className="mt-3 text-sm text-ink/70">
          Trying the demo? Search <span className="font-semibold text-primary-dark">10001</span>.
        </p>
      </div>

      <div className="mt-10">
        {zip === null ? (
          <PreSearchGuide onDemo={runDemo} />
        ) : isFetching ? (
          <CardGridSkeleton />
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
            <p className="mt-1 text-sm text-ink/70">
              Try another ZIP. In the demo, <span className="font-medium">10001</span> has an active shop.
            </p>
          </div>
        ) : (
          <>
            <p className="label-section mb-4">
              {shops.length} barber{shops.length > 1 ? 's' : ''} in {zip}
            </p>
            <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shops.map((shop) => (
                <ShopCard key={shop.id} shop={shop} onSelect={onSelect} />
              ))}
            </Stagger>
          </>
        )}
      </div>
    </div>
  )
}

// ── Saved (favorites) ─────────────────────────────────────────────────────────
function SavedView({ onSelect }: { onSelect: (s: Barbershop) => void }) {
  const { session } = useAuth()
  const { data: shops, isLoading } = useFavorites(session?.user.id)

  return (
    <div>
      <h1 className="heading-page">Saved barbers</h1>
      <p className="mt-1 text-ink/70">Shops you’ve saved. Tap the heart on any shop to add it here.</p>

      <div className="mt-6">
        {isLoading ? (
          <CardGridSkeleton />
        ) : !shops || shops.length === 0 ? (
          <Reveal className="editorial-card flex max-w-xl items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-badge-active-bg text-primary-dark">
              <Heart className="h-6 w-6" />
            </span>
            <div>
              <p className="font-medium text-ink">Nothing saved yet.</p>
              <p className="mt-1 text-sm text-ink/70">
                Find a barber and tap the heart to save them for later.
              </p>
            </div>
          </Reveal>
        ) : (
          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shops.map((shop) => (
              <ShopCard key={shop.id} shop={shop} onSelect={onSelect} />
            ))}
          </Stagger>
        )}
      </div>
    </div>
  )
}

// A logged-in client who hasn't searched yet: one calm, useful prompt with a
// one-tap demo shortcut. (Not a numbered "how it works" rehash of the landing.)
function PreSearchGuide({ onDemo }: { onDemo: () => void }) {
  return (
    <Reveal className="editorial-card flex max-w-xl flex-col items-start gap-4 sm:flex-row sm:items-center">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-badge-active-bg text-primary-dark">
        <MapPin className="h-6 w-6" />
      </span>
      <div>
        <p className="font-medium text-ink">Search a ZIP to see who’s open near you.</p>
        <p className="mt-1 text-sm text-ink/70">
          Active barbers show up here with their live open times, ratings, and prices.
        </p>
        <button
          type="button"
          onClick={onDemo}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-primary-dark active:scale-[0.98]"
        >
          <Search className="h-3.5 w-3.5" /> Try the demo: 10001
        </button>
      </div>
    </Reveal>
  )
}

function CardGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Skeleton className="h-44 w-full" />
      <Skeleton className="h-44 w-full" />
      <Skeleton className="h-44 w-full" />
    </div>
  )
}

// ── Shop detail + booking ─────────────────────────────────────────────────────
function ShopDetail({ shop, onBack }: { shop: Barbershop; onBack: () => void }) {
  const { session } = useAuth()
  const { data: slots, isLoading } = useShopOpenSlots(shop.id)
  const { data: menu } = useShopMenu(shop.id)
  const { data: hours } = useShopHours(shop.id)
  const { data: openNow } = useShopOpenNow(shop.id)
  const { data: rating } = useShopRating(shop.id)
  const { data: reviews } = useShopReviews(shop.id)
  const book = useBookSlot(session?.user.id)
  const [pending, setPending] = React.useState<AvailabilitySlot | null>(null)
  const [pick, setPick] = React.useState(0)

  // Booking options come from the shop's real menu, falling back to the built-in list.
  const options = React.useMemo(
    () =>
      menu && menu.length > 0
        ? menu.map((s) => ({ id: s.id as string | null, name: s.name, label: `${s.name} · ${formatPrice(s.price_cents)}` }))
        : SERVICES.map((s) => ({ id: null as string | null, name: s, label: s })),
    [menu]
  )

  const confirm = async () => {
    if (!pending) return
    const opt = options[pick] ?? options[0]
    try {
      await book.mutateAsync({ slotId: pending.id, shopId: shop.id, service: opt.name, serviceId: opt.id })
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
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink/70 transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back to results
      </button>

      {/* Shop identity: the one deep-teal anchor on the client layout. */}
      <Reveal className="surface-anchor overflow-hidden rounded-card-lg px-6 py-7 text-white sm:px-8 sm:py-8">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="active">Active</Badge>
              {openNow !== undefined && (
                <Badge variant={openNow ? 'active' : 'inactive'}>{openNow ? 'Open now' : 'Closed'}</Badge>
              )}
            </div>
            <h1 className="mt-3 font-display text-3xl font-semibold leading-tight sm:text-[2.5rem]">
              {shop.shop_name}
            </h1>
            {rating && rating.review_count > 0 && (
              <div className="mt-2.5 flex items-center gap-1.5 text-sm text-white/85">
                <Star className="h-4 w-4 fill-accent text-accent" />
                <span className="font-semibold text-white">{Number(rating.avg_rating).toFixed(1)}</span>
                <span className="text-white/60">
                  · {rating.review_count} review{rating.review_count > 1 ? 's' : ''}
                </span>
              </div>
            )}
            {shop.bio && <p className="mt-3 max-w-prose text-white/75">{shop.bio}</p>}
            {shop.address && (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-white/75">
                <MapPin className="h-4 w-4 shrink-0" /> {shop.address}
                {shop.zip ? `, ${shop.zip}` : ''}
              </p>
            )}
          </div>
          <FavHeart shopId={shop.id} className="border-white/25 bg-white/10" />
        </div>
      </Reveal>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Booking panel: source-first so it leads on mobile, right column + sticky on desktop. */}
        <div className="order-first lg:order-none lg:col-start-2 lg:row-start-1 lg:sticky lg:top-24">
          <Reveal className="card-elevated p-6">
            <div className="flex items-center justify-between">
              <p className="label-section">Book a time</p>
              {slots && slots.length > 0 && (
                <span className="text-xs text-ink/55">
                  {slots.length} slot{slots.length > 1 ? 's' : ''} open
                </span>
              )}
            </div>
            {isLoading ? (
              <div className="mt-4 space-y-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : !slots || slots.length === 0 ? (
              <p className="mt-4 text-sm text-ink/70">No open slots right now. Check back soon.</p>
            ) : (
              <Stagger className="mt-4 space-y-2" gap={0.05}>
                {slots.map((slot) => (
                  <StaggerItem key={slot.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setPick(0)
                        setPending(slot)
                      }}
                      className="group flex w-full items-center justify-between rounded-xl border border-ink/12 px-4 py-3 text-left transition-all duration-150 hover:border-primary hover:bg-badge-active-bg active:scale-[0.99]"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-ink">
                          {formatDateTime(slot.starts_at)}
                        </span>
                        <span className="block text-xs text-ink/55">{slot.duration_min} min</span>
                      </span>
                      <CalendarCheck className="h-4 w-4 shrink-0 text-ink/25 transition-colors group-hover:text-primary" />
                    </button>
                  </StaggerItem>
                ))}
              </Stagger>
            )}
          </Reveal>
        </div>

        {/* Hours + services in the left column. */}
        <div className="space-y-8 lg:col-start-1 lg:row-start-1">
          <Reveal>
            <HoursList hours={hours ?? []} />
          </Reveal>

          {menu && menu.length > 0 && (
            <Reveal>
              <p className="label-section mb-3">Services</p>
              <ul className="divide-y divide-ink/8 overflow-hidden rounded-card border border-ink/8 bg-white">
                {menu.map((s) => (
                  <li key={s.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="font-medium text-ink">{s.name}</p>
                      <p className="text-xs text-ink/55">{s.duration_min} min</p>
                    </div>
                    <span className="font-medium text-ink">{formatPrice(s.price_cents)}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          )}
        </div>
      </div>

      {/* Reviews */}
      <ReviewsList reviews={reviews ?? []} />

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
          <Select id="service" value={pick} onChange={(e) => setPick(Number(e.target.value))}>
            {options.map((o, i) => (
              <option key={i} value={i}>
                {o.label}
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

function HoursList({ hours }: { hours: BusinessHour[] }) {
  if (!hours.length) return null
  return (
    <div>
      <p className="label-section mb-3 flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" /> Hours
      </p>
      <ul className="space-y-1 text-sm">
        {DAY_ORDER.map((d) => {
          const row = hours.find((h) => h.day_of_week === d)
          return (
            <li key={d} className="flex justify-between">
              <span className="text-ink/70">{DAY_NAMES_LONG[d]}</span>
              <span className="text-ink">
                {!row || row.is_closed
                  ? 'Closed'
                  : `${formatClock(row.open_time)} – ${formatClock(row.close_time)}`}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function ReviewsList({ reviews }: { reviews: Review[] }) {
  if (!reviews.length) return null
  return (
    <div className="mt-10 max-w-2xl">
      <p className="label-section mb-4">Reviews</p>
      <Stagger className="space-y-3">
        {reviews.map((r) => (
          <StaggerItem key={r.id} className="editorial-card">
            <Stars value={r.rating} className="h-3.5 w-3.5" />
            {r.comment && <p className="mt-2 text-sm text-ink/80">{r.comment}</p>}
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  )
}

// ── My bookings ───────────────────────────────────────────────────────────────
function MyBookingsView() {
  const { session } = useAuth()
  const { data: bookings, isLoading } = useMyBookings(session?.user.id)
  const { data: reviewed } = useMyReviews(session?.user.id)
  const [review, setReview] = React.useState<MyBooking | null>(null)

  // Split into what's ahead vs. what's behind, each sorted the way you'd read it.
  const { upcoming, earlier } = React.useMemo(() => {
    const now = new Date().getTime()
    const up: MyBooking[] = []
    const past: MyBooking[] = []
    for (const b of bookings ?? []) {
      const t = b.slot ? new Date(b.slot.starts_at).getTime() : 0
      if (b.status !== 'cancelled' && t >= now) up.push(b)
      else past.push(b)
    }
    up.sort((a, b) => new Date(a.slot?.starts_at ?? 0).getTime() - new Date(b.slot?.starts_at ?? 0).getTime())
    past.sort((a, b) => new Date(b.slot?.starts_at ?? 0).getTime() - new Date(a.slot?.starts_at ?? 0).getTime())
    return { upcoming: up, earlier: past }
  }, [bookings])

  const hasAny = (bookings?.length ?? 0) > 0

  return (
    <div>
      <h1 className="heading-page">My bookings</h1>
      <p className="mt-1 text-ink/70">Your appointments, upcoming first.</p>

      <div className="mt-6 max-w-2xl">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : !hasAny ? (
          <Reveal className="editorial-card flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-badge-active-bg text-primary-dark">
              <CalendarCheck className="h-6 w-6" />
            </span>
            <div>
              <p className="font-medium text-ink">No bookings yet.</p>
              <p className="mt-1 text-sm text-ink/70">Find a barber and book your first slot.</p>
            </div>
          </Reveal>
        ) : (
          <div className="space-y-8">
            {upcoming.length > 0 && (
              <section>
                <p className="label-section mb-3">Upcoming</p>
                <Stagger className="space-y-3">
                  {upcoming.map((b) => (
                    <BookingRow
                      key={b.id}
                      booking={b}
                      reviewed={!!reviewed?.has(b.id)}
                      onReview={() => setReview(b)}
                    />
                  ))}
                </Stagger>
              </section>
            )}
            {earlier.length > 0 && (
              <section>
                <p className="label-section mb-3">Earlier</p>
                <Stagger className="space-y-3">
                  {earlier.map((b) => (
                    <BookingRow
                      key={b.id}
                      booking={b}
                      reviewed={!!reviewed?.has(b.id)}
                      onReview={() => setReview(b)}
                    />
                  ))}
                </Stagger>
              </section>
            )}
          </div>
        )}
      </div>

      <ReviewDialog booking={review} onClose={() => setReview(null)} />
    </div>
  )
}

function BookingRow({
  booking: b,
  reviewed,
  onReview,
}: {
  booking: MyBooking
  reviewed: boolean
  onReview: () => void
}) {
  const startsAt = b.slot ? new Date(b.slot.starts_at) : null
  const upcoming = startsAt ? startsAt > new Date() : false
  const past = startsAt ? startsAt < new Date() : false
  const canNavigate = b.status === 'confirmed' && upcoming && !!b.barbershop?.address?.trim()
  const canReview = b.status !== 'cancelled' && past && !reviewed

  const statusVariant =
    b.status === 'confirmed' ? 'active' : b.status === 'completed' ? 'neutral' : 'inactive'

  return (
    <StaggerItem className="editorial-card flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-badge-active-bg text-primary-dark">
          <CalendarCheck className="h-5 w-5" />
        </span>
        <div>
          <p className="font-medium text-ink">{b.barbershop?.shop_name ?? 'Barbershop'}</p>
          <p className="text-sm text-ink/70">
            {b.service}
            {b.slot ? ` · ${formatDateTime(b.slot.starts_at)}` : ''}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant={statusVariant} className="capitalize">
          {b.status}
        </Badge>
        {canReview && (
          <Button variant="outline" size="sm" onClick={onReview}>
            <Star className="mr-1.5 h-3.5 w-3.5" /> Review
          </Button>
        )}
        {canNavigate && (
          <a
            href={directionsUrl(b.barbershop!.address!, b.barbershop!.zip)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-ink/15 px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-primary hover:text-primary-dark"
          >
            <Navigation className="h-3.5 w-3.5" /> Get directions
          </a>
        )}
      </div>
    </StaggerItem>
  )
}

function ReviewDialog({ booking, onClose }: { booking: MyBooking | null; onClose: () => void }) {
  const { session } = useAuth()
  const leave = useLeaveReview(session?.user.id)
  const [rating, setRating] = React.useState(5)
  const [comment, setComment] = React.useState('')

  // Reset the form whenever a different booking is opened.
  const openId = booking?.id ?? null
  const lastId = React.useRef<string | null>(null)
  if (openId !== lastId.current) {
    lastId.current = openId
    if (openId) {
      // safe: runs once per open, guarded by the id check
      if (rating !== 5) setRating(5)
      if (comment !== '') setComment('')
    }
  }

  const submit = async () => {
    if (!booking?.barbershop_id) return
    try {
      await leave.mutateAsync({
        shopId: booking.barbershop_id,
        appointmentId: booking.id,
        rating,
        comment,
      })
      toast.success('Thanks for the review!')
      onClose()
    } catch (err) {
      if (err instanceof AlreadyReviewedError) {
        toast.error(err.message)
        onClose()
      } else {
        toast.error(err instanceof Error ? err.message : 'Could not submit review.')
      }
    }
  }

  return (
    <Dialog open={!!booking} onOpenChange={(o) => !o && onClose()}>
      <DialogHeader>
        <DialogTitle>Leave a review</DialogTitle>
        <DialogDescription>{booking?.barbershop?.shop_name ?? 'Your visit'}</DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="rating">Rating</Label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                aria-label={`${i} star${i > 1 ? 's' : ''}`}
                onClick={() => setRating(i)}
                className="p-0.5"
              >
                <Star className={'h-7 w-7 ' + (i <= rating ? 'fill-accent text-accent' : 'text-ink/25')} />
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="comment">Comment (optional)</Label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="How was your cut?"
            className="flex w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/55 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={leave.isPending}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={leave.isPending}>
          {leave.isPending ? 'Submitting…' : 'Submit review'}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

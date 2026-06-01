import * as React from 'react'
import { toast } from 'sonner'
import { Store, BadgeCheck, CalendarClock, Inbox, Trash2, Plus } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import {
  useMyShop,
  useSaveShop,
  useToggleSubscription,
  useShopSlots,
  useAddSlot,
  useDeleteSlot,
  useIncomingBookings,
  type ShopFormValues,
} from '@/lib/barber'
import type { Barbershop } from '@/lib/types'
import { useBookingRealtime } from '@/lib/realtime'
import { formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar } from '@/components/ui/avatar'

type Section = 'profile' | 'subscription' | 'availability' | 'bookings'

const NAV: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Shop profile', icon: Store },
  { id: 'subscription', label: 'Subscription', icon: BadgeCheck },
  { id: 'availability', label: 'Availability', icon: CalendarClock },
  { id: 'bookings', label: 'Incoming bookings', icon: Inbox },
]

// Lower bound for the "add slot" picker — computed once at load (local time, trimmed
// to minutes). Good enough to stop barbers picking a time in the past.
const MIN_DATETIME_LOCAL = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
  .toISOString()
  .slice(0, 16)

export function BarberDashboard() {
  const { session, profile } = useAuth()
  const ownerId = session?.user.id
  const { data: shop, isLoading } = useMyShop(ownerId)
  const [section, setSection] = React.useState<Section>('profile')

  // Live booking notifications for this shop (Step 6).
  useBookingRealtime(shop?.id)

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-6 py-10 lg:flex-row lg:gap-12">
      {/* Dark anchor sidebar — the single dark surface for this layout. */}
      <aside className="lg:w-64 lg:shrink-0">
        <div className="rounded-card-lg bg-dark-anchor p-6 text-white lg:sticky lg:top-24">
          <p className="label-section !text-white/50">Signed in as</p>
          <p className="mt-1 truncate font-display text-xl text-white">
            {shop?.shop_name || profile?.full_name || 'Your shop'}
          </p>
          <div className="mt-2">
            {shop ? (
              <Badge variant={shop.is_active ? 'active' : 'inactive'}>
                {shop.is_active ? 'Live' : 'Not subscribed'}
              </Badge>
            ) : (
              <Badge variant="pending">Setup needed</Badge>
            )}
          </div>

          <nav className="mt-6 flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {NAV.map(({ id, label, icon: Icon }) => {
              const active = section === id
              return (
                <button
                  key={id}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setSection(id)}
                  className={
                    'flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-colors duration-150 ' +
                    (active
                      ? 'bg-white/10 text-white'
                      : 'text-white/60 hover:bg-white/5 hover:text-white')
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              )
            })}
          </nav>
        </div>
      </aside>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <>
            {section === 'profile' && (
              <ProfileSection ownerId={ownerId} shop={shop ?? null} onSaved={() => setSection('subscription')} />
            )}
            {section === 'subscription' && <SubscriptionSection ownerId={ownerId} shop={shop ?? null} />}
            {section === 'availability' && <AvailabilitySection shop={shop ?? null} />}
            {section === 'bookings' && <BookingsSection shop={shop ?? null} />}
          </>
        )}
      </div>
    </div>
  )
}

// ── Shop profile ─────────────────────────────────────────────────────────────
function ProfileSection({
  ownerId,
  shop,
  onSaved,
}: {
  ownerId: string | undefined
  shop: Barbershop | null
  onSaved: () => void
}) {
  const save = useSaveShop(ownerId)
  const [form, setForm] = React.useState<ShopFormValues>({
    shop_name: shop?.shop_name ?? '',
    bio: shop?.bio ?? '',
    zip: shop?.zip ?? '',
    address: shop?.address ?? '',
    latitude: shop?.latitude ?? null,
    longitude: shop?.longitude ?? null,
  })
  const [error, setError] = React.useState('')

  const set = <K extends keyof ShopFormValues>(k: K, v: ShopFormValues[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.shop_name.trim() || !form.zip.trim()) {
      setError('Shop name and ZIP are required.')
      return
    }
    try {
      await save.mutateAsync({ existing: shop, values: form })
      toast.success(shop ? 'Shop updated.' : 'Shop created — activate your subscription to go live.')
      if (!shop) onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.')
    }
  }

  return (
    <section>
      <h1 className="heading-page">{shop ? 'Shop profile' : 'Set up your shop'}</h1>
      <p className="mt-1 text-ink/60">The details clients see when they find you.</p>

      <form onSubmit={onSubmit} className="editorial-card mt-6 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Shop name" htmlFor="shop_name" required>
            <Input id="shop_name" value={form.shop_name} onChange={(e) => set('shop_name', e.target.value)} />
          </Field>
          <Field label="ZIP code" htmlFor="zip" required>
            <Input id="zip" value={form.zip} onChange={(e) => set('zip', e.target.value)} inputMode="numeric" />
          </Field>
        </div>

        <Field label="Bio" htmlFor="bio" hint="A line or two about your shop.">
          <textarea
            id="bio"
            value={form.bio ?? ''}
            onChange={(e) => set('bio', e.target.value)}
            rows={3}
            className="flex w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/40 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          />
        </Field>

        <Field label="Address" htmlFor="address">
          <Input id="address" value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Latitude" htmlFor="lat" hint="For the client's “Get directions” link.">
            <Input
              id="lat"
              type="number"
              step="any"
              value={form.latitude ?? ''}
              onChange={(e) => set('latitude', e.target.value === '' ? null : Number(e.target.value))}
            />
          </Field>
          <Field label="Longitude" htmlFor="lng">
            <Input
              id="lng"
              type="number"
              step="any"
              value={form.longitude ?? ''}
              onChange={(e) => set('longitude', e.target.value === '' ? null : Number(e.target.value))}
            />
          </Field>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : shop ? 'Save changes' : 'Create shop'}
          </Button>
        </div>
      </form>
    </section>
  )
}

// ── Subscription ─────────────────────────────────────────────────────────────
function SubscriptionSection({ ownerId, shop }: { ownerId: string | undefined; shop: Barbershop | null }) {
  const toggle = useToggleSubscription(ownerId)

  if (!shop) {
    return (
      <section>
        <h1 className="heading-page">Subscription</h1>
        <div className="editorial-card mt-6">
          <p className="text-ink/60">Create your shop profile first, then activate your subscription here.</p>
        </div>
      </section>
    )
  }

  const active = shop.is_active
  const flip = async () => {
    try {
      await toggle.mutateAsync({ shopId: shop.id, active: !active })
      toast.success(active ? 'Subscription paused — your shop is hidden from search.' : 'You’re live! Clients can find and book you.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update subscription.')
    }
  }

  return (
    <section>
      <h1 className="heading-page">Subscription</h1>
      <p className="mt-1 text-ink/60">This is the gate that makes your shop visible to clients.</p>

      <div className="editorial-card mt-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="label-section">Current status</p>
            <div className="mt-2">
              <Badge variant={active ? 'active' : 'inactive'}>
                {active ? 'Active — visible in search' : 'Inactive — hidden from search'}
              </Badge>
            </div>
          </div>
          <Button onClick={flip} disabled={toggle.isPending} variant={active ? 'outline' : 'default'}>
            {toggle.isPending ? 'Updating…' : active ? 'Deactivate' : 'Activate'}
          </Button>
        </div>

        <p className="mt-5 border-t border-ink/8 pt-4 text-sm text-ink/50">
          Trimly only charges barbers. There’s no real billing in this demo — activating
          flips the visibility flag directly. In production this is where Stripe Checkout
          would confirm payment before the shop goes live.
        </p>
      </div>
    </section>
  )
}

// ── Availability ─────────────────────────────────────────────────────────────
function AvailabilitySection({ shop }: { shop: Barbershop | null }) {
  const { data: slots, isLoading } = useShopSlots(shop?.id)
  const addSlot = useAddSlot(shop?.id)
  const delSlot = useDeleteSlot(shop?.id)
  const [startsAt, setStartsAt] = React.useState('')
  const [duration, setDuration] = React.useState(30)

  if (!shop) {
    return (
      <section>
        <h1 className="heading-page">Availability</h1>
        <div className="editorial-card mt-6">
          <p className="text-ink/60">Create your shop profile first to open up bookable times.</p>
        </div>
      </section>
    )
  }

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!startsAt) return
    try {
      await addSlot.mutateAsync({ startsAt: new Date(startsAt).toISOString(), durationMin: duration })
      setStartsAt('')
      toast.success('Slot added.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add slot.')
    }
  }

  return (
    <section>
      <h1 className="heading-page">Availability</h1>
      <p className="mt-1 text-ink/60">Open up the times clients can book.</p>

      <form onSubmit={onAdd} className="editorial-card mt-6 flex flex-wrap items-end gap-4">
        <Field label="Date & time" htmlFor="startsAt" className="flex-1 min-w-[200px]">
          <Input
            id="startsAt"
            type="datetime-local"
            min={MIN_DATETIME_LOCAL}
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </Field>
        <Field label="Duration" htmlFor="duration" className="w-36">
          <Select id="duration" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
            <option value={45}>45 min</option>
            <option value={60}>60 min</option>
          </Select>
        </Field>
        <Button type="submit" disabled={addSlot.isPending || !startsAt}>
          <Plus className="mr-1.5 h-4 w-4" /> Add slot
        </Button>
      </form>

      <div className="mt-6">
        <p className="label-section mb-3">Upcoming slots</p>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : !slots || slots.length === 0 ? (
          <div className="editorial-card text-ink/60">No upcoming slots yet. Add one above.</div>
        ) : (
          <ul className="space-y-2">
            {slots.map((slot) => (
              <li
                key={slot.id}
                className="flex items-center justify-between rounded-xl border border-ink/8 bg-white px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-ink">{formatDateTime(slot.starts_at)}</span>
                  <span className="text-sm text-ink/50">{slot.duration_min} min</span>
                  {slot.is_booked && <Badge variant="active">Booked</Badge>}
                </div>
                {!slot.is_booked && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => delSlot.mutate(slot.id)}
                    aria-label="Delete slot"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

// ── Incoming bookings ────────────────────────────────────────────────────────
function BookingsSection({ shop }: { shop: Barbershop | null }) {
  const { data: bookings, isLoading } = useIncomingBookings(shop?.id)

  if (!shop) {
    return (
      <section>
        <h1 className="heading-page">Incoming bookings</h1>
        <div className="editorial-card mt-6">
          <p className="text-ink/60">Bookings will show here once your shop is set up and live.</p>
        </div>
      </section>
    )
  }

  return (
    <section>
      <h1 className="heading-page">Incoming bookings</h1>
      <p className="mt-1 text-ink/60">Newest first. New bookings arrive live.</p>

      <div className="mt-6">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : !bookings || bookings.length === 0 ? (
          <div className="editorial-card text-ink/60">No bookings yet.</div>
        ) : (
          <ul className="space-y-3">
            {bookings.map((b) => (
              <li key={b.id} className="editorial-card flex items-center gap-4">
                <Avatar name={b.client?.full_name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{b.client?.full_name ?? 'Client'}</p>
                  <p className="text-sm text-ink/60">
                    {b.service}
                    {b.slot ? ` · ${formatDateTime(b.slot.starts_at)}` : ''}
                  </p>
                </div>
                <Badge variant={b.status === 'cancelled' ? 'inactive' : 'active'}>{b.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

// ── Small labelled field wrapper ─────────────────────────────────────────────
function Field({
  label,
  htmlFor,
  hint,
  required,
  className,
  children,
}: {
  label: string
  htmlFor: string
  hint?: string
  required?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={'space-y-1.5 ' + (className ?? '')}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-primary"> *</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-ink/50">{hint}</p>}
    </div>
  )
}

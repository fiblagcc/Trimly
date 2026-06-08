import * as React from 'react'
import { toast } from 'sonner'
import {
  CalendarDays,
  Inbox,
  CalendarClock,
  Scissors,
  Clock,
  Store,
  BadgeCheck,
  Trash2,
  Plus,
  Phone,
  Mail,
  Check,
  X,
  Pencil,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import {
  useMyShop,
  useSaveShop,
  useToggleSubscription,
  useShopSlots,
  useAddSlot,
  useDeleteSlot,
  useIncomingBookings,
  useUpdateBookingStatus,
  useShopServices,
  useAddService,
  useUpdateService,
  useDeleteService,
  useShopHours,
  useSaveHours,
  type ShopFormValues,
  type HoursRow,
} from '@/lib/barber'
import type { Barbershop, BusinessHour, Service } from '@/lib/types'
import { useBookingRealtime } from '@/lib/realtime'
import { formatDateTime, formatPrice, DAY_NAMES_LONG } from '@/lib/format'
import { BarberCalendar } from '@/components/BarberCalendar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar } from '@/components/ui/avatar'

type Section = 'calendar' | 'bookings' | 'schedule' | 'services' | 'hours' | 'profile' | 'subscription'

const NAV: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'bookings', label: 'Bookings', icon: Inbox },
  { id: 'schedule', label: 'Schedule', icon: CalendarClock },
  { id: 'services', label: 'Services', icon: Scissors },
  { id: 'hours', label: 'Hours', icon: Clock },
  { id: 'profile', label: 'Shop profile', icon: Store },
  { id: 'subscription', label: 'Subscription', icon: BadgeCheck },
]

const MIN_DATETIME_LOCAL = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
  .toISOString()
  .slice(0, 16)

export function BarberDashboard() {
  const { session, profile } = useAuth()
  const ownerId = session?.user.id
  const { data: shop, isLoading } = useMyShop(ownerId)
  const [section, setSection] = React.useState<Section>('calendar')

  // Live booking notifications for this shop (Step 6).
  useBookingRealtime(shop?.id)

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-6 py-10 lg:flex-row lg:gap-12">
      <aside className="lg:w-60 lg:shrink-0">
        <div className="rounded-card-lg bg-dark-anchor p-6 text-white lg:sticky lg:top-24">
          <p className="label-section !text-white/60">Signed in as</p>
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
                    (active ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white')
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

      <div className="min-w-0 flex-1">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <div key={section} className="motion-safe:animate-[fadeIn_200ms_ease]">
            {section === 'calendar' && <CalendarSection shop={shop ?? null} />}
            {section === 'bookings' && <BookingsSection shop={shop ?? null} />}
            {section === 'schedule' && <AvailabilitySection shop={shop ?? null} />}
            {section === 'services' && <ServicesSection shop={shop ?? null} />}
            {section === 'hours' && <HoursSection shop={shop ?? null} />}
            {section === 'profile' && (
              <ProfileSection ownerId={ownerId} shop={shop ?? null} onSaved={() => setSection('subscription')} />
            )}
            {section === 'subscription' && <SubscriptionSection ownerId={ownerId} shop={shop ?? null} />}
          </div>
        )}
      </div>
    </div>
  )
}

// Shared empty state when the barber has not created their shop yet.
function NeedsShop({ title, line }: { title: string; line: string }) {
  return (
    <section>
      <h1 className="heading-page">{title}</h1>
      <div className="editorial-card mt-6">
        <p className="text-ink/70">{line}</p>
      </div>
    </section>
  )
}

// ── Calendar ──────────────────────────────────────────────────────────────────
function CalendarSection({ shop }: { shop: Barbershop | null }) {
  const { data: bookings, isLoading: lb } = useIncomingBookings(shop?.id)
  const { data: slots, isLoading: ls } = useShopSlots(shop?.id)

  if (!shop) return <NeedsShop title="Calendar" line="Set up your shop profile first to see bookings on a calendar." />
  if (lb || ls)
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-[520px] w-full" />
      </div>
    )
  return <BarberCalendar bookings={bookings ?? []} slots={slots ?? []} />
}

// ── Incoming bookings (contact + price + actions) ─────────────────────────────
function BookingsSection({ shop }: { shop: Barbershop | null }) {
  const { data: bookings, isLoading } = useIncomingBookings(shop?.id)
  const updateStatus = useUpdateBookingStatus(shop?.id)

  if (!shop) return <NeedsShop title="Incoming bookings" line="Bookings will show here once your shop is set up and live." />

  const act = async (id: string, status: 'completed' | 'cancelled') => {
    try {
      await updateStatus.mutateAsync({ id, status })
      toast.success(status === 'completed' ? 'Marked complete.' : 'Booking cancelled.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update booking.')
    }
  }

  return (
    <section>
      <h1 className="heading-page">Incoming bookings</h1>
      <p className="mt-1 text-ink/70">Newest first. New bookings arrive live.</p>

      <div className="mt-6">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : !bookings || bookings.length === 0 ? (
          <div className="editorial-card text-ink/70">No bookings yet.</div>
        ) : (
          <ul className="space-y-3">
            {bookings.map((b) => {
              const price = b.service_row?.price_cents
              return (
                <li key={b.id} className="editorial-card flex flex-wrap items-center gap-4">
                  <Avatar name={b.client?.full_name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{b.client?.full_name ?? 'Client'}</p>
                    <p className="text-sm text-ink/70">
                      {b.service}
                      {price != null ? ` · ${formatPrice(price)}` : ''}
                      {b.slot ? ` · ${formatDateTime(b.slot.starts_at)}` : ''}
                    </p>
                    {(b.client?.phone || b.client?.email) && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {b.client?.phone && (
                          <a
                            href={`tel:${b.client.phone}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-ink/15 px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:border-primary hover:text-primary-dark"
                          >
                            <Phone className="h-3.5 w-3.5" /> Call
                          </a>
                        )}
                        {b.client?.email && (
                          <a
                            href={`mailto:${b.client.email}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-ink/15 px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:border-primary hover:text-primary-dark"
                          >
                            <Mail className="h-3.5 w-3.5" /> Email
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {b.status === 'confirmed' ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={updateStatus.isPending}
                          onClick={() => act(b.id, 'completed')}
                        >
                          <Check className="mr-1.5 h-4 w-4" /> Complete
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={updateStatus.isPending}
                          onClick={() => act(b.id, 'cancelled')}
                        >
                          <X className="mr-1.5 h-4 w-4" /> Cancel
                        </Button>
                      </>
                    ) : (
                      <Badge variant={b.status === 'cancelled' ? 'inactive' : 'neutral'} className="capitalize">
                        {b.status}
                      </Badge>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

// ── Services (CRUD with price + duration) ─────────────────────────────────────
function ServicesSection({ shop }: { shop: Barbershop | null }) {
  const { data: services, isLoading } = useShopServices(shop?.id)
  const add = useAddService(shop?.id)
  const update = useUpdateService(shop?.id)
  const del = useDeleteService(shop?.id)

  const [editing, setEditing] = React.useState<Service | null>(null)
  const [name, setName] = React.useState('')
  const [price, setPrice] = React.useState('')
  const [duration, setDuration] = React.useState(30)

  const reset = () => {
    setEditing(null)
    setName('')
    setPrice('')
    setDuration(30)
  }

  if (!shop) return <NeedsShop title="Services" line="Set up your shop profile first to add services and prices." />

  const startEdit = (s: Service) => {
    setEditing(s)
    setName(s.name)
    setPrice((s.price_cents / 100).toString())
    setDuration(s.duration_min)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const dollars = parseFloat(price)
    if (!name.trim() || Number.isNaN(dollars) || dollars < 0) {
      toast.error('Enter a name and a valid price.')
      return
    }
    const values = {
      name: name.trim(),
      price_cents: Math.round(dollars * 100),
      duration_min: duration,
      is_active: editing ? editing.is_active : true,
    }
    try {
      if (editing) await update.mutateAsync({ id: editing.id, values })
      else await add.mutateAsync(values)
      toast.success(editing ? 'Service updated.' : 'Service added.')
      reset()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save service.')
    }
  }

  const toggleActive = (s: Service) =>
    update.mutate({ id: s.id, values: { is_active: !s.is_active } })

  return (
    <section>
      <h1 className="heading-page">Services</h1>
      <p className="mt-1 text-ink/70">The menu and prices clients see when they book.</p>

      <form onSubmit={submit} className="editorial-card mt-6 flex flex-wrap items-end gap-4">
        <div className="min-w-[180px] flex-1 space-y-1.5">
          <Label htmlFor="svc-name">Service</Label>
          <Input id="svc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Haircut" />
        </div>
        <div className="w-28 space-y-1.5">
          <Label htmlFor="svc-price">Price ($)</Label>
          <Input
            id="svc-price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="decimal"
            placeholder="25"
          />
        </div>
        <div className="w-32 space-y-1.5">
          <Label htmlFor="svc-dur">Duration</Label>
          <Select id="svc-dur" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
            <option value={45}>45 min</option>
            <option value={60}>60 min</option>
            <option value={90}>90 min</option>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={add.isPending || update.isPending}>
            {editing ? 'Save' : <><Plus className="mr-1.5 h-4 w-4" /> Add</>}
          </Button>
          {editing && (
            <Button type="button" variant="ghost" onClick={reset}>
              Cancel
            </Button>
          )}
        </div>
      </form>

      <div className="mt-6">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : !services || services.length === 0 ? (
          <div className="editorial-card text-ink/70">No services yet. Add your first above.</div>
        ) : (
          <ul className="space-y-2">
            {services.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink/8 bg-white px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-ink">
                    {s.name} {!s.is_active && <span className="text-xs font-normal text-ink/45">(hidden)</span>}
                  </p>
                  <p className="text-sm text-ink/70">
                    {formatPrice(s.price_cents)} · {s.duration_min} min
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button variant="ghost" size="sm" onClick={() => toggleActive(s)}>
                    {s.is_active ? 'Hide' : 'Show'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => startEdit(s)} aria-label="Edit service">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => del.mutate(s.id)} aria-label="Delete service">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

// ── Business hours (weekly editor) ────────────────────────────────────────────
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] // Monday-first display
type DayState = { open: string; close: string; closed: boolean }

function buildHourRows(hours: BusinessHour[]): Record<number, DayState> {
  const map: Record<number, DayState> = {}
  for (let d = 0; d <= 6; d++) {
    const row = hours.find((h) => h.day_of_week === d)
    map[d] = row
      ? { open: row.open_time.slice(0, 5), close: row.close_time.slice(0, 5), closed: row.is_closed }
      : { open: '09:00', close: '17:00', closed: d === 0 }
  }
  return map
}
const hoursSig = (hours: BusinessHour[]) =>
  hours.map((h) => `${h.day_of_week}:${h.open_time}:${h.close_time}:${h.is_closed}`).sort().join('|')

function HoursSection({ shop }: { shop: Barbershop | null }) {
  const { data: hours, isLoading } = useShopHours(shop?.id)
  if (!shop) return <NeedsShop title="Hours" line="Set up your shop profile first to set your weekly hours." />
  if (isLoading)
    return (
      <section>
        <h1 className="heading-page">Weekly hours</h1>
        <div className="editorial-card mt-6 space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </section>
    )
  // Keyed by content so the editor re-initialises from fresh data without an effect.
  return <HoursEditor shopId={shop.id} initial={hours ?? []} key={hoursSig(hours ?? [])} />
}

function HoursEditor({ shopId, initial }: { shopId: string; initial: BusinessHour[] }) {
  const save = useSaveHours(shopId)
  const [rows, setRows] = React.useState<Record<number, DayState>>(() => buildHourRows(initial))

  const setDay = (d: number, patch: Partial<DayState>) =>
    setRows((r) => ({ ...r, [d]: { ...r[d], ...patch } }))

  const onSave = async () => {
    const payload: HoursRow[] = []
    for (let d = 0; d <= 6; d++) {
      const r = rows[d]
      if (!r) continue
      if (!r.closed && r.close <= r.open) {
        toast.error(`${DAY_NAMES_LONG[d]}: closing time must be after opening time.`)
        return
      }
      payload.push({
        day_of_week: d,
        open_time: `${r.open}:00`,
        close_time: `${r.close}:00`,
        is_closed: r.closed,
      })
    }
    try {
      await save.mutateAsync(payload)
      toast.success('Hours saved.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save hours.')
    }
  }

  return (
    <section>
      <h1 className="heading-page">Weekly hours</h1>
      <p className="mt-1 text-ink/70">When clients can find you open. Used for the open / closed badge.</p>

      <div className="editorial-card mt-6 space-y-2">
        {DAY_ORDER.map((d) => {
          const r = rows[d]
          return (
            <div key={d} className="flex flex-wrap items-center gap-3 border-b border-ink/6 py-2 last:border-0">
              <span className="w-24 font-medium text-ink">{DAY_NAMES_LONG[d]}</span>
              <label className="inline-flex items-center gap-2 text-sm text-ink/70">
                <input
                  type="checkbox"
                  checked={!r.closed}
                  onChange={(e) => setDay(d, { closed: !e.target.checked })}
                  className="h-4 w-4 rounded border-ink/30 text-primary focus:ring-primary/30"
                />
                {r.closed ? 'Closed' : 'Open'}
              </label>
              {!r.closed && (
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={r.open}
                    onChange={(e) => setDay(d, { open: e.target.value })}
                    className="w-32"
                  />
                  <span className="text-ink/50">to</span>
                  <Input
                    type="time"
                    value={r.close}
                    onChange={(e) => setDay(d, { close: e.target.value })}
                    className="w-32"
                  />
                </div>
              )}
            </div>
          )
        })}
        <div className="flex justify-end pt-3">
          <Button onClick={onSave} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save hours'}
          </Button>
        </div>
      </div>
    </section>
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
      toast.success(shop ? 'Shop updated.' : 'Shop created. Activate your subscription to go live.')
      if (!shop) onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.')
    }
  }

  return (
    <section>
      <h1 className="heading-page">{shop ? 'Shop profile' : 'Set up your shop'}</h1>
      <p className="mt-1 text-ink/70">The details clients see when they find you.</p>

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
            className="flex w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/55 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          />
        </Field>

        <div className="space-y-5 border-t border-ink/8 pt-5">
          <p className="label-section">Location</p>
          <Field
            label="Street address"
            htmlFor="address"
            hint="The full address clients tap “Get directions” to. For example: 312 W 31st St, New York, NY."
          >
            <Input
              id="address"
              value={form.address ?? ''}
              onChange={(e) => set('address', e.target.value)}
              placeholder="Street, city, state"
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

  if (!shop)
    return <NeedsShop title="Subscription" line="Create your shop profile first, then activate your subscription here." />

  const active = shop.is_active
  const flip = async () => {
    try {
      await toggle.mutateAsync({ shopId: shop.id, active: !active })
      toast.success(
        active
          ? 'Subscription paused. Your shop is hidden from search.'
          : 'You’re live. Clients can find and book you.'
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update subscription.')
    }
  }

  return (
    <section>
      <h1 className="heading-page">Subscription</h1>
      <p className="mt-1 text-ink/70">This is the gate that makes your shop visible to clients.</p>

      <div className="editorial-card mt-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="label-section">Current status</p>
            <div className="mt-2">
              <Badge variant={active ? 'active' : 'inactive'}>
                {active ? 'Active, visible in search' : 'Inactive, hidden from search'}
              </Badge>
            </div>
          </div>
          <Button onClick={flip} disabled={toggle.isPending} variant={active ? 'outline' : 'default'}>
            {toggle.isPending ? 'Updating…' : active ? 'Deactivate' : 'Activate'}
          </Button>
        </div>

        <p className="mt-5 border-t border-ink/8 pt-4 text-sm text-ink/70">
          Trimly only charges barbers. There’s no real billing in this demo, so activating
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

  if (!shop) return <NeedsShop title="Schedule" line="Create your shop profile first to open up bookable times." />

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
      <h1 className="heading-page">Schedule</h1>
      <p className="mt-1 text-ink/70">Open up the times clients can book.</p>

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
          <div className="editorial-card text-ink/70">No upcoming slots yet. Add one above.</div>
        ) : (
          <ul className="space-y-2">
            {slots.map((slot) => (
              <li
                key={slot.id}
                className="flex items-center justify-between rounded-xl border border-ink/8 bg-white px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-ink">{formatDateTime(slot.starts_at)}</span>
                  <span className="text-sm text-ink/70">{slot.duration_min} min</span>
                  {slot.is_booked && <Badge variant="active">Booked</Badge>}
                </div>
                {!slot.is_booked && (
                  <Button variant="ghost" size="sm" onClick={() => delSlot.mutate(slot.id)} aria-label="Delete slot">
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
      {hint && <p className="text-xs text-ink/70">{hint}</p>}
    </div>
  )
}

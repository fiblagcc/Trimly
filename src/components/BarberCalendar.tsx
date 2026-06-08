import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { AvailabilitySlot } from '@/lib/types'
import type { IncomingBooking } from '@/lib/barber'
import { DAY_NAMES, formatTime } from '@/lib/format'

// A custom day / week / month calendar for the barber dashboard. It renders the shop's
// bookings (and quiet open slots) on a time grid so a barber can see the schedule at a
// glance from a desktop or tablet. Built in the editorial design system, no library.

type View = 'day' | 'week' | 'month'
type Kind = 'confirmed' | 'completed' | 'cancelled' | 'open'

type CalEvent = {
  id: string
  start: Date
  end: Date
  durationMin: number
  title: string
  subtitle: string
  kind: Kind
}

const HOUR_PX = 56
const DAY_MS = 86_400_000

const startOfDay = (d: Date) => {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY_MS)
// Monday-start week (matches a working-week layout).
const startOfWeek = (d: Date) => {
  const x = startOfDay(d)
  return addDays(x, -((x.getDay() + 6) % 7))
}
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

const KIND_CLASS: Record<Kind, string> = {
  confirmed: 'bg-badge-active-bg border-primary/25 text-primary-dark',
  completed: 'bg-ink/[0.04] border-ink/10 text-ink/60',
  cancelled: 'bg-ink/[0.03] border-ink/10 text-ink/40 line-through',
  open: 'border-dashed border-ink/20 bg-transparent text-ink/45',
}

export function BarberCalendar({
  bookings,
  slots,
}: {
  bookings: IncomingBooking[]
  slots: AvailabilitySlot[]
}) {
  const [view, setView] = React.useState<View>('week')
  const [cursor, setCursor] = React.useState<Date>(() => new Date())
  const today = startOfDay(new Date())

  const events = React.useMemo<CalEvent[]>(() => {
    const booked = bookings
      .filter((b) => b.slot?.starts_at)
      .map((b) => {
        const start = new Date(b.slot!.starts_at)
        const durationMin = b.slot!.duration_min ?? 30
        return {
          id: b.id,
          start,
          end: new Date(start.getTime() + durationMin * 60_000),
          durationMin,
          title: b.client?.full_name ?? 'Client',
          subtitle: b.service,
          kind: (b.status === 'completed'
            ? 'completed'
            : b.status === 'cancelled'
              ? 'cancelled'
              : 'confirmed') as Kind,
        }
      })
    const open = slots
      .filter((s) => !s.is_booked)
      .map((s) => {
        const start = new Date(s.starts_at)
        const durationMin = s.duration_min ?? 30
        return {
          id: `slot-${s.id}`,
          start,
          end: new Date(start.getTime() + durationMin * 60_000),
          durationMin,
          title: 'Open',
          subtitle: `${durationMin} min`,
          kind: 'open' as Kind,
        }
      })
    return [...booked, ...open]
  }, [bookings, slots])

  const move = (dir: -1 | 1) => {
    if (view === 'day') setCursor((c) => addDays(c, dir))
    else if (view === 'week') setCursor((c) => addDays(c, dir * 7))
    else setCursor((c) => new Date(c.getFullYear(), c.getMonth() + dir, 1))
  }

  const days =
    view === 'day' ? [startOfDay(cursor)] : view === 'week' ? weekDays(cursor) : []

  const rangeLabel =
    view === 'day'
      ? cursor.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
      : view === 'week'
        ? weekLabel(days)
        : cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  return (
    <section>
      {/* Toolbar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="heading-page">Calendar</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCursor(new Date())}
            className="rounded-xl border border-ink/15 bg-white px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:border-primary hover:text-primary-dark"
          >
            Today
          </button>
          <div className="flex items-center rounded-xl border border-ink/15 bg-white">
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label="Previous"
              className="p-2 text-ink/70 transition-colors hover:text-ink"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              aria-label="Next"
              className="border-l border-ink/10 p-2 text-ink/70 transition-colors hover:text-ink"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center rounded-xl border border-ink/15 bg-white p-0.5">
            {(['day', 'week', 'month'] as View[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={
                  'rounded-[10px] px-3 py-1.5 text-sm font-medium capitalize transition-colors ' +
                  (view === v ? 'bg-primary text-white' : 'text-ink/70 hover:text-ink')
                }
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="label-section mb-4">{rangeLabel}</p>

      {view === 'month' ? (
        <MonthGrid cursor={cursor} events={events} today={today} onPick={(d) => { setCursor(d); setView('day') }} />
      ) : (
        <TimeGrid days={days} events={events} today={today} />
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink/60">
        <Legend className="bg-badge-active-bg border-primary/25" label="Booked" />
        <Legend className="bg-ink/[0.04] border-ink/10" label="Completed" />
        <Legend className="border-dashed border-ink/25" label="Open slot" />
      </div>
    </section>
  )
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={'inline-block h-3 w-3 rounded border ' + className} />
      {label}
    </span>
  )
}

// ── Day / week time grid ──────────────────────────────────────────────────────
function TimeGrid({ days, events, today }: { days: Date[]; events: CalEvent[]; today: Date }) {
  // Dynamic vertical bounds: fit the events in view, with a sensible default window.
  const inView = events.filter((e) => days.some((d) => sameDay(d, e.start)))
  let startHour = 8
  let endHour = 20
  for (const e of inView) {
    startHour = Math.min(startHour, e.start.getHours())
    endHour = Math.max(endHour, e.end.getHours() + (e.end.getMinutes() > 0 ? 1 : 0))
  }
  startHour = Math.max(0, Math.min(startHour, 8))
  endHour = Math.min(24, Math.max(endHour, 20))
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i)
  const gridHeight = hours.length * HOUR_PX

  return (
    <div className="editorial-card overflow-x-auto p-0">
      <div className="min-w-[640px]">
        {/* Day headers */}
        <div className="grid border-b border-ink/8" style={{ gridTemplateColumns: `4rem repeat(${days.length}, 1fr)` }}>
          <div />
          {days.map((d) => {
            const isToday = sameDay(d, today)
            return (
              <div key={d.toISOString()} className="border-l border-ink/8 px-2 py-2 text-center">
                <p className="text-[11px] font-medium uppercase tracking-wide text-ink/50">
                  {DAY_NAMES[d.getDay()]}
                </p>
                <p
                  className={
                    'mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ' +
                    (isToday ? 'bg-primary text-white' : 'text-ink')
                  }
                >
                  {d.getDate()}
                </p>
              </div>
            )
          })}
        </div>

        {/* Time rows + event columns */}
        <div className="grid" style={{ gridTemplateColumns: `4rem repeat(${days.length}, 1fr)` }}>
          {/* Hour gutter */}
          <div className="relative" style={{ height: gridHeight }}>
            {hours.map((h, i) => (
              <div
                key={h}
                className="absolute right-2 -translate-y-1/2 text-[11px] text-ink/45"
                style={{ top: i * HOUR_PX }}
              >
                {i === 0 ? '' : labelHour(h)}
              </div>
            ))}
          </div>

          {/* One column per day */}
          {days.map((d) => {
            const dayEvents = layoutDay(events.filter((e) => sameDay(e.start, d)))
            return (
              <div key={d.toISOString()} className="relative border-l border-ink/8" style={{ height: gridHeight }}>
                {hours.map((_, i) => (
                  <div key={i} className="absolute inset-x-0 border-t border-ink/6" style={{ top: i * HOUR_PX }} />
                ))}
                {dayEvents.map(({ ev, col, cols }) => {
                  const top = ((ev.start.getHours() - startHour) * 60 + ev.start.getMinutes()) * (HOUR_PX / 60)
                  const height = Math.max(22, ev.durationMin * (HOUR_PX / 60) - 2)
                  const widthPct = 100 / cols
                  return (
                    <div
                      key={ev.id}
                      className={
                        'absolute overflow-hidden rounded-lg border px-2 py-1 text-[11px] leading-tight ' +
                        KIND_CLASS[ev.kind]
                      }
                      style={{ top, height, left: `calc(${col * widthPct}% + 2px)`, width: `calc(${widthPct}% - 4px)` }}
                      title={`${ev.title} · ${ev.subtitle} · ${formatTime(ev.start.toISOString())}`}
                    >
                      <p className="font-semibold">{formatTime(ev.start.toISOString())}</p>
                      <p className="truncate">{ev.title}</p>
                      {height > 40 && <p className="truncate opacity-80">{ev.subtitle}</p>}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Month grid ────────────────────────────────────────────────────────────────
function MonthGrid({
  cursor,
  events,
  today,
  onPick,
}: {
  cursor: Date
  events: CalEvent[]
  today: Date
  onPick: (d: Date) => void
}) {
  const first = startOfMonth(cursor)
  const gridStart = startOfWeek(first)
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  const weekHeads = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="editorial-card p-0">
      <div className="grid grid-cols-7 border-b border-ink/8">
        {weekHeads.map((w) => (
          <div key={w} className="px-2 py-2 text-center text-[11px] font-medium uppercase tracking-wide text-ink/50">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d) => {
          const inMonth = d.getMonth() === cursor.getMonth()
          const isToday = sameDay(d, today)
          const dayEvents = events
            .filter((e) => sameDay(e.start, d) && e.kind !== 'open')
            .sort((a, b) => a.start.getTime() - b.start.getTime())
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onPick(d)}
              className={
                'min-h-[104px] border-b border-l border-ink/8 p-1.5 text-left align-top transition-colors hover:bg-sand ' +
                (inMonth ? '' : 'bg-ink/[0.02]')
              }
            >
              <span
                className={
                  'ml-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ' +
                  (isToday ? 'bg-primary text-white' : inMonth ? 'text-ink' : 'text-ink/35')
                }
              >
                {d.getDate()}
              </span>
              <div className="mt-1 space-y-1">
                {dayEvents.slice(0, 3).map((e) => (
                  <div
                    key={e.id}
                    className={'truncate rounded border px-1.5 py-0.5 text-[10px] leading-tight ' + KIND_CLASS[e.kind]}
                  >
                    {formatTime(e.start.toISOString())} {e.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <p className="pl-1 text-[10px] font-medium text-ink/50">+{dayEvents.length - 3} more</p>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── helpers ───────────────────────────────────────────────────────────────────
function weekDays(d: Date) {
  const s = startOfWeek(d)
  return Array.from({ length: 7 }, (_, i) => addDays(s, i))
}
function weekLabel(days: Date[]) {
  const a = days[0]
  const b = days[days.length - 1]
  const fmt = (x: Date) => x.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `${fmt(a)} – ${fmt(b)}`
}
function labelHour(h: number) {
  const am = h < 12 || h === 24
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12} ${am ? 'AM' : 'PM'}`
}
// Lay overlapping events side by side within a day column.
function layoutDay(dayEvents: CalEvent[]) {
  const sorted = [...dayEvents].sort((a, b) => a.start.getTime() - b.start.getTime())
  const placed: { ev: CalEvent; col: number; cols: number }[] = []
  let cluster: typeof placed = []
  let clusterEnd = 0
  const flush = () => {
    const cols = cluster.reduce((m, p) => Math.max(m, p.col + 1), 1)
    cluster.forEach((p) => (p.cols = cols))
    placed.push(...cluster)
    cluster = []
  }
  for (const ev of sorted) {
    if (cluster.length && ev.start.getTime() >= clusterEnd) flush()
    const used = new Set(cluster.map((p) => p.col))
    let col = 0
    while (used.has(col)) col++
    cluster.push({ ev, col, cols: 1 })
    clusterEnd = Math.max(clusterEnd, ev.end.getTime())
  }
  flush()
  return placed
}

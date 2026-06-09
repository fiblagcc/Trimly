import * as React from 'react'
import { motion } from 'motion/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { AvailabilitySlot } from '@/lib/types'
import type { IncomingBooking } from '@/lib/barber'
import { DAY_NAMES, formatTime } from '@/lib/format'

// A compact day / week / month calendar for the barber dashboard. The grid lives in a
// bounded, full-height card and scrolls internally, so it always fits the page. View
// changes and week navigation animate; the day header stays pinned while time scrolls.

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

const HOUR_PX = 52
const DAY_MS = 86_400_000
const DEFAULT_START = 7
const DEFAULT_END = 21

const startOfDay = (d: Date) => {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY_MS)
const startOfWeek = (d: Date) => {
  const x = startOfDay(d)
  return addDays(x, -((x.getDay() + 6) % 7)) // Monday-start
}
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

const KIND_CLASS: Record<Kind, string> = {
  confirmed: 'bg-badge-active-bg border-primary/30 text-primary-dark',
  completed: 'bg-ink/[0.05] border-ink/12 text-ink/55',
  cancelled: 'bg-ink/[0.03] border-ink/10 text-ink/40 line-through',
  open: 'border-dashed border-primary/25 bg-primary/[0.04] text-primary-dark/70',
}

export function BarberCalendar({
  bookings,
  slots,
}: {
  bookings: IncomingBooking[]
  slots: AvailabilitySlot[]
}) {
  // Phones open on a single readable day; tablet and desktop open on the week.
  const [view, setView] = React.useState<View>(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'day' : 'week'
  )
  const [cursor, setCursor] = React.useState<Date>(() => new Date())
  const [dir, setDir] = React.useState(0)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const now = new Date()
  const today = startOfDay(now)

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

  const days = React.useMemo(
    () => (view === 'day' ? [startOfDay(cursor)] : view === 'week' ? weekDays(cursor) : []),
    [view, cursor]
  )
  const inView = React.useMemo(
    () => events.filter((e) => days.some((d) => sameDay(d, e.start))),
    [events, days]
  )

  // Vertical window: a sane default that grows only to fit out-of-hours events.
  let startHour = DEFAULT_START
  let endHour = DEFAULT_END
  for (const e of inView) {
    startHour = Math.min(startHour, e.start.getHours())
    endHour = Math.max(endHour, e.end.getHours() + (e.end.getMinutes() > 0 ? 1 : 0))
  }
  startHour = Math.max(0, startHour)
  endHour = Math.min(24, endHour)
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i)
  const gridHeight = hours.length * HOUR_PX

  const rangeKey = `${view}-${days[0]?.toDateString() ?? cursor.toDateString()}`

  // Scroll to the first booking of the range (or 8am) so the grid never opens on dead hours.
  React.useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el || view === 'month') return
    const earliest = inView.reduce((m, e) => Math.min(m, e.start.getHours()), 9)
    const focusHour = Math.min(Math.max(earliest, startHour), Math.max(startHour, endHour - 4))
    el.scrollTop = Math.max(0, (focusHour - startHour) * HOUR_PX - 8)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeKey])

  const move = (d: -1 | 1) => {
    setDir(d)
    if (view === 'day') setCursor((c) => addDays(c, d))
    else if (view === 'week') setCursor((c) => addDays(c, d * 7))
    else setCursor((c) => new Date(c.getFullYear(), c.getMonth() + d, 1))
  }
  const goToday = () => {
    setDir(0)
    setCursor(new Date())
  }
  const pickView = (v: View) => {
    setDir(0)
    setView(v)
  }

  const rangeLabel =
    view === 'day'
      ? cursor.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
      : view === 'week'
        ? weekLabel(days)
        : cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  const gridCols = { gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))` }
  const viewLayoutId = React.useId()

  return (
    <div className="card-elevated flex h-[calc(100dvh-8rem)] min-h-[520px] flex-col overflow-hidden !p-0">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/8 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold leading-none text-ink">Calendar</h1>
          <p className="mt-1 text-xs font-medium text-ink/55">{rangeLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToday}
            className="h-9 rounded-lg border border-ink/12 bg-white px-3 text-sm font-medium text-ink transition-colors hover:border-ink/25 hover:bg-panel"
          >
            Today
          </button>
          <div className="flex items-center rounded-lg border border-ink/12 bg-white">
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label="Previous"
              className="p-2 text-ink/60 transition-colors hover:text-ink"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              aria-label="Next"
              className="border-l border-ink/10 p-2 text-ink/60 transition-colors hover:text-ink"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center rounded-lg border border-ink/12 bg-white p-0.5">
            {(['day', 'week', 'month'] as View[]).map((v) => {
              const isActive = view === v
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => pickView(v)}
                  className="relative rounded-[7px] px-3 py-1 text-sm font-medium capitalize outline-none"
                >
                  {isActive && (
                    <motion.span
                      layoutId={viewLayoutId}
                      className="absolute inset-0 rounded-[7px] bg-primary"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className={'relative z-10 ' + (isActive ? 'text-white' : 'text-ink/60')}>{v}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Grid */}
      {view === 'month' ? (
        <div className="scroll-area flex-1 overflow-auto p-3">
          <MonthGrid cursor={cursor} events={events} today={today} dir={dir} onPick={(d) => { setDir(0); setCursor(d); setView('day') }} />
        </div>
      ) : (
        <div ref={scrollRef} className="scroll-area relative flex-1 overflow-y-auto overflow-x-hidden">
          {/* Pinned day header */}
          <div className="sticky top-0 z-20 grid border-b border-ink/8 bg-white/95 backdrop-blur-sm" style={gridCols}>
            <div />
            {days.map((d) => {
              const isToday = sameDay(d, today)
              return (
                <div key={d.toISOString()} className="flex items-center justify-center gap-1.5 border-l border-ink/8 py-2">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-ink/45">{DAY_NAMES[d.getDay()]}</span>
                  <span
                    className={
                      'flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold ' +
                      (isToday ? 'bg-primary text-white' : 'text-ink')
                    }
                  >
                    {d.getDate()}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Animated time grid */}
          <motion.div
            key={rangeKey}
            initial={{ opacity: 0, x: dir * 26 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="grid"
            style={gridCols}
          >
            {/* Hour gutter */}
            <div className="relative" style={{ height: gridHeight }}>
              {hours.map((h, i) => (
                <div
                  key={h}
                  className="absolute right-2 -translate-y-1/2 text-[10px] font-medium text-ink/40"
                  style={{ top: i * HOUR_PX }}
                >
                  {i === 0 ? '' : labelHour(h)}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map((d) => {
              const dayEvents = layoutDay(events.filter((e) => sameDay(e.start, d)))
              const showNow = sameDay(d, today) && now.getHours() >= startHour && now.getHours() < endHour
              const nowTop = ((now.getHours() - startHour) * 60 + now.getMinutes()) * (HOUR_PX / 60)
              return (
                <div key={d.toISOString()} className="relative border-l border-ink/8" style={{ height: gridHeight }}>
                  {hours.map((_, i) => (
                    <div key={i} className="absolute inset-x-0 border-t border-ink/[0.06]" style={{ top: i * HOUR_PX }} />
                  ))}

                  {dayEvents.map(({ ev, col, cols }) => {
                    const top = ((ev.start.getHours() - startHour) * 60 + ev.start.getMinutes()) * (HOUR_PX / 60)
                    const height = Math.max(20, ev.durationMin * (HOUR_PX / 60) - 2)
                    const widthPct = 100 / cols
                    const twoLine = height >= 40
                    return (
                      <div
                        key={ev.id}
                        className={'absolute overflow-hidden rounded-md border px-1.5 py-0.5 ' + KIND_CLASS[ev.kind]}
                        style={{ top, height, left: `calc(${col * widthPct}% + 2px)`, width: `calc(${widthPct}% - 4px)` }}
                        title={`${ev.title} · ${ev.subtitle} · ${formatTime(ev.start.toISOString())}`}
                      >
                        <p className="truncate text-[11px] font-semibold leading-tight">{ev.title}</p>
                        {twoLine && (
                          <p className="truncate text-[10px] leading-tight opacity-75">
                            {formatTime(ev.start.toISOString())} · {ev.subtitle}
                          </p>
                        )}
                      </div>
                    )
                  })}

                  {showNow && (
                    <div className="pointer-events-none absolute inset-x-0 z-10" style={{ top: nowTop }}>
                      <div className="relative border-t border-primary">
                        <span className="absolute -left-1 -top-[3px] h-1.5 w-1.5 rounded-full bg-primary" />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </motion.div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-ink/8 px-4 py-2.5 text-xs text-ink/55 sm:px-5">
        <Legend className="bg-badge-active-bg border-primary/30" label="Booked" />
        <Legend className="bg-ink/[0.05] border-ink/12" label="Completed" />
        <Legend className="border-dashed border-primary/30 bg-primary/[0.04]" label="Open slot" />
      </div>
    </div>
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

function MonthGrid({
  cursor,
  events,
  today,
  dir,
  onPick,
}: {
  cursor: Date
  events: CalEvent[]
  today: Date
  dir: number
  onPick: (d: Date) => void
}) {
  const first = startOfMonth(cursor)
  const gridStart = startOfWeek(first)
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  const weekHeads = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <motion.div
      key={cursor.getFullYear() + '-' + cursor.getMonth()}
      initial={{ opacity: 0, x: dir * 26 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden rounded-xl border border-ink/8"
    >
      <div className="grid grid-cols-7 border-b border-ink/8 bg-panel">
        {weekHeads.map((w) => (
          <div key={w} className="px-2 py-2 text-center text-[11px] font-medium uppercase tracking-wide text-ink/45">
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
                'min-h-[88px] border-b border-l border-ink/8 p-1.5 text-left align-top transition-colors hover:bg-panel ' +
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
                {dayEvents.slice(0, 2).map((e) => (
                  <div
                    key={e.id}
                    className={'truncate rounded border px-1.5 py-0.5 text-[10px] leading-tight ' + KIND_CLASS[e.kind]}
                  >
                    {formatTime(e.start.toISOString())} {e.title}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <p className="pl-1 text-[10px] font-medium text-ink/45">+{dayEvents.length - 2} more</p>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </motion.div>
  )
}

function weekDays(d: Date) {
  const s = startOfWeek(d)
  return Array.from({ length: 7 }, (_, i) => addDays(s, i))
}
function weekLabel(days: Date[]) {
  const fmt = (x: Date) => x.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `${fmt(days[0])} - ${fmt(days[days.length - 1])}`
}
function labelHour(h: number) {
  const am = h < 12 || h === 24
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12} ${am ? 'AM' : 'PM'}`
}
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

import * as React from 'react'
import { motion, useMotionValue, useTransform, animate, useInView, useReducedMotion } from 'motion/react'
import { toast } from 'sonner'
import { CalendarCheck, Store, Users, Ticket, RefreshCw } from 'lucide-react'
import { useTickets, useUpdateTicketStatus, useReport } from '@/lib/admin'
import type { TicketStatus } from '@/lib/types'
import { formatDate } from '@/lib/format'
import { Reveal, staggerItem } from '@/components/Reveal'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

const STATUS_VARIANT: Record<TicketStatus, 'active' | 'pending' | 'inactive'> = {
  open: 'pending',
  in_progress: 'active',
  closed: 'inactive',
}

const STATUS_LABEL: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  closed: 'Closed',
}

export function AdminDashboard() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-10 px-6 py-10">
      <Reveal>
        <h1 className="heading-page">Admin</h1>
        <p className="mt-1 text-ink/70">Support tickets and a snapshot of the platform.</p>
      </Reveal>

      <ReportSection />
      <TicketsSection />
    </div>
  )
}

// A number that animates up to its value the first time it scrolls into view, and
// honors reduced-motion by snapping straight to the final value.
function CountUp({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotion()
  const ref = React.useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const mv = useMotionValue(0)
  const text = useTransform(mv, (v) => Math.round(v).toString())

  React.useEffect(() => {
    if (reduce) {
      mv.set(value)
      return
    }
    if (!inView) return
    const controls = animate(mv, value, { duration: 0.9, ease: EASE })
    return () => controls.stop()
  }, [inView, value, reduce, mv])

  return (
    <motion.span ref={ref} className={className}>
      {text}
    </motion.span>
  )
}

// ── Report ────────────────────────────────────────────────────────────────────
function ReportSection() {
  // Load the snapshot on mount so the admin landing shows real counts immediately,
  // instead of an empty card. The button refreshes it.
  const { data, isFetching, refetch } = useReport(true)

  const metrics = [
    { key: 'bookings', label: 'Total bookings', value: data?.totalBookings, icon: CalendarCheck },
    { key: 'shops', label: 'Active barbershops', value: data?.activeShops, icon: Store },
    { key: 'users', label: 'Registered users', value: data?.totalUsers, icon: Users },
    { key: 'tickets', label: 'Open tickets', value: data?.openTickets, icon: Ticket, alert: true },
  ]

  return (
    <Reveal>
      {/* Platform snapshot: the one deep-teal anchor on the admin layout. */}
      <section className="surface-anchor overflow-hidden rounded-card-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-6 sm:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-white/55">
              Platform snapshot
            </p>
            <p className="mt-1 text-sm text-white/65">Live counts across Trimly.</p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 px-3 py-1.5 text-sm font-medium text-white/90 transition-colors duration-150 hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw className={'h-3.5 w-3.5 ' + (isFetching ? 'animate-spin' : '')} />
            {isFetching ? 'Refreshing' : 'Refresh'}
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-8 px-6 pb-8 sm:grid-cols-4 sm:px-8">
          {metrics.map((m) => {
            const amber = !!m.alert && (m.value ?? 0) > 0
            return (
              <div key={m.key}>
                <m.icon className="h-5 w-5 text-white/45" />
                <div
                  className={
                    'metric-number mt-3 text-4xl sm:text-5xl ' + (amber ? 'text-accent' : 'text-white')
                  }
                >
                  {m.value === undefined ? (
                    <span className="text-white/30">—</span>
                  ) : (
                    <CountUp value={m.value} />
                  )}
                </div>
                <p className="mt-1.5 text-sm text-white/60">{m.label}</p>
              </div>
            )
          })}
        </div>
      </section>
    </Reveal>
  )
}

// ── Tickets ─────────────────────────────────────────────────────────────────
function TicketsSection() {
  const { data: tickets, isLoading } = useTickets()
  const update = useUpdateTicketStatus()
  const reduce = useReducedMotion()

  const onChange = async (id: string, status: TicketStatus) => {
    try {
      await update.mutateAsync({ id, status })
      toast.success('Ticket updated.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update ticket.')
    }
  }

  const openCount = tickets?.filter((t) => t.status !== 'closed').length ?? 0

  return (
    <Reveal>
      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="label-section">Support tickets</p>
          {!isLoading && tickets && tickets.length > 0 && (
            <span className="text-sm text-ink/60">
              {openCount} open · {tickets.length} total
            </span>
          )}
        </div>

        <div className="editorial-card">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !tickets || tickets.length === 0 ? (
            <p className="text-ink/70">No tickets yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Opened by</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Change</TableHead>
                </TableRow>
              </TableHeader>
              <motion.tbody
                initial={reduce ? undefined : 'hidden'}
                animate={reduce ? undefined : 'show'}
                variants={{ show: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } } }}
              >
                {tickets.map((t) => (
                  <motion.tr
                    key={t.id}
                    variants={staggerItem}
                    className="border-b border-ink/8 last:border-0"
                  >
                    <TableCell className="font-medium text-ink">{t.subject}</TableCell>
                    <TableCell>{t.opener?.full_name ?? 'Unknown'}</TableCell>
                    <TableCell className="text-ink/70">{formatDate(t.created_at)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[t.status]}>{STATUS_LABEL[t.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        aria-label={`Change status for ${t.subject}`}
                        className="h-9 w-36 text-xs"
                        value={t.status}
                        onChange={(e) => onChange(t.id, e.target.value as TicketStatus)}
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In progress</option>
                        <option value="closed">Closed</option>
                      </Select>
                    </TableCell>
                  </motion.tr>
                ))}
              </motion.tbody>
            </Table>
          )}
        </div>
      </section>
    </Reveal>
  )
}

import * as React from 'react'
import { toast } from 'sonner'
import { useTickets, useUpdateTicketStatus, useReport } from '@/lib/admin'
import type { TicketStatus } from '@/lib/types'
import { formatDate } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

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
    <div className="mx-auto max-w-[1200px] space-y-12 px-6 py-10">
      <div>
        <h1 className="heading-page">Admin</h1>
        <p className="mt-1 text-ink/60">Support tickets and a snapshot of the platform.</p>
      </div>

      <ReportSection />
      <TicketsSection />
    </div>
  )
}

// ── Report ────────────────────────────────────────────────────────────────────
function ReportSection() {
  const [generated, setGenerated] = React.useState(false)
  const { data, isFetching, refetch } = useReport(generated)

  const metrics = [
    { label: 'Total bookings', value: data?.totalBookings },
    { label: 'Active barbershops', value: data?.activeShops },
    { label: 'Registered users', value: data?.totalUsers },
    { label: 'Open tickets', value: data?.openTickets },
  ]

  return (
    <section>
      <div className="flex items-center justify-between gap-4">
        <p className="label-section">Report</p>
        <Button
          variant={generated ? 'outline' : 'default'}
          size="sm"
          onClick={() => {
            setGenerated(true)
            if (generated) refetch()
          }}
          disabled={isFetching}
        >
          {isFetching ? 'Generating…' : generated ? 'Refresh' : 'Generate report'}
        </Button>
      </div>

      {!generated ? (
        <div className="editorial-card mt-4 text-ink/60">
          Generate a report to see current platform counts.
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.label} className="editorial-card">
              <p className="label-section">{m.label}</p>
              {isFetching || m.value === undefined ? (
                <Skeleton className="mt-3 h-10 w-16" />
              ) : (
                <p className="metric-number mt-2 text-5xl text-ink">{Math.round(m.value)}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

// ── Tickets ─────────────────────────────────────────────────────────────────
function TicketsSection() {
  const { data: tickets, isLoading } = useTickets()
  const update = useUpdateTicketStatus()

  const onChange = async (id: string, status: TicketStatus) => {
    try {
      await update.mutateAsync({ id, status })
      toast.success('Ticket updated.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update ticket.')
    }
  }

  return (
    <section>
      <p className="label-section">Support tickets</p>

      <div className="editorial-card mt-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !tickets || tickets.length === 0 ? (
          <p className="text-ink/60">No tickets yet.</p>
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
            <TableBody>
              {tickets.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium text-ink">{t.subject}</TableCell>
                  <TableCell>{t.opener?.full_name ?? '—'}</TableCell>
                  <TableCell className="text-ink/60">{formatDate(t.created_at)}</TableCell>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </section>
  )
}

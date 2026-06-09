import * as React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Bell } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useNotifications, useMarkAllRead, useNotificationsRealtime } from '@/lib/notifications'
import { formatDateTime } from '@/lib/format'

// Header bell with an unread count and a dropdown feed. Opening it marks everything
// read (same behaviour as the phone app's notifications screen).
export function NotificationBell() {
  const { session } = useAuth()
  const userId = session?.user.id
  useNotificationsRealtime(userId)
  const { data: items } = useNotifications(userId)
  const markAll = useMarkAllRead(userId)
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  const unread = items?.filter((n) => !n.is_read).length ?? 0

  React.useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  if (!userId) return null

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next && unread > 0) markAll.mutate()
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="absolute right-0 z-50 mt-2 w-80 origin-top-right overflow-hidden rounded-card-lg border border-ink/10 bg-white shadow-[0_12px_40px_-12px_rgba(10,38,32,0.25)]"
          >
            <div className="border-b border-ink/8 px-4 py-2.5">
              <p className="label-section">Notifications</p>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {!items || items.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-ink/55">No notifications yet.</p>
              ) : (
                <ul className="divide-y divide-ink/6">
                  {items.map((n) => (
                    <li key={n.id} className={'px-4 py-3 ' + (n.is_read ? '' : 'bg-badge-active-bg/40')}>
                      <p className="text-sm font-medium text-ink">{n.title}</p>
                      {n.body && <p className="mt-0.5 text-sm text-ink/70">{n.body}</p>}
                      <p className="mt-1 text-[11px] text-ink/45">{formatDateTime(n.created_at)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

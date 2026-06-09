import * as React from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

export interface RailNavItem {
  id: string
  label: string
  icon: React.ElementType
}

// The operator side rail: the one dark surface for the layout, now a proper sticky
// rail (content height, no dead space) with a brand-tinted gradient and an active
// indicator that springs between items via Motion's shared layout.
export function SidebarRail({
  nav,
  active,
  onNavigate,
  top,
}: {
  nav: RailNavItem[]
  active: string
  onNavigate: (id: string) => void
  top?: React.ReactNode
}) {
  const lid = React.useId()
  return (
    <div className="surface-anchor rounded-card-lg p-5 text-white shadow-pop lg:sticky lg:top-20 lg:self-start">
      {top}
      <nav
        className={cn(
          'flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible',
          top ? 'mt-5' : ''
        )}
      >
        {nav.map(({ id, label, icon: Icon }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onNavigate(id)}
              className="group relative flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            >
              {isActive && (
                <motion.span
                  layoutId={lid}
                  className="absolute inset-0 rounded-xl bg-white/[0.12] ring-1 ring-inset ring-white/10"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <Icon
                className={cn(
                  'relative z-10 h-4 w-4 shrink-0 transition-colors duration-200',
                  isActive ? 'text-accent' : 'text-white/55 group-hover:text-white'
                )}
              />
              <span
                className={cn(
                  'relative z-10 transition-colors duration-200',
                  isActive ? 'text-white' : 'text-white/60 group-hover:text-white'
                )}
              >
                {label}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

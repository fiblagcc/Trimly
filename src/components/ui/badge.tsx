import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Status palettes from SPEC §3 — driven by theme tokens, never hardcoded hex.
const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        active: 'bg-badge-active-bg text-badge-active-text',
        pending: 'bg-badge-pending-bg text-badge-pending-text',
        inactive: 'bg-badge-inactive-bg text-badge-inactive-text',
        neutral: 'bg-sand text-ink/70',
      },
    },
    defaultVariants: { variant: 'neutral' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

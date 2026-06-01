import { cn } from '@/lib/utils'

// Loading placeholder - card-shaped, not a spinner (ART_DIRECTION §7).
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-xl bg-ink/8', className)}
      {...props}
    />
  )
}

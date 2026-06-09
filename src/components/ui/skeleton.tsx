import { cn } from '@/lib/utils'

// Loading placeholder - a shimmer sweep, not a spinner.
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('shimmer rounded-xl', className)} {...props} />
}

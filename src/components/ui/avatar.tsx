import { cn } from '@/lib/utils'

// Initials avatar — no image fetch, just a tinted monogram. Quiet and on-brand.
export function Avatar({ name, className }: { name?: string | null; className?: string }) {
  const initials = (name ?? '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '·'

  return (
    <span
      className={cn(
        'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
        'bg-badge-active-bg text-sm font-semibold text-primary-dark',
        className
      )}
      aria-hidden="true"
    >
      {initials}
    </span>
  )
}

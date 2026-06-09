import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// Styled native <select> - accessible by default, no Radix dependency.
const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'h-11 w-full appearance-none rounded-xl border border-ink/12 bg-white pl-3.5 pr-9 text-sm text-ink',
          'transition-colors duration-200 hover:border-ink/25 focus-visible:outline-none focus-visible:border-primary',
          'focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/55" />
    </div>
  )
)
Select.displayName = 'Select'

export { Select }

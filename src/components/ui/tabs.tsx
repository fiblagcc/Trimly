import * as React from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

// Minimal accessible tabs (no Radix). The active pill is a shared-layout element
// that springs between triggers via Motion's layoutId.
interface TabsCtx {
  value: string
  setValue: (v: string) => void
  layoutId: string
}
const Ctx = React.createContext<TabsCtx | null>(null)
const useTabs = () => {
  const c = React.useContext(Ctx)
  if (!c) throw new Error('Tabs components must be used within <Tabs>')
  return c
}

export function Tabs({
  defaultValue,
  value: controlled,
  onValueChange,
  className,
  children,
}: {
  defaultValue?: string
  value?: string
  onValueChange?: (v: string) => void
  className?: string
  children: React.ReactNode
}) {
  const [internal, setInternal] = React.useState(defaultValue ?? '')
  const layoutId = React.useId()
  const value = controlled ?? internal
  const setValue = (v: string) => {
    if (controlled === undefined) setInternal(v)
    onValueChange?.(v)
  }
  return (
    <Ctx.Provider value={{ value, setValue, layoutId }}>
      <div className={className}>{children}</div>
    </Ctx.Provider>
  )
}

export function TabsList({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center gap-1 rounded-xl border border-ink/8 bg-white p-1 shadow-soft',
        className
      )}
    >
      {children}
    </div>
  )
}

export function TabsTrigger({ value, children }: { value: string; children: React.ReactNode }) {
  const { value: active, setValue, layoutId } = useTabs()
  const selected = active === value
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={() => setValue(value)}
      className="group relative rounded-lg px-4 py-1.5 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      {selected && (
        <motion.span
          layoutId={layoutId}
          className="absolute inset-0 rounded-lg bg-primary shadow-soft"
          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        />
      )}
      <span
        className={cn(
          'relative z-10 transition-colors duration-200',
          selected ? 'text-white' : 'text-ink/65 group-hover:text-ink'
        )}
      >
        {children}
      </span>
    </button>
  )
}

export function TabsContent({
  value,
  className,
  children,
}: {
  value: string
  className?: string
  children: React.ReactNode
}) {
  const { value: active } = useTabs()
  if (active !== value) return null
  return (
    <motion.div
      role="tabpanel"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

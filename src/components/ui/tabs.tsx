import * as React from 'react'
import { cn } from '@/lib/utils'

// Minimal accessible tabs (no Radix). Roving via simple click; ARIA roles set.
interface TabsCtx {
  value: string
  setValue: (v: string) => void
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
  const value = controlled ?? internal
  const setValue = (v: string) => {
    if (controlled === undefined) setInternal(v)
    onValueChange?.(v)
  }
  return (
    <Ctx.Provider value={{ value, setValue }}>
      <div className={className}>{children}</div>
    </Ctx.Provider>
  )
}

export function TabsList({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center gap-1 rounded-xl border border-ink/8 bg-white p-1',
        className
      )}
    >
      {children}
    </div>
  )
}

export function TabsTrigger({ value, children }: { value: string; children: React.ReactNode }) {
  const { value: active, setValue } = useTabs()
  const selected = active === value
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={() => setValue(value)}
      className={cn(
        'rounded-lg px-4 py-1.5 text-sm font-medium transition-colors duration-150',
        selected ? 'bg-primary text-white' : 'text-ink/70 hover:text-ink'
      )}
    >
      {children}
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
    <div role="tabpanel" className={className}>
      {children}
    </div>
  )
}

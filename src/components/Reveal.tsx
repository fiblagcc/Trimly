import * as React from 'react'
import { cn } from '@/lib/utils'

// One gentle fade-up as a section scrolls into view - fires once (ART_DIRECTION §7).
// Respects prefers-reduced-motion via the .reveal rule in index.css.
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  // When IntersectionObserver is unavailable, render shown from the start.
  const [shown, setShown] = React.useState(() => typeof IntersectionObserver === 'undefined')

  React.useEffect(() => {
    if (shown) return
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold: 0.12 }
    )
    io.observe(el)
    // Safety net: if the observer never fires (a renderer that doesn't scroll,
    // a background tab), reveal anyway so the section never ships blank.
    const fallback = setTimeout(() => setShown(true), 1100)
    return () => {
      io.disconnect()
      clearTimeout(fallback)
    }
  }, [shown])

  return (
    <div
      ref={ref}
      className={cn(shown && 'reveal', className)}
      style={shown ? { animationDelay: `${delay}ms` } : { opacity: 0 }}
    >
      {children}
    </div>
  )
}

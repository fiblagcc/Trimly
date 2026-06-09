/* eslint-disable react-refresh/only-export-components -- the motion variants ship next to their helpers */
import * as React from 'react'
import { motion, type Variants } from 'motion/react'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

// Fade + rise as it scrolls into view, once. Reduced motion is honored globally via
// <MotionConfig reducedMotion="user">, which collapses the transform to a plain fade.
export function Reveal({
  children,
  className,
  delay = 0,
  y = 16,
}: {
  children: React.ReactNode
  className?: string
  delay?: number // milliseconds (kept for existing callers)
  y?: number
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay: delay / 1000, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

// Staggered reveal for lists and grids: wrap items in <Stagger> and make each child a
// <StaggerItem> (or a motion element with variants={staggerItem}).
export function Stagger({
  children,
  className,
  amount = 0.15,
  gap = 0.06,
}: {
  children: React.ReactNode
  className?: string
  amount?: number
  gap?: number
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
      variants={{ show: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </motion.div>
  )
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div className={className} variants={staggerItem}>
      {children}
    </motion.div>
  )
}

/* eslint-disable react-refresh/only-export-components -- co-export buttonVariants with the component (shadcn convention) */
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 ease-out-expo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] active:translate-y-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-white shadow-soft hover:bg-primary-dark hover:-translate-y-px hover:shadow-pop',
        anchor: 'bg-dark-anchor text-white shadow-soft hover:-translate-y-px hover:shadow-pop',
        accent: 'bg-accent text-ink shadow-soft hover:-translate-y-px hover:shadow-pop hover:brightness-[1.02]',
        destructive: 'bg-red-600 text-white shadow-soft hover:bg-red-700 hover:-translate-y-px',
        outline: 'border border-ink/12 bg-white text-ink hover:border-ink/25 hover:bg-panel',
        secondary: 'border border-ink/8 bg-panel text-ink hover:bg-sand',
        ghost: 'text-ink hover:bg-ink/[0.06]',
        link: 'text-primary-dark underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-5 py-2',
        sm: 'h-9 px-3.5 text-[13px]',
        lg: 'h-12 px-7 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }

// src/components/ui/Button.tsx
'use client'

import * as React from 'react'
// We import `cva` to manage class variants, and `VariantProps` to get the types.
import { cva, type VariantProps } from 'class-variance-authority'

// --- The Core Change ---
// We define a `buttonVariants` object using `cva`.
// This sets up the base styles and defines different visual variants.
const buttonVariants = cva(
  // Base styles applied to all buttons.
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      // Defines the different visual styles for the button.
      variant: {
        default: 'bg-blue-600 text-white hover:bg-blue-700',
        destructive: 'bg-red-500 text-white hover:bg-red-600',
        outline: 'border border-gray-300 bg-transparent hover:bg-gray-100',
        // The "ghost" variant is for buttons that should have minimal styling.
        ghost: 'hover:bg-gray-100 hover:text-gray-900',
      },
      // Defines different sizes for the button.
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        // This is the new 'icon' size variant. It creates a square button
        // perfectly suited for holding an icon without text. This resolves
        // the TypeScript error from page.tsx.
        icon: 'h-10 w-10',
      },
    },
    // Sets the default variant and size if they are not specified.
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

// We define the new props for our button.
// It extends the standard button attributes and adds our custom variants and isLoading prop.
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean
}

/**
 * A reusable button component with variants for different styles and sizes,
 * and a built-in loading state.
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, ...props }, ref) => {
    return (
      <button
        // The `buttonVariants` function is called with the props to generate the correct class names.
        className={buttonVariants({ variant, size, className })}
        ref={ref}
        disabled={isLoading}
        {...props}
      >
        {isLoading ? 'Loading...' : children}
      </button>
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }

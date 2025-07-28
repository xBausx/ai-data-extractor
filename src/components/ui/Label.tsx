// src/components/ui/Label.tsx
'use client'

// This component uses the Radix UI Label primitive for accessibility and functionality.
import * as LabelPrimitive from '@radix-ui/react-label'
import * as React from 'react'

/**
 * A styled label component that forwards all props to the Radix UI Label primitive.
 * It provides a consistent look and feel for form labels across the application.
 */
const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    // --- The Core Fix ---
    // We now combine our base styles with any `className` that is passed in from a parent component.
    // This makes the component more flexible and reusable, and it resolves the "no-unused-vars" linting error.
    className={`text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className || ''}`}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }

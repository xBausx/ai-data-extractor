// src/components/ui/Input.tsx
import * as React from 'react'

// --- The First Fix ---
// We change `InputProps` from an interface to a type alias.
// This is a more direct way to define the props and avoids the empty interface linting error.
export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

/**
 * A reusable, styled input component.
 * It accepts all standard HTML input attributes.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        // --- The Second Fix ---
        // We now combine our base styles with any `className` that is passed in from a parent component.
        // This makes the component more flexible and reusable.
        // The `${className || ''}` part ensures that if `className` is undefined, it doesn't break the string.
        className={`flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-black focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${className || ''}`}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }

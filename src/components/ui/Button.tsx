// src/components/ui/Button.tsx
'use client'

import React from 'react'

// We use React.ComponentProps<'button'> to get all the standard props of a button element.
// We add a custom 'isLoading' prop to show a loading state.
type ButtonProps = React.ComponentProps<'button'> & {
  isLoading?: boolean
}

/**
 * A reusable button component with a loading state.
 * It forwards all standard button props (like onClick, type, etc.).
 */
export function Button({
  children,
  className,
  isLoading,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? 'Loading...' : children}
    </button>
  )
}

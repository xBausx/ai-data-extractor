'use client'

import React from 'react'

// This component forwards all standard input element props.
type InputProps = React.ComponentProps<'input'>

/**
 * A reusable, styled input component.
 */
export function Input({ className, ...props }: InputProps) {
  return (
    <input
      // --- CHANGES START HERE ---
      className={`block w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-gray-200 placeholder-gray-500 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none sm:text-sm ${className}`}
      // --- CHANGES END HERE ---
      {...props}
    />
  )
}

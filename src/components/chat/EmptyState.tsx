// src/components/chat/EmptyState.tsx
'use client'

import * as React from 'react'

// --- FIX: Removed the unused EmptyStateProps interface. ---
// The component no longer takes any props, so this interface is unnecessary.

// Renders the centered view when no messages exist yet.
export const EmptyState = () => (
  // No props are expected or used here now.
  <main className="flex flex-1 flex-col items-center justify-center p-4">
    <div className="text-center">
      <h2 className="text-muted-foreground text-2xl font-medium">
        What can I help with?
      </h2>
    </div>
  </main>
)

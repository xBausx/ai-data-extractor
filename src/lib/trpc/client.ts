// src/lib/trpc/client.ts
import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from '@/lib/trpc/root'

// This is the typed client that we will use in our React components.
export const trpc = createTRPCReact<AppRouter>({})

// src/app/api/trpc/[trpc]/route.ts

import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import type { NextRequest } from 'next/server'

import { appRouter } from '@/lib/trpc/root' // Imports the router from the correct location
import { createTRPCContext } from '@/lib/trpc/server'

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: createTRPCContext,
  })

export { handler as GET, handler as POST }

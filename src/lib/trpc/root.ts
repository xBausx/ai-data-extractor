// src/lib/trpc/root.ts

import { createTRPCRouter, publicProcedure } from '@/lib/trpc/server'
import { z } from 'zod'

// Import the newly created authentication router.
import { authRouter } from '@/modules/auth/trpc'

// This is our main app router.
export const appRouter = createTRPCRouter({
  // The 'greeting' procedure is still here for testing purposes.
  greeting: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello, ${input.text}!`,
      }
    }),

  // We mount the authRouter under the 'auth' namespace.
  // This means API calls will be like 'auth.signUp', 'auth.signIn', etc.
  auth: authRouter,
})

// Export the type of our app router for the client.
export type AppRouter = typeof appRouter

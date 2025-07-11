// src/lib/trpc/server.ts

import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { ZodError } from 'zod'
import { validateRequest } from '@/lib/auth' // Import our new function

// This is the new context creation function.
// It will be called for every request and provides the user session.
export const createTRPCContext = async () => {
  const { user, session } = await validateRequest()
  return {
    user,
    session,
  }
}

// This is the main tRPC initialization object.
const t = initTRPC
  .context<typeof createTRPCContext>() // Set the context type
  .create({
    transformer: superjson,
    errorFormatter: ({ shape, error }) => ({
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }),
  })

export const createTRPCRouter = t.router
export const publicProcedure = t.procedure

// This is the middleware for protected procedures.
// It checks if a user is authenticated.
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user || !ctx.session) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({
    ctx: {
      // Inferred procedures have access to the user and session.
      session: ctx.session,
      user: ctx.user,
    },
  })
})

// This is the new protected procedure.
// We will use this for any API route that requires a logged-in user.
export const protectedProcedure = t.procedure.use(enforceUserIsAuthed)

// src/modules/auth/trpc.ts

import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { Argon2id } from 'oslo/password'
import { cookies } from 'next/headers'
import { inngest } from '@/lib/inngest'

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from '@/lib/trpc/server'
import { lucia } from '@/lib/auth'
import { db } from '@/lib/db'

// Create a single, shared instance of Argon2id for the entire module
const argon2id = new Argon2id()

export const authRouter = createTRPCRouter({
  // Procedure for user sign-up.
  signUp: publicProcedure
    .input(
      // Zod schema for input validation.
      z.object({
        username: z.string().min(3, 'Username must be at least 3 characters'),
        password: z.string().min(6, 'Password must be at least 6 characters'),
      }),
    )
    .mutation(async ({ input }) => {
      // Hash the user's password using Argon2.
      const hashedPassword = await argon2id.hash(input.password)

      try {
        // Create the user in the database.
        const user = await db.user.create({
          data: {
            username: input.username,
            password: hashedPassword,
          },
        })

        // Create a session for the new user.
        const session = await lucia.createSession(user.id, {})
        // Create a session cookie to be sent to the client.
        const sessionCookie = lucia.createSessionCookie(session.id)

        // Await the cookies() call first
        const cookieStore = await cookies()

        // Set the cookie in the response headers.
        cookieStore.set(
          sessionCookie.name,
          sessionCookie.value,
          sessionCookie.attributes,
        )

        // Return the newly created user.
        return user
      } catch (error) {
        // Handle potential database errors, such as a unique constraint violation
        // if the username is already taken.
        // Prisma throws a specific error code 'P2002' for this.
        if (
          error instanceof Error &&
          error.message.includes('Unique constraint failed')
        ) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Username is already taken.',
          })
        }
        // For any other errors, we throw a generic internal server error.
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create user.',
        })
      }
    }),

  // Procedure for user sign-in.
  signIn: publicProcedure
    .input(
      z.object({
        username: z.string(),
        password: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      // Find the user by username.
      const user = await db.user.findUnique({
        where: { username: input.username },
      })

      // If no user is found, throw an error.
      if (!user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid username or password.',
        })
      }

      // Verify the provided password against the stored hash.
      // Use the shared instance to verify the password
      const isValidPassword = await argon2id.verify(
        user.password,
        input.password,
      )

      if (!isValidPassword) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid username or password.',
        })
      }

      // If the password is valid, create a new session.
      const session = await lucia.createSession(user.id, {})
      const sessionCookie = lucia.createSessionCookie(session.id)

      // Await the cookies() call first
      const cookieStore = await cookies()

      // Set the cookie in the response headers.
      cookieStore.set(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes,
      )

      return { success: true }
    }),

  // Procedure for user sign-out.
  signOut: protectedProcedure.mutation(async ({ ctx }) => {
    // This procedure is protected, so we know a session exists.
    // ctx.session is available thanks to our tRPC context setup.

    // Invalidate the current session in the database.
    await lucia.invalidateSession(ctx.session.id)

    // Create a blank session cookie to overwrite and effectively
    // delete the existing session cookie on the client.
    const sessionCookie = lucia.createBlankSessionCookie()
    // Await the cookies() call first
    const cookieStore = await cookies()

    // Set the cookie in the response headers.
    cookieStore.set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes,
    )

    return { success: true }
  }),

  // Procedure to get the current session state.
  // This is useful for the client to know if a user is logged in.
  getSession: publicProcedure.query(async ({ ctx }) => {
    // The context provides the user and session if they exist.
    return {
      user: ctx.user,
    }
  }),

  triggerInngestTest: protectedProcedure.mutation(async ({ ctx }) => {
    // The 'send' method is used to trigger an Inngest function.
    // The 'name' is the event name we defined in our function.
    // The 'data' is the payload that will be sent to the function.
    await inngest.send({
      // Change the event name to match our new function's trigger.
      name: 'test/e2b.run',
      data: { message: `E2B test triggered by ${ctx.user.username}` },
    })
    return { success: true }
  }),
})

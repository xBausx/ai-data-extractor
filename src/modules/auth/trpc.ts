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

const argon2id = new Argon2id()

export const authRouter = createTRPCRouter({
  // --- This procedure is UNCHANGED ---
  signUp: publicProcedure
    .input(
      z.object({
        username: z.string().min(3, 'Username must be at least 3 characters'),
        password: z.string().min(6, 'Password must be at least 6 characters'),
      }),
    )
    .mutation(async ({ input }) => {
      const hashedPassword = await argon2id.hash(input.password)
      try {
        const user = await db.user.create({
          data: {
            username: input.username,
            password: hashedPassword,
          },
        })
        const session = await lucia.createSession(user.id, {})
        const sessionCookie = lucia.createSessionCookie(session.id)
        const cookieStore = await cookies()
        cookieStore.set(
          sessionCookie.name,
          sessionCookie.value,
          sessionCookie.attributes,
        )
        return user
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes('Unique constraint failed')
        ) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Username is already taken.',
          })
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create user.',
        })
      }
    }),

  // --- This procedure is UNCHANGED ---
  signIn: publicProcedure
    .input(
      z.object({
        username: z.string(),
        password: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const user = await db.user.findUnique({
        where: { username: input.username },
      })
      if (!user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid username or password.',
        })
      }
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
      const session = await lucia.createSession(user.id, {})
      const sessionCookie = lucia.createSessionCookie(session.id)
      const cookieStore = await cookies()
      cookieStore.set(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes,
      )
      return { success: true }
    }),

  // --- This procedure is UNCHANGED ---
  signOut: protectedProcedure.mutation(async ({ ctx }) => {
    await lucia.invalidateSession(ctx.session.id)
    const sessionCookie = lucia.createBlankSessionCookie()
    const cookieStore = await cookies()
    cookieStore.set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes,
    )
    return { success: true }
  }),

  // --- This procedure is UNCHANGED ---
  getSession: publicProcedure.query(async ({ ctx }) => {
    return {
      user: ctx.user,
    }
  }),

  // --- This procedure is UPDATED ---
  /**
   * Triggers the product extraction job.
   * It now includes the userId in the event data and returns the unique eventId.
   */
  triggerInngestTest: protectedProcedure
    .input(
      z.object({
        fileUrl: z.string().url(),
        userPrompt: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.userId
      const { ids } = await inngest.send({
        name: 'app/agent.run',
        data: {
          fileUrl: input.fileUrl,
          userPrompt: input.userPrompt,
          userId: userId,
        },
      })
      return { eventId: ids[0] }
    }),

  // --- This is a NEW, CORRECTED procedure ---
  /**
   * Gets the result of a specific job by polling our own database.
   */
  getJobResult: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const jobResult = await db.jobResult.findUnique({
        where: {
          id: input.eventId,
          userId: ctx.session.userId,
        },
      })
      // If no result is found yet, return null. The client will poll again.
      if (!jobResult) {
        return null
      }
      // If a result is found, return the full record.
      return jobResult
    }),
})

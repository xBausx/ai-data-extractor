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

  // --- This procedure is UNCHANGED ---
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

  // --- This procedure is UNCHANGED ---
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

  /**
   * Generates a pre-signed S3 URL for direct client-side upload.
   * It now correctly uses the POST method and sends 'fileTypes' array as per API Gateway.
   */
  generateSignedUrl: protectedProcedure
    .input(
      z.object({
        count: z.number().int().min(1, 'Count must be at least 1.'),
        // NEW: Add fileType to the input schema as the API Gateway expects it.
        fileType: z.string().min(1, 'File type is required.'),
      }),
    )
    .mutation(async ({ input }) => {
      const apiGatewayUrl =
        'https://kk6ioj4lr7.execute-api.us-east-1.amazonaws.com/generate-urls'

      try {
        const response = await fetch(apiGatewayUrl, {
          method: 'POST', // Confirmed correct
          headers: {
            'Content-Type': 'application/json',
          },
          // UPDATED: Now send 'fileTypes' as an array matching the 'count'.
          body: JSON.stringify({
            count: input.count,
            fileTypes: [input.fileType], // Send the fileType as an array
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => null)
          console.error(
            `Failed to get signed URL from API Gateway: ${response.status} - ${response.statusText}`,
            errorData,
          )
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to get signed URL: ${errorData?.message || response.statusText}`,
          })
        }

        const data: { urls: Array<{ uploadUrl: string; fileUrl: string }> } =
          await response.json()

        if (
          !data.urls ||
          !Array.isArray(data.urls) ||
          data.urls.length === 0 ||
          !data.urls[0].uploadUrl ||
          !data.urls[0].fileUrl
        ) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message:
              'Invalid response from signed URL generation service: missing expected URL data in "urls" array.',
          })
        }

        return {
          uploadUrl: data.urls[0].uploadUrl,
          fileUrl: data.urls[0].fileUrl,
        }
      } catch (error) {
        console.error('Error in generateSignedUrl TRPC procedure:', error)
        if (error instanceof TRPCError) {
          throw error
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Could not generate signed URL: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        })
      }
    }),
})

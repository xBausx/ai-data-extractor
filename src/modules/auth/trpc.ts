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
import { Prisma } from '@prisma/client'

const argon2id = new Argon2id()

/**
 * Defines the schema for a single product, used for type validation in procedures.
 */
const productSchema = z.object({
  group: z.string(),
  name: z.string(),
  description: z.string().optional(),
  price: z.string().optional(),
  limit: z.string().optional(),
})

export const authRouter = createTRPCRouter({
  /**
   * Handles user registration by creating a new user in the database.
   * Hashes the password and creates a new session.
   */
  signUp: publicProcedure
    .input(
      z.object({ username: z.string().min(3), password: z.string().min(6) }),
    )
    .mutation(async ({ input }) => {
      const hashedPassword = await argon2id.hash(input.password)
      // Generates a simple unique ID for the user.
      const userId = `user-${Math.random().toString(36).substring(2, 15)}`

      try {
        await db.user.create({
          data: {
            id: userId,
            username: input.username,
            hashedPassword: hashedPassword,
          },
        })

        const session = await lucia.createSession(userId, {})
        const sessionCookie = lucia.createSessionCookie(session.id)
        const cookieStore = await cookies()
        cookieStore.set(
          sessionCookie.name,
          sessionCookie.value,
          sessionCookie.attributes,
        )

        return { success: true }
      } catch (e) {
        // Checks for unique constraint violation (e.g., duplicate username).
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === 'P2002'
        ) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Username already taken.',
          })
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unknown error occurred during signup.',
        })
      }
    }),

  /**
   * Handles user login by validating credentials and creating a new session.
   */
  signIn: publicProcedure
    .input(z.object({ username: z.string(), password: z.string() }))
    .mutation(async ({ input }) => {
      const existingUser = await db.user.findUnique({
        where: { username: input.username },
      })

      if (!existingUser || !existingUser.hashedPassword) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Incorrect username or password.',
        })
      }

      const isValidPassword = await argon2id.verify(
        existingUser.hashedPassword,
        input.password,
      )
      if (!isValidPassword) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Incorrect username or password.',
        })
      }

      const session = await lucia.createSession(existingUser.id, {})
      const sessionCookie = lucia.createSessionCookie(session.id)
      const cookieStore = await cookies()
      cookieStore.set(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes,
      )

      return { success: true }
    }),

  /**
   * Handles user logout by invalidating the current session.
   */
  signOut: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.session) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'No active session to sign out from.',
      })
    }

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

  /**
   * Retrieves the current user session.
   */
  getSession: publicProcedure.query(async ({ ctx }) => {
    return { user: ctx.user }
  }),

  /**
   * Triggers the initial product extraction job.
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
      // Sends the 'app/agent.run' event to Inngest.
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

  /**
   * Triggers a job to update existing product data based on user feedback.
   */
  triggerAgentUpdate: protectedProcedure
    .input(
      z.object({
        userPrompt: z.string(),
        existingData: z.array(productSchema),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.userId
      // Sends the 'app/agent.update' event to Inngest.
      const { ids } = await inngest.send({
        name: 'app/agent.update',
        data: {
          userPrompt: input.userPrompt,
          existingData: input.existingData,
          userId: userId,
        },
      })
      return { eventId: ids[0] }
    }),

  /**
   * Triggers a job to finalize the extracted and corrected data, generating a final file.
   */
  triggerAgentFinalize: protectedProcedure
    .input(
      z.object({
        finalData: z.array(productSchema),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.userId
      // Sends the 'app/agent.finalize' event to Inngest.
      const { ids } = await inngest.send({
        name: 'app/agent.finalize',
        data: {
          finalData: input.finalData,
          userId: userId,
        },
      })
      return { eventId: ids[0] }
    }),

  /**
   * Retrieves a specific job result by event ID for the authenticated user.
   */
  getJobResult: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const jobResult = await db.jobResult.findUnique({
        where: { id: input.eventId, userId: ctx.session.userId },
      })
      if (!jobResult) {
        return null
      }
      return jobResult
    }),

  /**
   * Generates a pre-signed S3 URL for secure client-side file uploads.
   */
  generateSignedUrl: protectedProcedure
    .input(
      z.object({
        count: z.number().int().min(1),
        fileType: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const apiGatewayUrl =
        'https://kk6ioj4lr7.execute-api.us-east-1.amazonaws.com/generate-urls'

      try {
        const response = await fetch(apiGatewayUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            count: input.count,
            fileTypes: [input.fileType],
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

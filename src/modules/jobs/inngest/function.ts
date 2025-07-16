// src/modules/jobs/inngest/function.ts

import { inngest } from '@/lib/inngest'
import { z } from 'zod'
import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'
import { createAdeptCodeInterpreter } from '@/services/e2b'
import type { Sandbox } from '@e2b/code-interpreter'
import fs from 'fs'
import path from 'path'
import { SYSTEM_PROMPT } from './prompt'

const productSchema = z.object({
  group: z
    .string()
    .describe('The category for this product (e.g., "Meat & Protein").'),
  name: z.string().describe('The name of the product.'),
  description: z
    .string()
    .optional()
    .describe('The product description, size, or flavor.'),
  price: z.string().optional().describe('The price of the product.'),
  limit: z
    .string()
    .optional()
    .describe('Any limit or special deal info (e.g., "Limit 2").'),
})

const pythonOutputSchema = z.object({
  products: z.array(productSchema),
})

const eventPayloadSchema = z.object({
  fileUrl: z.string().url(),
  userPrompt: z.string(),
  userId: z.string(),
})

/**
 * This Inngest function orchestrates the E2B Code Interpreter sandbox.
 * It injects data directly into a Python script template for robust execution.
 */
export const runAdeptAgentFn = inngest.createFunction(
  { id: 'run-adept-agent-fn' },
  { event: 'app/agent.run' },
  async ({ event, step }) => {
    const { id: eventId, data: eventData } = event
    const { userPrompt, fileUrl, userId } = eventPayloadSchema.parse(eventData)

    if (!eventId) {
      throw new Error(`Inngest event was triggered without an event ID.`)
    }

    const extractedData = await step.run(
      'extract-data-in-sandbox',
      async () => {
        const sandbox: Sandbox = await createAdeptCodeInterpreter()

        try {
          console.log('[Inngest] Installing Python dependencies in sandbox...')
          const installExecution = await sandbox.runCode(
            '!pip install openai requests',
          )
          if (installExecution.error) {
            throw new Error(
              `Failed to install dependencies: ${installExecution.error.value}`,
            )
          }
          console.log('[Inngest] Dependencies installed successfully.')

          // Read the Python script template from the filesystem.
          const scriptTemplate = fs.readFileSync(
            path.join(
              process.cwd(),
              'src/modules/jobs/inngest/scripts/extract_products.py',
            ),
            'utf-8',
          )

          // This is the key fix: We safely inject the data directly into the script.
          // By replacing placeholders, we avoid all the issues with environment variables
          // and special characters in the prompt strings.
          const pythonCode = scriptTemplate
            .replace('__IMAGE_URL__', fileUrl)
            .replace('__USER_PROMPT__', userPrompt)
            .replace('__SYSTEM_PROMPT__', SYSTEM_PROMPT)

          console.log('[Inngest] Executing Python script in sandbox...')
          const execution = await sandbox.runCode(pythonCode, {
            // We only pass the API key as an environment variable, as it's a
            // simple string and this is more secure than injecting it into the code.
            envs: {
              OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
            },
          })

          if (execution.error) {
            throw new Error(
              `Sandbox execution failed: ${execution.error.name}: ${execution.error.value}`,
            )
          }

          const lastStdoutLine =
            execution.logs.stdout[execution.logs.stdout.length - 1]
          return JSON.parse(lastStdoutLine)
        } finally {
          console.log(
            '[Inngest] Sandbox execution finished. E2B will handle cleanup.',
          )
        }
      },
    )

    try {
      const validatedData = pythonOutputSchema.parse(extractedData)
      console.log(`[Inngest] Job ${eventId} extracted data:`, validatedData)

      await db.jobResult.create({
        data: {
          id: eventId,
          userId: userId,
          status: 'completed',
          data: validatedData.products as Prisma.InputJsonValue,
        },
      })

      console.log(`[Inngest] Job ${eventId} result saved to database.`)
      return { success: true, eventId: eventId }
    } catch (error) {
      console.error(`[Inngest] Job ${eventId} failed:`, error)
      const errorMessage =
        error instanceof Error ? error.message : String(error)

      await db.jobResult.create({
        data: {
          id: eventId,
          userId: userId,
          status: 'failed',
          error: errorMessage,
          data: {},
        },
      })
      throw error
    }
  },
)

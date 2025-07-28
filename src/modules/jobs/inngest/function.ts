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
import { productSchema, productsSchema } from '@/lib/types'

/**
 * Defines the schema for the payload of the 'app/agent.run' event.
 * userId is now optional to support unauthenticated API calls.
 */
const extractEventPayloadSchema = z.object({
  fileUrl: z.string().url(),
  userPrompt: z.string(),
  userId: z.string().optional(),
})

/**
 * Defines the schema for the payload of the 'app/agent.update' event.
 * userId is now optional.
 */
const updateEventPayloadSchema = z.object({
  existingData: z.array(productSchema),
  userPrompt: z.string(),
  userId: z.string().optional(),
})

/**
 * Defines the schema for the payload of the 'app/agent.finalize' event.
 * userId is now optional.
 */
const finalizeEventPayloadSchema = z.object({
  finalData: z.array(productSchema),
  userId: z.string().optional(),
})

export const runAdeptAgentFn = inngest.createFunction(
  { id: 'run-adept-agent-fn' },
  [
    { event: 'app/agent.run' },
    { event: 'app/agent.update' },
    { event: 'app/agent.finalize' },
  ],
  async ({ event, step }) => {
    const { id: eventId, data: eventData } = event

    if (!eventId) {
      throw new Error(`Inngest event was triggered without an event ID.`)
    }

    const result = await step.run('run-agent-in-sandbox', async () => {
      const sandbox: Sandbox = await createAdeptCodeInterpreter({
        OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
      })

      try {
        let payload: Record<string, string> = {}

        if (event.name === 'app/agent.run') {
          console.log('[Inngest] Preparing payload for EXTRACT mode.')
          const { userPrompt, fileUrl } =
            extractEventPayloadSchema.parse(eventData)
          payload = {
            operation_mode: 'extract',
            user_prompt: userPrompt,
            system_prompt: SYSTEM_PROMPT,
            image_url: fileUrl,
          }
        } else if (event.name === 'app/agent.update') {
          console.log('[Inngest] Preparing payload for UPDATE mode.')
          const { userPrompt, existingData } =
            updateEventPayloadSchema.parse(eventData)
          payload = {
            operation_mode: 'update',
            user_prompt: userPrompt,
            system_prompt: SYSTEM_PROMPT,
            existing_data_json: JSON.stringify({ products: existingData }),
          }
        } else if (event.name === 'app/agent.finalize') {
          console.log('[Inngest] Preparing payload for FINALIZE mode.')
          const { finalData } = finalizeEventPayloadSchema.parse(eventData)
          payload = {
            operation_mode: 'finalize',
            final_data_json: JSON.stringify({ products: finalData }),
          }
        } else {
          throw new Error(`Unsupported event type: ${event.name}`)
        }

        const payloadString = JSON.stringify(payload)
        const base64Payload = Buffer.from(payloadString).toString('base64')

        const writerCode = `
import base64
encoded_payload = "${base64Payload}"
decoded_payload = base64.b64decode(encoded_payload).decode('utf-8')
with open('/home/user/input.json', 'w') as f:
    f.write(decoded_payload)
`
        console.log('[Inngest] Writing payload to input.json in sandbox...')
        await sandbox.runCode(writerCode)
        console.log('[Inngest] Payload file created successfully.')

        const pythonCode = fs.readFileSync(
          path.join(
            process.cwd(),
            'src/modules/jobs/inngest/scripts/extract_products.py',
          ),
          'utf-8',
        )

        await sandbox.runCode('!pip install openai requests')
        console.log('[Inngest] Executing main Python script...')
        const execution = await sandbox.runCode(pythonCode)

        const sandboxLogs = execution.logs.stderr.join('\n')
        if (execution.error) {
          throw new Error(
            `Sandbox execution failed: ${execution.error.name}: ${execution.error.value}\nLogs:\n${sandboxLogs}`,
          )
        }

        const lastStdoutLine =
          execution.logs.stdout[execution.logs.stdout.length - 1]

        return {
          jsonData: JSON.parse(lastStdoutLine),
          logs: sandboxLogs,
        }
      } finally {
        console.log('[Inngest] Sandbox execution finished.')
      }
    })

    try {
      // The userId is no longer needed here, as it's already in the 'pending' record.
      const { jsonData, logs } = result
      const validatedData = productsSchema.parse(jsonData)

      // Update the existing 'pending' record to 'completed'.
      await db.jobResult.update({
        where: { id: eventId },
        data: {
          status: 'completed',
          data: validatedData.products as Prisma.InputJsonValue,
          error: logs,
        },
      })
      return { success: true, eventId }
    } catch (error) {
      console.error(`[Inngest] Job ${eventId} failed:`, error)
      const errorMessage =
        error instanceof Error ? error.message : String(error)

      // Update the existing 'pending' record to 'failed'.
      await db.jobResult.update({
        where: { id: eventId },
        data: {
          status: 'failed',
          error: errorMessage,
        },
      })
      throw error
    }
  },
)

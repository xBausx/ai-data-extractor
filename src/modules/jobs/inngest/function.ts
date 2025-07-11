// src/modules/jobs/inngest/function.ts

import { inngest } from '@/lib/inngest'
import { createAdeptSandbox } from '@/services/e2b'
import type { Sandbox as SandboxType } from '@e2b/sdk'
import { z } from 'zod'
import { adeptAgent } from './agent'

// Define the input schema for our function's event payload.
const eventPayloadSchema = z.object({
  fileUrl: z.string().url(),
  userPrompt: z.string(),
})

export const runAdeptAgentFn = inngest.createFunction(
  { id: 'run-adept-agent-fn' },
  { event: 'app/agent.run' },
  async ({ event, step }) => {
    let sandbox: SandboxType | undefined

    try {
      const { userPrompt } = eventPayloadSchema.parse(event.data)

      console.log('[Inngest] Creating sandbox for AI agent...')
      sandbox = await createAdeptSandbox(async () => {
        console.log('[Inngest] Agent sandbox exited unexpectedly.')
      })
      console.log('[Inngest] Sandbox created.')

      // For this test, we'll create a dummy file in the sandbox.
      // Later, we will download the actual file from the fileUrl.
      await step.run('create-dummy-file', async () => {
        if (!sandbox) throw new Error('Sandbox not available')
        await sandbox.filesystem.write(
          '/home/user/test.txt',
          'This is a test file. The secret code is 1234.',
        )
      })

      console.log('[Inngest] Invoking AI agent...')
      const result = await adeptAgent.run({
        input: userPrompt,
        // We pass the sandbox instance to the agent's context,
        // making it available to all tools.
        context: {
          sandbox,
        },
      })

      console.log('[Inngest] Agent finished with result:', result)
      return { success: true, result }
    } catch (error) {
      console.error('[Inngest] Error in agent function:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    } finally {
      if (sandbox) {
        console.log('[Inngest] Closing agent sandbox...')
        try {
          await sandbox.close()
          console.log('[Inngest] Agent sandbox closed.')
        } catch (closeError) {
          console.error('[Inngest] Error closing sandbox:', closeError)
        }
      }
    }
  },
)

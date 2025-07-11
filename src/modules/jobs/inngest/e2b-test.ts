// src/modules/jobs/inngest/e2b-test.ts

import { inngest } from '@/lib/inngest'
import { createAdeptSandbox } from '@/services/e2b'
import type { Sandbox as SandboxType } from '@e2b/sdk'

export const e2bTestFn = inngest.createFunction(
  { id: 'e2b-sandbox-test-fn' },
  { event: 'test/e2b.run' },
  async ({ step }) => {
    // This variable will hold our sandbox instance. It must be defined
    // at the top level of the function to be accessible in the 'finally' block.
    let sandbox: SandboxType | undefined

    try {
      // Step 1: Acquire the resource (the sandbox).
      // This is NOT wrapped in a step.run() because it establishes a
      // persistent connection, rather than being a discrete, resumable action.
      console.log('[Inngest] Creating sandbox...')
      sandbox = await createAdeptSandbox(async () => {
        console.log('[Inngest] Sandbox exited unexpectedly.')
      })
      console.log('[Inngest] Sandbox created successfully.')

      // Step 2: Perform a resumable action INSIDE the sandbox.
      // Now that we have the sandbox, we use `step.run` to execute our
      // command. If this step fails, Inngest can retry it without
      // needing to recreate the sandbox.
      const sandboxOutput = await step.run('execute-ls-command', async () => {
        if (!sandbox) {
          // This should theoretically never happen if the code runs sequentially,
          // but it satisfies the compiler and adds robustness.
          throw new Error('Sandbox not initialized')
        }

        const process = await sandbox.process.start({
          cmd: 'ls -l /',
        })
        await process.wait()

        return {
          stdout: process.output.stdout,
          stderr: process.output.stderr,
        }
      })

      console.log('[Inngest] E2B Sandbox Output:', sandboxOutput.stdout)
      return { success: true, output: sandboxOutput }
    } finally {
      // Step 3: Clean up the resource.
      // The `finally` block ensures this code runs whether the function
      // succeeds or fails, preventing orphaned (and costly) sandboxes.
      if (sandbox) {
        console.log('[Inngest] Closing sandbox...')
        await sandbox.close()
        console.log('[Inngest] Sandbox closed successfully.')
      }
    }
  },
)

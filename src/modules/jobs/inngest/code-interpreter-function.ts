// src/modules/jobs/inngest/code-interpreter-function.ts

import { inngest } from '@/lib/inngest'
import { Sandbox } from '@e2b/code-interpreter'

/**
 * A minimal Inngest function to test the `@e2b/code-interpreter` sandbox.
 */
export const codeInterpreterTestFn = inngest.createFunction(
  { id: 'code-interpreter-test-fn' },
  { event: 'app/code-interpreter.test' },
  async () => {
    console.log(
      '[Code Interpreter Test] Function triggered. Attempting to create sandbox...',
    )
    let sandbox: Sandbox | undefined

    try {
      const apiKey = process.env.E2B_API_KEY
      if (!apiKey) {
        throw new Error('E2B_API_KEY is not defined.')
      }

      sandbox = await Sandbox.create({ apiKey })
      console.log(
        '[Code Interpreter Test] Sandbox created. Attempting to run code...',
      )

      const execution = await sandbox.runCode(
        "print('Hello from Code Interpreter!')",
      )

      // --- The Core Fix ---
      // Instead of an exact match, we now check if the first line of stdout
      // *includes* our target string. This correctly handles the trailing newline `\n`.
      if (
        execution.logs.stdout.length > 0 &&
        execution.logs.stdout[0].includes('Hello from Code Interpreter!')
      ) {
        console.log(
          '[Code Interpreter Test] SUCCESS: Code executed successfully.',
        )
        console.log('[Code Interpreter Test] stdout:', execution.logs.stdout)
      } else {
        console.error(
          '[Code Interpreter Test] ERROR: Code execution did not produce the expected output.',
          execution.logs,
        )
        throw new Error('Code execution did not produce the expected output.')
      }

      return { success: true, logs: execution.logs }
    } catch (error) {
      console.error('[Code Interpreter Test] FAILED:', error)
      throw error
    }
    // No `finally` block is needed as this sandbox type does not have a .close() method.
  },
)

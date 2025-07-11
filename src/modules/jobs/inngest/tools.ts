// src/modules/jobs/inngest/tools.ts

import { createTool } from '@inngest/agent-kit'
import { z } from 'zod'
import type { Sandbox as SandboxType } from '@e2b/sdk'

/**
 * First, we define the Zod schema for our tool's input.
 * We store it in a variable so we can easily get its type later.
 */
const parameters = z.object({
  cmd: z
    .string()
    .describe("The shell command to execute, e.g., 'ls -l' or 'cat file.txt'"),
})

/**
 * Second, we define the interface for the custom resources that our tool needs.
 */
export interface ToolResources {
  sandbox: SandboxType
}

/**
 * Create the shell tool without generic type parameters
 * The context will be passed when the agent runs
 */
export const shellTool = createTool({
  name: 'shell',
  description:
    'Execute a shell command in the sandbox environment. Use this to inspect files and directories.',

  parameters: parameters,

  /**
   * The 'handler' function.
   * @param {object} params - This is destructured from `z.infer<typeof parameters>`.
   * @param {object} options - This contains the context and other options.
   */
  handler: async ({ cmd }, options) => {
    try {
      // Access the sandbox from the context passed by the agent
      const { sandbox } = options as unknown as ToolResources
      const proc = await sandbox.process.start({ cmd })
      const result = await proc.wait()

      return {
        stdout: proc.output.stdout,
        stderr: proc.output.stderr,
        exitCode: result.exitCode,
      }
    } catch (error) {
      return {
        stdout: '',
        stderr: `Error executing command: ${error instanceof Error ? error.message : String(error)}`,
        exitCode: 1,
      }
    }
  },
})

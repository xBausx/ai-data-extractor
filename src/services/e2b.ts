// src/services/e2b.ts

// We import the `Sandbox` and `RunCodeOpts` types.
import { Sandbox, RunCodeOpts } from '@e2b/code-interpreter'

/**
 * Creates and initializes an E2B Code Interpreter sandbox with specified environment variables.
 * This function encapsulates the setup logic, including API key validation,
 * and returns a sandbox instance ready for code execution.
 *
 * @param {RunCodeOpts['envs']} envs - An object containing environment variables to be set in the sandbox.
 * @returns {Promise<Sandbox>} A promise that resolves to an active Sandbox instance.
 */
export async function createAdeptCodeInterpreter(
  envs: RunCodeOpts['envs'] = {},
): Promise<Sandbox> {
  // Retrieve the E2B API key from the environment variables.
  const apiKey = process.env.E2B_API_KEY

  // Fail fast with a clear error if the API key is not configured.
  if (!apiKey) {
    throw new Error('E2B_API_KEY is not defined. Please check your .env file.')
  }

  // Log the initiation of the sandbox creation.
  console.log('[E2B] Creating Code Interpreter sandbox...')

  // Create a new sandbox instance, passing the API key and all required environment variables.
  // This ensures all variables are available to the sandbox from its creation.
  const sandbox = await Sandbox.create({
    apiKey,
    envs,
  })

  console.log(`[E2B] Sandbox ready.`)

  // Return the active and ready sandbox instance.
  return sandbox
}

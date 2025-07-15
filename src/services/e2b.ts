// src/services/e2b.ts

// We import the `Sandbox` class by its correct, exported name.
import { Sandbox } from '@e2b/code-interpreter'

/**
 * Creates and initializes an E2B Code Interpreter sandbox.
 * This function encapsulates the setup logic, including API key validation,
 * and returns a sandbox instance ready for code execution.
 *
 * @returns {Promise<Sandbox>} A promise that resolves to an active Sandbox instance.
 */
export async function createAdeptCodeInterpreter(): Promise<Sandbox> {
  // Retrieve the E2B API key from the environment variables.
  const apiKey = process.env.E2B_API_KEY

  // Fail fast with a clear error if the API key is not configured.
  if (!apiKey) {
    throw new Error('E2B_API_KEY is not defined. Please check your .env file.')
  }

  // Log the initiation of the sandbox creation.
  console.log('[E2B] Creating Code Interpreter sandbox...')

  // Create a new sandbox instance using the correct `Sandbox` class.
  const sandbox = await Sandbox.create({ apiKey })

  // This is the fix: The log message no longer references the `.id` property,
  // which does not exist on the Sandbox type, resolving the TypeScript error.
  console.log(`[E2B] Sandbox ready.`)

  // Return the active and ready sandbox instance.
  return sandbox
}

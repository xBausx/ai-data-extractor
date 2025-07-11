// src/services/e2b.ts

import { Sandbox } from '@e2b/sdk'
// It's good practice to import the type for explicit type annotations.
import type { Sandbox as SandboxType } from '@e2b/sdk'

/**
 * A helper function to create a new E2B sandbox.
 * @param {() => Promise<void>} onExit - A callback function to execute when the sandbox exits.
 * @returns {Promise<SandboxType>} A promise that resolves to a new Sandbox instance.
 */
export async function createAdeptSandbox(
  onExit: () => Promise<void>,
): Promise<SandboxType> {
  // The Sandbox.create method is where the connection is established.
  const sandbox: SandboxType = await Sandbox.create({
    template: 'base',
    apiKey: process.env.E2B_API_KEY,

    // This is the critical line. It tells the SDK to wait up to 120 seconds
    // for the sandbox to be ready, which is enough time for a cold start.
    timeout: 120000, // 120 seconds

    onExit,
  })
  return sandbox
}

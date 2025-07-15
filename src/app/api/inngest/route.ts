// src/app/api/inngest/route.ts

// The `serve` function from Inngest is used to create the API endpoint
// that handles all communication with the Inngest Dev Server.
import { serve } from 'inngest/next'

// This is your Inngest client instance.
import { inngest } from '@/lib/inngest'

// This is your existing, complex agent function.
import { runAdeptAgentFn } from '@/modules/jobs/inngest/function'

import { codeInterpreterTestFn } from '@/modules/jobs/inngest/code-interpreter-function'

// This array tells Inngest which functions this application is responsible for.
// We add our new simple test function to this list.
const functions = [runAdeptAgentFn, codeInterpreterTestFn]

// This creates the GET, POST, and PUT handlers that Inngest needs to operate.
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
})

// src/app/api/inngest/route.ts

import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest'

// Remove the old hello-world import.
// import { helloWorldFn } from '@/modules/jobs/inngest/hello-world';

// Import the new E2B test function.
import { e2bTestFn } from '@/modules/jobs/inngest/e2b-test'

const functions = [
  // helloWorldFn, // Remove this
  e2bTestFn, // Add this
]

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
})

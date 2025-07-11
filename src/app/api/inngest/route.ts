// src/app/api/inngest/route.ts

import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest'

// Import the function we just created.
import { helloWorldFn } from '@/modules/jobs/inngest/hello-world'

// Add the function to the functions array.
const functions = [helloWorldFn]

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
})

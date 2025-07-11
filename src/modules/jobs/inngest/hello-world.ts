// src/modules/jobs/inngest/hello-world.ts

import { inngest } from '@/lib/inngest'

// This defines an Inngest function.
// The first argument is a configuration object.
// The second argument is the function that will be executed.
export const helloWorldFn = inngest.createFunction(
  { id: 'hello-world-fn' }, // A unique ID for this function
  { event: 'test/hello.world' }, // The event that triggers this function
  async ({ event, step }) => {
    // The 'step' object is used to run reliable, resumable code.
    await step.sleep('wait-one-second', '1s')

    // The event payload is available in the 'event' object.
    const message = event.data.message

    console.log(`[Inngest] Hello, ${message}!`)

    return { success: true, message: `Hello, ${message}!` }
  },
)

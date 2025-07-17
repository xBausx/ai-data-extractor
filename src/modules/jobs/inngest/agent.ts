// src/modules/jobs/inngest/agent.ts

import { createAgent, openai } from '@inngest/agent'
import { SYSTEM_PROMPT } from './prompt'
import { saveDetectedProducts, type ToolResources } from './tools'

/**
 * This creates the AI agent instance for product extraction.
 */
export const adeptAgent = createAgent<ToolResources>({
  name: 'Adept Product Extractor Agent',
  system: SYSTEM_PROMPT,
  model: openai({
    model: 'gpt-4o',
    defaultParameters: {
      temperature: 0.1,
    },
  }),
  tools: [saveDetectedProducts],

  // --- The Core Fix ---
  // Instead of the ambiguous "required" string, we explicitly tell the agenta
  // the name of the tool it must call. This resolves the API error.
  tool_choice: 'saveDetectedProducts',
})

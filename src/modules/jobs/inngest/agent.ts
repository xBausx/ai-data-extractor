// src/modules/jobs/inngest/agent.ts

import { createAgent, openai } from '@inngest/agent-kit'
import { SYSTEM_PROMPT } from './prompt'
import { shellTool, type ToolResources } from './tools'

// This creates the AI agent instance.
export const adeptAgent = createAgent<ToolResources>({
  name: 'Adept AI Agent',

  // The system prompt provides the AI with its core instructions.
  system: SYSTEM_PROMPT,
  // We configure the agent to use OpenAI's GPT-4 Turbo model.
  model: openai({
    model: 'gpt-4-turbo',
    defaultParameters: {
      temperature: 0.1,
    },
  }),

  // We register the tools that this agent is allowed to use.
  tools: [shellTool],
})

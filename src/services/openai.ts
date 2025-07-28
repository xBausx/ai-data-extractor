// src/services/openai.ts

import OpenAI from 'openai'

// This creates a new OpenAI client instance.
// The SDK will automatically read the OPENAI_API_KEY from process.env.
export const openai = new OpenAI()

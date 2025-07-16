// src/modules/jobs/inngest/tools.ts

import { createTool } from '@inngest/agent-kit'
import { z } from 'zod'

/**
 * Defines the Zod schema for a single product.
 * This ensures any product data extracted by the AI is well-structured.
 */
const productSchema = z.object({
  // The name of the product, e.g., "Organic Banana".
  name: z.string().describe('The full name of the product.'),
  // A detailed description of the product in the image.
  description: z
    .string()
    .describe(
      'A detailed description of the product, including its appearance and any notable features.',
    ),
  // The price of the product, if visible or inferable.
  price: z
    .number()
    .optional()
    .describe('The price of the product, if available.'),
  // A category or group for the product, for logical organization.
  group: z
    .string()
    .describe(
      'The category or group this product belongs to, e.g., "Fruits", "Dairy", "Electronics".',
    ),
})

/**
 * Defines the schema for the parameters that our main tool will accept.
 * The AI must provide an array of products that match the `productSchema`.
 */
const parameters = z.object({
  products: z
    .array(productSchema)
    .describe('An array of all products detected in the image.'),
})

/**
 * Defines the resources our agent needs. For this task, it doesn't need any
 * special state passed from the outside, so we define it as an empty object.
 */
export type ToolResources = Record<string, never>

/**
 * Creates the `saveDetectedProducts` tool.
 * The agent's primary goal will be to call this tool with the data it extracts.
 */
export const saveDetectedProducts = createTool<
  typeof parameters,
  ToolResources
>({
  // The name of the tool, which the agent will be instructed to call.
  name: 'saveDetectedProducts',
  // A description for the AI to understand the tool's purpose.
  description: 'Saves the structured data of all products found in the image.',
  // The Zod schema for the tool's input.
  parameters,
  /**
   * The handler function is the code that runs when the agent calls this tool.
   * For now, it will simply log the extracted data and return it.
   * Later, this is where we can add the logic to save the data to our database.
   * @param {object} { products } - The destructured, validated array of products from the AI.
   */
  handler: async ({ products }) => {
    console.log('[Tool] `saveDetectedProducts` was called with:', products)
    // For now, we just return the data. This will be the final output of our Inngest function.
    return products
  },
})

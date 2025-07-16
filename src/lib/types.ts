// src/lib/types.ts

// We use the `z` object from Zod to define schemas.
import { z } from 'zod'

/**
 * Defines the Zod schema for a single product.
 * This provides both runtime validation and a static TypeScript type.
 */
export const productSchema = z.object({
  name: z.string(),
  description: z.string(),
  price: z.number().optional(),
  group: z.string(),
})

/**
 * Defines the Zod schema for an array of products.
 * This is the expected structure of the data returned by our AI agent.
 */
export const productsSchema = z.array(productSchema)

/**
 * Derives a static TypeScript type from our Zod schema.
 * This type can be used in our frontend components for type-safe access to product data.
 * For example: `const [products, setProducts] = useState<Product[]>([]);`
 */
export type Product = z.infer<typeof productSchema>

// src/lib/types.ts

// We use the `z` object from Zod to define schemas.
import { z } from 'zod'

/**
 * Defines the Zod schema for a single product.
 * This is the single source of truth for the product data structure.
 * It provides both runtime validation and a static TypeScript type.
 */
export const productSchema = z.object({
  product_name: z.string(),
  product_description: z.string().optional(),
  price: z.string().optional(),
  limit: z.string().optional(),
  physical_product_description: z.string().optional(),
})

/**
 * Defines the Zod schema for an array of products.
 * This is the expected structure of the data returned by our AI agent.
 */
export const productsSchema = z.object({
  products: z.array(productSchema),
})

/**
 * Derives a static TypeScript type from our Zod schema.
 * This type should be used in all frontend components for type-safe access to product data.
 * For example: `const [products, setProducts] = useState<Product[]>([]);`
 */
export type Product = z.infer<typeof productSchema>

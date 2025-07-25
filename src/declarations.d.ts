/* eslint-disable @typescript-eslint/no-explicit-any */
// src/declarations.d.ts

/**
 * This declaration informs TypeScript that the 'swagger-ui-dist/swagger-ui-bundle' module exists
 * and that its default export can be treated as 'any'. This is a common practice for
 * JavaScript libraries that lack complete or official type definitions for specific files.
 */
declare module 'swagger-ui-dist/swagger-ui-bundle' {
  const SwaggerUI: any
  export default SwaggerUI
}

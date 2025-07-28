// src/app/api-doc/page.tsx

import { SwaggerUIComponent } from '@/components/api/SwaggerUI'

/**
 * This is the page component that will render our interactive API documentation.
 */
export default function ApiDocPage() {
  return (
    <section className="container mx-auto py-8">
      <h1 className="mb-4 text-3xl font-bold">
        Adept AI Extractor API Documentation
      </h1>
      {/* 
            We are passing the URL to our spec-generating endpoint to the Swagger component.
            This component will then fetch the spec and render the interactive UI.
        */}
      <SwaggerUIComponent specUrl="/api/doc" />
    </section>
  )
}

// src/components/api/SwaggerUI.tsx
'use client'

import { useEffect } from 'react'
import SwaggerUI from 'swagger-ui-dist/swagger-ui-bundle'

// 1. Import the default base styles for Swagger UI.
import 'swagger-ui-dist/swagger-ui.css'

// 2. Import a popular dark theme stylesheet AFTER the base styles.
// This allows the dark theme to override the defaults.
// We are using a well-maintained theme loaded from a CDN.
import './swagger-dark.css'

interface SwaggerUIProps {
  // The component will expect a URL to the swagger.json file.
  specUrl: string
}

/**
 * A client component that renders the Swagger UI with a dark theme.
 * It loads the UI and initializes it with the OpenAPI spec from the provided URL.
 */
export const SwaggerUIComponent = ({ specUrl }: SwaggerUIProps) => {
  useEffect(() => {
    // This effect runs once on the client side to initialize the Swagger UI.
    SwaggerUI({
      url: specUrl,
      dom_id: '#swagger-ui', // The ID of the div to render the UI in.
      layout: 'BaseLayout',
      presets: [SwaggerUI.presets.apis, SwaggerUI.SwaggerUIStandalonePreset],
    })
  }, [specUrl]) // Re-run if the specUrl changes.

  // This is the target div where the Swagger UI will be rendered.
  return <div id="swagger-ui" />
}

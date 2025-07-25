// src/app/api/doc/route.ts

import { NextResponse } from 'next/server'
import swaggerJsdoc from 'swagger-jsdoc'

export async function GET() {
  try {
    const options = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'Adept AI Extractor API',
          version: '1.0.0',
          description:
            'An API for extracting and refining structured data from images.',
        },
      },
      // This path is now more general. It will scan for any .ts or .tsx file
      // inside any subdirectory of /api, which is more robust.
      apis: ['./src/app/api/**/*.ts', './src/app/api/**/*.tsx'],
    }

    const swaggerSpec = swaggerJsdoc(options)

    return NextResponse.json(swaggerSpec)
  } catch (error) {
    console.error('Error generating Swagger spec:', error)
    return NextResponse.json(
      { message: 'Error generating API documentation.' },
      { status: 500 },
    )
  }
}

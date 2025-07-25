// src/app/api/jobs/extract/route.ts

import { NextResponse } from 'next/server'
import { inngest } from '@/lib/inngest'
import { z } from 'zod'
import { db } from '@/lib/db' // Import the database client

/**
 * Defines the expected schema for the incoming request body.
 */
const extractRequestSchema = z.object({
  imageUrl: z.string().url(),
  userPrompt: z.string().optional(),
})

/**
 * API endpoint for starting a new data extraction job.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsedBody = extractRequestSchema.safeParse(body)

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          message: 'Invalid request body.',
          errors: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      )
    }

    const { imageUrl, userPrompt } = parsedBody.data

    // 1. Trigger the Inngest job to get an event ID.
    console.log(`[API] Sending 'app/agent.run' event for imageUrl: ${imageUrl}`)
    const { ids } = await inngest.send({
      name: 'app/agent.run',
      data: {
        fileUrl: imageUrl,
        userPrompt: userPrompt || 'Extract all products from the image.',
      },
    })

    const eventId = ids[0]
    console.log(`[API] Inngest event sent with eventId: ${eventId}`)

    // 2. Immediately create a "pending" record in the database.
    // This solves the race condition and provides an immediate status for polling clients.
    await db.jobResult.create({
      data: {
        id: eventId,
        status: 'pending',
        data: {}, // Start with empty data
      },
    })
    console.log(`[API] Created pending job record for eventId: ${eventId}`)

    // 3. Respond with the jobId.
    return NextResponse.json({ jobId: eventId }, { status: 202 })
  } catch (error) {
    console.error('[API] Error in /api/jobs/extract:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.'

    return NextResponse.json(
      { message: 'An internal server error occurred.', error: errorMessage },
      { status: 500 },
    )
  }
}

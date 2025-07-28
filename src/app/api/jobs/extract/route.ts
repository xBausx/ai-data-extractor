// src/app/api/jobs/extract/route.ts

import { NextResponse } from 'next/server'
import { inngest } from '@/lib/inngest'
import { z } from 'zod'
import { db } from '@/lib/db'

const extractRequestSchema = z.object({
  imageUrl: z.string().url(),
  userPrompt: z.string().optional(),
})

/**
 * @swagger
 * /api/jobs/extract:
 *   post:
 *     summary: Starts a new data extraction job.
 *     description: Accepts an image URL and an optional user prompt to initiate an asynchronous data extraction process.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *                 example: "https://d1csarkz8obe9u.cloudfront.net/posterpreviews/supermarket-grocery-flyer-template-design-62d4bac98ec3e801492f00d5cac7df1f_screen.jpg?ts=1698450919"
 *               userPrompt:
 *                 type: string
 *                 example: "Extract all products from this flyer."
 *     responses:
 *       '202':
 *         description: Job accepted for processing. The `jobId` in the response should be used to poll for the result.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 jobId:
 *                   type: string
 *                   example: "01K10AJ2H6JG8GHBRG4TN1X4KN"
 *       '400':
 *         description: Invalid request body.
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

    await db.jobResult.create({
      data: {
        id: eventId,
        status: 'pending',
        data: {},
      },
    })
    console.log(`[API] Created pending job record for eventId: ${eventId}`)

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

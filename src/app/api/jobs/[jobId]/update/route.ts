// src/app/api/jobs/[jobId]/update/route.ts

import { NextResponse } from 'next/server'
import { inngest } from '@/lib/inngest'
import { db } from '@/lib/db'
import { z } from 'zod'
import { type Product } from '@/lib/types' // Import the Product type for casting

/**
 * @swagger
 * /api/jobs/{jobId}/update:
 *   post:
 *     summary: Performs a conversational update on an existing job.
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the job to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userPrompt:
 *                 type: string
 *                 example: "Change the price of Fresh Sweet Corn to $3.99"
 *     responses:
 *       '202':
 *         description: Update job accepted. Returns a new jobId for the update task.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 jobId:
 *                   type: string
 */

interface RouteParams {
  params: {
    jobId: string
  }
}

/**
 * Defines the expected schema for the incoming request body for an update action.
 */
const updateRequestSchema = z.object({
  userPrompt: z.string(),
})

/**
 * This is the API endpoint for performing a conversational update on an existing job.
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { jobId } = params

    // 1. Parse and validate the incoming request body for the user's prompt.
    const body = await request.json()
    const parsedBody = updateRequestSchema.safeParse(body)

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          message: 'Invalid request body.',
          errors: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      )
    }

    const { userPrompt } = parsedBody.data

    // 2. Fetch the most recent successful job result for the given ID.
    console.log(`[API] Fetching existing data for jobId: ${jobId}`)
    const existingJob = await db.jobResult.findUnique({
      where: { id: jobId },
    })

    if (!existingJob) {
      return NextResponse.json({ message: 'Job not found.' }, { status: 404 })
    }
    if (existingJob.status === 'failed') {
      return NextResponse.json(
        { message: 'Cannot update a failed job.' },
        { status: 400 },
      )
    }

    // 3. Trigger the 'app/agent.update' Inngest event.
    console.log(`[API] Sending 'app/agent.update' event for jobId: ${jobId}`)

    const { ids } = await inngest.send({
      name: 'app/agent.update',
      data: {
        userPrompt: userPrompt,
        // We can safely cast here because we've checked the job status.
        existingData: existingJob.data as Product[],
      },
    })

    const newEventId = ids[0]
    console.log(`[API] Inngest event sent with new eventId: ${newEventId}`)

    // 4. Immediately create a "pending" record for the new update job.
    await db.jobResult.create({
      data: {
        id: newEventId,
        status: 'pending',
        data: {},
      },
    })
    console.log(`[API] Created pending job record for eventId: ${newEventId}`)

    // 5. Respond immediately with the new jobId for the update task.
    return NextResponse.json({ jobId: newEventId }, { status: 202 })
  } catch (error) {
    console.error('[API] Error in /api/jobs/{jobId}/update:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.'

    return NextResponse.json(
      { message: 'An internal server error occurred.', error: errorMessage },
      { status: 500 },
    )
  }
}

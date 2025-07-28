// src/app/api/jobs/[jobId]/finalize/route.ts

import { NextResponse } from 'next/server'
import { inngest } from '@/lib/inngest'
import { db } from '@/lib/db'
import { type Product } from '@/lib/types' // Import the Product type for casting

/**
 * @swagger
 * /api/jobs/{jobId}/finalize:
 *   post:
 *     summary: Finalizes the data refinement process for a job.
 *     description: Signals that the user has approved the current state of the data and triggers the final processing step.
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the job to finalize.
 *     responses:
 *       '202':
 *         description: Finalization job accepted. Returns a new jobId for the finalization task.
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
 * This is the API endpoint for finalizing the data refinement process for a job.
 * It signals that the user has approved the current state of the data.
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { jobId } = params

    // 1. Fetch the most recent successful job result for the given ID.
    console.log(`[API] Fetching data to finalize for jobId: ${jobId}`)
    const existingJob = await db.jobResult.findUnique({
      where: { id: jobId },
    })

    if (!existingJob) {
      return NextResponse.json({ message: 'Job not found.' }, { status: 404 })
    }
    if (existingJob.status === 'failed') {
      return NextResponse.json(
        { message: 'Cannot finalize a failed job.' },
        { status: 400 },
      )
    }

    // 2. Trigger the 'app/agent.finalize' Inngest event.
    console.log(`[API] Sending 'app/agent.finalize' event for jobId: ${jobId}`)

    const { ids } = await inngest.send({
      name: 'app/agent.finalize',
      data: {
        // We can safely cast here because we've checked the job status.
        finalData: existingJob.data as Product[],
      },
    })

    const newEventId = ids[0]
    console.log(`[API] Inngest event sent with new eventId: ${newEventId}`)

    // 3. Immediately create a "pending" record for the new finalize job.
    await db.jobResult.create({
      data: {
        id: newEventId,
        status: 'pending',
        data: {},
      },
    })
    console.log(`[API] Created pending job record for eventId: ${newEventId}`)

    // 4. Respond immediately with the new jobId for the finalization task.
    return NextResponse.json({ jobId: newEventId }, { status: 202 })
  } catch (error) {
    console.error('[API] Error in /api/jobs/{jobId}/finalize:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.'

    return NextResponse.json(
      { message: 'An internal server error occurred.', error: errorMessage },
      { status: 500 },
    )
  }
}

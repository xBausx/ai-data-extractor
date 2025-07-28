// src/app/api/jobs/[jobId]/route.ts

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RouteParams {
  params: {
    jobId: string
  }
}

/**
 * @swagger
 * /api/jobs/{jobId}:
 *   get:
 *     summary: Retrieves the status and result of a specific job.
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the job to retrieve.
 *     responses:
 *       '200':
 *         description: Successful response with the job details.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobResult'
 *       '404':
 *         description: Job not found.
 */

/**
 * This is the API endpoint for retrieving the status and result of a specific job.
 * It accepts a GET request with a dynamic `jobId` in the URL path.
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { jobId } = params

    if (!jobId) {
      return NextResponse.json(
        { message: 'Job ID is required.' },
        { status: 400 },
      )
    }

    // 1. Fetch the job result from the database using the provided jobId.
    console.log(`[API] Fetching job result for jobId: ${jobId}`)
    const jobResult = await db.jobResult.findUnique({
      where: { id: jobId },
    })

    // 2. Handle the case where the job is not found.
    if (!jobResult) {
      console.log(`[API] Job result not found for jobId: ${jobId}`)
      return NextResponse.json({ message: 'Job not found.' }, { status: 404 })
    }

    console.log(
      `[API] Found job result for jobId: ${jobId} with status: ${jobResult.status}`,
    )

    // 3. Return the full job result object.
    // The client can inspect the 'status' field to see if the job is 'completed',
    // 'failed', or still 'pending' (if we were to implement that status).
    return NextResponse.json(jobResult, { status: 200 })
  } catch (error) {
    console.error(`[API] Error in /api/jobs/{jobId}:`, error)
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.'

    return NextResponse.json(
      { message: 'An internal server error occurred.', error: errorMessage },
      { status: 500 },
    )
  }
}

// Add this at the bottom of the file to define the reusable JobResult schema
/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       properties:
 *         product_name:
 *           type: string
 *         product_description:
 *           type: string
 *         price:
 *           type: string
 *         limit:
 *           type: string
 *         physical_product_description:
 *           type: string
 *     JobResult:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, completed, failed]
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Product'
 *         error:
 *           type: string
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

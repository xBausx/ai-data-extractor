// src/modules/jobs/inngest/function.ts

import { inngest } from '@/lib/inngest'
import { z } from 'zod'
import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'
import { createAdeptCodeInterpreter } from '@/services/e2b'
import type { Sandbox } from '@e2b/code-interpreter'
import fs from 'fs'
import path from 'path'
import { SYSTEM_PROMPT } from './prompt'
// NEW: Import the S3 Client and PutObjectCommand for uploading
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const eventPayloadSchema = z.object({
  fileUrl: z.string().url(),
  userPrompt: z.string(),
  userId: z.string(),
})

// NEW: Define constants for our S3 configuration.
const BUCKET_REGION = 'us-east-1'
const BUCKET_NAME = 'ai-extractor-bucket'

// NEW: Instantiate the S3 client once, outside the handler.
const s3 = new S3Client({ region: BUCKET_REGION })

export const runAdeptAgentFn = inngest.createFunction(
  { id: 'run-adept-agent-fn' },
  { event: 'app/agent.run' },
  async ({ event, step }) => {
    const { id: eventId, data: eventData } = event
    const { userPrompt, fileUrl, userId } = eventPayloadSchema.parse(eventData)

    if (!eventId) {
      throw new Error(`Inngest event was triggered without an event ID.`)
    }

    const fileBase64 = await step.run('extract-and-format-data', async () => {
      // This inner part remains the same as before.
      const sandbox: Sandbox = await createAdeptCodeInterpreter()
      try {
        // STEP 1: Install Dependencies
        await sandbox.runCode('!pip install openai requests openpyxl')

        // STEP 2: Run Extractor
        const extractorScriptTemplate = fs.readFileSync(
          path.join(
            process.cwd(),
            'src/modules/jobs/inngest/scripts/extract_products.py',
          ),
          'utf-8',
        )
        const modifiedExtractorScript = extractorScriptTemplate.replace(
          'print(json.dumps(arguments))',
          'products_json_str = json.dumps(arguments)',
        )
        const extractorPythonCode = modifiedExtractorScript
          .replace('__IMAGE_URL__', fileUrl)
          .replace('__USER_PROMPT__', userPrompt)
          .replace('__SYSTEM_PROMPT__', SYSTEM_PROMPT)

        await sandbox.runCode(extractorPythonCode, {
          envs: { OPENAI_API_KEY: process.env.OPENAI_API_KEY! },
        })

        // --- STEP 3: Run Formatter and Get Base64 Output ---
        const formatterPythonCode = `
            import json
            import openpyxl
            import base64
            # NEW: Import 'get_column_letter' to help with setting column widths
            from openpyxl.utils import get_column_letter

            # Access the variable created in the previous step
            data = json.loads(products_json_str)
            products = data.get('products', [])

            # Create a new Excel workbook
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = "Extracted Products"

            # Write headers
            headers = ["Group", "Name", "Description", "Price", "Limit"]
            ws.append(headers)

            # Write product data
            for product in products:
                row = [
                    product.get('group', ''),
                    product.get('name', ''),
                    product.get('description', ''),
                    product.get('price', ''),
                    product.get('limit', '')
                ]
                ws.append(row)

            # --- NEW: Auto-fit column widths ---
            # Loop through all the columns in the worksheet
            for col in ws.columns:
                max_length = 0
                # Get the column letter (e.g., 'A', 'B', 'C')
                column = get_column_letter(col[0].column)
                # Loop through all cells in the column to find the longest content length
                for cell in col:
                    try:
                        if len(str(cell.value)) > max_length:
                            max_length = len(str(cell.value))
                    except:
                        pass
                # Add a little extra padding to the width
                adjusted_width = (max_length + 2)
                # Set the column's width
                ws.column_dimensions[column].width = adjusted_width

            # Save the file to a temporary path
            output_filename = "/tmp/extracted_data.xlsx"
            wb.save(output_filename)

            # Read the binary content of the saved file
            with open(output_filename, "rb") as excel_file:
                # Encode the content to a Base64 string
                encoded_string = base64.b64encode(excel_file.read()).decode('utf-8')

            # Print the Base64 encoded string as the final output
            print(encoded_string)
          `
        const formatterExecution = await sandbox.runCode(formatterPythonCode)
        if (formatterExecution.error) {
          throw new Error(
            `Formatter execution failed: ${formatterExecution.error.value}`,
          )
        }

        return formatterExecution.logs.stdout.join('\n').trim()
      } finally {
        console.log('[Inngest] Sandbox execution finished.')
      }
    })

    // --- NEW: UPLOAD TO S3 & SAVE URL ---
    const s3Url = await step.run('upload-file-to-s3', async () => {
      // Decode the Base64 string back into binary data
      const fileBuffer = Buffer.from(fileBase64, 'base64')

      // Create a unique key (filename) for the S3 object
      const s3Key = `exports/${eventId}-${Date.now()}.xlsx`

      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: fileBuffer,
        ContentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })

      // Upload the file
      await s3.send(command)

      // Construct the public URL of the uploaded file
      const publicUrl = `https://${BUCKET_NAME}.s3.${BUCKET_REGION}.amazonaws.com/${s3Key}`
      console.log(`[Inngest] Successfully uploaded Excel file to ${publicUrl}`)

      return publicUrl
    })

    // --- FINAL STEP: Save S3 URL to the database ---
    try {
      await db.jobResult.create({
        data: {
          id: eventId,
          userId: userId,
          status: 'completed',
          // Save the S3 URL to the database
          data: { fileUrl: s3Url, type: 'excel' } as Prisma.InputJsonValue,
        },
      })
      console.log(
        `[Inngest] Job ${eventId} result saved to database with S3 URL.`,
      )
      return { success: true, eventId: eventId }
    } catch (error) {
      console.error(`[Inngest] Job ${eventId} failed during DB save:`, error)
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      await db.jobResult.create({
        data: {
          id: eventId,
          userId: userId,
          status: 'failed',
          error: errorMessage,
          data: {},
        },
      })
      throw error
    }
  },
)

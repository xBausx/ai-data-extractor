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
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const eventPayloadSchema = z.object({
  fileUrl: z.string().url(),
  userPrompt: z.string(),
  userId: z.string(),
})

const BUCKET_REGION = 'us-east-1'
const BUCKET_NAME = 'ai-extractor-bucket'
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

    // --- Read the feature flag from environment variables ---
    const imageSearchEnabled = process.env.ENABLE_IMAGE_SEARCH === 'true'

    const fileBase64 = await step.run(
      // Use a dynamic step name based on the flag for clearer logs
      imageSearchEnabled
        ? 'extract-and-embed-images'
        : 'extract-and-format-basic',
      async () => {
        const sandbox: Sandbox = await createAdeptCodeInterpreter()
        try {
          console.log('[Inngest] Installing Python dependencies...')
          // Conditionally determine which dependencies to install
          const pipInstallCommand = imageSearchEnabled
            ? '!pip install openai requests openpyxl google-search-results rembg Pillow'
            : '!pip install openai requests openpyxl'

          await sandbox.runCode(pipInstallCommand)

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

          console.log('[Inngest] Executing extractor logic...')
          await sandbox.runCode(extractorPythonCode, {
            envs: {
              OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
            },
          })

          // --- Conditionally define the Python formatter code ---
          let finalPythonCode: string

          if (imageSearchEnabled) {
            console.log(
              '[Inngest] Image Search is ENABLED. Preparing advanced formatter.',
            )
            // This is your full-featured Python code block
            finalPythonCode = `
              import json, openpyxl, base64, os, sys, requests
              from serpapi import GoogleSearch
              from PIL import Image
              from io import BytesIO
              from rembg import remove
              from openpyxl.drawing.image import Image as OpenpyxlImage

              def search_for_image_serpapi(query, api_key):
                  refined_query = f"{query} on white background"
                  params = {"engine": "google_images", "q": refined_query, "api_key": api_key}
                  try:
                      search = GoogleSearch(params)
                      results = search.get_dict()
                      if "images_results" in results and results["images_results"]:
                          return results["images_results"][0]["original"]
                  except Exception as e:
                      print(f"Error searching for '{query}': {e}", file=sys.stderr)
                  return None

              def process_and_embed_image(image_url, ws, cell):
                  try:
                      response = requests.get(image_url, stream=True, timeout=10)
                      response.raise_for_status()
                      output_image_bytes = remove(response.content)
                      img = OpenpyxlImage(BytesIO(output_image_bytes))
                      img.height = 75
                      img.width = 75
                      ws.add_image(img, cell.coordinate)
                      return True
                  except Exception as e:
                      print(f"Failed to process image from {image_url}: {e}", file=sys.stderr)
                      ws[cell.coordinate] = "Image Error"
                      return False

              serpapi_key = os.environ.get("SERPAPI_API_KEY")
              os.environ['U2NET_HOME'] = '/tmp/.u2net'
              if not serpapi_key: raise ValueError("SERPAPI_API_KEY is missing.")

              data = json.loads(products_json_str)
              products = data.get('products', [])
              wb = openpyxl.Workbook()
              ws = wb.active
              ws.title = "Extracted Products"
              headers = ["Group", "Name", "Description", "Price", "Limit", "Image"]
              ws.append(headers)

              for i in range(1, len(products) + 2): ws.row_dimensions[i].height = 60
              ws.column_dimensions['F'].width = 12

              for idx, product in enumerate(products):
                  row_num = idx + 2
                  image_url = search_for_image_serpapi(product.get('name', ''), serpapi_key)
                  row_data = [product.get('group',''), product.get('name',''), product.get('description',''), product.get('price',''), product.get('limit','')]
                  ws.append(row_data)
                  if image_url:
                      process_and_embed_image(image_url, ws, ws[f'F{row_num}'])

              from openpyxl.utils import get_column_letter
              for i, col in enumerate(ws.columns):
                  if i == 5: continue
                  max_length = 0
                  column = get_column_letter(col[0].column)
                  for cell in col:
                      try:
                          if len(str(cell.value)) > max_length: max_length = len(str(cell.value))
                      except: pass
                  ws.column_dimensions[column].width = max_length + 2

              output_filename = "/tmp/final_report.xlsx"
              wb.save(output_filename)
              with open(output_filename, "rb") as f: print(base64.b64encode(f.read()).decode('utf-8'))
              `
          } else {
            console.log(
              '[Inngest] Image Search is DISABLED. Preparing basic formatter.',
            )
            // This is the simplified version of the code without image processing
            finalPythonCode = `
              import json, openpyxl, base64, os
              data = json.loads(products_json_str)
              products = data.get('products', [])
              wb = openpyxl.Workbook()
              ws = wb.active
              ws.title = "Extracted Products"
              headers = ["Group", "Name", "Description", "Price", "Limit"]
              ws.append(headers)
              for product in products:
                  ws.append([
                      product.get('group', ''),
                      product.get('name', ''),
                      product.get('description', ''),
                      product.get('price', ''),
                      product.get('limit', '')
                  ])

              from openpyxl.utils import get_column_letter
              for col in ws.columns:
                  max_length = 0
                  column = get_column_letter(col[0].column)
                  for cell in col:
                      try:
                          if len(str(cell.value)) > max_length: max_length = len(str(cell.value))
                      except: pass
                  ws.column_dimensions[column].width = max_length + 2

              output_filename = "/tmp/final_report.xlsx"
              wb.save(output_filename)
              with open(output_filename, "rb") as f: print(base64.b64encode(f.read()).decode('utf-8'))
              `
          }

          console.log('[Inngest] Executing formatter logic...')
          // Conditionally pass the SERPAPI_API_KEY only when needed
          const formatterExecution = await sandbox.runCode(finalPythonCode, {
            envs: imageSearchEnabled
              ? { SERPAPI_API_KEY: process.env.SERPAPI_API_KEY! }
              : {},
          })

          if (formatterExecution.logs.stderr) {
            console.log(
              '[E2B Formatter stderr]:',
              formatterExecution.logs.stderr.join('\n'),
            )
          }
          if (formatterExecution.error) {
            throw new Error(
              `Formatter execution failed: ${formatterExecution.error.value}`,
            )
          }

          return formatterExecution.logs.stdout.join('\n').trim()
        } finally {
          console.log('[Inngest] Sandbox execution finished.')
        }
      },
    )

    // S3 Upload and DB Save Logic remains the same and works for both cases
    const s3Url = await step.run('upload-file-to-s3', async () => {
      const fileBuffer = Buffer.from(fileBase64, 'base64')
      const s3Key = `exports/${eventId}-${Date.now()}.xlsx`
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: fileBuffer,
        ContentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      await s3.send(command)
      const publicUrl = `https://${BUCKET_NAME}.s3.${BUCKET_REGION}.amazonaws.com/${s3Key}`
      return publicUrl
    })

    try {
      await db.jobResult.create({
        data: {
          id: eventId,
          userId: userId,
          status: 'completed',
          data: { fileUrl: s3Url, type: 'excel' } as Prisma.InputJsonValue,
        },
      })
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

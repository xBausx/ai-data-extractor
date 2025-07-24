// src/app/page.tsx
'use client'

import { useState, useEffect, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/Button'
import { ChatHistory } from '@/components/chat/ChatHistory'
import { EmptyState } from '@/components/chat/EmptyState'
import { ChatInputForm } from '@/components/chat/ChatInputForm'
import { UserNav } from '@/components/auth/UserNav'
import { DataTablePreview } from '@/components/chat/DataTablePreview'

/**
 * Defines the structure for a product extracted from an image.
 */
export interface Product {
  group: string
  name: string
  description?: string
  price?: string
  limit?: string
}

/**
 * Defines the structure for a file object, primarily for download links.
 * This interface might become obsolete if no files are generated.
 */
export interface FileObject {
  fileUrl: string
  type: 'excel' | string
}

/**
 * Defines the structure for a chat message, including content which can be string, Product array, or FileObject.
 * The content can also be a string representing formatted JSON.
 */
export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string | Product[] | FileObject
  error?: boolean
  imageUrl?: string
}

/**
 * A simple spinner component displayed while content is loading.
 */
const Spinner = () => (
  <div className="flex min-h-screen items-center justify-center">
    <svg
      className="text-primary h-8 w-8 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  </div>
)

/**
 * The main Home component for the Adept application, managing chat, data preview, and job orchestration.
 */
export default function Home() {
  const router = useRouter()
  // State for storing chat messages.
  const [messages, setMessages] = useState<Message[]>([])
  // State for the live structured data displayed in the preview pane.
  const [liveData, setLiveData] = useState<Product[] | null>(null)
  // State for the user's input in the chat form.
  const [input, setInput] = useState('')
  // State for files selected by the user for upload.
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  // State for URLs to display image previews.
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([])
  // State indicating if a file upload is currently in progress.
  const [isFileUploading, setIsFileUploading] = useState(false)
  // State holding the event ID of the currently running Inngest job, used for polling.
  const [runningEventId, setRunningEventId] = useState<string | null>(null)

  // tRPC query to get the current user session.
  const { data: session, isLoading: isSessionLoading } =
    trpc.auth.getSession.useQuery()
  // tRPC mutation to sign out the user.
  const signOutMutation = trpc.auth.signOut.useMutation({
    onSuccess: () => router.push('/login'),
  })
  // tRPC query to poll for the result of an Inngest job.
  const { data: polledResult } = trpc.auth.getJobResult.useQuery(
    { eventId: runningEventId! },
    { enabled: !!runningEventId, refetchInterval: 2000 },
  )

  // tRPC mutation to generate a signed URL for S3 image uploads.
  const generateSignedUrlMutation = trpc.auth.generateSignedUrl.useMutation({
    onError: (error) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Failed to prepare image for upload: ${error.message}`,
          error: true,
        },
      ])
      setIsFileUploading(false)
      selectedFiles.forEach((_, index) => {
        if (imagePreviewUrls[index])
          URL.revokeObjectURL(imagePreviewUrls[index])
      })
      setSelectedFiles([])
      setImagePreviewUrls([])
    },
  })

  /**
   * Reusable success handler for tRPC mutations. Sets the running event ID and a status message.
   * @param data - The data returned from the mutation, expected to contain an eventId.
   */
  const onMutationSuccess = (data: { eventId: string }) => {
    setRunningEventId(data.eventId)
    setMessages((prev) => [
      ...prev,
      { id: data.eventId, role: 'assistant', content: 'Agent is working...' },
    ])
    setIsFileUploading(false)
    selectedFiles.forEach((_, index) => {
      if (imagePreviewUrls[index]) URL.revokeObjectURL(imagePreviewUrls[index])
    })
    setSelectedFiles([])
    setImagePreviewUrls([])
  }

  /**
   * Reusable error handler for tRPC mutations. Displays an error message.
   * @param error - The error object from the mutation.
   */
  const onMutationError = (error: unknown) => {
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred'
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Error triggering job: ${errorMessage}`,
        error: true,
      },
    ])
    setIsFileUploading(false)
  }
  // tRPC mutation hook for triggering an EXTRACT job via Inngest.
  const extractProductsMutation = trpc.auth.triggerInngestTest.useMutation({
    onSuccess: onMutationSuccess,
    onError: onMutationError,
  })

  // tRPC mutation hook for triggering an UPDATE job via Inngest.
  const updateDataMutation = trpc.auth.triggerAgentUpdate.useMutation({
    onSuccess: onMutationSuccess,
    onError: onMutationError,
  })

  // tRPC mutation hook for triggering a FINALIZE job via Inngest.
  const finalizeDataMutation = trpc.auth.triggerAgentFinalize.useMutation({
    onSuccess: onMutationSuccess,
    onError: onMutationError,
  })

  /**
   * Handles the selection of a file for upload. Creates a preview URL.
   * @param file - The file selected by the user.
   */
  const handleFileSelect = (file: File | undefined) => {
    if (file) {
      const previewUrl = URL.createObjectURL(file)
      setSelectedFiles((prev) => [...prev, file])
      setImagePreviewUrls((prev) => [...prev, previewUrl])
      setInput('')
    }
  }

  /**
   * Clears a selected image by its index from the preview and selected files lists.
   * Revokes the object URL to prevent memory leaks.
   * @param indexToClear - The index of the image to clear.
   */
  const handleClearImageByIndex = (indexToClear: number) => {
    if (imagePreviewUrls[indexToClear]) {
      URL.revokeObjectURL(imagePreviewUrls[indexToClear])
    }
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== indexToClear))
    setImagePreviewUrls((prev) => prev.filter((_, idx) => idx !== indexToClear))
    if (selectedFiles.length === 1 && input.trim() === '') {
      setInput('')
    }
  }

  /**
   * Effect hook to revoke all image preview URLs when the component unmounts or image previews change,
   * preventing memory leaks.
   */
  useEffect(() => {
    return () => {
      imagePreviewUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [imagePreviewUrls])

  /**
   * Effect hook to process the polled job result. Updates liveData or messages based on job status.
   * This now handles the 'finalize' output as structured JSON data for display in chat history.
   */
  useEffect(() => {
    if (polledResult) {
      const jobIdentifier = polledResult.id
      if (polledResult.status === 'completed') {
        setRunningEventId(null)
        // All successful job types now return structured Product[] data.
        const resultData = polledResult.data as unknown as Product[]

        // Always update liveData with the latest structured data.
        setLiveData(resultData)

        // Update the message corresponding to the completed job.
        setMessages((prevMessages) =>
          prevMessages.map((msg) => {
            if (msg.id === jobIdentifier) {
              // Determine if this job was triggered by a "finalize" command.
              const originalUserMessage = prevMessages.find(
                (m) => m.id === jobIdentifier && m.role === 'user',
              )
              const finalizeKeywords = [
                'done',
                'finalize',
                'finish',
                'export',
                'give me the json',
                'show me the json',
              ]

              let isFinalizeTriggeredByThisJob = false
              // Safely checks if the original message content is a string before calling string methods.
              if (
                originalUserMessage &&
                typeof originalUserMessage.content === 'string'
              ) {
                // Assign the string content to a new variable to ensure type narrowing persists for .toLowerCase().
                const userMessageContentString = originalUserMessage.content
                isFinalizeTriggeredByThisJob = finalizeKeywords.some(
                  (keyword) =>
                    userMessageContentString.toLowerCase().includes(keyword),
                )
              }

              if (isFinalizeTriggeredByThisJob) {
                // Format the JSON data into a markdown code block for display in chat history.
                const formattedJson = `\`\`\`json\n${JSON.stringify(resultData, null, 2)}\n\`\`\``
                return {
                  ...msg,
                  content: `Final data prepared and displayed:\n\n${formattedJson}`,
                  error: false,
                }
              } else {
                // For extract or update operations, provide a generic success message.
                return {
                  ...msg,
                  content:
                    'Data extracted/updated successfully. You can now review and correct the results.',
                }
              }
            }
            return msg
          }),
        )
      } else if (polledResult.status === 'failed') {
        setRunningEventId(null)
        setLiveData(null)
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === jobIdentifier
              ? {
                  ...msg,
                  content: polledResult.error || 'An unknown error occurred.',
                  error: true,
                }
              : msg,
          ),
        )
      }
    }
  }, [polledResult, messages]) // `messages` is correctly in the dependency array.

  /**
   * Handles user submission from the chat input. Determines whether to trigger an EXTRACT, UPDATE, or FINALIZE operation.
   * @param e - The form event.
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    // Checks if any mutation is currently pending or if a file upload is in progress.
    const anyMutationPending =
      extractProductsMutation.isPending ||
      updateDataMutation.isPending ||
      finalizeDataMutation.isPending ||
      generateSignedUrlMutation.isPending
    if (isJobRunning || anyMutationPending || isFileUploading) {
      return
    }

    const userMessageContent = input.trim()
    if (!userMessageContent) return

    // Adds the user's message to the chat history with a unique ID for later updates.
    const userMessageId = Date.now().toString()
    const userMessage: Message = {
      id: userMessageId,
      role: 'user',
      content: userMessageContent,
    }
    setMessages((prev) => [...prev, userMessage])

    // Keywords to trigger the finalize action (case-insensitive).
    const finalizeKeywords = [
      'done',
      'finalize',
      'finish',
      'export',
      'give me the json',
      'show me the json',
    ] // Updated keywords for JSON output.
    const lowerCaseUserMessage = userMessageContent.toLowerCase()
    const isFinalizeCommand = finalizeKeywords.some((keyword) =>
      lowerCaseUserMessage.includes(keyword),
    )

    // Conditional logic to determine the type of job to trigger.
    if (isFinalizeCommand && liveData) {
      // If a finalize command is detected and live data exists, trigger the FINALIZE process.
      console.log('Submitting FINALIZE request...')
      finalizeDataMutation.mutate({
        finalData: liveData,
      })
      // Optionally clear liveData here if "finalize" means the end of the current data manipulation session.
      // setLiveData(null);
    } else if (liveData) {
      // If liveData exists and it's not a finalize command, we are in an update context.
      console.log('Submitting UPDATE request...')
      updateDataMutation.mutate({
        userPrompt: userMessageContent,
        existingData: liveData,
      })
    } else {
      // Otherwise, it's a new extraction request.
      console.log('Submitting new EXTRACT request...')
      const fileToProcess = selectedFiles[0]
      if (!fileToProcess) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: 'Please upload an image to begin.',
            error: true,
          },
        ])
        return
      }

      setIsFileUploading(true)
      try {
        // Generates a signed URL for uploading the image to S3.
        const { uploadUrl, fileUrl } =
          await generateSignedUrlMutation.mutateAsync({
            count: 1,
            fileType: fileToProcess.type,
          })
        // Uploads the file to the signed URL.
        await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': fileToProcess.type },
          body: fileToProcess,
        })

        // Updates the user message (which now has userMessageId) with the uploaded image URL.
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === userMessageId ? { ...msg, imageUrl: fileUrl } : msg,
          ),
        )
        // Triggers the product extraction mutation.
        extractProductsMutation.mutate({
          fileUrl,
          userPrompt: userMessageContent,
        })
      } catch (uploadError) {
        // Handles errors during the image upload process.
        console.error('Image upload process failed:', uploadError)
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: `Image upload failed: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`,
            error: true,
          },
        ])
        setIsFileUploading(false)
      }
    }

    // Clears the input field after submission.
    setInput('')
  }

  // Boolean indicating if an Inngest job is currently running.
  const isJobRunning = !!runningEventId
  // Boolean indicating if any tRPC mutation is pending.
  const anyMutationPending =
    extractProductsMutation.isPending ||
    updateDataMutation.isPending ||
    finalizeDataMutation.isPending ||
    generateSignedUrlMutation.isPending
  // Boolean to disable the form if a job is running, a mutation is pending, or a file is uploading.
  const isFormDisabled = isJobRunning || anyMutationPending || isFileUploading
  // Boolean to disable file uploads once live data exists (indicating an ongoing correction conversation).
  const isFileUploadDisabled = !!liveData

  // Displays a spinner while the user session is loading.
  if (isSessionLoading) {
    return <Spinner />
  }

  return (
    <div className="bg-background flex h-screen w-full flex-col">
      {!session?.user ? (
        // Renders a login/signup prompt if no user session exists.
        <main className="flex flex-1 flex-col items-center justify-center p-4">
          <h2 className="mb-4 text-2xl font-semibold">Welcome</h2>
          <p className="text-muted-foreground mb-8">
            Please log in to begin extracting data.
          </p>
          <div className="flex gap-4">
            <Link href="/login">
              <Button>Login</Button>
            </Link>
            <Link href="/signup">
              <Button variant="default">Sign Up</Button>
            </Link>
          </div>
        </main>
      ) : (
        // Renders the main application interface if a user session exists.
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="bg-background sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between px-4 shadow-sm md:px-6">
            <h1 className="text-xl font-bold">Adept AI Extractor</h1>
            <UserNav user={session.user} signOut={signOutMutation.mutate} />
          </header>

          <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-2">
            <div className="flex flex-col overflow-hidden">
              {messages.length === 0 ? (
                // Displays an empty state message if no chat messages exist.
                <EmptyState />
              ) : (
                // Renders the chat history.
                <main className="flex-1 overflow-y-auto p-4 md:p-6">
                  <ChatHistory
                    messages={messages}
                    isJobRunning={isJobRunning}
                  />
                </main>
              )}
              <footer className="bg-background sticky bottom-0 z-10 border-t p-4">
                <div className="mx-auto max-w-4xl">
                  {/* Chat input form for user interaction. */}
                  <ChatInputForm
                    input={input}
                    setInput={setInput}
                    handleSubmit={handleSubmit}
                    onFileSelect={handleFileSelect}
                    imagePreviewUrls={imagePreviewUrls}
                    onClearImageByIndex={handleClearImageByIndex}
                    isFileUploading={isFormDisabled}
                    isJobRunning={isJobRunning}
                    isPending={anyMutationPending}
                    isFileUploadDisabled={isFileUploadDisabled}
                  />
                </div>
              </footer>
            </div>

            <div className="bg-muted/20 overflow-y-auto border-l p-4 md:p-6">
              {liveData ? (
                // Displays the live structured data in a table.
                <DataTablePreview data={liveData} />
              ) : (
                // Placeholder message when no live data is available.
                <div className="border-border text-muted-foreground flex h-full items-center justify-center rounded-lg border-2 border-dashed">
                  <p>Data will appear here after a successful extraction.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

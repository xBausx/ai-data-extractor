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
// Import the centralized Product type and productsSchema.
import { type Product, productsSchema } from '@/lib/types'

// The local Product interface has been removed.

/**
 * Defines the structure for a file object, primarily for download links.
 */
export interface FileObject {
  fileUrl: string
  type: 'excel' | string
}

/**
 * Defines the structure for a chat message.
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
 * The main Home component for the Adept application.
 */
export default function Home() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [liveData, setLiveData] = useState<Product[] | null>(null)
  const [input, setInput] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([])
  const [isFileUploading, setIsFileUploading] = useState(false)
  const [runningEventId, setRunningEventId] = useState<string | null>(null)

  const { data: session, isLoading: isSessionLoading } =
    trpc.auth.getSession.useQuery()
  const signOutMutation = trpc.auth.signOut.useMutation({
    onSuccess: () => router.push('/login'),
  })
  const { data: polledResult } = trpc.auth.getJobResult.useQuery(
    { eventId: runningEventId! },
    { enabled: !!runningEventId, refetchInterval: 2000 },
  )

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

  const extractProductsMutation = trpc.auth.triggerInngestTest.useMutation({
    onSuccess: onMutationSuccess,
    onError: onMutationError,
  })

  const updateDataMutation = trpc.auth.triggerAgentUpdate.useMutation({
    onSuccess: onMutationSuccess,
    onError: onMutationError,
  })

  const finalizeDataMutation = trpc.auth.triggerAgentFinalize.useMutation({
    onSuccess: onMutationSuccess,
    onError: onMutationError,
  })

  const handleFileSelect = (file: File | undefined) => {
    if (file) {
      const previewUrl = URL.createObjectURL(file)
      setSelectedFiles((prev) => [...prev, file])
      setImagePreviewUrls((prev) => [...prev, previewUrl])
      setInput('')
    }
  }

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

  useEffect(() => {
    return () => {
      imagePreviewUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [imagePreviewUrls])

  useEffect(() => {
    if (polledResult) {
      const jobIdentifier = polledResult.id
      if (polledResult.status === 'completed') {
        setRunningEventId(null)

        // Safely parse the job result data to extract the products array.
        // This handles both direct arrays (from extract/update) and the nested
        // object from finalize, without using `any`.
        const parsedResult = productsSchema.safeParse(polledResult.data)
        const resultData = Array.isArray(polledResult.data)
          ? (polledResult.data as Product[])
          : parsedResult.success
            ? parsedResult.data.products
            : undefined

        if (!resultData) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === jobIdentifier
                ? {
                    ...msg,
                    content:
                      'An error occurred while processing the result data.',
                    error: true,
                  }
                : msg,
            ),
          )
          return
        }

        setLiveData(resultData)

        setMessages((prevMessages) =>
          prevMessages.map((msg) => {
            if (msg.id === jobIdentifier) {
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
                'approve',
              ]

              let isFinalizeTriggeredByThisJob = false
              if (
                originalUserMessage &&
                typeof originalUserMessage.content === 'string'
              ) {
                const userMessageContentString = originalUserMessage.content
                isFinalizeTriggeredByThisJob = finalizeKeywords.some(
                  (keyword) =>
                    userMessageContentString.toLowerCase().includes(keyword),
                )
              }

              if (isFinalizeTriggeredByThisJob) {
                const finalJsonObject = { products: resultData }
                const formattedJson = `\`\`\`json\n${JSON.stringify(finalJsonObject, null, 2)}\n\`\`\``
                return {
                  ...msg,
                  content: `Final data prepared and displayed:\n\n${formattedJson}`,
                  error: false,
                }
              } else {
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
  }, [polledResult, messages])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
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

    const userMessageId = Date.now().toString()
    const userMessage: Message = {
      id: userMessageId,
      role: 'user',
      content: userMessageContent,
    }
    setMessages((prev) => [...prev, userMessage])

    const finalizeKeywords = [
      'done',
      'finalize',
      'finish',
      'export',
      'give me the json',
      'show me the json',
      'approve',
    ]
    const lowerCaseUserMessage = userMessageContent.toLowerCase()
    const isFinalizeCommand = finalizeKeywords.some((keyword) =>
      lowerCaseUserMessage.includes(keyword),
    )

    if (isFinalizeCommand && liveData) {
      console.log('Submitting FINALIZE request...')
      finalizeDataMutation.mutate({
        finalData: liveData,
      })
    } else if (liveData) {
      console.log('Submitting UPDATE request...')
      updateDataMutation.mutate({
        userPrompt: userMessageContent,
        existingData: liveData,
      })
    } else {
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
        const { uploadUrl, fileUrl } =
          await generateSignedUrlMutation.mutateAsync({
            count: 1,
            fileType: fileToProcess.type,
          })
        await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': fileToProcess.type },
          body: fileToProcess,
        })

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === userMessageId ? { ...msg, imageUrl: fileUrl } : msg,
          ),
        )
        extractProductsMutation.mutate({
          fileUrl,
          userPrompt: userMessageContent,
        })
      } catch (uploadError) {
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

    setInput('')
  }

  const isJobRunning = !!runningEventId
  const anyMutationPending =
    extractProductsMutation.isPending ||
    updateDataMutation.isPending ||
    finalizeDataMutation.isPending ||
    generateSignedUrlMutation.isPending
  const isFormDisabled = isJobRunning || anyMutationPending || isFileUploading
  const isFileUploadDisabled = !!liveData

  if (isSessionLoading) {
    return <Spinner />
  }

  return (
    <div className="bg-background flex h-screen w-full flex-col">
      {!session?.user ? (
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
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="bg-background sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between px-4 shadow-sm md:px-6">
            <h1 className="text-xl font-bold">Adept AI Extractor</h1>
            <UserNav user={session.user} signOut={signOutMutation.mutate} />
          </header>

          <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-2">
            <div className="flex flex-col overflow-hidden">
              {messages.length === 0 ? (
                <EmptyState />
              ) : (
                <main className="flex-1 overflow-y-auto p-4 md:p-6">
                  <ChatHistory
                    messages={messages}
                    isJobRunning={isJobRunning}
                  />
                </main>
              )}
              <footer className="bg-background sticky bottom-0 z-10 border-t p-4">
                <div className="mx-auto max-w-4xl">
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
                <DataTablePreview data={liveData} />
              ) : (
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

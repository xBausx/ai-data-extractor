// src/app/page.tsx
'use client'

import { useState, useEffect, useRef, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/Button'
import { ChatHistory } from '@/components/chat/ChatHistory'
import { EmptyState } from '@/components/chat/EmptyState'
import { ChatInputForm } from '@/components/chat/ChatInputForm'
import { UserNav } from '@/components/auth/UserNav'

export interface Product {
  group: string
  name: string
  description?: string
  price?: string
  limit?: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string | Product[]
  error?: boolean
  imageUrl?: string
}

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

export default function Home() {
  const router = useRouter()
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const [messages, setMessages] = useState<Message[]>([])
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
      console.error('Failed to get signed URL:', error)
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

  const extractProductsMutation = trpc.auth.triggerInngestTest.useMutation({
    onSuccess: (data) => {
      setRunningEventId(data.eventId)
      setMessages((prev) => [
        ...prev,
        { id: data.eventId, role: 'assistant', content: 'Agent is working...' },
      ])
      setIsFileUploading(false)
      selectedFiles.forEach((_, index) => {
        if (imagePreviewUrls[index])
          URL.revokeObjectURL(imagePreviewUrls[index])
      })
      setSelectedFiles([])
      setImagePreviewUrls([])
    },
    onError: (error) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Error triggering extraction: ${error.message}`,
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
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === jobIdentifier
              ? { ...msg, content: polledResult.data as unknown as Product[] }
              : msg,
          ),
        )
      } else if (polledResult.status === 'failed') {
        setRunningEventId(null)
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
  }, [polledResult])

  useEffect(() => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (
      isJobRunning ||
      extractProductsMutation.isPending ||
      generateSignedUrlMutation.isPending ||
      isFileUploading
    ) {
      return
    }

    const userMessageContent = input.trim()
    let extractionImageUrl: string | undefined

    const fileToProcess = selectedFiles[0]

    if (fileToProcess) {
      setIsFileUploading(true)
      try {
        const { uploadUrl, fileUrl } =
          await generateSignedUrlMutation.mutateAsync({
            count: 1,
            fileType: fileToProcess.type,
          })

        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': fileToProcess.type,
          },
          body: fileToProcess,
        })

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text()
          console.error('S3 upload failed:', uploadResponse.status, errorText)
          throw new Error(
            `Failed to upload image to S3: ${uploadResponse.status} ${uploadResponse.statusText}`,
          )
        }

        extractionImageUrl = fileUrl
        console.log('Image successfully uploaded to S3:', extractionImageUrl)
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
        selectedFiles.forEach((_, index) => {
          if (imagePreviewUrls[index])
            URL.revokeObjectURL(imagePreviewUrls[index])
        })
        setSelectedFiles([])
        setImagePreviewUrls([])
        return
      }
    } else {
      if (!userMessageContent) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: 'Please enter a prompt or upload an image to begin.',
            error: true,
          },
        ])
        return
      }
      console.warn(
        'Attempted to submit text-only prompt without a valid image URL for extraction.',
      )
    }

    // --- CHANGED: Simplified the user message object construction ---
    // The user's message in the chat will now only contain their raw text prompt.
    // The uploaded image is displayed visually, so we no longer need to add "(Images: ...)" to the text.
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessageContent, // Directly use the trimmed user input.
      imageUrl: extractionImageUrl, // Pass the S3 URL to display the image.
    }
    setMessages((prev) => [...prev, userMessage])

    if (extractionImageUrl) {
      extractProductsMutation.mutate({
        fileUrl: extractionImageUrl,
        userPrompt: input,
      })
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'No image provided for extraction. Please upload an image.',
          error: true,
        },
      ])
      setIsFileUploading(false)
    }

    setInput('')
  }

  const isJobRunning = !!runningEventId
  const isFormDisabled =
    isJobRunning ||
    extractProductsMutation.isPending ||
    generateSignedUrlMutation.isPending ||
    isFileUploading

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
          <header className="bg-background sticky top-0 z-10 flex h-16 items-center justify-between px-4 shadow-sm md:px-6">
            <h1 className="text-xl font-bold">Adept AI Extractor</h1>
            <UserNav user={session.user} signOut={signOutMutation.mutate} />
          </header>

          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            <main
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 md:p-6"
            >
              <ChatHistory messages={messages} isJobRunning={isJobRunning} />
            </main>
          )}

          <footer className="bg-background sticky bottom-0 z-10 p-4 shadow-sm">
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
                isPending={extractProductsMutation.isPending}
              />
            </div>
          </footer>
        </div>
      )}
    </div>
  )
}

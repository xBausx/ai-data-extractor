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

// These types could be moved to a dedicated `types.ts` file for cleanliness.
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
  const [imageUrl] = useState('https://i.imgur.com/snMdp9T.jpeg') // Still temporarily hardcoded
  const [runningEventId, setRunningEventId] = useState<string | null>(null)

  const { data: session, isLoading: isSessionLoading } =
    trpc.auth.getSession.useQuery()
  const signOutMutation = trpc.auth.signOut.useMutation({
    // FIX: Change router.refresh() to router.push('/login') for a definitive logout redirect.
    // This ensures the browser's session cookie is cleared and the authentication state
    // is correctly re-evaluated on the new login page, avoiding caching issues.
    onSuccess: () => router.push('/login'),
  })
  const { data: polledResult } = trpc.auth.getJobResult.useQuery(
    { eventId: runningEventId! },
    { enabled: !!runningEventId, refetchInterval: 2000 },
  )
  const extractProductsMutation = trpc.auth.triggerInngestTest.useMutation({
    onSuccess: (data) => {
      setRunningEventId(data.eventId)
      setMessages((prev) => [
        ...prev,
        { id: data.eventId, role: 'assistant', content: 'Agent is working...' },
      ])
    },
    onError: (error) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Error: ${error.message}`,
          error: true,
        },
      ])
    },
  })

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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    // For now, if no input, simply return. Image upload will handle the imageUrl source later.
    if (!input.trim()) return
    // Temporarily, if imageUrl is empty for some reason, return. This will be dynamic later.
    if (!imageUrl.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    }
    setMessages((prev) => [...prev, userMessage])
    extractProductsMutation.mutate({ fileUrl: imageUrl, userPrompt: input })
    setInput('')
  }

  const isJobRunning = !!runningEventId

  if (isSessionLoading) {
    return <Spinner />
  }

  return (
    <div className="bg-background flex h-screen w-full flex-col">
      {!session?.user ? (
        // Render login/signup options if no user session
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
        // --- REFACTORED: Logged-in view now always includes header and footer ---
        // This outer div ensures the full page height and column layout for logged-in users.
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* The header is now consistently rendered for logged-in users. */}
          {/* Removed `border-b` from header, rely on `shadow-sm` for visual separation. */}
          <header className="bg-background sticky top-0 z-10 flex h-16 items-center justify-between px-4 shadow-sm md:px-6">
            <h1 className="text-xl font-bold">Adept AI Extractor</h1>
            {/* UserNav component is directly rendered here, without debugging styles. */}
            <UserNav user={session.user} signOut={signOutMutation.mutate} />
          </header>

          {/* This main section dynamically renders either EmptyState or ChatHistory. */}
          {/* It spans the remaining vertical space between the header and footer. */}
          {messages.length === 0 ? (
            // EmptyState is now rendered directly without children, as it contains the welcome message itself.
            <EmptyState />
          ) : (
            // Render active chat state if user is logged in and messages exist
            <main
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 md:p-6"
            >
              <ChatHistory messages={messages} isJobRunning={isJobRunning} />
            </main>
          )}

          {/* The footer is now consistently rendered for logged-in users. */}
          {/* Removed `border-t` from footer, rely on `shadow-sm` for visual separation. */}
          <footer className="bg-background sticky bottom-0 z-10 p-4 shadow-sm">
            <div className="mx-auto max-w-4xl">
              {/* The ChatInputForm is now consistently here, and only here. */}
              <ChatInputForm
                input={input}
                setInput={setInput}
                handleSubmit={handleSubmit}
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

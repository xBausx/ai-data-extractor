// src/components/chat/ChatInputForm.tsx
'use client'

import { FormEvent } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { UploadIcon, SendIcon } from './Icons'

// Prop interface for our reusable form component.
interface ChatInputFormProps {
  input: string
  setInput: (value: string) => void
  handleSubmit: (e: FormEvent) => void
  isJobRunning: boolean
  isPending: boolean
}

// A reusable component for the chat input form.
export const ChatInputForm = ({
  input,
  setInput,
  handleSubmit,
  isJobRunning,
  isPending,
}: ChatInputFormProps) => (
  <form
    onSubmit={handleSubmit}
    className="bg-card relative flex items-center rounded-xl border shadow-lg"
  >
    <Input
      value={input}
      onChange={(e) => setInput(e.target.value)}
      placeholder="Ask anything..."
      className="h-14 w-full border-none bg-transparent pr-20 pl-4 focus-visible:ring-0"
    />
    <div className="absolute right-4 flex items-center gap-2">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        disabled // Placeholder for future upload feature
      >
        <UploadIcon className="h-5 w-5" />
      </Button>
      <Button
        type="submit"
        size="icon"
        className="h-8 w-8"
        disabled={isJobRunning || isPending || !input}
      >
        <SendIcon className="h-5 w-5" />
      </Button>
    </div>
  </form>
)

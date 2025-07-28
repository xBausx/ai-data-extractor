// src/components/chat/ChatInputForm.tsx
'use client'

import { FormEvent, useRef, ChangeEvent } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { UploadIcon, SendIcon, XIcon } from './Icons'

// UPDATED: Added isFileUploadDisabled to the prop interface.
interface ChatInputFormProps {
  input: string
  setInput: (value: string) => void
  handleSubmit: (e: FormEvent) => void
  isJobRunning: boolean
  isPending: boolean
  onFileSelect: (file: File | undefined) => void
  isFileUploading: boolean
  imagePreviewUrls: string[]
  onClearImageByIndex: (index: number) => void
  isFileUploadDisabled: boolean // <-- NEW PROP
}

export const ChatInputForm = ({
  input,
  setInput,
  handleSubmit,
  isJobRunning,
  isPending,
  onFileSelect,
  isFileUploading,
  imagePreviewUrls,
  onClearImageByIndex,
  isFileUploadDisabled, // <-- NEW PROP
}: ChatInputFormProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    files.forEach((file) => onFileSelect(file))

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    // The main form container is unchanged.
    <form
      onSubmit={handleSubmit}
      className="bg-card relative flex flex-col rounded-xl border-2 border-gray-600 p-2 shadow-lg"
    >
      {/* Hidden file input remains unchanged */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
        multiple
      />

      {/* Image Previews Container remains unchanged */}
      {imagePreviewUrls.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {imagePreviewUrls.map((url, index) => (
            <div key={url} className="relative flex-shrink-0">
              <img
                src={url}
                alt={`Selected Image Preview ${index + 1}`}
                className="border-border h-16 w-16 rounded-md border object-cover"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="bg-background/70 absolute -top-1.5 -right-1.5 h-6 w-6 cursor-pointer rounded-full border-0 text-white ring-0 outline-none hover:bg-transparent hover:text-white focus:border-0 focus:ring-0 focus:outline-none focus-visible:border-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
                onClick={() => onClearImageByIndex(index)}
                aria-label={`Remove image ${index + 1}`}
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Input and Buttons Container */}
      <div className="relative flex w-full items-center">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            imagePreviewUrls.length > 0
              ? 'Add a prompt for the image(s)...'
              : 'Ask anything...'
          }
          className="h-14 w-full border-none bg-transparent pr-20 pl-4 focus-visible:ring-0"
        />
        <div className="absolute right-4 flex items-center gap-2">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            // --- UPDATED: The disabled state now also checks our new prop ---
            // This button will now be disabled if a job is running OR if we are in an update context.
            disabled={
              isJobRunning ||
              isPending ||
              isFileUploading ||
              isFileUploadDisabled
            }
            onClick={handleUploadClick}
          >
            <UploadIcon className="h-5 w-5" />
          </Button>
          <Button
            type="submit"
            size="icon"
            className="h-8 w-8"
            disabled={
              isJobRunning ||
              isPending ||
              (!input && imagePreviewUrls.length === 0) ||
              isFileUploading
            }
          >
            <SendIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </form>
  )
}

// src/components/chat/ChatHistory.tsx
'use client'

// Import the Product type from our new single source of truth.
import { type Product } from '@/lib/types'
// Import the other types from their correct location.
import { type Message, type FileObject } from '@/app/chat/page'

import { MessageToolbar } from './MessageToolbar'
import { Button } from '@/components/ui/Button'
import ReactMarkdown from 'react-markdown'

/**
 * A type guard function to check if the content is a FileObject.
 * @param content - The content to check, of unknown type.
 * @returns {boolean} - True if the content is a FileObject, false otherwise.
 */
function isFileObject(content: unknown): content is FileObject {
  return typeof content === 'object' && content !== null && 'fileUrl' in content
}

interface ChatHistoryProps {
  messages: Message[]
  isJobRunning: boolean
}

export const ChatHistory = ({ messages, isJobRunning }: ChatHistoryProps) => (
  <div className="mx-auto max-w-4xl space-y-8">
    {messages.map((message) => (
      <div key={message.id} className="fade-in flex flex-col">
        <div className="flex items-start gap-4">
          <span
            className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
              message.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card-foreground text-card'
            }`}
          >
            {message.role === 'user' ? 'U' : 'A'}
          </span>
          <div
            className={`w-full max-w-[80%] rounded-lg p-4 ${
              message.role === 'user'
                ? 'bg-card border border-gray-700'
                : message.error
                  ? 'bg-destructive/10 border-destructive text-destructive-foreground border'
                  : 'bg-card'
            }`}
          >
            {isFileObject(message.content) ? (
              <div className="flex flex-col items-start gap-3">
                <p className="font-medium">Your file is ready.</p>
                <a href={message.content.fileUrl} download>
                  <Button>Download Report</Button>
                </a>
              </div>
            ) : typeof message.content === 'string' ? (
              <div className="prose prose-sm dark:prose-invert">
                <ReactMarkdown
                  components={{
                    p: ({ ...props }) => (
                      <p className="mb-2 last:mb-0" {...props} />
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            ) : Array.isArray(message.content) ? (
              <div className="space-y-6">
                <div className="overflow-x-auto">
                  {/* This table rendering is likely for a legacy display.
                        The primary data view is now in DataTablePreview.
                        However, we will update it to use the correct field names. */}
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr className="text-left">
                        <th className="p-2">Product</th>
                        <th className="p-2">Description</th>
                        <th className="p-2">Price</th>
                        <th className="p-2">Limit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(message.content as Product[]).map((p, i) => (
                        <tr key={i} className="border-b">
                          {/* Updated to use the new field names */}
                          <td className="p-2 font-medium">{p.product_name}</td>
                          <td className="text-muted-foreground p-2">
                            {p.product_description}
                          </td>
                          <td className="p-2">{p.price}</td>
                          <td className="p-2">{p.limit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {message.imageUrl && (
              <img
                src={message.imageUrl}
                alt="Uploaded image"
                className="mt-4 max-h-48 w-full rounded-md object-contain"
              />
            )}
          </div>
        </div>
        {message.role === 'assistant' && !isJobRunning && !message.error && (
          <div className="ml-10">
            <MessageToolbar />
          </div>
        )}
      </div>
    ))}
  </div>
)

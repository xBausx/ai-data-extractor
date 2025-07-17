// src/components/chat/ChatHistory.tsx
'use client'

// UPDATED: Import the new FileObject type
import { Message, Product, FileObject } from '@/app/page'
import { MessageToolbar } from './MessageToolbar'
import { Button } from '@/components/ui/Button'

// This function can remain for backward compatibility or future use cases.
const groupProducts = (products: Product[]) => {
  return products.reduce(
    (acc, product) => {
      const group = product.group || 'Uncategorized'
      if (!acc[group]) acc[group] = []
      acc[group].push(product)
      return acc
    },
    {} as Record<string, Product[]>,
  )
}

// NEW: A dedicated type guard function. This is the best practice.
// It checks if 'content' is our FileObject, and tells TypeScript so.
function isFileObject(content: unknown): content is FileObject {
  return (
    typeof content === 'object' &&
    content !== null &&
    // The 'in' operator is the key. It checks for the property's existence
    // in a way that is fully type-safe and requires no casting.
    'fileUrl' in content
  )
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
            {
              // --- CLEANED UP: Final rendering logic using the type guard ---

              // 1. Check for our new FileObject type first.
              isFileObject(message.content) ? (
                <div className="flex flex-col items-start gap-3">
                  <p className="font-medium">Your Excel file is ready.</p>
                  <a
                    href={message.content.fileUrl} // No error here now
                    download
                  >
                    <Button>Download Report</Button>
                  </a>
                </div>
              ) : // 2. Fallback to check if it's a string.
              typeof message.content === 'string' ? (
                <p className="whitespace-pre-wrap">{message.content}</p>
              ) : // 3. If it's not a string or a file, it must be the Product[] array.
              // We can safely cast it here because all other possibilities are exhausted.
              Array.isArray(message.content) ? (
                <div className="space-y-6">
                  {Object.entries(
                    groupProducts(message.content as Product[]),
                  ).map(([group, products]) => (
                    <div key={group}>
                      <h3 className="mb-2 font-semibold">{group}</h3>
                      <div className="overflow-x-auto">
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
                            {products.map((p, i) => (
                              <tr key={i} className="border-b">
                                <td className="p-2 font-medium">{p.name}</td>
                                <td className="text-muted-foreground p-2">
                                  {p.description}
                                </td>
                                <td className="p-2">{p.price}</td>
                                <td className="p-2">{p.limit}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null
            }

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

// src/components/chat/ChatHistory.tsx
'use client'

import { Message, Product } from '@/app/page'
import { MessageToolbar } from './MessageToolbar'

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
            {typeof message.content === 'string' ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupProducts(message.content)).map(
                  ([group, products]) => (
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
                  ),
                )}
              </div>
            )}
            {/* Conditionally render image if message.imageUrl exists */}
            {message.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={message.imageUrl}
                alt="Uploaded image"
                // --- CHANGED: Removed the 'border' and 'border-border' classes ---
                // This is the fix to remove the unwanted white border around the uploaded image.
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

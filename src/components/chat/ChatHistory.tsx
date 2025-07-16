// src/components/chat/ChatHistory.tsx
'use client'

import { Message, Product } from '@/app/page' // Importing types. Will be moved to a central types file later.
import { MessageToolbar } from './MessageToolbar'

// Helper function to group products. Good candidate to be moved to `src/lib/utils.ts` later.
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

// Prop interface for the chat history component.
interface ChatHistoryProps {
  messages: Message[]
  isJobRunning: boolean
}

// Renders the list of messages in the active chat view.
export const ChatHistory = ({ messages, isJobRunning }: ChatHistoryProps) => (
  <div className="mx-auto max-w-4xl space-y-8">
    {messages.map((message) => (
      <div key={message.id} className="fade-in flex flex-col">
        <div className="flex items-start gap-4">
          <span
            className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
              message.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card-foreground text-card' // Avatars remain distinct.
            }`}
          >
            {message.role === 'user' ? 'U' : 'A'}
          </span>
          <div
            // REFINED: Conditional styling for message bubbles based on role and error status,
            // strictly following the latest explicit instructions for borders.
            className={`w-full max-w-[80%] rounded-lg p-4 ${
              message.role === 'user'
                ? 'bg-card border' // User messages: Have a subtle card background and a border.
                : message.error
                  ? 'bg-destructive/10 text-destructive-foreground' // Error messages: Have a destructive background, but NO border.
                  : 'bg-card' // Agent messages (non-error): Have a subtle card background, but NO border.
            }`}
          >
            {typeof message.content === 'string' ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              // The product data table rendering logic remains correct and unchanged here.
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
          </div>
        </div>
        {/* The toolbar for assistant messages. */}
        {message.role === 'assistant' && !isJobRunning && !message.error && (
          <div className="ml-10">
            <MessageToolbar />
          </div>
        )}
      </div>
    ))}
  </div>
)

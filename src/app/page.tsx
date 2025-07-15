// src/app/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

// This is the first key change: The Product type is updated to match the
// new, detailed data structure returned by our E2B sandbox script.
export interface Product {
  group: string
  name: string
  description?: string
  price?: string
  limit?: string
}

// A simple spinner component for loading states
const Spinner = () => (
  <svg
    className="mr-3 -ml-1 h-5 w-5 animate-spin text-white"
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
)

export default function Home() {
  const router = useRouter()

  const [imageUrl, setImageUrl] = useState('https://i.imgur.com/S6nL4gD.jpeg')
  const [userPrompt] = useState(
    'Please identify all products in this grocery flyer, including their name, a detailed description, price, and a logical group (e.g., "Produce", "Dairy").',
  )
  const [runningEventId, setRunningEventId] = useState<string | null>(null)
  // The state now correctly uses our updated Product type.
  const [jobResult, setJobResult] = useState<Product[] | null>(null)
  const [jobError, setJobError] = useState<string | null>(null)

  const { data: session, isLoading: isSessionLoading } =
    trpc.auth.getSession.useQuery()
  const signOutMutation = trpc.auth.signOut.useMutation({
    onSuccess: () => router.refresh(),
  })

  const { data: polledResult } = trpc.auth.getJobResult.useQuery(
    { eventId: runningEventId! },
    {
      enabled: !!runningEventId,
      refetchInterval: 2000,
    },
  )

  useEffect(() => {
    if (polledResult) {
      if (polledResult.status === 'completed') {
        setRunningEventId(null)
        // The data is now correctly cast to the new Product type.
        setJobResult(polledResult.data as unknown as Product[])
      } else if (polledResult.status === 'failed') {
        setRunningEventId(null)
        setJobError(polledResult.error || 'An unknown error occurred.')
      }
    }
  }, [polledResult])

  const extractProductsMutation = trpc.auth.triggerInngestTest.useMutation({
    onSuccess: (data) => setRunningEventId(data.eventId),
    onError: (error) => setJobError(error.message),
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setJobResult(null)
    setJobError(null)
    extractProductsMutation.mutate({
      fileUrl: imageUrl,
      userPrompt: userPrompt,
    })
  }

  const isJobRunning = extractProductsMutation.isPending || !!runningEventId

  // This is a helper function to group the products by their category.
  const groupedResults = jobResult?.reduce(
    (acc, product) => {
      const group = product.group || 'Uncategorized'
      if (!acc[group]) {
        acc[group] = []
      }
      acc[group].push(product)
      return acc
    },
    {} as Record<string, Product[]>,
  )

  if (isSessionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="bg-background flex min-h-screen w-full flex-col">
      <header className="bg-background sticky top-0 z-10 flex h-16 items-center justify-between border-b px-4 md:px-6">
        <h1 className="text-xl font-bold">Adept AI Extractor</h1>
        {session?.user && (
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground text-sm">
              {session.user.username}
            </span>
            <Button variant="ghost" onClick={() => signOutMutation.mutate()}>
              Logout
            </Button>
          </div>
        )}
      </header>

      <main className="flex flex-1 flex-col items-center p-4 md:p-6">
        <div className="w-full max-w-4xl">
          {!session?.user ? (
            <div className="flex h-[80vh] flex-col items-center justify-center">
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
            </div>
          ) : (
            <div className="space-y-8">
              <div className="bg-card rounded-lg border p-6 shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="imageUrl">Image URL</Label>
                    <Input
                      id="imageUrl"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    isLoading={isJobRunning}
                  >
                    {isJobRunning ? 'Agent is Working...' : 'Extract Products'}
                  </Button>
                </form>
              </div>

              {jobError && (
                <div className="border-destructive bg-destructive/10 text-destructive-foreground rounded-lg border p-4">
                  <h3 className="font-semibold">Extraction Failed</h3>
                  <p className="text-sm">{jobError}</p>
                </div>
              )}

              {/* This is the second key change: A rich display for the extracted data. */}
              {groupedResults && (
                <div className="space-y-6">
                  {Object.entries(groupedResults).map(([group, products]) => (
                    <div key={group} className="bg-card rounded-lg border p-6">
                      <h3 className="mb-4 text-lg font-semibold">{group}</h3>
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
                            {products.map((product, index) => (
                              <tr key={index} className="border-b">
                                <td className="p-2 font-medium">
                                  {product.name}
                                </td>
                                <td className="text-muted-foreground p-2">
                                  {product.description}
                                </td>
                                <td className="p-2">{product.price}</td>
                                <td className="p-2">{product.limit}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

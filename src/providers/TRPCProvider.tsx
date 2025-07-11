// src/providers/TRPCProvider.tsx

// The "use client" directive is necessary for this file because it uses React hooks (useState)
// and interacts with the browser environment, making it a Client Component.
'use client'

// Import necessary components and functions from TanStack Query and tRPC.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink, loggerLink } from '@trpc/client'
import React, { useState } from 'react'

// superjson is a library that allows for serializing/deserializing data types
// that are not supported by standard JSON, such as Dates, Maps, and Sets.
import superjson from 'superjson'

// Import the tRPC client instance that we created.
// The '@' alias points to the 'src' directory.
import { trpc } from '@/lib/trpc/client'

/**
 * A helper function to determine the base URL of the API.
 * This makes the application more flexible and able to run in different environments.
 * @returns {string} The base URL for the API endpoint.
 */
function getBaseUrl() {
  // If this code is running in a browser, we return a relative path.
  // This is the standard and most robust approach for client-side requests.
  if (typeof window !== 'undefined') return ''

  // If the code is running on a Vercel server, Vercel provides a `VERCEL_URL`
  // environment variable that contains the deployment URL.
  if (process.env.VERCEL_URL) return `https://{process.env.VERCEL_URL}`

  // If we are in a local or non-Vercel server environment, we fall back to localhost.
  // The port should match the one your Next.js app is running on.
  return `http://localhost:3000`
}

/**
 * This is a React component that acts as a provider for tRPC.
 * It wraps the entire application to provide the tRPC client and React Query client
 * to all child components.
 * @param {object} props - The component's props.
 * @param {React.ReactNode} props.children - The child components that will be rendered within this provider.
 */
export default function TRPCProvider({
  children,
}: {
  children: React.ReactNode
}) {
  // useState is used here to create and persist the client instances across re-renders.
  // This ensures that we don't create a new client on every render, which would be inefficient
  // and would cause issues like losing cache state.

  // The QueryClient from TanStack Query is responsible for caching API request data.
  const [queryClient] = useState(() => new QueryClient({}))

  // This is the main tRPC client instance that will be used to make API calls.
  const [trpcClient] = useState(() =>
    trpc.createClient({
      // `links` are a core concept in tRPC. They are middlewares that control the flow
      // of a request, from invocation to the final HTTP call. They run in order.
      links: [
        // The loggerLink logs tRPC requests and responses to the browser console.
        // This is extremely useful for debugging during development.
        loggerLink({
          // This function determines whether the logger should be active.
          enabled: (opts) =>
            // We enable it only in the 'development' environment.
            process.env.NODE_ENV === 'development' ||
            // Or if a request resulted in an error, so we can debug production issues.
            (opts.direction === 'down' && opts.result instanceof Error),
        }),

        // The httpBatchLink is the terminating link. It's responsible for sending
        // the actual HTTP request to the server. It also batches multiple concurrent
        // requests into a single HTTP call to improve performance.
        httpBatchLink({
          // The full URL to our tRPC API endpoint.
          url: `${getBaseUrl()}/api/trpc`,

          // The transformer needs to be passed here. It must match the transformer
          // used on the server-side tRPC router.
          transformer: superjson,
        }),
      ],
    }),
  )

  return (
    // The trpc.Provider makes the tRPC client available to all components
    // that use the `trpc` hooks (e.g., trpc.greeting.useQuery).
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      {/* The QueryClientProvider from TanStack Query provides the caching client. */}
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  )
}

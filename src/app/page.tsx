// src/app/page.tsx
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/Button'

export default function Home() {
  const router = useRouter()

  // The getSession query hook fetches the current user's session data.
  // tRPC's React Query integration automatically caches this data.
  const { data: session, isLoading: isSessionLoading } =
    trpc.auth.getSession.useQuery()

  // The signOut mutation hook to handle user logout.
  const signOutMutation = trpc.auth.signOut.useMutation({
    onSuccess: () => {
      // On successful logout, refresh the router to update the UI.
      router.refresh()
    },
  })
  // Add a new tRPC mutation hook to trigger the Inngest function.
  const triggerInngest = trpc.auth.triggerInngestTest.useMutation({
    onSuccess: () => {
      alert('Inngest event sent! Check your dev server terminal.')
    },
  })

  // A simple loading state while we fetch the session.
  if (isSessionLoading) {
    return <div className="p-24 text-center">Loading...</div>
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      <h1 className="mb-8 text-5xl font-bold">Adept AI Data Extractor</h1>

      {session?.user ? (
        // If the user is logged in, show a welcome message and a logout button.
        <div className="text-center">
          <p className="mb-4 text-xl">
            Welcome,{' '}
            <span className="font-semibold">{session.user.username}</span>!
          </p>
          <Button
            onClick={() => signOutMutation.mutate()}
            isLoading={signOutMutation.isPending}
          >
            Logout
          </Button>
          <Button
            onClick={() => triggerInngest.mutate()}
            isLoading={triggerInngest.isPending}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Trigger Inngest Job
          </Button>
        </div>
      ) : (
        // If the user is not logged in, show links to the login and sign-up pages.
        <div className="flex gap-4">
          <Link href="/login">
            <Button>Login</Button>
          </Link>
          <Link href="/signup">
            <Button className="bg-green-600 hover:bg-green-700">Sign Up</Button>
          </Link>
        </div>
      )}
    </main>
  )
}

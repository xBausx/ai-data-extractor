'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function SignUpPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const signUpMutation = trpc.auth.signUp.useMutation({
    onSuccess: () => {
      router.push('/login')
    },
    onError: (error) => {
      setError(error.message)
    },
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    signUpMutation.mutate({ username, password })
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      {/* --- CHANGE: Form background and text colors --- */}
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg bg-gray-900 p-8 shadow-md"
      >
        <h1 className="mb-6 text-center text-2xl font-bold text-gray-100">
          Create Account
        </h1>
        {error && <p className="mb-4 text-center text-red-500">{error}</p>}
        <div className="mb-4">
          {/* --- CHANGE: Label text color --- */}
          <label
            htmlFor="username"
            className="mb-1 block text-sm font-medium text-gray-400"
          >
            Username
          </label>
          <Input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="mb-6">
          {/* --- CHANGE: Label text color --- */}
          <label
            htmlFor="password"
            className="mb-1 block text-sm font-medium text-gray-400"
          >
            Password
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button
          type="submit"
          className="w-full"
          isLoading={signUpMutation.isPending}
        >
          Sign Up
        </Button>
      </form>
    </div>
  )
}

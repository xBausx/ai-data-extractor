// src/components/auth/UserNav.tsx
'use client'

import * as React from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/Button'

// Defines the user object structure expected by this component.
interface UserForUserNav {
  username: string
}

// Defines the props for our component.
interface UserNavProps {
  user: UserForUserNav | null | undefined
  signOut: () => void
  className?: string
}

/**
 * A reusable component that displays a user avatar and a dropdown menu
 * with user-specific actions like logging out.
 */
export function UserNav({ user, signOut, className }: UserNavProps) {
  if (!user) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={`relative h-8 w-8 rounded-full outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ${className || ''}`}
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src="/placeholder.svg" alt={`@${user.username}`} />
            <AvatarFallback>
              {user.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm leading-none font-medium">{user.username}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            // Debugging: Log when the logout button is clicked.
            console.log('Logout button clicked inside UserNav!')
            // FIX: Removed event.preventDefault() as it might interfere with shadcn/ui's internal logic.
            // The signOut function (which is a direct mutation call) does not require event prevention.
            signOut()
          }}
          className="outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

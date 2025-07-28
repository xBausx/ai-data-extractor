// src/components/chat/MessageToolbar.tsx
'use client'

import { Button } from '@/components/ui/Button'
import { ThumbsUpIcon, ThumbsDownIcon, CopyIcon } from './Icons'

// Renders the small toolbar that appears below assistant messages.
export const MessageToolbar = () => (
  <div className="mt-2 flex items-center gap-2">
    <Button variant="ghost" size="icon" className="h-7 w-7">
      <ThumbsUpIcon className="text-muted-foreground h-4 w-4" />
    </Button>
    <Button variant="ghost" size="icon" className="h-7 w-7">
      <ThumbsDownIcon className="text-muted-foreground h-4 w-4" />
    </Button>
    <Button variant="ghost" size="icon" className="h-7 w-7">
      <CopyIcon className="text-muted-foreground h-4 w-4" />
    </Button>
  </div>
)

'use client' // Error components must be Client Components

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ServerCrash } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background gap-6 text-center p-4">
        <ServerCrash className="h-16 w-16 text-destructive" />
        <div className="max-w-md">
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="text-muted-foreground mt-2">
                An unexpected error occurred. You can try to recover by clicking the button below, or refresh the page.
            </p>
        </div>
        <Button onClick={() => reset()}>
            Try again
        </Button>
    </div>
  )
}

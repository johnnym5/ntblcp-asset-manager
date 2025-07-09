
"use client"
import { Inbox } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAppState } from "@/contexts/app-state-context"

// This component is no longer used directly in the app-layout, but kept for potential future use.
interface InboxIconProps {
  onClick: () => void;
}

export function InboxIcon({ onClick }: InboxIconProps) {
  const { unreadInboxCount } = useAppState();

  return (
    <Button variant="ghost" size="icon" className="relative h-10 w-10" onClick={onClick}>
      <Inbox className="h-[1.2rem] w-[1.2rem]" />
      {unreadInboxCount > 0 && (
        <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
          {unreadInboxCount}
        </span>
      )}
      <span className="sr-only">Toggle Inbox</span>
    </Button>
  )
}

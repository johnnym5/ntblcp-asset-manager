
"use client"

import * as React from "react"
import { Bell, CheckCheck } from "lucide-react"
import { formatDistanceToNow } from 'date-fns'

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useNotifications, markAllAsRead, clearAll } from "@/hooks/use-notifications"
import { cn } from "@/lib/utils"

export function NotificationBell() {
  const { notifications, unreadCount } = useNotifications();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && unreadCount > 0) {
      setTimeout(() => markAllAsRead(), 500);
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10">
          <Bell className="h-[1.2rem] w-[1.2rem]" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
              {unreadCount}
            </span>
          )}
          <span className="sr-only">Toggle notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0">
        <div className="flex items-center justify-between p-4">
          <h3 className="font-semibold">Notifications</h3>
          {notifications.length > 0 && (
            <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => clearAll()}>
              Clear all
            </Button>
          )}
        </div>
        <Separator />
        <ScrollArea className="h-[400px]">
          {notifications.length > 0 ? (
            notifications.map((notification, index) => (
              <div key={notification.id}>
                <div className="p-4">
                  <p className={cn("font-semibold mb-1", !notification.read && "text-foreground", notification.read && "text-muted-foreground")}>
                    {notification.title}
                  </p>
                  {notification.description && (
                    <p className={cn("text-sm", !notification.read && "text-muted-foreground", notification.read && "text-muted-foreground/70")}>
                      {notification.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground/80 mt-2">
                    {formatDistanceToNow(notification.date, { addSuffix: true })}
                  </p>
                </div>
                {index < notifications.length - 1 && <Separator />}
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 text-center p-8 text-muted-foreground">
              <CheckCheck className="h-8 w-8" />
              <p className="text-sm font-medium">You're all caught up!</p>
              <p className="text-xs">New notifications will appear here.</p>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

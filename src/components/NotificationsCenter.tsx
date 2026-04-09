'use client';

/**
 * @fileOverview NotificationsCenter - High-Density Interactive Pop-up Window.
 * Phase 1410: Integrated TactileMenu for forensic breakdown and navigation arrows.
 */

import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Trash2,
  Cloud,
  ArrowRight,
  Info,
  Tag,
  Monitor
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useAppState } from '@/contexts/app-state-context';
import { useNotifications, removeNotification, clearAll, markAllAsRead } from '@/hooks/use-notifications';
import { TactileMenu } from '@/components/TactileMenu';

interface NotificationsCenterProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationsCenter({ isOpen, onOpenChange }: NotificationsCenterProps) {
  const { notifications, unreadCount } = useNotifications();
  const { setActiveView, setSearchTerm } = useAppState();

  const handleNotificationClick = (n: any) => {
    markAllAsRead(); 
    if (n.assetId) {
      const shortId = n.assetId.split('-')[0];
      setSearchTerm(shortId); 
      setActiveView('REGISTRY');
    } else if (n.targetView) {
      setActiveView(n.targetView as any);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 border-none bg-background text-foreground shadow-3xl overflow-hidden flex flex-col rounded-[2.5rem]">
        <div className="p-8 pb-4 bg-muted/20 border-b">
          <DialogHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Bell className="text-primary h-5 w-5" />
                </div>
                <DialogTitle className="text-xl font-black uppercase tracking-tight leading-none">Notifications</DialogTitle>
              </div>
              {unreadCount > 0 && (
                <Badge className="bg-primary text-black font-black uppercase text-[8px] h-5 px-2 rounded-full">
                  {unreadCount} NEW
                </Badge>
              )}
            </div>
            <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70 mt-1">
              Registry updates and activity history.
            </DialogDescription>
          </DialogHeader>
        </div>

        <ScrollArea className="flex-1 bg-background max-h-[60vh]">
          <div className="p-6 space-y-3 pb-10">
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <TactileMenu
                  key={n.id}
                  title="Forensic Breakdown"
                  options={[
                    { label: `ID: ${n.assetId || 'System Pulse'}`, icon: Tag, onClick: () => {} },
                    { label: n.date.toLocaleString(), icon: Clock, onClick: () => {} },
                    { label: 'Navigate to Source', icon: ArrowRight, onClick: () => handleNotificationClick(n) },
                    { label: 'Dismiss Alert', icon: Trash2, onClick: () => removeNotification(n.id), destructive: true }
                  ]}
                >
                  <div 
                    onClick={() => handleNotificationClick(n)}
                    className={cn(
                      "p-4 rounded-2xl border-2 transition-all group relative cursor-pointer",
                      n.read ? "bg-transparent border-border/40 opacity-60" : "bg-card border-primary/20 shadow-lg hover:border-primary/40"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-2 rounded-lg shrink-0",
                        n.variant === 'destructive' ? "bg-red-100 text-red-600" : "bg-primary/10 text-primary"
                      )}>
                        {n.variant === 'destructive' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                      </div>

                      <div className="space-y-0.5 min-w-0 flex-1">
                        <h4 className="text-xs font-black uppercase tracking-tight leading-tight truncate text-foreground">{n.title}</h4>
                        {n.description && (
                          <p className="text-[10px] font-medium text-muted-foreground leading-relaxed italic line-clamp-2">
                            {n.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 pt-1.5">
                          <div className="flex items-center gap-1.5 text-[8px] font-bold text-muted-foreground uppercase tracking-widest opacity-40">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(n.date, { addSuffix: true })}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-lg bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </TactileMenu>
              ))
            ) : (
              <div className="py-24 text-center opacity-20 flex flex-col items-center gap-4">
                <Cloud className="h-12 w-12 text-foreground" />
                <p className="text-[10px] font-black uppercase tracking-widest">No New Alerts</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-8 bg-muted/20 border-t flex items-center justify-between gap-4">
          <Button 
            variant="ghost" 
            onClick={clearAll}
            disabled={notifications.length === 0}
            className="h-12 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest text-muted-foreground hover:text-foreground gap-2"
          >
            <Trash2 className="h-4 w-4" /> Clear All
          </Button>
          <Button onClick={() => onOpenChange(false)} className="h-12 px-10 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl">
            Dismiss
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

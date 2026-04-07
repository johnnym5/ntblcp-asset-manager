'use client';

/**
 * @fileOverview NotificationsCenter - High-Density Interactive Pop-up Window.
 * Converted from Sheet to Dialog for professional workstation focus.
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
  Cloud
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useAppState } from '@/contexts/app-state-context';
import { useNotifications, removeNotification, clearAll, markAllAsRead } from '@/hooks/use-notifications';

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
    }
    setActiveView('REGISTRY');
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 border-none bg-black text-white shadow-3xl overflow-hidden flex flex-col rounded-[2.5rem]">
        <div className="p-8 pb-4 bg-white/[0.02] border-b border-white/5">
          <DialogHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Bell className="text-primary h-5 w-5" />
                </div>
                <DialogTitle className="text-xl font-black uppercase tracking-tight text-white leading-none">Notifications</DialogTitle>
              </div>
              {unreadCount > 0 && (
                <Badge className="bg-primary text-black font-black uppercase text-[8px] h-5 px-2 rounded-full">
                  {unreadCount} NEW
                </Badge>
              )}
            </div>
            <DialogDescription className="text-[10px] font-medium text-white/40 italic">
              Registry updates and activity history.
            </DialogDescription>
          </DialogHeader>
        </div>

        <ScrollArea className="flex-1 bg-black max-h-[60vh]">
          <div className="p-6 space-y-3 pb-10">
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <div 
                  key={n.id} 
                  onClick={() => handleNotificationClick(n)}
                  className={cn(
                    "p-4 rounded-2xl border transition-all group relative cursor-pointer",
                    n.read ? "bg-transparent border-white/5 opacity-60" : "bg-white/[0.02] border-white/10 shadow-lg hover:border-primary/30"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-2 rounded-lg shrink-0",
                      n.variant === 'destructive' ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary"
                    )}>
                      {n.variant === 'destructive' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                    </div>

                    <div className="space-y-0.5 min-w-0 flex-1">
                      <h4 className="text-xs font-black uppercase tracking-tight leading-tight truncate">{n.title}</h4>
                      {n.description && (
                        <p className="text-[10px] font-medium text-white/50 leading-relaxed italic line-clamp-2">
                          {n.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 pt-1.5">
                        <div className="flex items-center gap-1.5 text-[8px] font-bold text-white/20 uppercase tracking-widest">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(n.date, { addSuffix: true })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeNotification(n.id); }}
                        className="p-2 rounded-lg text-white/5 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-24 text-center opacity-20 flex flex-col items-center gap-4">
                <Cloud className="h-12 w-12 text-white" />
                <p className="text-[10px] font-black uppercase tracking-widest">No New Alerts</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-8 bg-[#050505] border-t border-white/5 flex items-center justify-between gap-4">
          <Button 
            variant="ghost" 
            onClick={clearAll}
            disabled={notifications.length === 0}
            className="h-12 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest text-white/40 hover:text-white hover:bg-white/5 gap-2"
          >
            <Trash2 className="h-4 w-4" /> Clear All
          </Button>
          <Button onClick={() => onOpenChange(false)} className="h-12 px-10 rounded-2xl bg-white/[0.05] text-white font-black uppercase text-[10px] tracking-[0.2em] hover:bg-white/10 transition-all">
            Dismiss
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
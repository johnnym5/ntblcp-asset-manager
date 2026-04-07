'use client';

/**
 * @fileOverview NotificationsCenter - High-Density Interactive Audit Panel.
 * Phase 300: Scaled down by 50% for high-density workstation parity.
 */

import React from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetClose 
} from '@/components/ui/sheet';
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
  ArrowRight
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
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-sm p-0 border-none bg-black text-white shadow-3xl overflow-hidden flex flex-col rounded-l-[1.5rem]">
        <div className="p-6 pb-4 bg-white/[0.02] border-b border-white/5">
          <SheetHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary/10 rounded-lg">
                  <Bell className="text-primary h-4 w-4" />
                </div>
                <SheetTitle className="text-lg font-black uppercase tracking-tight text-white leading-none">Audit Alerts</SheetTitle>
              </div>
              {unreadCount > 0 && (
                <Badge className="bg-primary text-black font-black uppercase text-[8px] h-5 px-2 rounded-full">
                  {unreadCount} NEW
                </Badge>
              )}
            </div>
            <SheetDescription className="text-[10px] font-medium text-white/40 italic">
              Registry modifications and field audit pulses.
            </SheetDescription>
          </SheetHeader>
        </div>

        <ScrollArea className="flex-1 bg-black">
          <div className="p-4 space-y-3 pb-24">
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <div 
                  key={n.id} 
                  onClick={() => handleNotificationClick(n)}
                  className={cn(
                    "p-3 rounded-xl border transition-all group relative cursor-pointer",
                    n.read ? "bg-transparent border-white/5 opacity-60" : "bg-white/[0.02] border-white/10 shadow-lg hover:border-primary/30"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-1.5 rounded-md shrink-0",
                      n.variant === 'destructive' ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary"
                    )}>
                      {n.variant === 'destructive' ? <AlertCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    </div>

                    <div className="space-y-0.5 min-w-0 flex-1">
                      <h4 className="text-[11px] font-black uppercase tracking-tight leading-tight truncate">{n.title}</h4>
                      {n.description && (
                        <p className="text-[9px] font-medium text-white/50 leading-relaxed italic line-clamp-2">
                          {n.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        <div className="flex items-center gap-1 text-[7px] font-bold text-white/20 uppercase tracking-widest">
                          <Clock className="h-2.5 w-2.5" />
                          {formatDistanceToNow(n.date, { addSuffix: true })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeNotification(n.id); }}
                        className="p-1.5 rounded-lg text-white/5 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-32 text-center opacity-20 flex flex-col items-center gap-4">
                <Cloud className="h-10 w-10 text-white" />
                <p className="text-[9px] font-black uppercase tracking-widest">Audit Ledger Clear</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-6 bg-[#050505] border-t border-white/5 flex items-center justify-between gap-3">
          <Button 
            variant="ghost" 
            onClick={clearAll}
            disabled={notifications.length === 0}
            className="h-9 px-4 rounded-xl font-black uppercase text-[8px] tracking-widest text-white/40 hover:text-white hover:bg-white/5 gap-2"
          >
            <Trash2 className="h-3 w-3" /> Clear
          </Button>
          <SheetClose asChild>
            <Button className="h-9 px-8 rounded-xl bg-white/[0.05] text-white font-black uppercase text-[8px] tracking-[0.2em] hover:bg-white/10 transition-all">
              Dismiss
            </Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}

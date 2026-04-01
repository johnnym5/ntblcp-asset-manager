'use client';

/**
 * @fileOverview NotificationsSheet - High-Fidelity System Alerts.
 * Phase 170: Amoled-Gold aesthetic with real-time notification telemetry.
 */

import React from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetFooter,
  SheetClose 
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, removeNotification, clearAll } from '@/hooks/use-notifications';
import { 
  Bell, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Trash2,
  Database,
  Cloud
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';

interface NotificationsSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationsSheet({ isOpen, onOpenChange }: NotificationsSheetProps) {
  const { notifications, unreadCount } = useNotifications();

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 border-none bg-black text-white shadow-3xl overflow-hidden flex flex-col rounded-l-[2rem]">
        <div className="p-8 pb-6 bg-white/[0.03] border-b border-white/5">
          <SheetHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-xl">
                  <Bell className="text-primary h-6 w-6" />
                </div>
                <SheetTitle className="text-2xl font-black uppercase tracking-tight text-white leading-none">System Alerts</SheetTitle>
              </div>
              {unreadCount > 0 && (
                <Badge className="bg-primary text-black font-black uppercase text-[10px] h-6 px-3 rounded-full">
                  {unreadCount} NEW
                </Badge>
              )}
            </div>
            <SheetDescription className="text-sm font-medium text-white/40 italic">
              Registry activity and connection heartbeat logs.
            </SheetDescription>
          </SheetHeader>
        </div>

        <ScrollArea className="flex-1 bg-black">
          <div className="p-6 space-y-4 pb-32">
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={cn(
                    "p-5 rounded-2xl border transition-all group relative",
                    n.read ? "bg-transparent border-white/5 opacity-60" : "bg-white/[0.03] border-white/10 shadow-lg"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "p-2 rounded-lg shrink-0",
                      n.variant === 'destructive' ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary"
                    )}>
                      {n.variant === 'destructive' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <h4 className="text-sm font-black uppercase tracking-tight leading-tight pr-6">{n.title}</h4>
                      {n.description && (
                        <p className="text-[11px] font-medium text-white/60 leading-relaxed italic line-clamp-2">
                          {n.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 pt-2 text-[9px] font-bold text-white/20 uppercase tracking-widest">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(n.date, { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => removeNotification(n.id)}
                    className="absolute top-4 right-4 p-1 rounded-lg text-white/10 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <div className="py-40 text-center opacity-20 flex flex-col items-center gap-6">
                <div className="p-10 bg-white/5 rounded-full">
                  <Cloud className="h-16 w-16 text-white" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-black uppercase tracking-widest">Logs Clear</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest">No recent system pulses detected.</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-8 bg-[#050505] border-t border-white/5 flex items-center justify-between gap-4">
          <Button 
            variant="ghost" 
            onClick={clearAll}
            disabled={notifications.length === 0}
            className="h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest text-white/40 hover:text-white hover:bg-white/5 gap-2"
          >
            <Trash2 className="h-4 w-4" /> Clear All
          </Button>
          <SheetClose asChild>
            <Button className="h-14 px-12 rounded-2xl bg-white/[0.05] text-white font-black uppercase text-[10px] tracking-[0.25em] hover:bg-white/10 transition-all active:scale-95">
              Dismiss
            </Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}

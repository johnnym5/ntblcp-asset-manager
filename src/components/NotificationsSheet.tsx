'use client';

/**
 * @fileOverview NotificationsCenter - Interactive Drill-Down Audit Panel.
 * Phase 200: Implemented Group-aware notifications with surgical asset navigation.
 */

import React, { useMemo } from 'react';
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
import { 
  Bell, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Trash2,
  Database,
  Cloud,
  ArrowRight,
  User,
  Zap,
  ArrowRightLeft
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { useNotifications, removeNotification, clearAll, markAllAsRead } from '@/hooks/use-notifications';

interface NotificationsCenterProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationsCenter({ isOpen, onOpenChange }: NotificationsCenterProps) {
  const { notifications, unreadCount } = useNotifications();
  const { assets, setActiveView, setSearchTerm } = useAppState();
  const { userProfile } = useAuth();

  const handleNotificationClick = (n: any) => {
    if (n.assetId) {
      // 1. Mark as read
      markAllAsRead(); // For simplicity in MVP, but can be targeted
      
      // 2. Drill down into the specific asset
      setSearchTerm(n.assetId.split('-')[0]); // Search by short ID to find it
      setActiveView('REGISTRY');
      onOpenChange(false);
    }
  };

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
                <SheetTitle className="text-2xl font-black uppercase tracking-tight text-white leading-none">Audit Alerts</SheetTitle>
              </div>
              {unreadCount > 0 && (
                <Badge className="bg-primary text-black font-black uppercase text-[10px] h-6 px-3 rounded-full">
                  {unreadCount} UNSEEN
                </Badge>
              )}
            </div>
            <SheetDescription className="text-sm font-medium text-white/40 italic">
              Trace registry modifications and field audit pulses.
            </SheetDescription>
          </SheetHeader>
        </div>

        <ScrollArea className="flex-1 bg-black">
          <div className="p-6 space-y-4 pb-32">
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <div 
                  key={n.id} 
                  onClick={() => handleNotificationClick(n)}
                  className={cn(
                    "p-5 rounded-2xl border transition-all group relative cursor-pointer",
                    n.read ? "bg-transparent border-white/5 opacity-60" : "bg-white/[0.03] border-white/10 shadow-lg hover:border-primary/40"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "p-2 rounded-lg shrink-0",
                      n.variant === 'destructive' ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary"
                    )}>
                      {n.variant === 'destructive' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                    </div>
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black uppercase tracking-tight leading-tight pr-6">{n.title}</h4>
                        <ArrowRight className="h-3.5 w-3.5 text-primary opacity-0 group-hover:opacity-100 transition-all" />
                      </div>
                      
                      {n.description && (
                        <p className="text-[11px] font-medium text-white/60 leading-relaxed italic line-clamp-2">
                          {n.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-white/20 uppercase tracking-widest">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(n.date, { addSuffix: true })}
                        </div>
                        <Badge variant="outline" className="h-4 px-1.5 text-[7px] font-black border-white/10 text-white/40">
                          ID: {n.assetId?.split('-')[0] || 'SYS'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeNotification(n.id); }}
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
                  <h3 className="text-xl font-black uppercase tracking-widest">Audit Ledger Clear</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest">No recent registry modifications.</p>
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
              Dismiss Panel
            </Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
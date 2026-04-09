'use client';

/**
 * @fileOverview SyncStatusDialog - High-Fidelity Sync Management Workstation.
 * Recreated to match the exact visual pulse from the user's screenshot.
 * Phase 1100: Real-time queue counting and connectivity orchestration.
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  Wifi, 
  WifiOff, 
  ShieldCheck, 
  Download, 
  Zap, 
  Activity,
  Circle,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { storage } from '@/offline/storage';
import { cn } from '@/lib/utils';
import type { OfflineQueueEntry } from '@/types/domain';

interface SyncStatusDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SyncStatusDialog({ isOpen, onOpenChange }: SyncStatusDialogProps) {
  const { isOnline, setIsOnline, manualDownload, isSyncing, assets } = useAppState();
  const [queue, setQueue] = useState<OfflineQueueEntry[]>([]);

  useEffect(() => {
    if (isOpen) {
      const load = async () => {
        const items = await storage.getQueue();
        setQueue(items);
      };
      load();
      const interval = setInterval(load, 2000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const stats = useMemo(() => {
    const pending = queue.filter(q => q.status === 'PENDING').length;
    const errors = queue.filter(q => q.status === 'FAILED').length;
    return { pending, errors };
  }, [queue]);

  const isFullySynced = stats.pending === 0 && stats.errors === 0;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 border-none bg-black text-white shadow-3xl overflow-hidden rounded-[2.5rem]">
        {/* Header Ribbon */}
        <DialogHeader className="px-10 py-6 flex flex-row items-center gap-3 space-y-0">
          <Zap className="h-4 w-4 text-primary fill-current" />
          <DialogTitle className="text-[11px] font-black uppercase tracking-[0.3em] text-primary/80 leading-none">Sync Status</DialogTitle>
        </DialogHeader>

        {/* Main Control Surface */}
        <div className="px-10 pb-10 space-y-12">
          {/* Top Section: Connectivity */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className={cn(
                "p-5 rounded-[1.5rem] transition-all duration-500 shadow-inner",
                isOnline ? "bg-green-500/10 text-green-500 shadow-green-500/5" : "bg-red-500/10 text-red-500"
              )}>
                <Wifi className={cn("h-10 w-10", isOnline && "animate-pulse")} />
              </div>
              <div className="space-y-1">
                <h3 className="text-3xl font-black uppercase text-white tracking-tight leading-none">Pending Changes</h3>
                <p className={cn(
                  "text-[10px] font-black uppercase tracking-widest",
                  isOnline ? "text-green-500/60" : "text-red-500/60"
                )}>
                  Online Status: {isOnline ? 'Active' : 'Disconnected'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-white/[0.03] p-3 px-6 rounded-2xl border border-white/10 shadow-xl">
              <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">Connect</span>
              <Switch 
                checked={isOnline} 
                onCheckedChange={setIsOnline} 
                className="data-[state=checked]:bg-green-500 h-7 w-12" 
              />
            </div>
          </div>

          <div className="h-px w-full bg-white/[0.05]" />

          {/* Middle Section: Metrics & Action */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="flex items-center gap-12">
              <div className="flex items-center gap-4 group">
                <div className="h-6 w-6 rounded-full border-2 border-white/10 flex items-center justify-center transition-all group-hover:border-primary/40">
                  <div className="h-2.5 w-2.5 rounded-full bg-transparent" />
                </div>
                <span className="text-[11px] font-black uppercase text-white/40 tracking-[0.2em]">All</span>
              </div>

              <div className="w-px h-10 bg-white/10" />

              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">Pending</span>
                <span className="text-5xl font-black text-white tabular-nums">{stats.pending}</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black text-red-600/40 uppercase tracking-[0.3em]">Errors</span>
                <span className="text-5xl font-black text-red-600 tabular-nums">{stats.errors}</span>
              </div>
            </div>

            <Button 
              onClick={manualDownload}
              disabled={isSyncing || !isOnline}
              className="h-16 px-10 rounded-2xl bg-white/[0.03] border-2 border-white/5 hover:border-primary/20 hover:bg-white/5 text-white font-black uppercase text-xs tracking-widest gap-4 transition-all shadow-2xl"
            >
              {isSyncing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
              Sync Down
            </Button>
          </div>

          {/* Bottom Section: Fidelity Shield */}
          <div className="pt-10 flex flex-col items-center justify-center gap-6">
            <div className={cn(
              "p-6 rounded-full transition-all duration-700",
              isFullySynced ? "bg-green-500/5 text-green-500 scale-110" : "bg-white/5 text-white/10"
            )}>
              <ShieldCheck className={cn("h-16 w-16", isFullySynced && "animate-[bounce_2s_infinite]")} />
            </div>
            <p className={cn(
              "text-[11px] font-black uppercase tracking-[0.4em] transition-all",
              isFullySynced ? "text-green-500/40" : "text-white/10"
            )}>
              {isFullySynced ? 'All Changes Synchronized' : 'Sync Pulse Pending'}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

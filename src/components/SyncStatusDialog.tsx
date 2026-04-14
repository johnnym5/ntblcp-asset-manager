'use client';

/**
 * @fileOverview SyncStatusDialog - Simplified Sync Hub.
 * Phase 1914: Simplified terminology (Sync Hub, Records, Push/Pull).
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
  Upload,
  Zap, 
  Activity,
  RefreshCw,
  Loader2,
  X
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
  const { 
    isOnline, 
    setIsOnline, 
    manualDownload, 
    manualUpload,
    isSyncing, 
    assets 
  } = useAppState();
  
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

  const handlePushPulse = async () => {
    await manualUpload();
  };

  const handlePullPulse = async () => {
    await manualDownload();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 border-none bg-black text-white shadow-3xl overflow-hidden rounded-[2.5rem]">
        {/* Header Ribbon */}
        <DialogHeader className="px-10 py-6 flex flex-row items-center justify-between gap-3 space-y-0 border-b border-white/5">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-4 w-4 text-primary" />
            <DialogTitle className="text-[11px] font-black uppercase tracking-[0.3em] text-primary/80 leading-none">Sync Hub</DialogTitle>
          </div>
          <button onClick={() => onOpenChange(false)} className="h-8 w-8 flex items-center justify-center bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        {/* Main Control Surface */}
        <div className="px-10 pb-10 space-y-12 mt-8">
          {/* Top Section: Connectivity */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className={cn(
                "p-5 rounded-[1.5rem] transition-all duration-500 shadow-inner",
                isOnline ? "bg-green-500/10 text-green-500 shadow-green-500/5" : "bg-red-500/10 text-red-500"
              )}>
                {isOnline ? <Wifi className="h-10 w-10 animate-pulse" /> : <WifiOff className="h-10 w-10" />}
              </div>
              <div className="space-y-1">
                <h3 className="text-3xl font-black uppercase text-white tracking-tight leading-none">Connection Status</h3>
                <p className={cn(
                  "text-[10px] font-black uppercase tracking-widest",
                  isOnline ? "text-green-500/60" : "text-red-500/60"
                )}>
                  Network: {isOnline ? 'Online' : 'Offline'}
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

          {/* Middle Section: Metrics */}
          <div className="flex flex-col gap-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-12">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">Waiting</span>
                  <span className="text-5xl font-black text-white tabular-nums">{stats.pending}</span>
                </div>

                <div className="w-px h-10 bg-white/10" />

                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black text-red-600/40 uppercase tracking-[0.3em]">Errors</span>
                  <span className="text-5xl font-black text-red-600 tabular-nums">{stats.errors}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  onClick={handlePullPulse}
                  disabled={isSyncing || !isOnline}
                  className="h-16 px-8 rounded-2xl bg-white/[0.03] border-2 border-white/10 hover:border-primary/20 text-white font-black uppercase text-[10px] tracking-widest gap-3 transition-all"
                >
                  {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 text-primary" />}
                  Get Data
                </Button>
                <Button 
                  onClick={handlePushPulse}
                  disabled={isSyncing || !isOnline || stats.pending === 0}
                  className="h-16 px-10 rounded-2xl bg-primary text-black font-black uppercase text-xs tracking-widest gap-3 shadow-2xl transition-transform hover:scale-105 active:scale-95"
                >
                  {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Save Changes
                </Button>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="pt-10 flex flex-col items-center justify-center gap-6 border-t border-dashed border-white/5">
            <div className={cn(
              "p-6 rounded-full transition-all duration-700",
              isFullySynced ? "bg-green-500/5 text-green-500 scale-110" : "bg-white/5 text-white/10"
            )}>
              <ShieldCheck className={cn("h-16 w-16", isFullySynced && "animate-[bounce_3s_infinite]")} />
            </div>
            <p className={cn(
              "text-[11px] font-black uppercase tracking-[0.4em] transition-all",
              isFullySynced ? "text-green-500/40" : "text-white/10"
            )}>
              {isFullySynced ? 'Up To Date' : 'Update Required'}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

'use client';

/**
 * @fileOverview Waiting Updates - Cloud Synchronization.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { 
  RefreshCw, 
  Database, 
  Clock, 
  Trash2, 
  RotateCcw, 
  Activity, 
  Upload, 
  Download, 
  Check, 
  X, 
  Wifi, 
  WifiOff, 
  Loader2, 
  ChevronRight, 
  Info,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAppState } from '@/contexts/app-state-context';
import { Badge } from '@/components/ui/badge';
import { storage } from '@/offline/storage';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import type { OfflineQueueEntry } from '@/types/domain';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { processSelectedSyncQueue } from '@/offline/sync';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function SyncQueueWorkstation({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const { isSyncing, refreshRegistry, manualDownload, isOnline, setIsOnline } = useAppState();
  const { toast } = useToast();
  
  const [queue, setQueue] = useState<OfflineQueueEntry[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isFullViewOpen, setIsFullViewOpen] = useState(false);
  const [isRetryingId, setIsRetryingId] = useState<string | null>(null);

  const loadQueue = async () => { 
    const items = await storage.getQueue(); 
    setQueue(items); 
  };

  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 3000); 
    return () => clearInterval(interval);
  }, []);

  const recentQueue = useMemo(() => {
    return [...queue].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
  }, [queue]);

  const opGroups = useMemo(() => {
    return {
      CREATE: queue.filter(q => q.operation === 'CREATE'),
      UPDATE: queue.filter(q => q.operation === 'UPDATE'),
      DELETE: queue.filter(q => q.operation === 'DELETE'),
      RESTORE: queue.filter(q => q.operation === 'RESTORE'),
    };
  }, [queue]);

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(new Set(queue.map(q => q.id)));
    else setSelectedIds(new Set());
  };

  const handlePushSelected = async () => {
    if (!isOnline) {
      toast({ variant: "destructive", title: "Offline", description: "Internet required to sync." });
      return;
    }
    const idsToPush = Array.from(selectedIds);
    if (idsToPush.length === 0) return;

    try {
      await processSelectedSyncQueue(idsToPush);
      setSelectedIds(new Set());
      await refreshRegistry();
      loadQueue();
    } catch (e) {
      toast({ variant: "destructive", title: "Sync Failed" });
    }
  };

  const handleDiscardSelected = async () => {
    if (selectedIds.size === 0) return;
    for (const id of Array.from(selectedIds)) {
      await storage.dequeue(id);
    }
    setSelectedIds(new Set());
    toast({ title: "Changes Discarded" });
    loadQueue();
  };

  const handleRetry = async (entry: OfflineQueueEntry) => {
    if (!isOnline) {
      toast({ variant: "destructive", title: "Offline", description: "Cannot sync while disconnected." });
      return;
    }
    setIsRetryingId(entry.id);
    try {
      const resetEntry: OfflineQueueEntry = { ...entry, status: 'PENDING', error: undefined };
      await storage.updateQueueEntry(resetEntry);
      await processSelectedSyncQueue([entry.id]);
      await refreshRegistry();
      await loadQueue();
      toast({ title: "Sync Successful" });
    } catch (e) {
      toast({ variant: "destructive", title: "Sync Failed" });
    } finally {
      setIsRetryingId(null);
    }
  };

  const pendingCount = queue.filter(q => q.status === 'PENDING').length;
  const failedCount = queue.filter(q => q.status === 'FAILED').length;

  const SyncItemCard = ({ entry }: { entry: OfflineQueueEntry }) => (
    <Card className={cn(
      "bg-[#050505] border-2 rounded-[1.5rem] overflow-hidden transition-all group",
      selectedIds.has(entry.id) ? "border-primary/40 bg-primary/[0.02]" : "border-white/5"
    )}>
      <div className="flex items-center p-4 gap-6">
        <Checkbox checked={selectedIds.has(entry.id)} onCheckedChange={() => handleToggleSelect(entry.id)} className="h-5 w-5 rounded-full" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h5 className="text-[13px] font-black uppercase text-white truncate leading-none">{(entry.payload as any).description || 'Update record'}</h5>
            <Badge variant="outline" className={cn("h-4 px-1.5 text-[7px] font-black uppercase", entry.status === 'FAILED' ? "text-red-500 border-red-500/20" : "text-primary border-primary/20")}>{entry.status === 'FAILED' ? 'ERROR' : entry.operation}</Badge>
          </div>
          <div className="flex items-center gap-4 mt-2 text-[8px] font-bold text-white/20 uppercase">
            <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {formatDistanceToNow(entry.timestamp, { addSuffix: true })}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => handleRetry(entry)} disabled={isRetryingId === entry.id} className="h-8 w-8 text-primary"><RotateCcw className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => storage.dequeue(entry.id).then(loadQueue)} className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>
    </Card>
  );

  return (
    <div className={cn("space-y-8 h-full flex flex-col", !isEmbedded && "max-w-5xl mx-auto pb-40")}>
      <Card className="bg-[#080808] border-2 border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 border-b border-white/5">
          <div className="flex items-center gap-5">
            <div className={cn("p-4 rounded-2xl", isOnline ? "bg-green-500/10" : "bg-red-500/10")}>
              {isOnline ? <Wifi className="h-8 w-8 text-green-500" /> : <WifiOff className="h-8 w-8 text-red-500" />}
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black uppercase text-white">Pending Changes</h3>
              <p className="text-[10px] font-bold text-white/40 uppercase">{isOnline ? 'Online' : 'Offline'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-black/40 p-2.5 px-6 rounded-2xl border border-white/10">
            <span className="text-[10px] font-black uppercase text-white/60">Connect</span>
            <Switch checked={isOnline} onCheckedChange={setIsOnline} className="data-[state=checked]:bg-green-500" />
          </div>
        </div>

        <CardContent className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex flex-col gap-1"><span className="text-[9px] font-black text-white/20 uppercase">Waiting</span><span className="text-3xl font-black text-white">{pendingCount}</span></div>
              <div className="flex flex-col gap-1"><span className="text-[9px] font-black text-white/20 uppercase">Errors</span><span className="text-3xl font-black text-red-600">{failedCount}</span></div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={manualDownload} disabled={isSyncing || !isOnline} className="h-12 px-6 rounded-xl text-[10px] font-black uppercase"><Download className="h-4 w-4 mr-2" /> Download</Button>
              <Button onClick={() => setIsFullViewOpen(true)} className="h-12 px-6 rounded-xl bg-primary text-black font-black uppercase text-[10px]">Review Changes</Button>
            </div>
          </div>
          <div className="space-y-2">
            {recentQueue.map(entry => <SyncItemCard key={entry.id} entry={entry} />)}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isFullViewOpen} onOpenChange={setIsFullViewOpen}>
        <DialogContent className="max-w-[1000px] w-[95vw] h-[85vh] p-0 overflow-hidden bg-black text-white rounded-[2.5rem]">
          <div className="flex flex-col h-full">
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Activity className="h-8 w-8 text-primary" />
                <DialogTitle className="text-3xl font-black uppercase">Change List</DialogTitle>
              </div>
              <button onClick={() => setIsFullViewOpen(false)} className="h-12 w-12 flex items-center justify-center bg-white/5 rounded-2xl"><X className="h-6 w-6" /></button>
            </div>

            <div className="px-8 py-4 bg-primary/5 border-b border-primary/10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Checkbox id="pop-select-all" checked={selectedIds.size === queue.length && queue.length > 0} onCheckedChange={(c) => handleSelectAll(!!c)} />
                <label htmlFor="pop-select-all" className="text-[11px] font-black uppercase text-primary/80">Select All</label>
              </div>
              {selectedIds.size > 0 && (
                <div className="flex gap-3">
                  <Button variant="ghost" onClick={handleDiscardSelected} className="h-10 text-[10px] font-black uppercase text-red-500">Discard</Button>
                  <Button onClick={handlePushSelected} className="h-10 text-[10px] font-black uppercase bg-primary text-black">Upload Changes</Button>
                </div>
              )}
            </div>

            <ScrollArea className="flex-1 p-8">
              <div className="space-y-4 pb-20">
                {queue.map(entry => <SyncItemCard key={entry.id} entry={entry} />)}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

/**
 * @fileOverview SyncQueueWorkstation - Grouped Multi-Select Sync Hub.
 * Phase 450: Implemented Asset Grouping and Selective Category Pushing.
 * Phase 451: Fixed JSX mapping syntax error.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Database, 
  Cloud, 
  Clock, 
  Tag,
  Trash2,
  RotateCcw,
  Activity,
  Zap,
  Box,
  ArrowRight,
  Upload,
  Download,
  Check,
  X,
  Layers,
  ShieldCheck,
  Monitor,
  ToggleRight,
  Wifi,
  WifiOff,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppState } from '@/contexts/app-state-context';
import { Badge } from '@/components/ui/badge';
import { storage } from '@/offline/storage';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import type { OfflineQueueEntry } from '@/types/domain';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { processSelectedSyncQueue } from '@/offline/sync';

export function SyncQueueWorkstation({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const { isSyncing, refreshRegistry, manualDownload, isOnline, setIsOnline } = useAppState();
  const { toast } = useToast();
  const [queue, setQueue] = useState<OfflineQueueEntry[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadQueue = async () => { 
    const items = await storage.getQueue(); 
    setQueue(items); 
  };

  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 3000); 
    return () => clearInterval(interval);
  }, []);

  // --- Grouping Logic: Categorize pulses by Asset Group ---
  const groupedQueue = useMemo(() => {
    return queue.reduce((acc, item) => {
      const category = (item.payload as any).category || 'System Updates';
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    }, {} as Record<string, OfflineQueueEntry[]>);
  }, [queue]);

  const sortedCategories = useMemo(() => Object.keys(groupedQueue).sort(), [groupedQueue]);

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectGroup = (category: string, checked: boolean) => {
    const next = new Set(selectedIds);
    const categoryItems = groupedQueue[category] || [];
    categoryItems.forEach(item => {
      if (checked) next.add(item.id);
      else next.delete(item.id);
    });
    setSelectedIds(next);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(queue.map(q => q.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleDiscardSelected = async () => {
    if (selectedIds.size === 0) return;
    for (const id of Array.from(selectedIds)) {
      await storage.dequeue(id);
    }
    setSelectedIds(new Set());
    toast({ title: "Local Changes Purged" });
    loadQueue();
  };

  const handlePushSelected = async () => {
    if (!isOnline) {
      toast({ variant: "destructive", title: "Connection Latent", description: "Internet required for cloud broadcast." });
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
      toast({ variant: "destructive", title: "Sync Interrupted" });
    }
  };

  const handleRetry = async (entry: OfflineQueueEntry) => {
    await storage.updateQueueEntry({ ...entry, status: 'PENDING', error: undefined });
    toast({ title: "Retry Initialized" });
    loadQueue();
  };

  const pendingCount = queue.filter(q => q.status === 'PENDING').length;
  const failedCount = queue.filter(q => q.status === 'FAILED').length;
  const allSelected = queue.length > 0 && selectedIds.size === queue.length;

  return (
    <div className={cn("space-y-8", !isEmbedded && "max-w-5xl mx-auto pb-32 animate-in fade-in duration-700")}>
      
      {/* 1. Decision Terminal (Online/Offline) */}
      <Card className="bg-[#080808] border-2 border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="p-8 flex flex-col md:flex-row items-center justify-between gap-8 border-b border-white/5 bg-white/[0.01]">
          <div className="flex items-center gap-5">
            <div className={cn("p-4 rounded-2xl shadow-inner", isOnline ? "bg-green-500/10" : "bg-red-500/10")}>
              {isOnline ? <Wifi className="h-8 w-8 text-green-500" /> : <WifiOff className="h-8 w-8 text-red-500" />}
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black uppercase text-white tracking-tight leading-none">Cloud Pulse Decision</h3>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                {isOnline ? 'Active Connection Heartbeat' : 'Offline Persistence Mode'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-black/40 p-2.5 px-6 rounded-2xl border border-white/10 shadow-inner">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Global Broadcast</span>
            <Switch checked={isOnline} onCheckedChange={setIsOnline} className="data-[state=checked]:bg-green-500" />
          </div>
        </div>

        <CardContent className="p-8 flex flex-col sm:flex-row items-center justify-between gap-10">
          <div className="flex items-center gap-12">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">Queue Depth</span>
              <span className="text-4xl font-black tabular-nums text-white">{pendingCount}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">Interruptions</span>
              <span className="text-4xl font-black tabular-nums text-red-600">{failedCount}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button variant="outline" onClick={manualDownload} disabled={isSyncing || !isOnline} className="flex-1 sm:flex-none h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2 hover:bg-white/5 transition-all text-white/60">
              <Download className="h-4 w-4 mr-2" /> Fetch Updates
            </Button>
            <Button onClick={() => handlePushSelected()} disabled={isSyncing || !isOnline || selectedIds.size === 0} className="flex-1 sm:flex-none h-14 px-10 rounded-2xl bg-primary text-black font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-primary/20 transition-transform active:scale-95">
              {isSyncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />} 
              Push {selectedIds.size > 0 ? selectedIds.size : 'Selection'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. Global Select All Terminal */}
      <AnimatePresence>
        {queue.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-2 space-y-4">
            <div className="flex items-center gap-4 px-8 py-4 bg-white/5 rounded-2xl border border-white/10 group transition-all hover:border-primary/20 shadow-xl">
              <Checkbox 
                id="sync-select-all" 
                checked={allSelected} 
                onCheckedChange={handleSelectAll}
                className="h-6 w-6 rounded-lg border-2 data-[state=checked]:bg-primary"
              />
              <label htmlFor="sync-select-all" className="text-[11px] font-black uppercase tracking-[0.3em] text-white/60 cursor-pointer group-hover:text-primary transition-colors flex-1">
                Select All Pending Modifications ({queue.length})
              </label>
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-2">
                  <Button variant="ghost" size="sm" onClick={handleDiscardSelected} className="h-9 px-4 rounded-xl text-[9px] font-black uppercase text-destructive/60 hover:text-destructive hover:bg-destructive/10">Discard Selection</Button>
                  <div className="w-px h-4 bg-white/10" />
                  <Badge className="bg-primary text-black font-black text-[10px] h-7 px-4 rounded-xl shadow-lg">{selectedIds.size} SELECTED</Badge>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Grouped Category Batches */}
      <div className="space-y-12 px-2 pb-32">
        {sortedCategories.length > 0 ? (
          sortedCategories.map((category) => {
            const items = groupedQueue[category];
            const categorySelectedCount = items.filter(item => selectedIds.has(item.id)).length;
            const isCategoryAllSelected = categorySelectedCount === items.length;
            const isCategoryPartial = categorySelectedCount > 0 && !isCategoryAllSelected;

            return (
              <div key={category} className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex items-center justify-between px-4">
                  <div className="flex items-center gap-5">
                    <div className="flex items-center gap-3">
                      <Checkbox 
                        checked={isCategoryAllSelected}
                        onCheckedChange={(c) => handleSelectGroup(category, !!c)}
                        className={cn(
                          "h-5 w-5 rounded-lg border-2",
                          isCategoryPartial && "bg-primary/20 border-primary/40"
                        )}
                      />
                      <div className="p-2 bg-white/5 rounded-xl"><Layers className="h-4 w-4 text-white/40" /></div>
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-black uppercase tracking-widest text-white">{category}</h4>
                      <p className="text-[9px] font-bold text-white/20 uppercase tracking-tighter">{items.length} PENDING PULSES</p>
                    </div>
                  </div>
                  {categorySelectedCount > 0 && (
                    <Badge variant="outline" className="h-6 px-3 border-primary/20 text-primary bg-primary/5 font-black text-[9px]">
                      {categorySelectedCount} SELECTED IN GROUP
                    </Badge>
                  )}
                </div>

                <div className="space-y-3">
                  {items.map((entry) => (
                    <Card key={entry.id} className={cn(
                      "bg-[#050505] border-2 rounded-[1.5rem] overflow-hidden transition-all group",
                      selectedIds.has(entry.id) ? "border-primary/40 bg-primary/[0.02] shadow-xl" : "border-white/5 hover:border-white/10"
                    )}>
                      <div className="flex items-center p-5 gap-6">
                        <Checkbox 
                          checked={selectedIds.has(entry.id)} 
                          onCheckedChange={() => handleToggleSelect(entry.id)}
                          className="h-6 w-6 rounded-full border-2 border-white/10 data-[state=checked]:bg-primary"
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <h5 className="text-sm font-black uppercase tracking-tight text-white truncate leading-none">
                              {(entry.payload as any).description || 'System Update Pulse'}
                            </h5>
                            <Badge variant="outline" className={cn(
                              "h-5 px-2 text-[8px] font-black uppercase tracking-widest",
                              entry.operation === 'CREATE' ? "text-green-500 border-green-500/20 bg-green-500/5" : "text-primary border-primary/20 bg-primary/5"
                            )}>{entry.operation}</Badge>
                          </div>
                          <div className="flex items-center gap-5 mt-2.5 text-[9px] font-bold text-white/20 uppercase tracking-[0.2em]">
                            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {formatDistanceToNow(entry.timestamp, { addSuffix: true })}</span>
                            <div className="h-1 w-1 rounded-full bg-white/10" />
                            <span className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> ROW: {(entry.payload as any).sn || 'MANUAL'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 opacity-20 group-hover:opacity-100 transition-opacity">
                          {entry.status === 'FAILED' && (
                            <Button variant="ghost" size="icon" onClick={() => handleRetry(entry)} className="h-10 w-10 rounded-xl bg-white/5 hover:bg-primary/10 text-primary transition-all shadow-sm">
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => storage.dequeue(entry.id).then(loadQueue)} className="h-10 w-10 rounded-xl bg-white/5 text-destructive/40 hover:text-destructive hover:bg-destructive/10 transition-all shadow-sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-32 text-center opacity-20 border-4 border-dashed border-white/5 rounded-[4rem] flex flex-col items-center gap-10 bg-white/[0.01] shadow-inner">
            <div className="relative">
              <div className="p-16 bg-white/5 rounded-[3rem] shadow-inner">
                <Database className="h-32 w-28 text-white" />
              </div>
              <div className="absolute -bottom-4 -right-4 p-6 bg-primary rounded-[2rem] shadow-2xl animate-pulse">
                <ShieldCheck className="h-12 w-12 text-black" />
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-3xl font-black uppercase tracking-[0.3em] text-white">Registry Synchronized</h3>
              <p className="text-sm font-medium italic text-white/60 max-w-sm mx-auto">
                No pending local modifications detected. Your local encrypted storage is in absolute parity with the cloud authority.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

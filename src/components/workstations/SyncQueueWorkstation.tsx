'use client';

/**
 * @fileOverview SyncQueueWorkstation - Grouped Multi-Select Sync.
 * Phase 400: Implemented Asset Grouping, Multi-Select Pushing, and mode switch.
 * Phase 410: Integrated "Select All" master control pulse.
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
  WifiOff
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
import { processSyncQueue } from '@/offline/sync';

export function SyncQueueWorkstation({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const { isSyncing, refreshRegistry, manualUpload, manualDownload, isOnline, setIsOnline } = useAppState();
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

  // --- Grouping Logic ---
  const groupedQueue = useMemo(() => {
    return queue.reduce((acc, item) => {
      const category = (item.payload as any).category || 'System Updates';
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    }, {} as Record<string, OfflineQueueEntry[]>);
  }, [queue]);

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
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
      toast({ variant: "destructive", title: "Offline Pulse", description: "Internet connection required for cloud broadcast." });
      return;
    }
    await manualUpload();
    setSelectedIds(new Set());
  };

  const handleRetry = async (entry: OfflineQueueEntry) => {
    await storage.updateQueueEntry({ ...entry, status: 'PENDING', error: undefined });
    toast({ title: "Retry Initiated" });
    loadQueue();
  };

  const pendingCount = queue.filter(q => q.status === 'PENDING').length;
  const failedCount = queue.filter(q => q.status === 'FAILED').length;
  const allSelected = queue.length > 0 && selectedIds.size === queue.length;

  return (
    <div className={cn("space-y-8", !isEmbedded && "max-w-5xl mx-auto pb-32 animate-in fade-in duration-700")}>
      
      {/* Control Header */}
      <Card className="bg-[#080808] border-2 border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
        <div className="p-8 flex flex-col md:flex-row items-center justify-between gap-8 border-b border-white/5">
          <div className="flex items-center gap-5">
            <div className={cn("p-4 rounded-2xl shadow-inner", isOnline ? "bg-green-500/10" : "bg-red-500/10")}>
              {isOnline ? <Wifi className="h-8 w-8 text-green-500" /> : <WifiOff className="h-8 w-8 text-red-500" />}
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black uppercase text-white tracking-tight leading-none">Cloud Heartbeat</h3>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                {isOnline ? 'Active Connection Pulse' : 'Isolated Persistence Mode'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-black/40 p-2 px-6 rounded-2xl border border-white/10">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Broadcast Enabled</span>
            <Switch checked={isOnline} onCheckedChange={setIsOnline} className="data-[state=checked]:bg-green-500" />
          </div>
        </div>

        <CardContent className="p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-10">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">Queue Depth</span>
              <span className="text-3xl font-black tabular-nums">{pendingCount}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">Interruptions</span>
              <span className="text-3xl font-black text-red-600 tabular-nums">{failedCount}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button variant="outline" onClick={manualDownload} disabled={isSyncing || !isOnline} className="flex-1 sm:flex-none h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2 hover:bg-white/5">
              <Download className="h-4 w-4 mr-2" /> Fetch State
            </Button>
            <Button onClick={manualUpload} disabled={isSyncing || !isOnline || queue.length === 0} className="flex-1 sm:flex-none h-14 px-8 rounded-2xl bg-primary text-black font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-primary/20">
              {isSyncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />} Broadcast All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Multi-Select Action Bar */}
      <AnimatePresence>
        {queue.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-2 space-y-4">
            <div className="flex items-center gap-3 px-6 py-3 bg-white/5 rounded-2xl border border-white/10 group transition-all hover:border-primary/20">
              <Checkbox 
                id="sync-select-all" 
                checked={allSelected} 
                onCheckedChange={handleSelectAll}
                className="h-5 w-5 rounded-lg border-2 data-[state=checked]:bg-primary"
              />
              <label htmlFor="sync-select-all" className="text-[10px] font-black uppercase tracking-[0.25em] text-white/60 cursor-pointer group-hover:text-primary transition-colors">
                Select All Pending Pulses ({queue.length})
              </label>
            </div>

            {selectedIds.size > 0 && (
              <div className="bg-primary/5 border-2 border-primary/20 rounded-2xl p-2 flex items-center justify-between shadow-xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-4 ml-4">
                  <Badge className="bg-primary text-black font-black text-[10px] h-7 px-4 rounded-xl">{selectedIds.size} SELECTED</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={handleDiscardSelected} className="h-10 px-4 rounded-xl font-black text-[9px] uppercase text-destructive/60 hover:text-destructive hover:bg-destructive/10">Discard Selection</Button>
                  <Button onClick={handlePushSelected} className="h-10 px-6 rounded-xl font-black text-[9px] uppercase bg-primary text-black shadow-lg">Push Pulse</Button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grouped Queue List */}
      <div className="space-y-10 px-2 pb-20">
        {Object.keys(groupedQueue).length > 0 ? (
          Object.entries(groupedQueue).map(([category, items]) => (
            <div key={category} className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-white/5 rounded-lg"><Layers className="h-3.5 w-3.5 text-white/40" /></div>
                  <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-white/60">{category}</h4>
                </div>
                <Badge variant="outline" className="h-5 px-2 border-white/5 text-white/20 font-black text-[8px] uppercase">{items.length} PENDING</Badge>
              </div>

              <div className="space-y-3">
                {items.map((entry) => (
                  <Card key={entry.id} className={cn(
                    "bg-[#050505] border-2 rounded-3xl overflow-hidden transition-all group",
                    selectedIds.has(entry.id) ? "border-primary/40 bg-primary/[0.02]" : "border-white/5"
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
                            {(entry.payload as any).description || 'Registry Modification'}
                          </h5>
                          <Badge variant="outline" className={cn(
                            "h-5 px-2 text-[8px] font-black uppercase",
                            entry.operation === 'CREATE' ? "text-green-500 border-green-500/20 bg-green-500/5" : "text-primary border-primary/20 bg-primary/5"
                          )}>{entry.operation}</Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-[9px] font-bold text-white/20 uppercase tracking-widest">
                          <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {formatDistanceToNow(entry.timestamp, { addSuffix: true })}</span>
                          <span className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> ROW: {(entry.payload as any).sn || 'MAN'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {entry.status === 'FAILED' && (
                          <Button variant="ghost" size="icon" onClick={() => handleRetry(entry)} className="h-10 w-10 rounded-xl bg-white/5 hover:bg-primary/10 text-primary">
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => storage.dequeue(entry.id).then(loadQueue)} className="h-10 w-10 rounded-xl bg-white/5 text-destructive/40 hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="py-24 text-center opacity-20 border-4 border-dashed border-white/5 rounded-[4rem] flex flex-col items-center gap-8 bg-white/[0.01]">
            <div className="p-10 bg-white/5 rounded-full shadow-inner"><ShieldCheck className="h-20 w-20 text-white" /></div>
            <div className="space-y-2">
              <h3 className="text-3xl font-black uppercase tracking-[0.3em]">Storage Parity Stable</h3>
              <p className="text-sm font-medium italic">No pending local modifications detected in the current pulse.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

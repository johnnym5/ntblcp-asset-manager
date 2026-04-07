'use client';

/**
 * @fileOverview Pending Sync - Waiting Cloud Updates.
 * Phase 1013: Implemented Dashboard-level Select All and Accordion Grouping.
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
  Loader2,
  ChevronRight,
  Info,
  ArrowDownCircle,
  ArrowUpCircle
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function SyncQueueWorkstation({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const { isSyncing, refreshRegistry, manualDownload, isOnline, setIsOnline, appSettings } = useAppState();
  const { toast } = useToast();
  
  const [queue, setQueue] = useState<OfflineQueueEntry[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isFullViewOpen, setIsFullViewOpen] = useState(false);
  const [isRetryingId, setIsRetryingId] = useState<string | null>(null);

  const isAdvanced = appSettings?.uxMode === 'advanced';

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
    if (checked) {
      setSelectedIds(new Set(queue.map(q => q.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handlePushSelected = async () => {
    if (!isOnline) {
      toast({ variant: "destructive", title: "No Connection", description: "Internet required to sync changes." });
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
      toast({ variant: "destructive", title: "Offline", description: "Cannot retry while disconnected." });
      return;
    }
    
    setIsRetryingId(entry.id);
    try {
      const resetEntry: OfflineQueueEntry = { ...entry, status: 'PENDING', error: undefined };
      await storage.updateQueueEntry(resetEntry);
      await processSelectedSyncQueue([entry.id]);
      await refreshRegistry();
      await loadQueue();
      toast({ title: "Retry Pulse Applied" });
    } catch (e) {
      toast({ variant: "destructive", title: "Retry Failed" });
    } finally {
      setIsRetryingId(null);
    }
  };

  const pendingCount = queue.filter(q => q.status === 'PENDING').length;
  const failedCount = queue.filter(q => q.status === 'FAILED').length;

  const SyncItemCard = ({ entry }: { entry: OfflineQueueEntry }) => (
    <Card className={cn(
      "bg-[#050505] border-2 rounded-[1.5rem] overflow-hidden transition-all group",
      selectedIds.has(entry.id) ? "border-primary/40 bg-primary/[0.02] shadow-xl" : "border-white/5 hover:border-white/10"
    )}>
      <div className="flex items-center p-4 gap-6">
        <Checkbox 
          checked={selectedIds.has(entry.id)} 
          onCheckedChange={() => handleToggleSelect(entry.id)}
          className="h-5 w-5 rounded-full border-2 border-white/10 data-[state=checked]:bg-primary"
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h5 className="text-[13px] font-black uppercase tracking-tight text-white truncate leading-none">
              {(entry.payload as any).description || 'Record update'}
            </h5>
            <Badge variant="outline" className={cn(
              "h-4 px-1.5 text-[7px] font-black uppercase tracking-[0.2em] rounded-md",
              entry.status === 'FAILED' ? "text-red-500 border-red-500/20 bg-red-500/5" :
              entry.operation === 'CREATE' ? "text-green-500 border-green-500/20 bg-green-500/5" : "text-primary border-primary/20"
            )}>{entry.status === 'FAILED' ? 'FAILED' : entry.operation}</Badge>
          </div>
          <div className="flex items-center gap-4 mt-2 text-[8px] font-bold text-white/20 uppercase">
            <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {formatDistanceToNow(entry.timestamp, { addSuffix: true })}</span>
            {entry.error && <span className="text-red-500 italic truncate max-w-[200px]">{entry.error}</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {(entry.status === 'FAILED' || entry.status === 'PENDING') && (
            <Button variant="ghost" size="icon" onClick={() => handleRetry(entry)} disabled={isRetryingId === entry.id} className="h-8 w-8 rounded-lg bg-white/5 hover:bg-primary/10 text-primary">
              {isRetryingId === entry.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => storage.dequeue(entry.id).then(loadQueue)} className="h-8 w-8 rounded-lg bg-white/5 text-destructive/40 hover:text-destructive hover:bg-destructive/10">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );

  return (
    <div className={cn("space-y-8 h-full flex flex-col", !isEmbedded && "max-w-5xl mx-auto pb-40 animate-in fade-in duration-700")}>
      
      {/* Dashboard View */}
      <Card className="bg-[#080808] border-2 border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl shrink-0">
        <div className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 border-b border-white/5 bg-white/[0.01]">
          <div className="flex items-center gap-5">
            <div className={cn("p-4 rounded-2xl shadow-inner", isOnline ? "bg-green-500/10" : "bg-red-500/10")}>
              {isOnline ? <Wifi className="h-8 w-8 text-green-500" /> : <WifiOff className="h-8 w-8 text-red-500" />}
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black uppercase text-white tracking-tight leading-none">{isAdvanced ? 'Pending Sync' : 'Waiting Changes'}</h3>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                {isOnline ? 'Online Pulse Active' : 'Offline Regional Scope'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-black/40 p-2.5 px-6 rounded-2xl border border-white/10 shadow-inner">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Connect</span>
            <Switch checked={isOnline} onCheckedChange={setIsOnline} className="data-[state=checked]:bg-green-500" />
          </div>
        </div>

        <CardContent className="p-0">
          <div className="p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-6">
                {/* Dashboard Select All Pulse */}
                <div className="flex items-center gap-3 pr-6 border-r border-white/10">
                  <Checkbox 
                    id="dash-select-all" 
                    checked={selectedIds.size === queue.length && queue.length > 0} 
                    onCheckedChange={(c) => handleSelectAll(!!c)}
                    className="h-5 w-5 rounded-lg border-2 border-white/20 data-[state=checked]:bg-primary"
                  />
                  <label htmlFor="dash-select-all" className="text-[9px] font-black uppercase tracking-widest text-white/40 cursor-pointer">All</label>
                </div>

                <div className="flex items-center gap-8">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">{isAdvanced ? 'Pending' : 'Waiting'}</span>
                    <span className="text-3xl font-black tabular-nums text-white">{pendingCount}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">{isAdvanced ? 'Failures' : 'Errors'}</span>
                    <span className="text-3xl font-black tabular-nums text-red-600">{failedCount}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={manualDownload} disabled={isSyncing || !isOnline} className="h-12 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest border-2 hover:bg-white/5 text-white/60">
                  <Download className="h-4 w-4 mr-2" /> Sync Down
                </Button>
                
                {selectedIds.size > 0 && (
                  <Button onClick={handlePushSelected} disabled={isSyncing || !isOnline} className="h-12 px-8 rounded-xl bg-primary text-black font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 transition-all hover:scale-105">
                    {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} 
                    Sync {selectedIds.size}
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto no-scrollbar">
              {recentQueue.length > 0 ? (
                recentQueue.map(entry => <SyncItemCard key={entry.id} entry={entry} />)
              ) : (
                <div className="py-12 text-center opacity-20 flex flex-col items-center gap-4">
                  <ShieldCheck className="h-12 w-12 text-white" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Everything is synced</p>
                </div>
              )}
            </div>
          </div>

          {queue.length > 0 && (
            <div className="p-4 border-t border-white/5 bg-white/[0.01] flex justify-end">
              <Button 
                variant="ghost" 
                onClick={() => setIsFullViewOpen(true)}
                className="h-10 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 text-primary hover:bg-primary/10 transition-all"
              >
                Review all {queue.length} <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full Audit Dialog */}
      <Dialog open={isFullViewOpen} onOpenChange={setIsFullViewOpen}>
        <DialogContent className="max-w-[1000px] w-[95vw] h-[85vh] p-0 overflow-hidden bg-black border-white/10 rounded-[2.5rem] shadow-3xl text-white">
          <div className="flex flex-col h-full">
            <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <Activity className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-1">
                  <DialogTitle className="text-3xl font-black uppercase tracking-tight leading-none">Pending Sync Log</DialogTitle>
                  <DialogDescription className="text-[10px] font-bold uppercase text-white/40 tracking-[0.3em]">
                    Review the chronological order of local changes.
                  </DialogDescription>
                </div>
              </div>
              <button onClick={() => setIsFullViewOpen(false)} className="h-12 w-12 flex items-center justify-center bg-white/5 rounded-2xl text-white/40 hover:text-white transition-all"><X className="h-6 w-6" /></button>
            </div>

            <div className="px-8 py-4 bg-primary/5 border-b border-primary/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <Checkbox 
                  id="pop-select-all" 
                  checked={selectedIds.size === queue.length && queue.length > 0} 
                  onCheckedChange={(c) => handleSelectAll(!!c)}
                  className="h-6 w-6 rounded-lg border-2 border-primary/40 data-[state=checked]:bg-primary"
                />
                <label htmlFor="pop-select-all" className="text-[11px] font-black uppercase tracking-widest text-primary/80 cursor-pointer">
                  {selectedIds.size > 0 ? `${selectedIds.size} Changes Staged` : 'Select all pending changes'}
                </label>
              </div>
              
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-3">
                  <Button variant="ghost" onClick={handleDiscardSelected} className="h-10 px-4 rounded-xl text-[10px] font-black uppercase text-red-500 hover:bg-red-500/10">Discard Selection</Button>
                  <Button onClick={handlePushSelected} disabled={!isOnline} className="h-12 px-8 rounded-xl bg-primary text-black font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 gap-3">
                    Broadast Changes
                  </Button>
                </div>
              )}
            </div>

            <ScrollArea className="flex-1 bg-black">
              <div className="p-8 space-y-6 pb-20">
                <Accordion type="multiple" defaultValue={["outgoing"]} className="space-y-4">
                  
                  {/* INCOMING PULSE */}
                  <AccordionItem value="incoming" className="border-2 border-white/5 rounded-[2rem] bg-white/[0.01] overflow-hidden px-6">
                    <AccordionTrigger className="hover:no-underline py-6">
                      <div className="flex items-center justify-between w-full pr-6">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-500"><ArrowDownCircle className="h-5 w-5" /></div>
                          <h4 className="text-sm font-black uppercase text-white leading-none">Incoming Pulses (From Cloud)</h4>
                        </div>
                        <Badge variant="outline" className="text-[8px] font-black uppercase opacity-40">Scanning Required</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-8 text-center py-12 opacity-40">
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-4">Click "Sync Down" to identify incoming cloud state changes.</p>
                      <Button variant="outline" onClick={manualDownload} size="sm" className="h-10 px-6 rounded-xl border-white/10 font-black uppercase text-[9px] tracking-widest">
                        Initialize Cloud Scan
                      </Button>
                    </AccordionContent>
                  </AccordionItem>

                  {/* OUTGOING PULSES (Local mods) */}
                  <AccordionItem value="outgoing" className="border-2 border-white/5 rounded-[2rem] bg-white/[0.01] overflow-hidden px-6">
                    <AccordionTrigger className="hover:no-underline py-6">
                      <div className="flex items-center justify-between w-full pr-6">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-primary/10 rounded-xl text-primary"><ArrowUpCircle className="h-5 w-5" /></div>
                          <h4 className="text-sm font-black uppercase text-white leading-none">Outgoing Pulses ({queue.length})</h4>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-8 space-y-6">
                      <Accordion type="multiple" defaultValue={["create", "update", "delete"]} className="space-y-3">
                        {opGroups.CREATE.length > 0 && (
                          <AccordionItem value="create" className="border-none">
                            <AccordionTrigger className="hover:no-underline py-2 opacity-60 hover:opacity-100 transition-opacity">
                              <span className="text-[10px] font-black uppercase tracking-widest">New Records ({opGroups.CREATE.length})</span>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 space-y-2">
                              {opGroups.CREATE.map(entry => <SyncItemCard key={entry.id} entry={entry} />)}
                            </AccordionContent>
                          </AccordionItem>
                        )}
                        {opGroups.UPDATE.length > 0 && (
                          <AccordionItem value="update" className="border-none">
                            <AccordionTrigger className="hover:no-underline py-2 opacity-60 hover:opacity-100 transition-opacity">
                              <span className="text-[10px] font-black uppercase tracking-widest">Record Edits ({opGroups.UPDATE.length})</span>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 space-y-2">
                              {opGroups.UPDATE.map(entry => <SyncItemCard key={entry.id} entry={entry} />)}
                            </AccordionContent>
                          </AccordionItem>
                        )}
                        {opGroups.DELETE.length > 0 && (
                          <AccordionItem value="delete" className="border-none">
                            <AccordionTrigger className="hover:no-underline py-2 opacity-60 hover:opacity-100 transition-opacity">
                              <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Deletions ({opGroups.DELETE.length})</span>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 space-y-2">
                              {opGroups.DELETE.map(entry => <SyncItemCard key={entry.id} entry={entry} />)}
                            </AccordionContent>
                          </AccordionItem>
                        )}
                      </Accordion>
                    </AccordionContent>
                  </AccordionItem>

                </Accordion>
              </div>
            </ScrollArea>

            <div className="p-8 bg-white/[0.02] border-t border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4 text-[10px] font-bold text-white/40 uppercase italic max-w-sm">
                <Info className="h-4 w-4 text-primary shrink-0" />
                <p>Changes are broadcast sequentially to maintain the audit trail's structural integrity.</p>
              </div>
              <Button variant="ghost" onClick={() => setIsFullViewOpen(false)} className="h-14 px-12 rounded-2xl font-black uppercase text-[11px] tracking-[0.25em] bg-white/5 hover:bg-white/10 text-white">
                Dismiss Panel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

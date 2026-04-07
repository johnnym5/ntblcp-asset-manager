'use client';

/**
 * @fileOverview SyncQueueWorkstation - Grouped Multi-Select Sync Hub.
 * Phase 500: Implemented compact Dashboard list (last 10) and full-audit pop-up.
 * Grouped by Operation Type (Created, Updated, Deleted) in the pop-up.
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
  ExternalLink,
  ChevronRight,
  PlusCircle,
  FileEdit,
  Eraser
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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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

  const loadQueue = async () => { 
    const items = await storage.getQueue(); 
    setQueue(items); 
  };

  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 3000); 
    return () => clearInterval(interval);
  }, []);

  // Last 10 items for the Dashboard view
  const recentQueue = useMemo(() => {
    return [...queue].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
  }, [queue]);

  // Grouping by operation for the pop-up
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

  const handleSelectGroup = (items: OfflineQueueEntry[], checked: boolean) => {
    const next = new Set(selectedIds);
    items.forEach(item => {
      if (checked) next.add(item.id);
      else next.delete(item.id);
    });
    setSelectedIds(next);
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

  const handleDiscardSelected = async () => {
    if (selectedIds.size === 0) return;
    for (const id of Array.from(selectedIds)) {
      await storage.dequeue(id);
    }
    setSelectedIds(new Set());
    toast({ title: "Selected Pulses Purged" });
    loadQueue();
  };

  const handleRetry = async (entry: OfflineQueueEntry) => {
    await storage.updateQueueEntry({ ...entry, status: 'PENDING', error: undefined });
    toast({ title: "Retry Initialized" });
    loadQueue();
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
              {(entry.payload as any).description || 'System Update Pulse'}
            </h5>
            <Badge variant="outline" className={cn(
              "h-4 px-1.5 text-[7px] font-black uppercase tracking-[0.2em] rounded-md",
              entry.operation === 'CREATE' ? "text-green-500 border-green-500/20" : "text-primary border-primary/20"
            )}>{entry.operation}</Badge>
          </div>
          <div className="flex items-center gap-4 mt-2 text-[8px] font-bold text-white/20 uppercase">
            <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {formatDistanceToNow(entry.timestamp, { addSuffix: true })}</span>
            <span className="flex items-center gap-1.5"><Tag className="h-3 w-3" /> ROW: {(entry.payload as any).importMetadata?.rowNumber || 'MAN'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {entry.status === 'FAILED' && (
            <Button variant="ghost" size="icon" onClick={() => handleRetry(entry)} className="h-8 w-8 rounded-lg bg-white/5 hover:bg-primary/10 text-primary">
              <RotateCcw className="h-4 w-4" />
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
      
      {/* 1. Dashboard Mode: Decision Terminal & Last 10 */}
      <Card className="bg-[#080808] border-2 border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl shrink-0">
        <div className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 border-b border-white/5 bg-white/[0.01]">
          <div className="flex items-center gap-5">
            <div className={cn("p-4 rounded-2xl shadow-inner", isOnline ? "bg-green-500/10" : "bg-red-500/10")}>
              {isOnline ? <Wifi className="h-8 w-8 text-green-500" /> : <WifiOff className="h-8 w-8 text-red-500" />}
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black uppercase text-white tracking-tight leading-none">Sync Decision</h3>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                {isOnline ? 'Active Connection' : 'Persistence Mode'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-black/40 p-2.5 px-6 rounded-2xl border border-white/10 shadow-inner">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Broadcast</span>
            <Switch checked={isOnline} onCheckedChange={setIsOnline} className="data-[state=checked]:bg-green-500" />
          </div>
        </div>

        <CardContent className="p-0">
          <div className="p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-8">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">Pending</span>
                  <span className="text-3xl font-black tabular-nums text-white">{pendingCount}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">Errors</span>
                  <span className="text-3xl font-black tabular-nums text-red-600">{failedCount}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={manualDownload} disabled={isSyncing || !isOnline} className="h-12 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest border-2 hover:bg-white/5 text-white/60">
                  <Download className="h-4 w-4 mr-2" /> Fetch
                </Button>
                {selectedIds.size > 0 && (
                  <Button onClick={handlePushSelected} disabled={isSyncing || !isOnline} className="h-12 px-8 rounded-xl bg-primary text-black font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 transition-all hover:scale-105">
                    {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} 
                    Push {selectedIds.size}
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
                  <p className="text-[10px] font-black uppercase tracking-widest">Registry at Parity</p>
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
                View Full Audit Queue <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Full Audit Pop-up: Grouped by Operation */}
      <Dialog open={isFullViewOpen} onOpenChange={setIsFullViewOpen}>
        <DialogContent className="max-w-[1000px] w-[95vw] h-[85vh] p-0 overflow-hidden bg-black border-white/10 rounded-[2.5rem] shadow-3xl text-white">
          <div className="flex flex-col h-full">
            <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <Activity className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-1">
                  <DialogTitle className="text-3xl font-black uppercase tracking-tight leading-none">Full Audit Queue</DialogTitle>
                  <DialogDescription className="text-[10px] font-bold uppercase text-white/40 tracking-[0.3em]">
                    Batch Adjudication & Global Broadcast Station
                  </DialogDescription>
                </div>
              </div>
              <button onClick={() => setIsFullViewOpen(false)} className="h-12 w-12 flex items-center justify-center bg-white/5 rounded-2xl text-white/40 hover:text-white transition-all"><X className="h-6 w-6" /></button>
            </div>

            {/* Selection Pulse Toolbar */}
            <div className="px-8 py-4 bg-primary/5 border-b border-primary/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <Checkbox 
                  id="pop-select-all" 
                  checked={selectedIds.size === queue.length && queue.length > 0} 
                  onCheckedChange={(c) => {
                    if (c) setSelectedIds(new Set(queue.map(q => q.id)));
                    else setSelectedIds(new Set());
                  }}
                  className="h-6 w-6 rounded-lg border-2 border-primary/40 data-[state=checked]:bg-primary"
                />
                <label htmlFor="pop-select-all" className="text-[11px] font-black uppercase tracking-widest text-primary/80 cursor-pointer">
                  {selectedIds.size > 0 ? `${selectedIds.size} Pulses Selected` : 'Select All Modifications'}
                </label>
              </div>
              
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-3 animate-in slide-in-from-right-2">
                  <Button variant="ghost" onClick={handleDiscardSelected} className="h-10 px-4 rounded-xl text-[10px] font-black uppercase text-red-500 hover:bg-red-500/10">Purge Selection</Button>
                  <Button onClick={handlePushSelected} disabled={!isOnline} className="h-12 px-8 rounded-xl bg-primary text-black font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 gap-3">
                    {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    Broadcast Selection
                  </Button>
                </div>
              )}
            </div>

            <ScrollArea className="flex-1 bg-black">
              <div className="p-8 space-y-6 pb-20">
                <Accordion type="multiple" defaultValue={["create", "update", "delete"]} className="space-y-4">
                  
                  {/* CREATE GROUP */}
                  {opGroups.CREATE.length > 0 && (
                    <AccordionItem value="create" className="border-2 border-white/5 rounded-[2rem] bg-white/[0.01] overflow-hidden px-6">
                      <AccordionTrigger className="hover:no-underline py-6">
                        <div className="flex items-center justify-between w-full pr-6">
                          <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-green-500/10 rounded-xl text-green-500"><PlusCircle className="h-5 w-5" /></div>
                            <div className="text-left">
                              <h4 className="text-sm font-black uppercase text-white leading-none">New Asset Pulses</h4>
                              <p className="text-[9px] font-bold text-white/20 uppercase mt-1.5">{opGroups.CREATE.length} Pending Records</p>
                            </div>
                          </div>
                          <Checkbox 
                            checked={opGroups.CREATE.every(i => selectedIds.has(i.id))} 
                            onCheckedChange={(c) => handleSelectGroup(opGroups.CREATE, !!c)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-5 w-5 rounded-lg border-2 border-white/10"
                          />
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-8 space-y-3">
                        {opGroups.CREATE.map(entry => <SyncItemCard key={entry.id} entry={entry} />)}
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* UPDATE GROUP */}
                  {opGroups.UPDATE.length > 0 && (
                    <AccordionItem value="update" className="border-2 border-white/5 rounded-[2rem] bg-white/[0.01] overflow-hidden px-6">
                      <AccordionTrigger className="hover:no-underline py-6">
                        <div className="flex items-center justify-between w-full pr-6">
                          <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-primary/10 rounded-xl text-primary"><FileEdit className="h-5 w-5" /></div>
                            <div className="text-left">
                              <h4 className="text-sm font-black uppercase text-white leading-none">Modification Pulses</h4>
                              <p className="text-[9px] font-bold text-white/20 uppercase mt-1.5">{opGroups.UPDATE.length} Field Edits</p>
                            </div>
                          </div>
                          <Checkbox 
                            checked={opGroups.UPDATE.every(i => selectedIds.has(i.id))} 
                            onCheckedChange={(c) => handleSelectGroup(opGroups.UPDATE, !!c)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-5 w-5 rounded-lg border-2 border-white/10"
                          />
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-8 space-y-3">
                        {opGroups.UPDATE.map(entry => <SyncItemCard key={entry.id} entry={entry} />)}
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* DELETE GROUP */}
                  {opGroups.DELETE.length > 0 && (
                    <AccordionItem value="delete" className="border-2 border-white/5 rounded-[2rem] bg-white/[0.01] overflow-hidden px-6">
                      <AccordionTrigger className="hover:no-underline py-6">
                        <div className="flex items-center justify-between w-full pr-6">
                          <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-red-500/10 rounded-xl text-red-500"><Eraser className="h-5 w-5" /></div>
                            <div className="text-left">
                              <h4 className="text-sm font-black uppercase text-white leading-none">Removal Pulses</h4>
                              <p className="text-[9px] font-bold text-white/20 uppercase mt-1.5">{opGroups.DELETE.length} Deletions</p>
                            </div>
                          </div>
                          <Checkbox 
                            checked={opGroups.DELETE.every(i => selectedIds.has(i.id))} 
                            onCheckedChange={(c) => handleSelectGroup(opGroups.DELETE, !!c)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-5 w-5 rounded-lg border-2 border-white/10"
                          />
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-8 space-y-3">
                        {opGroups.DELETE.map(entry => <SyncItemCard key={entry.id} entry={entry} />)}
                      </AccordionContent>
                    </AccordionItem>
                  )}

                </Accordion>
              </div>
            </ScrollArea>

            <div className="p-8 bg-white/[0.02] border-t border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4 text-[10px] font-bold text-white/40 uppercase italic max-w-sm">
                <Info className="h-4 w-4 text-primary shrink-0" />
                <p>Registry modifications are replayed in chronological order to preserve forensic data integrity.</p>
              </div>
              <Button variant="ghost" onClick={() => setIsFullViewOpen(false)} className="h-14 px-12 rounded-2xl font-black uppercase text-[11px] tracking-[0.25em] bg-white/5 hover:bg-white/10 text-white">
                Dismiss Audit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

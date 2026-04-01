'use client';

/**
 * @fileOverview SyncQueueWorkstation - SPA Pending Operations Module.
 * Phase 74: Manual Sync Orchestration.
 */

import React, { useEffect, useState } from 'react';
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
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppState } from '@/contexts/app-state-context';
import { Badge } from '@/components/ui/badge';
import { storage } from '@/offline/storage';
import type { OfflineQueueEntry } from '@/types/domain';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function SyncQueueWorkstation() {
  const { isSyncing, refreshRegistry, manualUpload, manualDownload, isOnline } = useAppState();
  const { toast } = useToast();
  const [queue, setQueue] = useState<OfflineQueueEntry[]>([]);

  const loadQueue = async () => { const items = await storage.getQueue(); setQueue(items); };

  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 3000); 
    return () => clearInterval(interval);
  }, []);

  const handleRetry = async (entry: OfflineQueueEntry) => {
    await storage.updateQueueEntry({ ...entry, status: 'PENDING', error: undefined });
    toast({ title: "Pulse Reset" });
    loadQueue();
  };

  const handleDiscard = async (id: string) => {
    await storage.dequeue(id);
    toast({ title: "Pulse Discarded" });
    loadQueue();
  };

  const pendingCount = queue.filter(q => q.status === 'PENDING').length;
  const failedCount = queue.filter(q => q.status === 'FAILED').length;

  return (
    <div className="space-y-8 pb-32 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div className="space-y-2">
          <h2 className="text-3xl font-black tracking-tight uppercase flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" /> Sync Workstation
          </h2>
          <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">Manual Write-Ahead Ledger Management</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" disabled={isSyncing || !isOnline} onClick={manualDownload} className="h-12 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2">
            <Download className="h-4 w-4 mr-2" /> Pull Cloud State
          </Button>
          <Button disabled={isSyncing || !isOnline} onClick={manualUpload} className="h-12 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20">
            {isSyncing ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />} Execute Sync Pulse
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-2">
        <Card className="border-2 rounded-[2rem]"><CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-muted-foreground">Queue Depth</CardTitle></CardHeader><CardContent><div className="text-5xl font-black">{pendingCount}</div></CardContent></Card>
        <Card className="border-2 rounded-[2rem] border-destructive/20"><CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-destructive">Logic Conflicts</CardTitle></CardHeader><CardContent><div className="text-5xl font-black text-destructive">{failedCount}</div></CardContent></Card>
        <Card className="border-2 rounded-[2rem] border-green-500/20"><CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-green-600">Sync Awareness</CardTitle></CardHeader><CardContent><div className={cn("text-5xl font-black", isOnline ? "text-green-600" : "text-muted-foreground")}>{isOnline ? 'ON' : 'OFF'}</div></CardContent></Card>
      </div>

      {queue.length > 0 ? (
        <div className="space-y-4 px-2">
          <AnimatePresence mode="popLayout">
            {queue.map((entry) => (
              <motion.div key={entry.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} layout>
                <Card className={cn("border-2 transition-all rounded-[2rem] overflow-hidden bg-card/50", entry.status === 'FAILED' ? "border-destructive/40 bg-destructive/5" : "border-border/40 hover:border-primary/20")}>
                  <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-5">
                      <div className={cn("p-4 rounded-2xl shadow-inner", entry.status === 'FAILED' ? "bg-destructive/10" : "bg-primary/10")}>
                        <Database className={cn("h-6 w-6", entry.status === 'FAILED' ? "text-destructive" : "text-primary")} />
                      </div>
                      <div className="space-y-1.5 min-w-0">
                        <h4 className="font-black text-base uppercase truncate leading-none">{(entry.payload as any).description || 'Mutation Pulse'}</h4>
                        <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase opacity-60">
                          <Badge variant="outline" className="h-5 text-[8px] font-black">{entry.operation}</Badge>
                          <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {formatDistanceToNow(entry.timestamp, { addSuffix: true })}</span>
                        </div>
                        {entry.status === 'FAILED' && <p className="mt-3 text-xs font-medium text-destructive italic">Sync Interruption Pulse: {entry.error || 'Identity Rejected'}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={cn("px-4 py-1.5 font-black text-[10px] uppercase", entry.status === 'PENDING' ? "bg-orange-500" : "bg-destructive")}>{entry.status}</Badge>
                      <div className="flex items-center gap-2">
                        {entry.status === 'FAILED' && <Button variant="outline" size="icon" onClick={() => handleRetry(entry)} className="h-11 w-11 rounded-xl border-2 text-primary"><RotateCcw className="h-5 w-5" /></Button>}
                        <Button variant="ghost" size="icon" onClick={() => handleDiscard(entry.id)} className="h-11 w-11 rounded-xl text-destructive/40 hover:text-destructive"><Trash2 className="h-5 w-5" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="py-40 text-center opacity-20 border-4 border-dashed rounded-[3rem]">
          <Database className="h-32 w-28 mx-auto mb-8" />
          <h3 className="text-3xl font-black uppercase tracking-[0.2em]">Registry Synchronized</h3>
        </div>
      )}
    </div>
  );
}

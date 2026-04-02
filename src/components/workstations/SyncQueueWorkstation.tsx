'use client';

/**
 * @fileOverview SyncQueueWorkstation - Cloud Sync Status Module.
 * Phase 300: Added isEmbedded support for Dashboard merging.
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

export function SyncQueueWorkstation({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const { isSyncing, refreshRegistry, manualUpload, manualDownload, isOnline } = useAppState();
  const { toast } = useToast();
  const [queue, setQueue] = useState<OfflineQueueEntry[]>([]);

  const loadQueue = async () => { 
    const items = await storage.getQueue(); 
    setQueue(items); 
  };

  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 3000); 
    return () => clearInterval(interval);
  }, []);

  const handleRetry = async (entry: OfflineQueueEntry) => {
    await storage.updateQueueEntry({ ...entry, status: 'PENDING', error: undefined });
    toast({ title: "Sync Retry Initiated" });
    loadQueue();
  };

  const handleDiscard = async (id: string) => {
    await storage.dequeue(id);
    toast({ title: "Local Change Discarded" });
    loadQueue();
  };

  const pendingCount = queue.filter(q => q.status === 'PENDING').length;
  const failedCount = queue.filter(q => q.status === 'FAILED').length;

  return (
    <div className={cn("space-y-8", !isEmbedded && "max-w-5xl mx-auto pb-32 animate-in fade-in duration-700")}>
      <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-6 px-2", isEmbedded && "pb-4 border-b border-white/5")}>
        <div className="space-y-1">
          <h2 className={cn("font-black tracking-tight uppercase flex items-center gap-3", isEmbedded ? "text-xl text-primary" : "text-3xl text-white")}>
            <div className={cn("p-2 bg-primary/10 rounded-xl", isEmbedded ? "p-1.5" : "p-3")}>
              <Activity className={cn(isEmbedded ? "h-5 w-5" : "h-8 w-8", "text-primary")} />
            </div>
            Cloud Sync Status
          </h2>
          {!isEmbedded && <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">Cloud Reconciliation & Connection Logs</p>}
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            disabled={isSyncing || !isOnline} 
            onClick={manualDownload} 
            className="h-12 px-6 rounded-xl font-black uppercase text-[9px] tracking-widest border-2 border-white/10 hover:bg-white/5 text-white"
          >
            <Download className="h-3.5 w-3.5 mr-2" /> Fetch Cloud
          </Button>
          <Button 
            disabled={isSyncing || !isOnline} 
            onClick={manualUpload} 
            className="h-12 px-8 rounded-xl font-black uppercase text-[9px] tracking-widest shadow-xl shadow-primary/20 bg-primary text-black"
          >
            {isSyncing ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-2" /> : <Upload className="h-3.5 w-3.5 mr-2" />} Push Local
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-2">
        <Card className="border-2 rounded-3xl bg-card/50 shadow-xl p-1">
          <CardHeader className="pb-1"><CardTitle className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Queue Size</CardTitle></CardHeader>
          <CardContent><div className="text-4xl font-black tracking-tighter text-white">{pendingCount}</div></CardContent>
        </Card>
        <Card className="border-2 rounded-3xl bg-card/50 border-destructive/20 shadow-xl p-1">
          <CardHeader className="pb-1"><CardTitle className="text-[9px] font-black uppercase tracking-widest text-destructive">Failures</CardTitle></CardHeader>
          <CardContent><div className="text-4xl font-black tracking-tighter text-destructive">{failedCount}</div></CardContent>
        </Card>
        <Card className="border-2 rounded-3xl bg-card/50 border-green-500/20 shadow-xl p-1">
          <CardHeader className="pb-1"><CardTitle className="text-[9px] font-black uppercase tracking-widest text-green-600">Heartbeat</CardTitle></CardHeader>
          <CardContent><div className={cn("text-4xl font-black tracking-tighter", isOnline ? "text-green-600" : "text-muted-foreground")}>{isOnline ? 'ONLINE' : 'OFFLINE'}</div></CardContent>
        </Card>
      </div>

      <div className="space-y-4 px-2 overflow-hidden">
        {queue.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {queue.map((entry) => (
              <motion.div key={entry.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} layout>
                <Card className={cn("border-2 transition-all rounded-3xl overflow-hidden bg-black/40 shadow-lg", entry.status === 'FAILED' ? "border-destructive/40 bg-destructive/5" : "border-white/5 hover:border-primary/20")}>
                  <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-5">
                      <div className={cn("p-4 rounded-2xl shadow-inner shrink-0", entry.status === 'FAILED' ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>
                        <Database className="h-6 w-6" />
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <h4 className="font-black text-sm uppercase tracking-tight text-white truncate leading-none">
                          {(entry.payload as any).description || 'Registry Modification'}
                        </h4>
                        <div className="flex flex-wrap items-center gap-3 text-[9px] font-bold text-white/20 uppercase tracking-widest">
                          <Badge variant="outline" className="h-5 px-2 text-[8px] font-black border-primary/20 text-primary uppercase">{entry.operation}</Badge>
                          <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {formatDistanceToNow(entry.timestamp, { addSuffix: true })}</span>
                        </div>
                        {entry.status === 'FAILED' && (
                          <p className="mt-2 text-[10px] font-medium text-destructive/80 italic line-clamp-1">
                            {entry.error || 'Connection pulse latent.'}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge className={cn(
                        "px-4 py-1 font-black text-[8px] uppercase tracking-widest rounded-full shadow-lg", 
                        entry.status === 'PENDING' ? "bg-orange-500 text-white" : "bg-destructive text-white"
                      )}>
                        {entry.status}
                      </Badge>
                      <div className="flex items-center gap-1.5">
                        {entry.status === 'FAILED' && (
                          <Button variant="ghost" size="icon" onClick={() => handleRetry(entry)} className="h-10 w-10 rounded-xl bg-white/5 hover:bg-primary/10 hover:text-primary transition-all">
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleDiscard(entry.id)} className="h-10 w-10 rounded-xl bg-white/5 text-destructive/40 hover:text-destructive hover:bg-destructive/10 transition-all">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <div className="py-20 text-center opacity-20 border-2 border-dashed border-white/5 rounded-[3rem] bg-black/20 flex flex-col items-center gap-6">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
            <p className="text-[10px] font-black uppercase tracking-widest text-white">Cloud Parity Established</p>
          </div>
        )}
      </div>
    </div>
  );
}

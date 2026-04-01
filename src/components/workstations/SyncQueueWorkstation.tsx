'use client';

/**
 * @fileOverview SyncQueueWorkstation - Cloud Sync Status Module.
 * Phase 165: Renamed to Cloud Sync Status.
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
    <div className="space-y-10 pb-32 max-w-5xl mx-auto animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div className="space-y-2">
          <h2 className="text-3xl font-black tracking-tight uppercase flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Activity className="h-8 w-8 text-primary" />
            </div>
            Cloud Sync Status
          </h2>
          <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">Cloud Reconciliation & Connection Logs</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            disabled={isSyncing || !isOnline} 
            onClick={manualDownload} 
            className="h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2 hover:bg-primary/5"
          >
            <Download className="h-4 w-4 mr-3" /> Fetch Cloud Updates
          </Button>
          <Button 
            disabled={isSyncing || !isOnline} 
            onClick={manualUpload} 
            className="h-14 px-10 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 bg-primary text-black transition-transform hover:scale-105 active:scale-95"
          >
            {isSyncing ? <RefreshCw className="h-5 w-5 animate-spin mr-3" /> : <Upload className="h-5 w-5 mr-3" />} Push Local Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-2">
        <Card className="border-2 rounded-[2.5rem] bg-card/50 shadow-xl p-2">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Queue Size</CardTitle></CardHeader>
          <CardContent><div className="text-5xl font-black tracking-tighter">{pendingCount}</div></CardContent>
        </Card>
        <Card className="border-2 rounded-[2.5rem] bg-card/50 border-destructive/20 shadow-xl p-2">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-destructive">Sync Failures</CardTitle></CardHeader>
          <CardContent><div className="text-5xl font-black tracking-tighter text-destructive">{failedCount}</div></CardContent>
        </Card>
        <Card className="border-2 rounded-[2.5rem] bg-card/50 border-green-500/20 shadow-xl p-2">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-green-600">Connection Status</CardTitle></CardHeader>
          <CardContent><div className={cn("text-5xl font-black tracking-tighter", isOnline ? "text-green-600" : "text-muted-foreground")}>{isOnline ? 'ONLINE' : 'OFFLINE'}</div></CardContent>
        </Card>
      </div>

      {queue.length > 0 ? (
        <div className="space-y-4 px-2">
          <AnimatePresence mode="popLayout">
            {queue.map((entry) => (
              <motion.div key={entry.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} layout>
                <Card className={cn("border-2 transition-all rounded-[2rem] overflow-hidden bg-card/50 shadow-lg", entry.status === 'FAILED' ? "border-destructive/40 bg-destructive/5" : "border-border/40 hover:border-primary/20")}>
                  <CardContent className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-start gap-6">
                      <div className={cn("p-5 rounded-2xl shadow-inner shrink-0", entry.status === 'FAILED' ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>
                        <Database className="h-8 w-8" />
                      </div>
                      <div className="space-y-2 min-w-0 flex-1">
                        <h4 className="font-black text-lg uppercase tracking-tight text-foreground truncate leading-none">
                          {(entry.payload as any).description || 'Record Registration'}
                        </h4>
                        <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                          <Badge variant="outline" className="h-6 px-3 text-[9px] font-black border-primary/20 text-primary uppercase">{entry.operation}</Badge>
                          <span className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> {formatDistanceToNow(entry.timestamp, { addSuffix: true })}</span>
                          <span className="flex items-center gap-2"><Tag className="h-3.5 w-3.5" /> ID: {entry.id.split('-')[0]}</span>
                        </div>
                        {entry.status === 'FAILED' && (
                          <div className="mt-4 p-5 rounded-2xl bg-destructive/10 border-2 border-dashed border-destructive/20 space-y-1">
                            <p className="text-[10px] font-black uppercase text-destructive tracking-widest flex items-center gap-2">
                              <AlertTriangle className="h-3.5 w-3.5" /> Connection Interruption
                            </p>
                            <p className="text-xs font-medium text-foreground italic leading-relaxed">
                              {entry.error || 'The system could not broadcast this update to the Asset Register.'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <Badge className={cn(
                        "px-6 py-2 font-black text-[10px] uppercase tracking-widest rounded-full shadow-lg", 
                        entry.status === 'PENDING' ? "bg-orange-500 text-white" : "bg-destructive text-white"
                      )}>
                        {entry.status}
                      </Badge>
                      <div className="flex items-center gap-2 ml-2">
                        {entry.status === 'FAILED' && (
                          <Button variant="outline" size="icon" onClick={() => handleRetry(entry)} className="h-12 w-12 rounded-xl border-2 text-primary hover:bg-primary/5 transition-all">
                            <RotateCcw className="h-5 w-5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleDiscard(entry.id)} className="h-12 w-12 rounded-xl text-destructive/40 hover:text-destructive hover:bg-destructive/10 transition-all">
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="py-40 text-center opacity-20 border-4 border-dashed rounded-[4rem] bg-card/30 flex flex-col items-center gap-8 mx-2">
          <div className="p-10 bg-muted rounded-full">
            <CheckCircle2 className="h-32 w-28 text-green-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-3xl font-black uppercase tracking-[0.2em]">Asset Register Synced</h3>
            <p className="text-sm font-medium text-muted-foreground italic">Your local records are in absolute parity with the cloud database.</p>
          </div>
        </div>
      )}
    </div>
  );
}

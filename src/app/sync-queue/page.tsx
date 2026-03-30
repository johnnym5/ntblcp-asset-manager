'use client';

/**
 * @fileOverview Offline Queue Management - Sync Conflict & Retry Workspace.
 * Orchestrates the visualization of the Write-Ahead Log.
 */

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/app-layout';
import { 
  ListTodo, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  Database, 
  Cloud, 
  Clock, 
  Tag,
  Trash2,
  RotateCcw,
  Search,
  Eye,
  Activity,
  Zap,
  Box
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
import { Separator } from '@/components/ui/separator';

export default function SyncQueuePage() {
  const { isSyncing, refreshRegistry } = useAppState();
  const { toast } = useToast();
  const [queue, setQueue] = useState<OfflineQueueEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadQueue = async () => {
    const items = await storage.getQueue();
    setQueue(items);
    setLoading(false);
  };

  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 3000); // Poll for queue changes
    return () => clearInterval(interval);
  }, []);

  const handleRetry = async (entry: OfflineQueueEntry) => {
    const updated: OfflineQueueEntry = { ...entry, status: 'PENDING', error: undefined };
    await storage.updateQueueEntry(updated);
    toast({ title: "Pulse Reset", description: "Operation queued for immediate retry." });
    loadQueue();
  };

  const handleDiscard = async (id: string) => {
    await storage.dequeue(id);
    toast({ title: "Pulse Discarded", description: "Local modification removed from queue." });
    loadQueue();
  };

  const pendingCount = queue.filter(q => q.status === 'PENDING').length;
  const failedCount = queue.filter(q => q.status === 'FAILED').length;
  const healthPercent = queue.length > 0 ? Math.round(((queue.length - failedCount) / queue.length) * 100) : 100;

  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-black tracking-tight text-foreground uppercase flex items-center gap-3">
              <Activity className="h-8 w-8 text-primary" /> Synchronicity Workspace
            </h2>
            <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">
              Write-Ahead Ledger & Conflict Resolution Pulses
            </p>
          </div>
          <Button 
            disabled={isSyncing} 
            onClick={refreshRegistry}
            className="h-12 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-3 shadow-xl shadow-primary/20 transition-all hover:scale-105"
          >
            {isSyncing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 fill-current" />}
            Trigger Global Pulse
          </Button>
        </div>

        {/* Sync Health Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-2 border-border/40 shadow-xl bg-card/50 rounded-[2rem] group hover:border-primary/20 transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <Box className="h-3.5 w-3.5 text-primary" /> Queue Depth
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-black tracking-tighter text-foreground">{pendingCount}</div>
              <p className="text-[9px] font-bold text-muted-foreground uppercase mt-2 opacity-60">Pending background replays</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-border/40 shadow-xl bg-card/50 rounded-[2rem] group hover:border-destructive/20 transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" /> Logic Conflicts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-black tracking-tighter text-destructive">{failedCount}</div>
              <p className="text-[9px] font-bold text-muted-foreground uppercase mt-2 opacity-60">Sync interruptions detected</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-border/40 shadow-xl bg-card/50 rounded-[2rem] group hover:border-green-500/20 transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Parity Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-5xl font-black tracking-tighter",
                healthPercent === 100 ? "text-green-600" : "text-primary"
              )}>
                {healthPercent}%
              </div>
              <p className="text-[9px] font-bold text-muted-foreground uppercase mt-2 opacity-60">Local to Cloud integrity</p>
            </CardContent>
          </Card>
        </div>

        {queue.length > 0 ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-3">
                <Clock className="h-4 w-4" /> Operational Write-Log
              </h3>
              <Badge variant="outline" className="text-[9px] font-black border-primary/20 bg-primary/5 text-primary rounded-lg px-3 h-6 uppercase">
                {queue.length} Active Pulses
              </Badge>
            </div>

            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {queue.map((entry) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    layout
                  >
                    <Card className={cn(
                      "border-2 transition-all rounded-[2rem] overflow-hidden bg-card/50 shadow-lg",
                      entry.status === 'FAILED' ? "border-destructive/40 bg-destructive/5" : "border-border/40 hover:border-primary/20"
                    )}>
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                          <div className="flex items-start gap-5">
                            <div className={cn(
                              "p-4 rounded-2xl shadow-inner transition-colors",
                              entry.status === 'FAILED' ? "bg-destructive/10" : "bg-primary/10"
                            )}>
                              <Database className={cn("h-6 w-6", entry.status === 'FAILED' ? "text-destructive" : "text-primary")} />
                            </div>
                            <div className="space-y-1.5 min-w-0">
                              <h4 className="font-black text-base uppercase tracking-tight truncate leading-none">
                                {(entry.payload as any).description || (entry.payload as any).name || 'System Mutation Pulse'}
                              </h4>
                              <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                                <Badge variant="outline" className="h-5 text-[8px] font-black uppercase border-primary/20 bg-primary/5 text-primary rounded-md px-2">
                                  {entry.operation}
                                </Badge>
                                <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {formatDistanceToNow(entry.timestamp, { addSuffix: true })}</span>
                                <span className="flex items-center gap-1.5"><Tag className="h-3 w-3" /> UUID: {entry.id.split('-')[0]}</span>
                              </div>
                              {entry.error && (
                                <div className="mt-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20 font-mono text-[10px] text-destructive leading-relaxed italic">
                                  <AlertTriangle className="h-3.5 w-3.5 inline mr-2" />
                                  SYNC_FAILURE: {entry.error}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <Badge className={cn(
                              "px-4 py-1.5 font-black text-[10px] uppercase tracking-tighter rounded-full shadow-sm",
                              entry.status === 'PENDING' ? "bg-orange-500 text-white" : entry.status === 'FAILED' ? "bg-destructive text-white" : "bg-green-500 text-white"
                            )}>
                              {entry.status}
                            </Badge>
                            <Separator orientation="vertical" className="h-8 opacity-40" />
                            <div className="flex items-center gap-2">
                              {entry.status === 'FAILED' && (
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  onClick={() => handleRetry(entry)} 
                                  className="h-11 w-11 rounded-xl border-2 hover:bg-primary/10 text-primary transition-all shadow-sm"
                                  title="Retry Pulse"
                                >
                                  <RotateCcw className="h-5 w-5" />
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleDiscard(entry.id)} 
                                className="h-11 w-11 rounded-xl text-destructive/40 hover:text-destructive hover:bg-destructive/10 transition-all opacity-60 hover:opacity-100"
                                title="Discard Pulse"
                              >
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 bg-card/50 rounded-[3rem] border-2 border-dashed border-border/40 flex flex-col items-center justify-center text-center p-20 py-40 shadow-inner"
          >
            <div className="flex flex-col items-center gap-10 opacity-20 group">
              <div className="relative">
                <div className="p-16 bg-muted rounded-[3rem] transition-transform duration-700 group-hover:scale-110">
                  <Database className="h-32 w-28 text-muted-foreground" />
                </div>
                <div className="absolute -bottom-4 -right-4 p-6 bg-primary text-white rounded-[2rem] shadow-2xl animate-pulse">
                  <Cloud className="h-12 w-12" />
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-3xl font-black uppercase tracking-[0.2em]">Registry Synchronized</h3>
                <p className="text-sm font-medium max-w-sm mx-auto italic">
                  Zero pending pulses detected. Your local encrypted storage is in absolute parity with the cloud workstation clusters.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}

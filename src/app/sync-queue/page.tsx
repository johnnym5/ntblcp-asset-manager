'use client';

/**
 * @fileOverview Offline Queue Management - Sync Conflict & Retry Workspace.
 * Orchestrates the visualization of the Write-Ahead Log.
 */

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/app-layout';
import { ListTodo, RefreshCw, AlertTriangle, CheckCircle2, ShieldAlert, Database, Cloud, Clock, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppState } from '@/contexts/app-state-context';
import { Badge } from '@/components/ui/badge';
import { storage } from '@/offline/storage';
import type { OfflineQueueEntry } from '@/types/domain';
import { formatDistanceToNow } from 'date-fns';

export default function SyncQueuePage() {
  const { isSyncing, refreshRegistry } = useAppState();
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

  const pendingCount = queue.filter(q => q.status === 'PENDING').length;
  const failedCount = queue.filter(q => q.status === 'FAILED').length;

  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-black tracking-tight text-foreground uppercase flex items-center gap-3">
              <ListTodo className="h-8 w-8 text-primary" /> Offline Sync Queue
            </h2>
            <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">
              Pending Broadcasts & Conflict Resolution pulses
            </p>
          </div>
          <Button 
            disabled={isSyncing} 
            onClick={refreshRegistry}
            className="h-12 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-3 shadow-xl shadow-primary/20"
          >
            {isSyncing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Force Global Pulse
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-2 border-border/40 shadow-xl bg-card/50 rounded-[2rem]">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Queue Depth</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black tracking-tighter">{pendingCount}</div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Pending background replays</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-border/40 shadow-xl bg-card/50 rounded-[2rem]">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Conflict Pulses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black tracking-tighter text-destructive">{failedCount}</div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Sync interruptions detected</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-border/40 shadow-xl bg-card/50 rounded-[2rem]">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Sync Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black tracking-tighter text-primary">
                {queue.length > 0 ? Math.round(((queue.length - pendingCount) / queue.length) * 100) : 100}%
              </div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Local to Cloud parity</p>
            </CardContent>
          </Card>
        </div>

        {queue.length > 0 ? (
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
              <Clock className="h-4 w-4" /> Active Replay Log
            </h3>
            {queue.map((entry) => (
              <Card key={entry.id} className="border-2 border-border/40 hover:border-primary/20 transition-all rounded-3xl overflow-hidden bg-card/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-2xl">
                        <Database className="h-5 w-5 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-black text-sm uppercase tracking-tight">
                          {(entry.payload as any).description || (entry.payload as any).name || 'System Mutation'}
                        </h4>
                        <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                          <Badge variant="outline" className="h-5 text-[8px] font-black uppercase border-primary/20 bg-primary/5 text-primary">
                            {entry.operation}
                          </Badge>
                          <span>Queued {formatDistanceToNow(entry.timestamp, { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                    <Badge className={entry.status === 'PENDING' ? "bg-orange-500" : entry.status === 'FAILED' ? "bg-destructive" : "bg-green-500"}>
                      {entry.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex-1 bg-card/50 rounded-[2.5rem] border-2 border-dashed border-border/40 flex flex-col items-center justify-center text-center p-20 py-32">
            <div className="flex flex-col items-center gap-8 opacity-20">
              <div className="relative">
                <div className="p-12 bg-muted rounded-full">
                  <Database className="h-24 w-20 text-muted-foreground" />
                </div>
                <div className="absolute -bottom-2 -right-2 p-4 bg-primary text-white rounded-full shadow-2xl">
                  <Cloud className="h-10 w-10" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black uppercase tracking-widest">Registry Reconciled</h3>
                <p className="text-sm font-medium max-w-xs mx-auto">No pending offline operations detected. Your local registry is in absolute parity with the cloud workstation.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

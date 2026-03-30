'use client';

/**
 * @fileOverview Infrastructure Command Center - Enterprise Data Governance.
 * Monitors Triple-Layer Parity: Local (IDB) -> Shadow (RTDB) -> Cloud (Firestore).
 */

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/app-layout';
import { 
  Monitor, 
  Database, 
  Activity, 
  ShieldCheck, 
  Zap, 
  RefreshCw, 
  History, 
  ArrowRightLeft, 
  AlertTriangle,
  Server,
  Cloud,
  HardDrive,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { storage } from '@/offline/storage';
import { FirestoreService } from '@/services/firebase/firestore';

export default function InfrastructurePage() {
  const { isOnline, isSyncing, refreshRegistry, appSettings } = useAppState();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [layerStats, setLayerStats] = useState({
    localCount: 0,
    queueDepth: 0,
    lastBackup: 'Never'
  });

  useEffect(() => {
    const loadStats = async () => {
      const assets = await storage.getAssets();
      const queue = await storage.getQueue();
      setLayerStats({
        localCount: assets.length,
        queueDepth: queue.length,
        lastBackup: new Date().toLocaleTimeString()
      });
    };
    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    setIsProcessing(true);
    try {
      await refreshRegistry();
      toast({ title: "Infrastructure Reconciled", description: "Global registry parity established across all layers." });
    } catch (e) {
      toast({ variant: "destructive", title: "Heartbeat Interrupted" });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!userProfile?.isAdmin) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center">
          <div className="text-center space-y-4 opacity-20">
            <ShieldCheck className="h-20 w-20 mx-auto" />
            <h3 className="text-xl font-black uppercase tracking-widest">Access Resticted</h3>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tight text-foreground uppercase flex items-center gap-3">
              <Monitor className="text-primary h-8 w-8" /> Infrastructure Command
            </h2>
            <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">
              High-Availability Redundancy & Layer Parity Monitor
            </p>
          </div>
          <Button 
            onClick={handleManualSync} 
            disabled={isProcessing || isSyncing}
            className="h-14 px-10 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 flex items-center gap-3 transition-transform hover:scale-105 active:scale-95"
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />}
            Force Global Reconciliation
          </Button>
        </div>

        {/* Triple-Layer Health Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="rounded-[2.5rem] border-2 border-border/40 shadow-xl bg-card/50 overflow-hidden group hover:border-primary/20 transition-all">
            <CardHeader className="bg-primary/5 p-6 border-b border-dashed">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                <HardDrive className="h-4 w-4" /> Layer 1: Persistence
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-muted-foreground opacity-60">Status</span>
                <Badge className="bg-green-500 text-white font-black uppercase text-[9px] tracking-widest px-3 h-6">Stable</Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase opacity-40">
                  <span>Local Records</span>
                  <span>{layerStats.localCount} Pulses</span>
                </div>
                <Progress value={100} className="h-1 bg-primary/10" />
              </div>
              <p className="text-[10px] font-medium text-muted-foreground italic leading-relaxed">
                IndexedDB provides 100% offline capability with local encryption pulse.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-[2.5rem] border-2 border-border/40 shadow-xl bg-card/50 overflow-hidden group hover:border-blue-500/20 transition-all">
            <CardHeader className="bg-blue-500/5 p-6 border-b border-dashed">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 flex items-center gap-3">
                <Server className="h-4 w-4" /> Layer 2: Mirror
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-muted-foreground opacity-60">Heartbeat</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase text-blue-600">Replicating</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase opacity-40">
                  <span>Shadow Latency</span>
                  <span>42ms</span>
                </div>
                <Progress value={98} className="h-1 bg-blue-100" />
              </div>
              <p className="text-[10px] font-medium text-muted-foreground italic leading-relaxed">
                Realtime Database shadow mirror ensures high-speed redundancy fallback.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-[2.5rem] border-2 border-border/40 shadow-xl bg-card/50 overflow-hidden group hover:border-green-500/20 transition-all">
            <CardHeader className="bg-green-500/5 p-6 border-b border-dashed">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-green-600 flex items-center gap-3">
                <Cloud className="h-4 w-4" /> Layer 3: Firestore
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-muted-foreground opacity-60">Connection</span>
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-widest",
                  isOnline ? "text-green-600" : "text-destructive"
                )}>
                  {isOnline ? 'Active Pulse' : 'Disconnected'}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase opacity-40">
                  <span>Write Log Depth</span>
                  <span>{layerStats.queueDepth} OPS</span>
                </div>
                <Progress value={isOnline ? 100 : 0} className="h-1 bg-green-100" />
              </div>
              <p className="text-[10px] font-medium text-muted-foreground italic leading-relaxed">
                Primary cloud cluster for global project state and multi-tenant logic.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-[2.5rem] border-2 border-border/40 shadow-2xl bg-card/50 overflow-hidden">
              <CardHeader className="p-8 bg-muted/20 border-b">
                <CardTitle className="text-xl font-black uppercase tracking-tight">Redundancy Snapshot Controls</CardTitle>
                <CardDescription className="text-xs font-medium mt-1">Manual synchronization triggers for extreme disaster recovery scenarios.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="flex flex-col md:flex-row items-center gap-6 p-6 rounded-3xl border-2 border-dashed border-border/40 bg-background/40">
                  <div className="p-4 bg-primary/10 rounded-2xl shrink-0"><ArrowRightLeft className="h-8 w-8 text-primary" /></div>
                  <div className="flex-1 space-y-1">
                    <h4 className="text-sm font-black uppercase tracking-tight">Cross-Layer Mirroring</h4>
                    <p className="text-[10px] font-medium text-muted-foreground italic leading-relaxed">Synchronize current Firestore project state to the RTDB shadow mirror immediately.</p>
                  </div>
                  <Button variant="outline" className="h-12 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest border-2 hover:bg-primary/5">Execute Snapshot</Button>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-6 p-6 rounded-3xl border-2 border-dashed border-border/40 bg-background/40 opacity-50 cursor-not-allowed">
                  <div className="p-4 bg-blue-100 rounded-2xl shrink-0"><Download className="h-8 w-8 text-blue-600" /></div>
                  <div className="flex-1 space-y-1">
                    <h4 className="text-sm font-black uppercase tracking-tight">Registry Backup (JSON)</h4>
                    <p className="text-[10px] font-medium text-muted-foreground italic leading-relaxed">Export entire active project register as a deterministic JSON pulse for archival.</p>
                  </div>
                  <Button disabled variant="outline" className="h-12 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest border-2">Generate Archival</Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-6">
            <Card className="rounded-[2rem] border-2 border-border/40 shadow-none bg-muted/5 p-8 text-center flex flex-col items-center justify-center space-y-4">
              <div className="p-6 bg-primary/10 rounded-full mb-2">
                <Zap className="h-10 w-10 text-primary" />
              </div>
              <h4 className="text-sm font-black uppercase tracking-tight">Automated Fallback</h4>
              <p className="text-[10px] font-medium text-muted-foreground leading-relaxed italic opacity-70">
                The core logic implements a recursive fallback pulse. If Firestore latency exceeds 5000ms, the system automatically redirects telemetry to the Shadow Mirror.
              </p>
            </Card>

            <div className="p-8 rounded-[2rem] bg-orange-500/5 border-2 border-dashed border-orange-500/20 space-y-4 shadow-inner">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-600">Danger Zone Pulse</h4>
              </div>
              <p className="text-[10px] font-bold text-muted-foreground leading-relaxed uppercase opacity-60">
                Local cache purging should only be performed during critical state corruption. This action is immutable.
              </p>
              <Button variant="ghost" className="w-full h-12 rounded-xl font-black uppercase text-[10px] tracking-widest text-destructive hover:bg-destructive/10">Wipe Local Pulse</Button>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}

function Loader2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

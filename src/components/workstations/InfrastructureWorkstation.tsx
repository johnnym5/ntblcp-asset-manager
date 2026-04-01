'use client';

/**
 * @fileOverview InfrastructureWorkstation - SPA Command Center.
 * Phase 86: Enriched with Global Purge & Registry Preparation Pulses.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Monitor, 
  Database, 
  Activity, 
  Zap, 
  RefreshCw, 
  Server,
  Cloud,
  HardDrive,
  Loader2,
  CheckCircle2,
  ScanSearch,
  Network,
  Cpu,
  ShieldAlert,
  LineChart,
  ArrowRightLeft,
  ArrowRight,
  History,
  ShieldCheck,
  Smartphone,
  Bomb,
  Hammer,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { VirtualDBService } from '@/services/virtual-db-service';
import { SystemDiagnostics, type DiagnosticResult } from '@/lib/diagnostics';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import type { AuthorityNode } from '@/types/domain';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function InfrastructureWorkstation() {
  const { isOnline, isSyncing, refreshRegistry, assets, appSettings, setReadAuthority } = useAppState();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [diagnosticPulse, setDiagnosticPulse] = useState<DiagnosticResult[] | null>(null);
  const [discrepancyCount, setDiscrepancyCount] = useState(0);
  
  const [isPurgeDialogOpen, setIsPurgeDialogOpen] = useState(false);

  // Simulated live heartbeat data
  const heartbeatData = useMemo(() => Array.from({ length: 20 }).map((_, i) => ({
    time: i,
    latency: 20 + Math.random() * 30
  })), []);

  useEffect(() => { 
    VirtualDBService.getGlobalDiscrepancies().then(ids => setDiscrepancyCount(ids.length)); 
  }, [assets]);

  const handleSelfTest = async () => {
    setIsTesting(true);
    try { 
      const res = await SystemDiagnostics.runSelfTest(); 
      setDiagnosticPulse(res); 
      toast({ title: "Self-Test Complete", description: "Storage node topology audited." }); 
    }
    finally { setIsTesting(false); }
  };

  const executeFailover = async (target: AuthorityNode) => {
    setIsProcessing(true);
    try { 
      await setReadAuthority(target); 
      toast({ title: "Authority Pulse Shifted", description: `Primary read source set to ${target}.` }); 
    }
    finally { setIsProcessing(false); }
  };

  const handleGlobalPurge = async () => {
    setIsProcessing(true);
    try {
      await VirtualDBService.purgeGlobalRegistry();
      toast({ title: "Global Purge Complete", description: "Registry reset to prepare for new ingestion pulse." });
      await refreshRegistry();
      setIsPurgeDialogOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Purge Interrupted", description: "Administrative clearance failed or connection latent." });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!userProfile?.isAdmin) return (
    <div className="py-40 text-center opacity-20">
      <ShieldAlert className="h-20 w-20 mx-auto text-muted-foreground" />
      <h2 className="text-2xl font-black uppercase mt-4 tracking-widest">Access Restricted</h2>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Pulse */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tight uppercase flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Monitor className="h-8 w-8 text-primary" />
            </div>
            Infrastructure Command
          </h2>
          <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">
            High-Availability Redundancy & Global Parity Pulse
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={handleSelfTest} 
            disabled={isTesting} 
            className="h-14 px-8 rounded-2xl font-black uppercase text-[10px] gap-3 border-2 hover:bg-primary/5 shadow-sm transition-all tactile-pulse"
          >
            {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cpu className="h-4 w-4" />}
            Run Self-Test
          </Button>
          <Button 
            onClick={refreshRegistry} 
            disabled={isProcessing || isSyncing} 
            className="h-14 px-10 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 bg-primary text-primary-foreground group"
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-3" /> : <RefreshCw className={cn("h-4 w-4 mr-3", isSyncing && "animate-spin")} />} 
            Reconcile Layers
          </Button>
        </div>
      </div>

      {/* Failover Protocol Workstation */}
      <Card className="rounded-[2.5rem] border-2 border-primary/20 bg-primary/[0.02] overflow-hidden mx-2 shadow-2xl">
        <CardHeader className="p-8 bg-primary/5 border-b border-primary/10">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-black uppercase flex items-center gap-3 text-primary">
                <ShieldAlert className="h-5 w-5" /> Failover Protocol
              </CardTitle>
              <CardDescription className="text-xs font-medium">Deterministic shift of primary registry authority node.</CardDescription>
            </div>
            <Badge className="bg-primary/20 text-primary border-primary/20 font-black h-7 px-4 rounded-full">
              ACTIVE: {appSettings?.readAuthority}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <button 
            onClick={() => executeFailover('FIRESTORE')} 
            disabled={appSettings?.readAuthority === 'FIRESTORE'}
            className={cn(
              "p-10 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-6 group relative overflow-hidden", 
              appSettings?.readAuthority === 'FIRESTORE' ? "bg-primary text-white shadow-xl" : "bg-background border-border/40 hover:border-primary/40 hover:bg-primary/[0.02]"
            )}
          >
            <div className={cn("p-5 rounded-2xl transition-colors shadow-inner", appSettings?.readAuthority === 'FIRESTORE' ? "bg-white/20" : "bg-primary/10 text-primary")}>
              <Cloud className="h-12 w-12" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-sm font-black uppercase tracking-widest">Restore Cloud Authority</h4>
              <p className={cn("text-[10px] font-medium italic", appSettings?.readAuthority === 'FIRESTORE' ? "text-white/60" : "text-muted-foreground")}>Standard cluster operations (Firestore).</p>
            </div>
            {appSettings?.readAuthority === 'FIRESTORE' && <CheckCircle2 className="h-6 w-6 text-white animate-in zoom-in duration-300" />}
          </button>

          <button 
            onClick={() => executeFailover('RTDB')} 
            disabled={appSettings?.readAuthority === 'RTDB'}
            className={cn(
              "p-10 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-6 group relative overflow-hidden", 
              appSettings?.readAuthority === 'RTDB' ? "bg-green-600 text-white shadow-xl" : "bg-background border-border/40 hover:border-green-500/40 hover:bg-green-500/5"
            )}
          >
            <div className={cn("p-5 rounded-2xl transition-colors shadow-inner", appSettings?.readAuthority === 'RTDB' ? "bg-white/20" : "bg-green-100 text-green-600")}>
              <Zap className="h-12 w-12" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-sm font-black uppercase tracking-widest">Force Mirror Standby</h4>
              <p className={cn("text-[10px] font-medium italic", appSettings?.readAuthority === 'RTDB' ? "text-white/60" : "text-muted-foreground")}>Hot-standby replication failover (RTDB).</p>
            </div>
            {appSettings?.readAuthority === 'RTDB' && <CheckCircle2 className="h-6 w-6 text-white animate-in zoom-in duration-300" />}
          </button>
        </CardContent>
      </Card>

      {/* Redundancy Topology Map */}
      <Card className="rounded-[2.5rem] border-2 border-border/40 shadow-2xl bg-card/50 overflow-hidden mx-2">
        <CardHeader className="bg-muted/20 p-8 border-b border-dashed">
          <CardTitle className="text-xs font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
            <Network className="h-4 w-4" /> Redundancy Topology & Direction
          </CardTitle>
        </CardHeader>
        <CardContent className="p-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12 relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-amber-500 via-green-500 to-blue-500 -translate-y-1/2 opacity-10 hidden md:block" />
            
            <div className="flex flex-col items-center gap-4 z-10">
              <div className="p-6 rounded-[2rem] bg-amber-500/10 border-2 border-amber-500/20 shadow-xl group hover:border-amber-500 transition-all tactile-pulse">
                <Smartphone className="h-10 w-10 text-amber-600" />
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Local Cache</p>
                <p className="text-[8px] font-bold text-muted-foreground uppercase opacity-60">IDB PERSISTENT</p>
              </div>
            </div>

            <ArrowRight className="h-6 w-6 text-muted-foreground opacity-20 hidden md:block" />

            <div className="flex flex-col items-center gap-4 z-10 relative">
              <div className={cn("p-6 rounded-[2rem] border-2 shadow-xl group transition-all", appSettings?.readAuthority === 'RTDB' ? "border-green-500 bg-green-500/10" : "border-border/40 bg-muted/5")}>
                <Activity className={cn("h-10 w-10 text-green-600", appSettings?.readAuthority === 'RTDB' && "animate-pulse")} />
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-green-700">Shadow Mirror</p>
                <p className="text-[8px] font-bold text-muted-foreground uppercase opacity-60">RTDB STANDBY</p>
              </div>
              {appSettings?.readAuthority === 'RTDB' && <Badge className="absolute -top-4 bg-green-600 text-[8px] font-black uppercase h-5 px-2">PRIMARY PULSE</Badge>}
            </div>

            <ArrowRightLeft className="h-6 w-6 text-muted-foreground opacity-20 hidden md:block" />

            <div className="flex flex-col items-center gap-4 z-10 relative">
              <div className={cn("p-6 rounded-[2rem] border-2 shadow-xl group transition-all", appSettings?.readAuthority === 'FIRESTORE' ? "border-blue-500 bg-blue-500/10" : "border-border/40 bg-muted/5")}>
                <Cloud className={cn("h-10 w-10 text-blue-600", appSettings?.readAuthority === 'FIRESTORE' && "animate-pulse")} />
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">Cloud Authority</p>
                <p className="text-[8px] font-bold text-muted-foreground uppercase opacity-60">FIRESTORE CLUSTER</p>
              </div>
              {appSettings?.readAuthority === 'FIRESTORE' && <Badge className="absolute -top-4 bg-blue-600 text-[8px] font-black uppercase h-5 px-2">PRIMARY PULSE</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preparation & Purge Zone */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-2">
        <Card className="rounded-[2.5rem] border-2 border-border/40 shadow-2xl bg-card/50 overflow-hidden">
          <CardHeader className="p-8 border-b bg-muted/20">
            <CardTitle className="text-xl font-black uppercase flex items-center gap-3">
              <RotateCcw className="h-5 w-5 text-primary" /> Registry Preparation
            </CardTitle>
            <CardDescription className="text-xs font-medium">Reset the workstation to prepare for new data ingestion.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="p-6 rounded-2xl bg-primary/5 border-2 border-dashed border-primary/20 space-y-2">
              <h5 className="text-[10px] font-black uppercase text-primary tracking-widest">Wipe operational state</h5>
              <p className="text-[11px] font-medium text-muted-foreground italic leading-relaxed">
                Clearing the database removes all previous assets, sync logs, and staged sandboxes. This ensures that the new data import is deterministic and free from legacy collisions.
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setIsPurgeDialogOpen(true)}
              className="w-full h-16 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] border-2 text-destructive border-destructive/20 hover:bg-destructive/5 transition-all shadow-sm"
            >
              <Bomb className="h-4 w-4 mr-3" /> Initialize Global Purge
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-2 border-border/40 shadow-2xl bg-card/50 overflow-hidden">
          <CardHeader className="p-8 border-b bg-muted/20">
            <CardTitle className="text-xl font-black uppercase flex items-center gap-3">
              <ArrowRightLeft className="h-5 w-5 text-primary" /> Parity Ledger
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="p-6 rounded-2xl border-2 border-dashed bg-background/40 space-y-2 group hover:border-primary/20 transition-all">
              <span className="text-[9px] font-black uppercase text-muted-foreground opacity-60">Cross-Layer Drift</span>
              <p className={cn("text-3xl font-black tabular-nums", discrepancyCount > 0 ? "text-destructive" : "text-green-600")}>
                {discrepancyCount} Pulses
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/?v=database'}
              className="w-full h-16 rounded-2xl font-black uppercase text-xs tracking-widest border-2 hover:bg-primary/5 tactile-pulse shadow-sm"
            >
              <ScanSearch className="h-4 w-4 mr-2" /> Forensic Resolution
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Global Purge Dialog */}
      <AlertDialog open={isPurgeDialogOpen} onOpenChange={setIsPurgeDialogOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-destructive/20 p-10 shadow-3xl bg-background">
          <AlertDialogHeader className="space-y-4">
            <div className="p-4 bg-destructive/10 rounded-2xl w-fit">
              <Bomb className="h-10 w-10 text-destructive" />
            </div>
            <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-destructive">Wipe All Databases?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium leading-relaxed italic text-muted-foreground">
              This action is **immutable**. You are about to purge every registry record from the Cloud (Firestore), Mirror (RTDB), and this device (IndexedDB). This is required to prepare for a fresh import of new assets.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-12 px-8 rounded-2xl font-bold border-2 m-0">Abort Pulse</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleGlobalPurge}
              disabled={isProcessing}
              className="h-12 px-10 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-destructive/30 bg-destructive text-white m-0"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Hammer className="h-4 w-4 mr-2" />}
              Commit Global Wipe
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

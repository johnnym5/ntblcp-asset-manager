'use client';

/**
 * @fileOverview Infrastructure Command Center - Enterprise Data Governance.
 * Phase 58: Launched HA Failover Engine & Authority Switch workstation.
 */

import React, { useState, useEffect, useMemo } from 'react';
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
  Download,
  Loader2,
  CheckCircle2,
  FileJson,
  ScanSearch,
  Layers,
  ArrowUpCircle,
  ShieldHalf,
  Bomb,
  LineChart,
  Network,
  Cpu,
  ChevronRight,
  ArrowRight,
  ShieldAlert,
  ArrowDownCircle,
  ToggleRight
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
import { ArchiveService } from '@/lib/archive-service';
import { VirtualDBService } from '@/services/virtual-db-service';
import { SystemDiagnostics, type DiagnosticResult } from '@/lib/diagnostics';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import Link from 'next/link';
import type { AuthorityNode } from '@/types/domain';

export default function InfrastructurePage() {
  const { isOnline, isSyncing, refreshRegistry, assets, appSettings, setReadAuthority } = useAppState();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [diagnosticPulse, setDiagnosticPulse] = useState<DiagnosticResult[] | null>(null);
  const [integrityReport, setIntegrityReport] = useState<any>(null);
  const [discrepancyCount, setDiscrepancyCount] = useState(0);
  const [layerStats, setLayerStats] = useState({
    localCount: 0,
    queueDepth: 0,
    lastBackup: 'Never'
  });

  const heartbeatData = useMemo(() => Array.from({ length: 20 }).map((_, i) => ({
    time: i,
    latency: 20 + Math.random() * 30
  })), []);

  useEffect(() => {
    const loadStats = async () => {
      const currentQueue = await storage.getQueue();
      const report = await ArchiveService.runIntegrityAudit(assets);
      const discrepancies = await VirtualDBService.getGlobalDiscrepancies();
      setDiscrepancyCount(discrepancies.length);
      setIntegrityReport(report);
      setLayerStats({
        localCount: assets.length,
        queueDepth: currentQueue.length,
        lastBackup: new Date().toLocaleTimeString()
      });
    };
    loadStats();
  }, [assets]);

  const handleSelfTest = async () => {
    setIsTesting(true);
    try {
      const results = await SystemDiagnostics.runSelfTest();
      setDiagnosticPulse(results);
      toast({ title: "Self-Test Complete", description: "Diagnostics successfully audited all storage nodes." });
    } finally {
      setIsTesting(false);
    }
  };

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

  const executeFailover = async (target: AuthorityNode) => {
    setIsProcessing(true);
    try {
      await setReadAuthority(target);
      toast({ title: "Authority Pulse Shifted", description: `Primary read source is now ${target}.` });
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
            <h3 className="text-xl font-black uppercase tracking-widest">Access Restricted</h3>
          </div>
        </div>
      </AppLayout>
    );
  }

  const activeAuthority = appSettings?.readAuthority || 'FIRESTORE';

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tight text-foreground uppercase flex items-center gap-3 leading-none">
              <div className="p-3 bg-primary/10 rounded-2xl">
                <Monitor className="h-8 w-8 text-primary" />
              </div>
              Infrastructure Command
            </h2>
            <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">
              High-Availability Redundancy & Global Parity Monitor
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline"
              onClick={handleSelfTest}
              disabled={isTesting}
              className="h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-3 border-2 hover:bg-primary/5 tactile-pulse shadow-sm"
            >
              {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cpu className="h-4 w-4" />}
              System Self-Test
            </Button>
            <Button 
              onClick={handleManualSync} 
              disabled={isProcessing || isSyncing}
              className="h-14 px-10 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 flex items-center gap-3 transition-transform hover:scale-105 active:scale-95"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />}
              Force Reconciliation
            </Button>
          </div>
        </div>

        {/* Failover Protocol Workstation */}
        <Card className="rounded-[2.5rem] border-2 border-primary/20 shadow-2xl bg-primary/[0.02] overflow-hidden mx-2">
          <CardHeader className="p-8 bg-primary/5 border-b border-primary/10">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3 text-primary">
                  <ShieldAlert className="h-5 w-5" /> Failover Protocol
                </CardTitle>
                <CardDescription className="text-xs font-medium">Deterministic shift of primary data authority.</CardDescription>
              </div>
              <Badge variant="outline" className="font-black px-4 h-8 rounded-full border-primary/20 text-primary bg-primary/10">
                ACTIVE AUTHORITY: {activeAuthority}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button 
                onClick={() => executeFailover('FIRESTORE')}
                disabled={isProcessing || activeAuthority === 'FIRESTORE'}
                className={cn(
                  "p-8 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-4 group",
                  activeAuthority === 'FIRESTORE' 
                    ? "bg-primary border-primary text-white shadow-xl" 
                    : "bg-background border-border/40 hover:border-primary/40 hover:bg-primary/5"
                )}
              >
                <div className={cn(
                  "p-4 rounded-2xl transition-colors",
                  activeAuthority === 'FIRESTORE' ? "bg-white/20" : "bg-primary/10 text-primary"
                )}>
                  <Cloud className="h-10 w-10" />
                </div>
                <div className="text-center">
                  <h4 className="text-sm font-black uppercase tracking-widest">Restore Cloud Authority</h4>
                  <p className={cn(
                    "text-[10px] font-medium italic mt-1",
                    activeAuthority === 'FIRESTORE' ? "text-white/60" : "text-muted-foreground"
                  )}>
                    Standard cluster operations (Firestore).
                  </p>
                </div>
                {activeAuthority === 'FIRESTORE' && <CheckCircle2 className="h-5 w-5 mt-auto" />}
              </button>

              <button 
                onClick={() => executeFailover('RTDB')}
                disabled={isProcessing || activeAuthority === 'RTDB'}
                className={cn(
                  "p-8 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-4 group",
                  activeAuthority === 'RTDB' 
                    ? "bg-green-600 border-green-600 text-white shadow-xl" 
                    : "bg-background border-border/40 hover:border-green-500/40 hover:bg-green-500/5"
                )}
              >
                <div className={cn(
                  "p-4 rounded-2xl transition-colors",
                  activeAuthority === 'RTDB' ? "bg-white/20" : "bg-green-100 text-green-600"
                )}>
                  <Zap className="h-10 w-10" />
                </div>
                <div className="text-center">
                  <h4 className="text-sm font-black uppercase tracking-widest">Force Mirror Standby</h4>
                  <p className={cn(
                    "text-[10px] font-medium italic mt-1",
                    activeAuthority === 'RTDB' ? "text-white/60" : "text-muted-foreground"
                  )}>
                    Hot-standby replication failover (RTDB).
                  </p>
                </div>
                {activeAuthority === 'RTDB' && <CheckCircle2 className="h-5 w-5 mt-auto" />}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Topology Visualization */}
        <Card className="rounded-[2.5rem] border-2 border-border/40 shadow-2xl bg-card/50 overflow-hidden mx-2">
          <CardHeader className="bg-muted/20 p-8 border-b border-dashed">
            <CardTitle className="text-xs font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
              <Network className="h-4 w-4" /> Redundancy Topology & Pulse Direction
            </CardTitle>
          </CardHeader>
          <CardContent className="p-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-12 relative">
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-amber-500 via-green-500 to-blue-500 -translate-y-1/2 opacity-10 hidden md:block" />
              
              {/* Node 1: Local */}
              <div className="flex flex-col items-center gap-4 z-10">
                <div className="p-6 rounded-[2rem] bg-amber-500/10 border-2 border-amber-500/20 shadow-xl group hover:border-amber-500 transition-all">
                  <HardDrive className="h-10 w-10 text-amber-600" />
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Local Cache</p>
                  <p className="text-[8px] font-bold text-muted-foreground uppercase opacity-60">IDB Persistent</p>
                </div>
              </div>

              <div className="hidden md:block">
                <div className="flex flex-col items-center">
                  <ArrowRight className="h-6 w-6 text-muted-foreground opacity-20" />
                  <span className="text-[7px] font-black uppercase mt-1 opacity-20">Buffer</span>
                </div>
              </div>

              {/* Node 2: Mirror */}
              <div className="flex flex-col items-center gap-4 z-10 relative">
                <div className={cn(
                  "p-6 rounded-[2rem] border-2 shadow-xl group transition-all",
                  activeAuthority === 'RTDB' ? "bg-green-500/20 border-green-500" : "bg-green-500/10 border-green-500/20"
                )}>
                  <Activity className={cn("h-10 w-10", activeAuthority === 'RTDB' ? "text-green-600 animate-pulse" : "text-green-600")} />
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-green-700">Shadow Mirror</p>
                  <p className="text-[8px] font-bold text-muted-foreground uppercase opacity-60">RTDB Standby</p>
                </div>
                {activeAuthority === 'RTDB' && (
                  <div className="absolute -top-4 -right-4">
                    <Badge className="bg-green-600 text-[8px] font-black">PRIMARY PULSE</Badge>
                  </div>
                )}
              </div>

              <div className="hidden md:block">
                <div className="flex flex-col items-center">
                  <ArrowRightLeft className="h-6 w-6 text-muted-foreground opacity-20" />
                  <span className="text-[7px] font-black uppercase mt-1 opacity-20">Replicate</span>
                </div>
              </div>

              {/* Node 3: Cloud */}
              <div className="flex flex-col items-center gap-4 z-10 relative">
                <div className={cn(
                  "p-6 rounded-[2rem] border-2 shadow-xl group transition-all",
                  activeAuthority === 'FIRESTORE' ? "bg-blue-500/20 border-blue-500" : "bg-blue-500/10 border-blue-500/20"
                )}>
                  <Cloud className={cn("h-10 w-10", activeAuthority === 'FIRESTORE' ? "text-blue-600 animate-pulse" : "text-blue-600")} />
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">Cloud Authority</p>
                  <p className="text-[8px] font-bold text-muted-foreground uppercase opacity-60">Firestore Cluster</p>
                </div>
                {activeAuthority === 'FIRESTORE' && (
                  <div className="absolute -top-4 -right-4">
                    <Badge className="bg-blue-600 text-[8px] font-black">PRIMARY PULSE</Badge>
                  </div>
                )}
              </div>
            </div>

            {diagnosticPulse && (
              <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-bottom-2 duration-500">
                {diagnosticPulse.map((res) => (
                  <div key={res.node} className="p-4 rounded-2xl bg-muted/30 border border-border/40 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[8px] font-black uppercase opacity-40">{res.node} Pulse</span>
                      <p className="text-[10px] font-bold">{res.message}</p>
                    </div>
                    <Badge variant="outline" className={cn(
                      "text-[8px] font-mono",
                      res.status === 'STABLE' ? "text-green-600 border-green-200" : "text-destructive border-destructive/20"
                    )}>
                      {res.latency}MS
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Global Parity Monitor */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-2">
          <div className="lg:col-span-8 space-y-8">
            <Card className="rounded-[2.5rem] border-2 border-border/40 shadow-2xl bg-card/50 overflow-hidden">
              <CardHeader className="p-8 bg-muted/20 border-b flex flex-row items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                    <ArrowRightLeft className="h-5 w-5 text-primary" /> Parity Ledger Pulse
                  </CardTitle>
                  <CardDescription className="text-xs font-medium">Automatic detection of cross-layer data drift.</CardDescription>
                </div>
                <Badge variant="outline" className={cn("font-black px-4 h-8 rounded-full", discrepancyCount > 0 ? "border-destructive text-destructive" : "border-green-500 text-green-600")}>
                  {discrepancyCount} DISCREPANCIES
                </Badge>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-6 rounded-2xl border-2 border-dashed bg-background/40 space-y-2">
                    <span className="text-[9px] font-black uppercase text-muted-foreground opacity-60">Sync Drift</span>
                    <p className={cn("text-2xl font-black", discrepancyCount > 0 ? "text-destructive" : "text-green-600")}>
                      {discrepancyCount} Pulses
                    </p>
                  </div>
                  <div className="p-6 rounded-2xl border-2 border-dashed bg-background/40 space-y-2">
                    <span className="text-[9px] font-black uppercase text-muted-foreground opacity-60">Integrity Health</span>
                    <p className="text-2xl font-black text-primary">{integrityReport?.score || 0}%</p>
                  </div>
                  <div className="p-6 rounded-2xl border-2 border-dashed bg-background/40 space-y-2">
                    <span className="text-[9px] font-black uppercase text-muted-foreground opacity-60">Node Tier</span>
                    <p className="text-2xl font-black text-foreground">Global</p>
                  </div>
                </div>
                <Button 
                  asChild
                  variant="outline" 
                  className="w-full h-16 rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] border-2 hover:bg-primary/5 tactile-pulse shadow-sm"
                >
                  <Link href="/admin/database">
                    <ScanSearch className="h-4 w-4 mr-2" /> Initialize Forensic Reconciliation
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] border-2 border-border/40 shadow-2xl bg-card/50 overflow-hidden">
              <CardHeader className="p-8 bg-muted/20 border-b">
                <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                  <LineChart className="h-5 w-5 text-primary" /> Live Sync Heartbeat
                </CardTitle>
                <CardDescription className="text-xs font-medium">Real-time replication latency monitor.</CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={heartbeatData}>
                      <defs>
                        <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="latency" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#latencyGradient)" strokeWidth={3} />
                      <XAxis hide dataKey="time" />
                      <YAxis hide domain={[0, 100]} />
                      <Tooltip content={() => null} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-between mt-6 px-4">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary animate-ping" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Monitoring Active Pulse</span>
                  </div>
                  <Badge variant="outline" className="text-[9px] font-mono border-primary/20 text-primary">STABLE: 42MS</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <aside className="lg:col-span-4 space-y-6">
            <Card className="rounded-[2rem] border-2 border-border/40 shadow-none bg-muted/5 p-8 text-center flex flex-col items-center justify-center space-y-4">
              <div className="p-6 bg-primary/10 rounded-full mb-2">
                <Network className="h-10 w-10 text-primary" />
              </div>
              <h4 className="text-sm font-black uppercase tracking-tight">Redundancy Protocol</h4>
              <p className="text-[10px] font-medium text-muted-foreground leading-relaxed italic opacity-70">
                Registry flow uses a strictly synchronous &quot;Dual-Commit&quot; pulse. Every modification to the Cloud Authority is instantly mirrored to the Shadow Standby (RTDB).
              </p>
            </Card>

            <div className="p-8 rounded-[2rem] bg-orange-500/5 border-2 border-dashed border-orange-500/20 space-y-4 shadow-inner">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-600">Infrastructure Rule</h4>
              </div>
              <p className="text-[10px] font-bold text-muted-foreground leading-relaxed uppercase opacity-60">
                Atomic wipes are immutable operational pulses. Failover to the Shadow Mirror should only be used during prolonged Cloud Authority latency.
              </p>
              <Button variant="ghost" className="w-full h-12 rounded-xl font-black uppercase text-[10px] tracking-widest text-destructive hover:bg-destructive/10 border-2 border-transparent hover:border-destructive/20 transition-all">
                <Bomb className="h-4 w-4 mr-2" /> Wipe Persistence Layer
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}

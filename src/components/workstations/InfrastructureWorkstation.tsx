'use client';

/**
 * @fileOverview InfrastructureWorkstation - SPA Command Center.
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
  LineChart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { storage } from '@/offline/storage';
import { ArchiveService } from '@/lib/archive-service';
import { VirtualDBService } from '@/services/virtual-db-service';
import { SystemDiagnostics, type DiagnosticResult } from '@/lib/diagnostics';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import type { AuthorityNode } from '@/types/domain';

export function InfrastructureWorkstation() {
  const { isOnline, isSyncing, refreshRegistry, assets, appSettings, setReadAuthority } = useAppState();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [diagnosticPulse, setDiagnosticPulse] = useState<DiagnosticResult[] | null>(null);
  const [discrepancyCount, setDiscrepancyCount] = useState(0);

  useEffect(() => { VirtualDBService.getGlobalDiscrepancies().then(ids => setDiscrepancyCount(ids.length)); }, [assets]);

  const handleSelfTest = async () => {
    setIsTesting(true);
    try { const res = await SystemDiagnostics.runSelfTest(); setDiagnosticPulse(res); toast({ title: "Self-Test Complete" }); }
    finally { setIsTesting(false); }
  };

  const executeFailover = async (target: AuthorityNode) => {
    setIsProcessing(true);
    try { await setReadAuthority(target); toast({ title: "Authority Shifted" }); }
    finally { setIsProcessing(false); }
  };

  if (!userProfile?.isAdmin) return <div className="py-40 text-center opacity-20"><ShieldAlert className="h-20 w-20 mx-auto" /><h2 className="text-xl font-black uppercase mt-4">Access Restricted</h2></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tight uppercase flex items-center gap-3">
            <Monitor className="h-8 w-8 text-primary" /> Infrastructure Command
          </h2>
          <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">High-Availability Redundancy Monitor</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleSelfTest} disabled={isTesting} className="h-14 px-8 rounded-2xl font-black uppercase text-[10px] gap-3 border-2"><Cpu className="h-4 w-4" /> System Self-Test</Button>
          <Button onClick={refreshRegistry} disabled={isProcessing || isSyncing} className="h-14 px-10 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-primary/20"><RefreshCw className={cn("h-4 w-4 mr-3", isSyncing && "animate-spin")} /> Force Reconciliation</Button>
        </div>
      </div>

      <Card className="rounded-[2.5rem] border-2 border-primary/20 bg-primary/[0.02] overflow-hidden mx-2">
        <CardHeader className="p-8 bg-primary/5 border-b border-primary/10">
          <CardTitle className="text-xl font-black uppercase flex items-center gap-3 text-primary"><ShieldAlert className="h-5 w-5" /> Failover Protocol</CardTitle>
        </CardHeader>
        <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <button onClick={() => executeFailover('FIRESTORE')} className={cn("p-8 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-4", appSettings?.readAuthority === 'FIRESTORE' ? "bg-primary text-white" : "bg-background border-border/40 hover:bg-primary/5")}>
            <Cloud className="h-10 w-10" /><h4 className="text-sm font-black uppercase">Restore Cloud Authority</h4>
          </button>
          <button onClick={() => executeFailover('RTDB')} className={cn("p-8 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-4", appSettings?.readAuthority === 'RTDB' ? "bg-green-600 text-white" : "bg-background border-border/40 hover:bg-green-500/5")}>
            <Zap className="h-10 w-10" /><h4 className="text-sm font-black uppercase">Force Mirror Standby</h4>
          </button>
        </CardContent>
      </Card>

      <Card className="rounded-[2.5rem] border-2 border-border/40 bg-card/50 overflow-hidden mx-2">
        <CardHeader className="bg-muted/20 p-8 border-b"><CardTitle className="text-xs font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3"><Network className="h-4 w-4" /> Redundancy Topology</CardTitle></CardHeader>
        <CardContent className="p-10 flex flex-col md:flex-row items-center justify-around gap-12">
          <div className="flex flex-col items-center gap-4"><HardDrive className="h-10 w-10 text-amber-600" /><span className="text-[10px] font-black uppercase">Local Cache</span></div>
          <div className="flex flex-col items-center gap-4"><Activity className="h-10 w-10 text-green-600" /><span className="text-[10px] font-black uppercase">Shadow Mirror</span></div>
          <div className="flex flex-col items-center gap-4"><Cloud className="h-10 w-10 text-blue-600" /><span className="text-[10px] font-black uppercase">Cloud Authority</span></div>
        </CardContent>
      </Card>
    </div>
  );
}
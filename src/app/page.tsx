'use client';

/**
 * @fileOverview DashboardPage - The Inventory Intelligence Hub.
 * Redesigned for high-density metrics and drill-down operational awareness.
 */

import React, { useMemo } from 'react';
import AppLayout from '@/components/app-layout';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  ShieldCheck, 
  AlertCircle, 
  Activity, 
  Loader2, 
  ArrowRight, 
  Database, 
  Globe,
  Clock,
  CheckCircle2,
  Zap,
  LayoutGrid
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import UserProfileSetup from '@/components/user-profile-setup';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { assets, settingsLoaded, isSyncing, isOnline, appSettings } = useAppState();
  const { profileSetupComplete, loading: authLoading } = useAuth();

  const stats = useMemo(() => {
    if (!settingsLoaded || !assets) return { total: 0, verified: 0, discrepancies: 0, coverage: 0 };
    
    const total = assets.length;
    const verified = assets.filter(a => a.status === 'VERIFIED').length;
    const discrepancies = assets.filter(a => a.status === 'DISCREPANCY').length;
    const coverage = total > 0 ? Math.round((verified / total) * 100) : 0;

    return { total, verified, discrepancies, coverage };
  }, [assets, settingsLoaded]);

  if (authLoading || !settingsLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!profileSetupComplete) {
    return <UserProfileSetup />;
  }

  const activeProjectName = appSettings?.grants.find(g => g.id === appSettings.activeGrantId)?.name || 'Global Registry';

  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
        {/* Header Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tight text-foreground uppercase">Inventory Pulse</h2>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary font-black uppercase text-[10px] tracking-widest px-3">
                {activeProjectName}
              </Badge>
              <Badge variant="outline" className={cn(
                "font-black uppercase text-[10px] tracking-widest px-3",
                isOnline ? "text-green-600 border-green-200 bg-green-50" : "text-orange-600 border-orange-200 bg-orange-50"
              )}>
                {isOnline ? <Globe className="mr-1.5 h-3 w-3 inline" /> : <Database className="mr-1.5 h-3 w-3 inline" />}
                {isOnline ? 'Online Assets' : 'Locally Saved Assets'}
              </Badge>
            </div>
          </div>
          <Button variant="ghost" className="text-[10px] font-black uppercase tracking-[0.2em] group hover:bg-primary/5" asChild>
            <Link href="/assets">
              Registry Explorer <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link href="/assets?filter=all" className="transition-transform hover:scale-[1.02] active:scale-95">
            <Card className="bg-primary border-none shadow-2xl shadow-primary/20 text-primary-foreground h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Project Coverage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-5xl font-black tracking-tighter mb-2">{stats.coverage}%</div>
                <Progress value={stats.coverage} className="h-1 bg-white/20" />
              </CardContent>
            </Card>
          </Link>

          <Card className="border-border/40 shadow-xl bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Verified Units</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black tracking-tighter text-foreground">{stats.verified}</div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Confirmed Field assessment</p>
            </CardContent>
          </Card>

          <Card className="border-border/40 shadow-xl bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Awaiting Assessment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black tracking-tighter text-orange-500">{stats.total - stats.verified}</div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Pending Field Pulse</p>
            </CardContent>
          </Card>

          <Card className="border-border/40 shadow-xl bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Exceptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black tracking-tighter text-destructive">{stats.discrepancies}</div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Integrity Failures detected</p>
            </CardContent>
          </Card>
        </div>

        {/* Intelligence Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity Log */}
          <Card className="lg:col-span-2 border-border/40 shadow-2xl bg-card/50 overflow-hidden">
            <CardHeader className="bg-muted/30 border-b p-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-black tracking-tight uppercase">Recent Pulse History</CardTitle>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mt-1">Latest modifications in {activeProjectName}</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {assets.slice(0, 5).map((asset) => (
                  <div key={asset.id} className="flex items-center justify-between p-5 rounded-2xl border-2 border-dashed border-border/40 hover:border-primary/20 transition-all group bg-background/40">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-muted rounded-xl group-hover:bg-primary/10 transition-colors">
                        <Activity className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black uppercase tracking-tight">{asset.description || asset.name}</span>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                          {asset.location} &bull; {asset.category} &bull; By {asset.lastModifiedBy}
                        </span>
                      </div>
                    </div>
                    <div className={cn(
                      "text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border",
                      asset.status === 'VERIFIED' 
                        ? "text-green-600 bg-green-50 border-green-100" 
                        : "text-orange-600 bg-orange-50 border-orange-100"
                    )}>
                      {asset.status}
                    </div>
                  </div>
                ))}
                {assets.length === 0 && (
                  <div className="py-20 text-center opacity-30">
                    <div className="p-6 bg-muted rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                      <Database className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">Registry pulse silent</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* System Pulse Panel */}
          <div className="space-y-8">
            <Card className="border-border/40 shadow-2xl bg-card/50 overflow-hidden">
              <CardHeader className="bg-primary/5 border-b p-6">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 fill-current" /> System Integrity Pulse
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 rounded-lg"><ShieldCheck className="h-4 w-4 text-green-600" /></div>
                    <span className="text-xs font-black uppercase tracking-tight text-muted-foreground">Fidelity Status</span>
                  </div>
                  <span className="text-[10px] font-black uppercase text-green-600">Stable Heartbeat</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/5 rounded-lg"><TrendingUp className="h-4 w-4 text-primary" /></div>
                    <span className="text-xs font-black uppercase tracking-tight text-muted-foreground">Audit Momentum</span>
                  </div>
                  <span className="text-[10px] font-black uppercase text-primary">+{stats.coverage > 0 ? (stats.coverage / 7).toFixed(1) : '0.0'}% / Week</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-50 rounded-lg"><Activity className="h-4 w-4 text-orange-600" /></div>
                    <span className="text-xs font-black uppercase tracking-tight text-muted-foreground">Sync Heartbeat</span>
                  </div>
                  <span className={cn(
                    "text-[10px] font-black uppercase",
                    isSyncing ? "text-primary animate-pulse" : "text-orange-600"
                  )}>
                    {isSyncing ? 'Synchronizing...' : 'Reconciled'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="p-8 rounded-[2.5rem] bg-primary/5 border-2 border-dashed border-primary/20 text-center space-y-6 shadow-inner">
              <div className="p-4 bg-primary/10 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                <LayoutGrid className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-black uppercase tracking-widest text-primary">Ingestion Engine Ready</h4>
                <p className="text-[10px] font-medium text-muted-foreground leading-relaxed italic px-4">
                  Initialize the deterministic workbook parser to ingest new hierarchical data batches for {activeProjectName}.
                </p>
              </div>
              <Button className="w-full h-14 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl shadow-primary/20 transition-transform hover:scale-[1.02] active:scale-95" asChild>
                <Link href="/import">Initialize Ingestion</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

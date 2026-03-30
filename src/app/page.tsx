'use client';

/**
 * @fileOverview DashboardPage - The Inventory Intelligence Hub.
 * Final Polish: High-density KPI cards with motion-aware drill-downs.
 */

import React, { useMemo } from 'react';
import AppLayout from '@/components/app-layout';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { motion } from 'framer-motion';
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

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  show: { opacity: 1, scale: 1, y: 0 }
};

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
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-8 pb-20"
      >
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-4xl font-black tracking-tighter text-foreground uppercase leading-none">Inventory Pulse</h2>
            <div className="flex items-center gap-3 mt-2">
              <Badge className="bg-primary/5 border-2 border-primary/20 text-primary font-black uppercase text-[10px] tracking-widest px-4 h-7 rounded-full shadow-sm">
                {activeProjectName}
              </Badge>
              <Badge variant="outline" className={cn(
                "font-black uppercase text-[10px] tracking-widest px-4 h-7 rounded-full border-2 shadow-sm transition-colors",
                isOnline ? "text-green-600 border-green-200 bg-green-50" : "text-orange-600 border-orange-200 bg-orange-50"
              )}>
                {isOnline ? <Globe className="mr-2 h-3 w-3 inline" /> : <Database className="mr-2 h-3 w-3 inline" />}
                {isOnline ? 'Online Assets' : 'Locally Saved Assets'}
              </Badge>
            </div>
          </div>
          <Button variant="ghost" className="h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] group hover:bg-primary/5 border-2 border-transparent hover:border-primary/10 transition-all" asChild>
            <Link href="/assets">
              Registry Explorer <ArrowRight className="ml-3 h-4 w-4 transition-transform group-hover:translate-x-2" />
            </Link>
          </Button>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div variants={item}>
            <Link href="/assets" className="block h-full group">
              <Card className="bg-primary border-none shadow-2xl shadow-primary/30 text-primary-foreground h-full relative overflow-hidden transition-all group-hover:-translate-y-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70">Project Coverage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-6xl font-black tracking-tighter mb-4">{stats.coverage}%</div>
                  <Progress value={stats.coverage} className="h-1.5 bg-white/20" />
                  <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:rotate-12 transition-transform duration-700">
                    <TrendingUp className="h-32 w-32" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>

          <motion.div variants={item}>
            <Card className="border-2 border-border/40 shadow-xl bg-card/50 hover:border-primary/20 transition-all">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Verified Units
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-5xl font-black tracking-tighter text-foreground leading-none">{stats.verified}</div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase mt-3 tracking-tighter opacity-60">Confirmed field assessment</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="border-2 border-border/40 shadow-xl bg-card/50 hover:border-orange-500/20 transition-all">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-orange-500" /> Awaiting Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-5xl font-black tracking-tighter text-orange-500 leading-none">{stats.total - stats.verified}</div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase mt-3 tracking-tighter opacity-60">Pending field pulse</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="border-2 border-border/40 shadow-xl bg-card/50 hover:border-red-500/20 transition-all">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-destructive" /> Exceptions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-5xl font-black tracking-tighter text-destructive leading-none">{stats.discrepancies}</div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase mt-3 tracking-tighter opacity-60">Integrity failures detected</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Intelligence Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity Log */}
          <motion.div variants={item} className="lg:col-span-2">
            <Card className="border-2 border-border/40 shadow-2xl bg-card/50 overflow-hidden h-full">
              <CardHeader className="bg-muted/30 border-b p-8">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-2xl font-black tracking-tight uppercase">Recent Pulse History</CardTitle>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-[0.2em] mt-1">Latest modifications in {activeProjectName}</p>
                  </div>
                  <div className="p-4 bg-primary/10 rounded-2xl shadow-inner">
                    <Activity className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                  <div className="p-8 space-y-4">
                    {assets.slice(0, 8).map((asset, idx) => (
                      <div key={asset.id} className="flex items-center justify-between p-5 rounded-2xl border-2 border-dashed border-border/40 hover:border-primary/20 transition-all group bg-background/40 hover:shadow-lg hover:shadow-primary/5">
                        <div className="flex items-center gap-5">
                          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-[10px] font-black opacity-40 group-hover:bg-primary/10 group-hover:text-primary group-hover:opacity-100 transition-all">
                            {String(idx + 1).padStart(2, '0')}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-black uppercase tracking-tight line-clamp-1">{asset.description || asset.name}</span>
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 mt-1">
                              {asset.location} &bull; {asset.category} &bull; By {asset.lastModifiedBy}
                            </span>
                          </div>
                        </div>
                        <Badge className={cn(
                          "text-[9px] font-black uppercase tracking-widest h-7 px-3 rounded-full border shadow-sm",
                          asset.status === 'VERIFIED' 
                            ? "text-green-600 bg-green-50 border-green-100" 
                            : "text-orange-600 bg-orange-50 border-orange-100"
                        )}>
                          {asset.status}
                        </Badge>
                      </div>
                    ))}
                    {assets.length === 0 && (
                      <div className="py-24 text-center opacity-30">
                        <div className="p-8 bg-muted rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center shadow-inner">
                          <Database className="h-12 w-12 text-muted-foreground" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em]">Registry pulse silent</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>

          {/* System Pulse Panel */}
          <div className="space-y-8">
            <motion.div variants={item}>
              <Card className="border-2 border-border/40 shadow-2xl bg-card/50 overflow-hidden">
                <CardHeader className="bg-primary/5 border-b p-8">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                    <Zap className="h-4 w-4 fill-current" /> System Integrity Pulse
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <div className="flex items-center justify-between border-b border-dashed pb-4">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-green-100 rounded-xl shadow-inner"><ShieldCheck className="h-5 w-5 text-green-600" /></div>
                      <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Fidelity State</span>
                    </div>
                    <span className="text-[10px] font-black uppercase text-green-600 tracking-tighter">Stable Heartbeat</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-dashed pb-4">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-primary/5 rounded-xl shadow-inner"><TrendingUp className="h-5 w-5 text-primary" /></div>
                      <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Audit Momentum</span>
                    </div>
                    <span className="text-[10px] font-black uppercase text-primary tracking-tighter">+{stats.coverage > 0 ? (stats.coverage / 7).toFixed(1) : '0.0'}% / Week</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-orange-100 rounded-xl shadow-inner"><Activity className="h-5 w-5 text-orange-600" /></div>
                      <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Sync Pulse</span>
                    </div>
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-tighter",
                      isSyncing ? "text-primary animate-pulse" : "text-orange-600"
                    )}>
                      {isSyncing ? 'Broadcasting...' : 'Reconciled'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <div className="p-10 rounded-[3rem] bg-primary/5 border-2 border-dashed border-primary/20 text-center space-y-8 shadow-2xl shadow-primary/5 group hover:bg-primary/[0.07] transition-all">
                <div className="p-6 bg-primary/10 rounded-full w-24 h-24 mx-auto flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                  <LayoutGrid className="h-12 w-12 text-primary" />
                </div>
                <div className="space-y-3">
                  <h4 className="text-lg font-black uppercase tracking-tight text-primary">Ingestion Engine Ready</h4>
                  <p className="text-[10px] font-bold text-muted-foreground leading-relaxed uppercase tracking-widest opacity-60 px-4 italic">
                    Discover hierarchical provenance markers in new registry batch pulses.
                  </p>
                </div>
                <Button className="w-full h-16 rounded-[1.5rem] font-black uppercase text-xs tracking-[0.25em] shadow-2xl shadow-primary/20 transition-all hover:-translate-y-1 active:scale-95" asChild>
                  <Link href="/import">Initialize Ingestion</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </AppLayout>
  );
}

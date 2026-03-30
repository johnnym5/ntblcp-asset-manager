'use client';

/**
 * @fileOverview Intelligence Hub - The Operational Command Center.
 * Phase 16: High-density KPI grid with Integrity Scrubbing & Regional Benchmarking.
 */

import React, { useMemo, useState, useEffect } from 'react';
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
  LayoutGrid,
  ShieldAlert,
  Fingerprint,
  FileWarning,
  Map,
  History,
  PieChart,
  ShieldHalf
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import UserProfileSetup from '@/components/user-profile-setup';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArchiveService } from '@/lib/archive-service';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function DashboardPage() {
  const { assets, settingsLoaded, isSyncing, isOnline, appSettings, activeGrantId } = useAppState();
  const { profileSetupComplete, loading: authLoading, userProfile } = useAuth();
  
  const [integrityScore, setIntegrityScore] = useState(100);
  const [integrityConflicts, setIntegrityConflicts] = useState(0);

  useEffect(() => {
    if (assets.length > 0) {
      ArchiveService.runIntegrityAudit(assets).then(report => {
        setIntegrityScore(report.score);
        setIntegrityConflicts(report.conflicts);
      });
    }
  }, [assets]);

  const stats = useMemo(() => {
    if (!settingsLoaded || !assets) return null;
    
    const total = assets.length;
    const verified = assets.filter(a => a.status === 'VERIFIED').length;
    const coverage = total > 0 ? Math.round((verified / total) * 100) : 0;

    // Data Quality Exceptions
    const missingSerials = assets.filter(a => !a.serialNumber || a.serialNumber === 'N/A').length;
    const missingTags = assets.filter(a => !a.assetIdCode).length;
    const criticalHealth = assets.filter(a => ['Stolen', 'Burnt', 'Unsalvageable'].includes(a.condition || '')).length;

    // Regional Benchmarking
    const regionalStats = assets.reduce((acc, a) => {
      const loc = a.location || 'GLOBAL';
      if (!acc[loc]) acc[loc] = { total: 0, verified: 0 };
      acc[loc].total++;
      if (a.status === 'VERIFIED') acc[loc].verified++;
      return acc;
    }, {} as Record<string, { total: number, verified: number }>);

    const benchmarking = Object.entries(regionalStats)
      .map(([name, s]) => ({ 
        name, 
        total: s.total, 
        verified: s.verified, 
        percentage: Math.round((s.verified / s.total) * 100) 
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    return { total, verified, coverage, missingSerials, missingTags, criticalHealth, benchmarking };
  }, [assets, settingsLoaded]);

  if (authLoading || !settingsLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!profileSetupComplete) return <UserProfileSetup />;

  const activeProjectName = appSettings?.grants.find(g => g.id === activeGrantId)?.name || 'Registry Hub';

  return (
    <AppLayout>
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-10 pb-20 max-w-7xl mx-auto"
      >
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-4xl font-black tracking-tighter text-foreground uppercase leading-none">Operational Pulse</h2>
            <div className="flex items-center gap-3 mt-2">
              <Badge className="bg-primary/5 border-2 border-primary/20 text-primary font-black uppercase text-[10px] tracking-widest px-4 h-7 rounded-full shadow-sm">
                {activeProjectName}
              </Badge>
              <Badge variant="outline" className={cn(
                "font-black uppercase text-[10px] tracking-widest px-4 h-7 rounded-full border-2 shadow-sm transition-colors",
                isOnline ? "text-green-600 border-green-200 bg-green-50" : "text-orange-600 border-orange-200 bg-orange-50"
              )}>
                {isOnline ? <Globe className="mr-2 h-3 w-3 inline" /> : <Database className="mr-2 h-3 w-3 inline" />}
                {isOnline ? 'Cloud Active' : 'Offline Mode'}
              </Badge>
            </div>
          </div>
          <Button variant="ghost" className="h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] group hover:bg-primary/5 border-2 border-transparent hover:border-primary/10 transition-all" asChild>
            <Link href="/assets">
              Explore Registry <ArrowRight className="ml-3 h-4 w-4 transition-transform group-hover:translate-x-2" />
            </Link>
          </Button>
        </div>

        {/* Primary KPI Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div variants={item}>
            <Card className="bg-primary border-none shadow-2xl shadow-primary/30 text-primary-foreground h-full relative overflow-hidden group">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70">Project Coverage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-6xl font-black tracking-tighter mb-4">{stats?.coverage || 0}%</div>
                <Progress value={stats?.coverage || 0} className="h-1.5 bg-white/20" />
                <TrendingUp className="absolute -right-4 -bottom-4 h-32 w-32 opacity-10 group-hover:rotate-12 transition-transform duration-700" />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="border-2 border-border/40 shadow-xl bg-card/50 hover:border-primary/20 transition-all">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Verified Pulses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-5xl font-black tracking-tighter text-foreground leading-none">{stats?.verified || 0}</div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase mt-3 tracking-tighter opacity-60">Physical assessments confirmed</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="border-2 border-border/40 shadow-xl bg-card/50 hover:border-orange-500/20 transition-all">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-orange-500" /> Awaiting Pulse
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-5xl font-black tracking-tighter text-orange-500 leading-none">{(stats?.total || 0) - (stats?.verified || 0)}</div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase mt-3 tracking-tighter opacity-60">Pending field assessment</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="border-2 border-border/40 shadow-xl bg-card/50 hover:border-red-500/20 transition-all">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                  <ShieldAlert className="h-3.5 w-3.5 text-destructive" /> Critical Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-5xl font-black tracking-tighter text-destructive leading-none">{stats?.criticalHealth || 0}</div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase mt-3 tracking-tighter opacity-60">High-risk registry exceptions</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Intelligence Breakdown Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Regional Benchmarking Matrix */}
          <motion.div variants={item} className="lg:col-span-2">
            <Card className="border-2 border-border/40 shadow-2xl bg-card/50 overflow-hidden rounded-[2.5rem]">
              <CardHeader className="bg-muted/30 border-b p-8">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-2xl font-black tracking-tight uppercase flex items-center gap-3">
                      <Map className="h-6 w-6 text-primary" /> Regional Performance Matrix
                    </CardTitle>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-[0.2em] mt-1">Verification coverage by authorized jurisdiction</p>
                  </div>
                  <Badge variant="outline" className="border-primary/20 text-primary font-black uppercase text-[10px]">Top 6 Pulse Zones</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/10">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="py-4 pl-8 text-[9px] font-black uppercase tracking-widest">State / Store</TableHead>
                      <TableHead className="py-4 text-[9px] font-black uppercase tracking-widest">Registry Size</TableHead>
                      <TableHead className="py-4 text-right pr-8 text-[9px] font-black uppercase tracking-widest">Coverage Pulse</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats?.benchmarking.map((region) => (
                      <TableRow key={region.name} className="group hover:bg-primary/[0.02] border-b-2 border-dashed last:border-0 transition-colors">
                        <TableCell className="py-5 pl-8 font-black text-sm uppercase tracking-tight text-foreground">{region.name}</TableCell>
                        <TableCell className="py-5">
                          <span className="text-xs font-mono font-bold text-muted-foreground">{region.total} Assets</span>
                        </TableCell>
                        <TableCell className="py-5 pr-8 text-right">
                          <div className="flex items-center justify-end gap-4">
                            <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
                              <div className="h-full bg-primary" style={{ width: `${region.percentage}%` }} />
                            </div>
                            <span className="text-sm font-black text-primary tabular-nums">{region.percentage}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>

          {/* System Integrity Stack */}
          <div className="space-y-8">
            <motion.div variants={item}>
              <Card className="border-2 border-border/40 shadow-2xl bg-card/50 overflow-hidden rounded-[2.5rem]">
                <CardHeader className="bg-primary/5 border-b p-8">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                    <ShieldHalf className="h-4 w-4 fill-current" /> Maintenance Integrity
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <div className="flex items-center justify-between border-b border-dashed pb-4">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-green-100 rounded-xl"><ShieldCheck className="h-5 w-5 text-green-600" /></div>
                      <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Pulse Score</span>
                    </div>
                    <span className={cn("text-[10px] font-black uppercase", integrityScore > 90 ? "text-green-600" : "text-orange-600")}>
                      {integrityScore}% Healthy
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-dashed pb-4">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-orange-100 rounded-xl"><AlertCircle className="h-5 w-5 text-orange-600" /></div>
                      <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Conflicts</span>
                    </div>
                    <span className={cn("text-[10px] font-black uppercase", integrityConflicts > 0 ? "text-destructive" : "text-green-600")}>
                      {integrityConflicts} Detected
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-primary/10 rounded-xl"><Fingerprint className="h-5 w-5 text-primary" /></div>
                      <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Data Gaps</span>
                    </div>
                    <span className="text-[10px] font-black uppercase text-primary">{(stats?.missingSerials || 0) + (stats?.missingTags || 0)} Missing</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <div className="p-10 rounded-[3rem] bg-muted/5 border-2 border-dashed border-border/40 text-center space-y-8 group hover:bg-primary/[0.02] transition-all">
                <div className="p-6 bg-primary/10 rounded-full w-24 h-24 mx-auto flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                  <LayoutGrid className="h-12 w-12 text-primary" />
                </div>
                <div className="space-y-3">
                  <h4 className="text-lg font-black uppercase tracking-tight text-primary">Ingestion Workflow</h4>
                  <p className="text-[10px] font-bold text-muted-foreground leading-relaxed uppercase tracking-widest opacity-60 px-4">
                    Merge hierarchical spreadsheet pulses into the global registry.
                  </p>
                </div>
                <Button className="w-full h-16 rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 transition-all hover:-translate-y-1" asChild>
                  <Link href="/import">Initialize Ingest</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </AppLayout>
  );
}

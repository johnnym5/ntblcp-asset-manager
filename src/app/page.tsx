'use client';

/**
 * @fileOverview Intelligence Hub - The Operational Command Center.
 * Phase 59: Integrated Coverage Trend Analysis & Tactictal Pulse.
 */

import React, { useMemo, useState, useEffect } from 'react';
import AppLayout from '@/components/app-layout';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  TrendingUp, 
  Loader2, 
  ArrowRight, 
  Database, 
  Globe,
  Map,
  ShieldHalf,
  LayoutGrid,
  FileUp,
  ClipboardCheck,
  History,
  Activity,
  Camera,
  AlertTriangle,
  BarChart3,
  Monitor,
  RefreshCw,
  FolderKanban,
  CheckCircle2,
  XCircle,
  Fingerprint,
  ChevronDown,
  LineChart,
  AreaChart as AreaChartIcon,
  ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import UserProfileSetup from '@/components/user-profile-setup';
import { WelcomeExperience } from '@/components/WelcomeExperience';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArchiveService } from '@/lib/archive-service';
import { VerificationPulse } from '@/components/registry/VerificationPulse';
import { FirestoreService } from '@/services/firebase/firestore';
import { VirtualDBService } from '@/services/virtual-db-service';
import { storage } from '@/offline/storage';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Cell, AreaChart, Area, CartesianGrid } from 'recharts';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

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
  const { assets, settingsLoaded, isOnline, appSettings, activeGrantId, setActiveGrantId, refreshRegistry } = useAppState();
  const { userProfile, profileSetupComplete, loading: authLoading } = useAuth();
  
  const [integrityReport, setIntegrityReport] = useState<any>(null);
  const [syncDrift, setSyncDrift] = useState(0);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (assets.length > 0) {
      ArchiveService.runIntegrityAudit(assets).then(report => {
        setIntegrityReport(report);
      });
    }
    
    if (userProfile?.isAdmin) {
      VirtualDBService.getGlobalDiscrepancies().then(ids => {
        setSyncDrift(ids.length);
      });
    }
  }, [assets, userProfile]);

  useEffect(() => {
    if (settingsLoaded && appSettings && !appSettings.onboardingComplete) {
      setShowWelcome(true);
    }
  }, [settingsLoaded, appSettings]);

  const handleWelcomeComplete = async () => {
    setShowWelcome(false);
    if (appSettings) {
      const updated = { ...appSettings, onboardingComplete: true };
      await storage.saveSettings(updated);
      if (isOnline) {
        await FirestoreService.updateSettings(updated);
      }
      await refreshRegistry();
    }
  };

  const stats = useMemo(() => {
    if (!settingsLoaded || !assets) return null;
    
    const total = assets.length;
    const verified = assets.filter(a => a.status === 'VERIFIED').length;
    const missingSerials = assets.filter(a => !a.serialNumber || a.serialNumber === 'N/A').length;
    const missingTags = assets.filter(a => !a.assetIdCode).length;
    const criticalHealth = assets.filter(a => ['Stolen', 'Burnt', 'Unsalvageable'].includes(a.condition || '')).length;

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

    // Trend Pulse: Last 30 Days
    const trendData = Array.from({ length: 15 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (14 - i));
      const dayStr = d.toISOString().split('T')[0];
      const verifiedUpToDay = assets.filter(a => a.status === 'VERIFIED' && a.lastModified <= dayStr + 'T23:59:59Z').length;
      return {
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        coverage: total > 0 ? Math.round((verifiedUpToDay / total) * 100) : 0
      };
    });

    const velocityData = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      const count = assets.filter(a => a.lastModified.startsWith(dayStr)).length;
      return { 
        name: d.toLocaleDateString('en-US', { weekday: 'short' }), 
        pulses: count 
      };
    }).reverse();

    return { 
      total, 
      verified, 
      missingSerials, 
      missingTags, 
      criticalHealth, 
      benchmarking,
      velocityData,
      trendData,
      dataGaps: missingSerials + missingTags
    };
  }, [assets, settingsLoaded]);

  if (authLoading || !settingsLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!profileSetupComplete) return <UserProfileSetup />;

  const activeGrant = appSettings?.grants.find(g => g.id === activeGrantId);
  const otherGrants = appSettings?.grants.filter(g => g.id !== activeGrantId) || [];

  return (
    <AppLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-10 pb-32 max-w-7xl mx-auto">
        {/* Header: Project Switcher Cockpit */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
          <div className="space-y-1">
            <div className="flex items-center gap-4">
              <h2 className="text-4xl font-black tracking-tighter text-foreground uppercase leading-none">Intelligence Hub</h2>
              {appSettings && appSettings.grants.length > 1 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-10 px-4 rounded-xl border-2 border-primary/10 bg-card hover:bg-primary/5 gap-2 group shadow-sm transition-all">
                      <FolderKanban className="h-4 w-4 text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Switch Project</span>
                      <ChevronDown className="h-3 w-3 opacity-40 group-data-[state=open]:rotate-180 transition-transform" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64 rounded-2xl border-2 shadow-2xl p-2">
                    <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-widest opacity-40 px-2 py-3">Active Registry Pulse</DropdownMenuLabel>
                    <DropdownMenuItem className="rounded-xl h-12 bg-primary/5 text-primary mb-1">
                      <div className="flex flex-col min-w-0">
                        <span className="font-black text-[11px] uppercase truncate">{activeGrant?.name}</span>
                        <span className="text-[8px] font-bold uppercase opacity-60">Currently Active</span>
                      </div>
                      <CheckCircle2 className="h-4 w-4 ml-auto" />
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-2" />
                    <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-widest opacity-40 px-2 py-3">Other Projects</DropdownMenuLabel>
                    {otherGrants.map(grant => (
                      <DropdownMenuItem 
                        key={grant.id} 
                        onClick={() => setActiveGrantId(grant.id)}
                        className="rounded-xl h-12 hover:bg-muted group cursor-pointer"
                      >
                        <span className="font-bold text-[11px] uppercase truncate group-hover:text-primary transition-colors">{grant.name}</span>
                        <ArrowRight className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <div className="flex items-center gap-3 mt-2">
              <Badge className="bg-primary/5 border-2 border-primary/20 text-primary font-black uppercase text-[10px] tracking-widest px-4 h-7 rounded-full shadow-sm">
                {activeGrant?.name || 'Registry Hub'}
              </Badge>
              <Badge variant="outline" className={cn("font-black uppercase text-[10px] tracking-widest px-4 h-7 rounded-full border-2 shadow-sm transition-colors", isOnline ? "text-green-600 border-green-200 bg-green-50" : "text-orange-600 border-orange-200 bg-orange-50")}>
                {isOnline ? <Globe className="mr-2 h-3 w-3 inline" /> : <Database className="mr-2 h-3 w-3 inline" />}
                {isOnline ? 'Cloud Active' : 'Offline Mode'}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" asChild className="h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest gap-2">
              <Link href="/alerts"><ShieldAlert className="h-4 w-4 text-destructive" /> Tactical Alerts</Link>
            </Button>
            <Button className="h-12 px-8 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 group" asChild>
              <Link href="/assets">Explore Registry <ArrowRight className="ml-3 h-4 w-4 transition-transform group-hover:translate-x-2" /></Link>
            </Button>
          </div>
        </div>

        <VerificationPulse total={stats?.total || 0} verified={stats?.verified || 0} exceptions={stats?.criticalHealth || 0} dataGaps={stats?.dataGaps || 0} className="px-1" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-1">
          <motion.div variants={item} className="lg:col-span-2 space-y-8">
            <Card className="border-2 border-primary/10 bg-card shadow-2xl rounded-[2.5rem] overflow-hidden">
              <CardHeader className="p-8 pb-4 border-b border-dashed">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-black uppercase tracking-tight">Coverage Trend</CardTitle>
                      <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">Verification Pulse Trajectory</CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-primary text-white font-black uppercase text-[10px] h-8 px-4 rounded-full">
                    {stats?.verified} / {stats?.total} TARGETS
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-10">
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats?.trendData}>
                      <defs>
                        <linearGradient id="coverageGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.2} />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 9, fontWeight: 900, fill: 'hsl(var(--muted-foreground))' }} 
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 9, fontWeight: 900, fill: 'hsl(var(--muted-foreground))' }} 
                        unit="%"
                      />
                      <RechartsTooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-background border-2 border-primary/20 p-4 rounded-2xl shadow-2xl">
                                <p className="text-[10px] font-black uppercase text-primary mb-1">{payload[0].payload.date}</p>
                                <p className="text-lg font-black">{payload[0].value}% Coverage</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="coverage" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={4}
                        fillOpacity={1} 
                        fill="url(#coverageGradient)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-border/40 shadow-2xl bg-card/50 overflow-hidden rounded-[2.5rem]">
              <CardHeader className="bg-muted/30 border-b p-8 flex flex-row items-center justify-between">
                <CardTitle className="text-2xl font-black tracking-tight uppercase flex items-center gap-3"><Map className="h-6 w-6 text-primary" /> Regional Matrix</CardTitle>
                <Badge variant="outline" className="border-primary/20 text-primary font-black uppercase text-[10px]">Registry Coverage Pulse</Badge>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/10">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="py-4 pl-8 text-[9px] font-black uppercase tracking-widest">State / Store</TableHead>
                      <TableHead className="py-4 text-right pr-8 text-[9px] font-black uppercase tracking-widest">Coverage Pulse</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats?.benchmarking.map((region) => (
                      <TableRow key={region.name} className="group hover:bg-primary/[0.02] border-b-2 border-dashed last:border-0 transition-colors">
                        <TableCell className="py-5 pl-8 font-black text-sm uppercase tracking-tight text-foreground">{region.name}</TableCell>
                        <TableCell className="py-5 pr-8 text-right">
                          <div className="flex items-center justify-end gap-4">
                            <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
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

          <div className="space-y-8">
            {/* Registry Health Cockpit */}
            <motion.div variants={item}>
              <Card className="border-2 border-border/40 bg-card shadow-2xl rounded-[2.5rem] overflow-hidden">
                <CardHeader className="p-8 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-primary rounded-xl">
                        <ShieldHalf className="h-5 w-5 text-white" />
                      </div>
                      <CardTitle className="text-xl font-black uppercase tracking-tight">Registry Fidelity</CardTitle>
                    </div>
                    <Badge className="bg-primary text-white font-black uppercase text-[9px]">{integrityReport?.score || 100}% HEALTH</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-8 pt-0 space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/40">
                      <div className="flex items-center gap-3">
                        <Fingerprint className={cn("h-4 w-4", stats?.missingSerials ? "text-orange-500" : "text-green-600")} />
                        <span className="text-[10px] font-black uppercase opacity-60">Missing Serials</span>
                      </div>
                      <span className={cn("text-xs font-black", stats?.missingSerials ? "text-orange-600" : "text-green-600")}>{stats?.missingSerials}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/40">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className={cn("h-4 w-4", stats?.criticalHealth ? "text-destructive" : "text-green-600")} />
                        <span className="text-[10px] font-black uppercase opacity-60">High-Risk Alerts</span>
                      </div>
                      <span className={cn("text-xs font-black", stats?.criticalHealth ? "text-destructive" : "text-green-600")}>{stats?.criticalHealth}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/40">
                      <div className="flex items-center gap-3">
                        <History className={cn("h-4 w-4", syncDrift ? "text-primary" : "text-green-600")} />
                        <span className="text-[10px] font-black uppercase opacity-60">Infrastructure Drift</span>
                      </div>
                      <span className={cn("text-xs font-black", syncDrift ? "text-primary" : "text-green-600")}>{syncDrift} Pulse(s)</span>
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <Button variant="ghost" asChild className="w-full h-12 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2 bg-primary/5 hover:bg-primary/10">
                      <Link href="/reports"><CheckCircle2 className="h-3.5 w-3.5" /> Initialize Fidelity Audit</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={item} className="grid grid-cols-1 gap-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground px-2">Common Operations</h4>
              <Link href="/import" className="group"><div className="p-6 rounded-[2rem] bg-card border-2 border-border/40 group-hover:border-primary/20 shadow-lg transition-all flex items-center justify-between"><div className="flex items-center gap-4"><div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors"><FileUp className="h-5 w-5 text-primary" /></div><div className="flex flex-col"><span className="text-sm font-black uppercase tracking-tight">Upload Center</span><span className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Ingest Workbook</span></div></div><ArrowRight className="h-4 w-4 opacity-20 group-hover:translate-x-1 transition-all" /></div></Link>
              <Link href="/verify" className="group"><div className="p-6 rounded-[2rem] bg-card border-2 border-border/40 group-hover:border-primary/20 shadow-lg transition-all flex items-center justify-between"><div className="flex items-center gap-4"><div className="p-3 bg-green-500/10 rounded-xl group-hover:bg-green-500/20 transition-colors"><ClipboardCheck className="h-5 w-5 text-green-600" /></div><div className="flex flex-col"><span className="text-sm font-black uppercase tracking-tight">To Review</span><span className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Audit Field findings</span></div></div><ArrowRight className="h-4 w-4 opacity-20 group-hover:translate-x-1 transition-all" /></div></Link>
              <Link href="/audit-log" className="group"><div className="p-6 rounded-[2rem] bg-card border-2 border-border/40 group-hover:border-primary/20 shadow-lg transition-all flex items-center justify-between"><div className="flex items-center gap-4"><div className="p-3 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors"><History className="h-5 w-5 text-blue-600" /></div><div className="flex flex-col"><span className="text-sm font-black uppercase tracking-tight">Registry Ledger</span><span className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Traceability Heartbeat</span></div></div><ArrowRight className="h-4 w-4 opacity-20 group-hover:translate-x-1 transition-all" /></div></Link>
            </motion.div>
          </div>
        </div>
      </motion.div>
      <WelcomeExperience isOpen={showWelcome} onComplete={handleWelcomeComplete} />
    </AppLayout>
  );
}


'use client';

/**
 * @fileOverview Intelligence Hub - The Operational Command Center.
 * Phase 45: Removed AI interpretation pulses.
 */

import React, { useMemo, useState, useEffect } from 'react';
import AppLayout from '@/components/app-layout';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  BarChart3
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
import { storage } from '@/offline/storage';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Cell } from 'recharts';

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
  const { assets, settingsLoaded, isOnline, appSettings, activeGrantId, refreshRegistry } = useAppState();
  const { profileSetupComplete, loading: authLoading } = useAuth();
  
  const [integrityScore, setIntegrityScore] = useState(100);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (assets.length > 0) {
      ArchiveService.runIntegrityAudit(assets).then(report => {
        setIntegrityScore(report.score);
      });
    }
  }, [assets]);

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

  const activeProjectName = appSettings?.grants.find(g => g.id === activeGrantId)?.name || 'Registry Hub';

  return (
    <AppLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-10 pb-32 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
          <div className="space-y-1">
            <h2 className="text-4xl font-black tracking-tighter text-foreground uppercase leading-none">Intelligence Hub</h2>
            <div className="flex items-center gap-3 mt-2">
              <Badge className="bg-primary/5 border-2 border-primary/20 text-primary font-black uppercase text-[10px] tracking-widest px-4 h-7 rounded-full shadow-sm">
                {activeProjectName}
              </Badge>
              <Badge variant="outline" className={cn("font-black uppercase text-[10px] tracking-widest px-4 h-7 rounded-full border-2 shadow-sm transition-colors", isOnline ? "text-green-600 border-green-200 bg-green-50" : "text-orange-600 border-orange-200 bg-orange-50")}>
                {isOnline ? <Globe className="mr-2 h-3 w-3 inline" /> : <Database className="mr-2 h-3 w-3 inline" />}
                {isOnline ? 'Cloud Active' : 'Offline Mode'}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" asChild className="h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest gap-2">
              <Link href="/gallery"><Camera className="h-4 w-4" /> Evidence Gallery</Link>
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
              <CardHeader className="p-8 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-xl font-black uppercase tracking-tight">Audit Velocity</CardTitle>
                  </div>
                  <Badge variant="outline" className="border-primary/20 text-primary font-black uppercase text-[10px] gap-2">
                    <Activity className="h-3 w-3" /> 7-Day Pulse
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-0 space-y-8">
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.velocityData}>
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 9, fontWeight: 900, fill: 'hsl(var(--primary))' }} 
                        dy={10}
                      />
                      <RechartsTooltip 
                        cursor={{ fill: 'rgba(var(--primary), 0.05)' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-background border-2 border-primary/20 p-3 rounded-xl shadow-xl">
                                <p className="text-[10px] font-black uppercase text-primary mb-1">{payload[0].payload.name}</p>
                                <p className="text-sm font-black">{payload[0].value} Audits</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="pulses" radius={[6, 6, 6, 6]}>
                        {stats?.velocityData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={index === stats.velocityData.length - 1 ? 'hsl(var(--primary))' : 'rgba(var(--primary), 0.2)'} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
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
            <motion.div variants={item} className="grid grid-cols-1 gap-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground px-2">Common Operations</h4>
              <Link href="/import" className="group"><div className="p-6 rounded-[2rem] bg-card border-2 border-border/40 group-hover:border-primary/20 shadow-lg transition-all flex items-center justify-between"><div className="flex items-center gap-4"><div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors"><FileUp className="h-5 w-5 text-primary" /></div><div className="flex flex-col"><span className="text-sm font-black uppercase tracking-tight">Upload Center</span><span className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Ingest Workbook</span></div></div><ArrowRight className="h-4 w-4 opacity-20 group-hover:translate-x-1 transition-all" /></div></Link>
              <Link href="/verify" className="group"><div className="p-6 rounded-[2rem] bg-card border-2 border-border/40 group-hover:border-primary/20 shadow-lg transition-all flex items-center justify-between"><div className="flex items-center gap-4"><div className="p-3 bg-green-500/10 rounded-xl group-hover:bg-green-500/20 transition-colors"><ClipboardCheck className="h-5 w-5 text-green-600" /></div><div className="flex flex-col"><span className="text-sm font-black uppercase tracking-tight">To Review</span><span className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Audit Field findings</span></div></div><ArrowRight className="h-4 w-4 opacity-20 group-hover:translate-x-1 transition-all" /></div></Link>
              <Link href="/audit-log" className="group"><div className="p-6 rounded-[2rem] bg-card border-2 border-border/40 group-hover:border-primary/20 shadow-lg transition-all flex items-center justify-between"><div className="flex items-center gap-4"><div className="p-3 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors"><History className="h-5 w-5 text-blue-600" /></div><div className="flex flex-col"><span className="text-sm font-black uppercase tracking-tight">Registry Ledger</span><span className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Traceability Heartbeat</span></div></div><ArrowRight className="h-4 w-4 opacity-20 group-hover:translate-x-1 transition-all" /></div></Link>
            </motion.div>

            <motion.div variants={item}>
              <Card className="border-2 border-border/40 shadow-2xl bg-card/50 overflow-hidden rounded-[2.5rem]">
                <CardHeader className="bg-primary/5 border-b p-8"><CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3"><ShieldHalf className="h-4 w-4 fill-current" /> Maintenance Integrity</CardTitle></CardHeader>
                <CardContent className="p-8 space-y-8">
                  <div className="flex items-center justify-between border-b border-dashed pb-4"><div className="flex items-center gap-4"><div className="p-2.5 bg-green-100 rounded-xl"><ShieldHalf className="h-5 w-5 text-green-600" /></div><span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Pulse Score</span></div><span className={cn("text-[10px] font-black uppercase", integrityScore > 90 ? "text-green-600" : "text-orange-600")}>{integrityScore}% Healthy</span></div>
                  <div className="flex items-center justify-between"><div className="flex items-center gap-4"><div className="p-2.5 bg-primary/10 rounded-xl"><LayoutGrid className="h-5 w-5 text-primary" /></div><span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Data Gaps</span></div><span className="text-[10px] font-black uppercase text-primary">{(stats?.missingSerials || 0) + (stats?.missingTags || 0)} Missing</span></div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </motion.div>
      <WelcomeExperience isOpen={showWelcome} onComplete={handleWelcomeComplete} />
    </AppLayout>
  );
}

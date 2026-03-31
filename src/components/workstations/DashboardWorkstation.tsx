'use client';

/**
 * @fileOverview DashboardWorkstation - SPA Intelligence Hub.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  ArrowRight, 
  Database, 
  Globe,
  Map,
  ShieldHalf,
  FileUp,
  History,
  CheckCircle2,
  FolderKanban,
  ChevronDown,
  ShieldAlert,
  Fingerprint,
  Search,
  Zap,
  Boxes,
  ListTodo,
  FileText,
  Monitor
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, AreaChart, Area, CartesianGrid } from 'recharts';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { IntegrityEngine, type IntegrityIssue } from '@/lib/integrity-engine';
import { VerificationPulse } from '@/components/registry/VerificationPulse';
import { VirtualDBService } from '@/services/virtual-db-service';
import { cn } from '@/lib/utils';

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export function DashboardWorkstation() {
  const { assets, isOnline, appSettings, activeGrantId, setActiveGrantId, setActiveView } = useAppState();
  const { userProfile } = useAuth();
  
  const [integrityIssues, setIssues] = useState<IntegrityIssue[]>([]);
  const [fidelityScore, setFidelityScore] = useState(100);
  const [syncDrift, setSyncDrift] = useState(0);
  const [globalSearch, setGlobalSearch] = useState("");

  useEffect(() => {
    if (assets.length > 0) {
      IntegrityEngine.runFullAudit(assets).then(issues => {
        setIssues(issues);
        setFidelityScore(IntegrityEngine.calculateFidelityScore(assets, issues));
      });
    }
    
    if (userProfile?.isAdmin) {
      VirtualDBService.getGlobalDiscrepancies().then(ids => {
        setSyncDrift(ids.length);
      });
    }
  }, [assets, userProfile]);

  const globalSearchResults = useMemo(() => {
    if (!globalSearch || globalSearch.length < 2) return [];
    const term = globalSearch.toLowerCase();
    return assets.filter(a => 
      a.description.toLowerCase().includes(term) ||
      a.serialNumber?.toLowerCase().includes(term) ||
      a.assetIdCode?.toLowerCase().includes(term)
    ).slice(0, 5);
  }, [assets, globalSearch]);

  const stats = useMemo(() => {
    if (!assets) return null;
    
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

    return { 
      total, 
      verified, 
      missingSerials, 
      missingTags, 
      criticalHealth, 
      benchmarking,
      trendData,
      dataGaps: missingSerials + missingTags
    };
  }, [assets]);

  const activeGrant = appSettings?.grants.find(g => g.id === activeGrantId);
  const otherGrants = appSettings?.grants.filter(g => g.id !== activeGrantId) || [];

  return (
    <div className="space-y-10">
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
                  <DropdownMenuItem className="rounded-xl h-12 bg-primary/5 text-primary mb-1">
                    <div className="flex flex-col min-w-0">
                      <span className="font-black text-[11px] uppercase truncate">{activeGrant?.name}</span>
                      <span className="text-[8px] font-bold uppercase opacity-60">Currently Active</span>
                    </div>
                    <CheckCircle2 className="h-4 w-4 ml-auto" />
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-2" />
                  {otherGrants.map(grant => (
                    <DropdownMenuItem key={grant.id} onClick={() => setActiveGrantId(grant.id)} className="rounded-xl h-12 hover:bg-muted group cursor-pointer">
                      <span className="font-bold text-[11px] uppercase truncate">{grant.name}</span>
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
          <Button variant="outline" onClick={() => setActiveView('ALERTS')} className="h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest gap-2">
            <ShieldAlert className="h-4 w-4 text-destructive" /> Risk Alerts
          </Button>
          <Button onClick={() => setActiveView('REGISTRY')} className="h-12 px-8 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 group">
            Open Registry <ArrowRight className="ml-3 h-4 w-4 transition-transform group-hover:translate-x-2" />
          </Button>
        </div>
      </div>

      <div className="px-1 relative z-50">
        <div className="relative group max-w-2xl">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-primary animate-pulse" />
          <Input 
            placeholder="Global Discovery: Search across all asset categories..." 
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="h-16 pl-14 pr-10 rounded-2xl bg-card border-2 border-primary/10 shadow-2xl focus-visible:ring-primary/20 font-black text-sm transition-all"
          />
          <AnimatePresence>
            {globalSearch.length >= 2 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full left-0 right-0 mt-3 bg-background border-2 border-primary/20 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden"
              >
                <div className="p-4 bg-primary/5 border-b flex items-center justify-between">
                  <span className="text-10px font-black uppercase tracking-0.3em text-primary">Discovery Pulse Results</span>
                  <Badge className="bg-primary text-black font-black text-[8px]">{globalSearchResults.length} HITS</Badge>
                </div>
                <div className="divide-y divide-border/40 max-h-[400px] overflow-y-auto custom-scrollbar">
                  {globalSearchResults.map(asset => (
                    <button 
                      key={asset.id} 
                      onClick={() => setActiveView('REGISTRY')}
                      className="w-full flex items-center justify-between p-5 hover:bg-primary/5 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-muted rounded-xl group-hover:bg-primary/10 transition-colors">
                          <Boxes className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-sm font-black uppercase tracking-tight">{asset.description}</span>
                          <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">ID: {asset.assetIdCode || 'UNSET'} • SN: {asset.serialNumber || 'N/A'}</span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.2} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: 'hsl(var(--muted-foreground))' }} unit="%" />
                    <RechartsTooltip content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-background border-2 border-primary/20 p-4 rounded-2xl shadow-2xl">
                            <p className="text-[10px] font-black uppercase text-primary mb-1">{payload[0].payload.date}</p>
                            <p className="text-lg font-black">{payload[0].value}% Coverage</p>
                          </div>
                        );
                      }
                      return null;
                    }} />
                    <Area type="monotone" dataKey="coverage" stroke="hsl(var(--primary))" strokeWidth={4} fill="hsl(var(--primary))" fillOpacity={0.1} />
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
        </div>

        <div className="space-y-8">
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
                  <Badge className="bg-primary text-white font-black uppercase text-[9px]">{fidelityScore}% HEALTH</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-0 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/40">
                    <div className="flex items-center gap-3">
                      <Fingerprint className={cn("h-4 w-4", stats?.missingSerials ? "text-orange-500" : "text-green-600")} />
                      <span className="text-[10px] font-black uppercase opacity-60">Serial Gaps</span>
                    </div>
                    <span className={cn("text-xs font-black", stats?.missingSerials ? "text-orange-600" : "text-green-600")}>{stats?.missingSerials}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/40">
                    <div className="flex items-center gap-3">
                      <Zap className={cn("h-4 w-4", syncDrift ? "text-primary" : "text-green-600")} />
                      <span className="text-[10px] font-black uppercase opacity-60">Sync Drift</span>
                    </div>
                    <span className={cn("text-xs font-black", syncDrift ? "text-primary" : "text-green-600")}>{syncDrift} Pulses</span>
                  </div>
                </div>
                
                <div className="pt-4">
                  <Button variant="ghost" onClick={() => setActiveView('REPORTS')} className="w-full h-12 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2 bg-primary/5 hover:bg-primary/10">
                    Initialize Fidelity Audit
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item} className="grid grid-cols-1 gap-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground px-2">Common Operations</h4>
            <Button variant="outline" onClick={() => setActiveView('IMPORT')} className="h-20 justify-start p-6 rounded-[2rem] bg-card border-2 border-border/40 hover:border-primary/20 shadow-lg transition-all group">
              <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors mr-4"><FileUp className="h-5 w-5 text-primary" /></div>
              <div className="flex flex-col text-left"><span className="text-sm font-black uppercase tracking-tight">Upload Center</span><span className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Ingest Workbook</span></div>
            </Button>
            <Button variant="outline" onClick={() => setActiveView('VERIFY')} className="h-20 justify-start p-6 rounded-[2rem] bg-card border-2 border-border/40 hover:border-primary/20 shadow-lg transition-all group">
              <div className="p-3 bg-green-500/10 rounded-xl group-hover:bg-green-500/20 transition-colors mr-4"><CheckCircle2 className="h-5 w-5 text-green-600" /></div>
              <div className="flex flex-col text-left"><span className="text-sm font-black uppercase tracking-tight">Review Queue</span><span className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Field Assessments</span></div>
            </Button>
            <Button variant="outline" onClick={() => setActiveView('AUDIT_LOG')} className="h-20 justify-start p-6 rounded-[2rem] bg-card border-2 border-border/40 hover:border-primary/20 shadow-lg transition-all group">
              <div className="p-3 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors mr-4"><History className="h-5 w-5 text-blue-600" /></div>
              <div className="flex flex-col text-left"><span className="text-sm font-black uppercase tracking-tight">Registry Ledger</span><span className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Traceability Trail</span></div>
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
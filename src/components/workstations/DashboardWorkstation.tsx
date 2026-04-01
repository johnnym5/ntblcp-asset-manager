
'use client';

/**
 * @fileOverview DashboardWorkstation - SPA Intelligence Hub.
 * Phase 98: Integrated redesigned AssetSummaryDashboard Pulse.
 */

import React, { useMemo } from 'react';
import { 
  ArrowRight, 
  Globe,
  Map as MapIcon,
  CheckCircle2,
  FolderKanban,
  ChevronDown,
  ShieldAlert,
  Activity,
  Target,
  History as HistoryIcon,
  Zap,
  TrendingUp,
  PieChart,
  ShieldCheck,
  AlertCircle,
  Fingerprint,
  Database
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useAppState } from '@/contexts/app-state-context';
import { AssetSummaryDashboard } from '@/components/asset-summary-dashboard';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';

export function DashboardWorkstation() {
  const { assets, isOnline, appSettings, activeGrantId, setActiveGrantId, setActiveView } = useAppState();
  
  const stats = useMemo(() => {
    if (!assets || assets.length === 0) return null;
    const total = assets.length;
    const verified = assets.filter(a => a.status === 'VERIFIED').length;
    const exceptions = assets.filter(a => ['Stolen', 'Burnt', 'Unsalvageable'].includes(a.condition || '')).length;
    const dataGaps = assets.filter(a => !a.serialNumber || a.serialNumber === 'N/A' || !a.assetIdCode).length;
    
    // Temporal Breakdown
    const temporalData = assets.reduce((acc, a) => {
      const year = a.yearBucket || 'Legacy';
      acc[year] = (acc[year] || 0) + 1;
      return acc;
    }, {} as Record<string | number, number>);

    const temporalSummary = Object.entries(temporalData)
      .map(([year, count]) => ({ year, count, percent: Math.round((count / total) * 100) }))
      .sort((a, b) => String(b.year).localeCompare(String(a.year)));

    // Condition Health
    const healthData = assets.reduce((acc, a) => {
      const cond = a.condition || 'Unassessed';
      acc[cond] = (acc[cond] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const healthSummary = Object.entries(healthData)
      .map(([label, count]) => ({ label, count, percent: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);

    return { 
      total, 
      verified, 
      exceptions, 
      dataGaps, 
      temporalSummary, 
      healthSummary,
      coverage: total > 0 ? Math.round((verified / total) * 100) : 0,
      fidelityScore: Math.max(0, 100 - (exceptions * 5) - (dataGaps * 0.1))
    };
  }, [assets]);

  const activeGrant = appSettings?.grants?.find(g => g.id === activeGrantId);
  const otherGrants = appSettings?.grants?.filter(g => g.id !== activeGrantId) || [];

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-32">
      {/* Contextual Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
        <div className="space-y-1">
          <div className="flex items-center gap-4">
            <h2 className="text-4xl font-black tracking-tighter uppercase leading-none">Intelligence Hub</h2>
            {appSettings?.grants && appSettings.grants.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-10 px-4 rounded-xl border-2 border-primary/10 bg-card gap-2 hover:bg-primary/5 transition-all group">
                    <FolderKanban className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Switch Project</span>
                    <ChevronDown className="h-3 w-3 opacity-40 group-data-[state=open]:rotate-180 transition-transform" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 rounded-2xl border-2 shadow-2xl p-2 mt-2">
                  <DropdownMenuItem className="rounded-xl h-12 bg-primary/5 text-primary mb-1">
                    <span className="font-black text-[11px] uppercase truncate">{activeGrant?.name}</span>
                    <CheckCircle2 className="h-4 w-4 ml-auto" />
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {otherGrants.map(grant => (
                    <DropdownMenuItem key={grant.id} onClick={() => setActiveGrantId(grant.id)} className="rounded-xl h-12 cursor-pointer hover:bg-muted">
                      <span className="font-bold text-[11px] uppercase truncate">{grant.name}</span>
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
            <Badge variant="outline" className={cn("font-black uppercase text-[10px] tracking-widest px-4 h-7 rounded-full border-2", isOnline ? "text-green-600 border-green-200" : "text-orange-600 border-orange-200")}>
              {isOnline ? <Globe className="mr-2 h-3 w-3 inline" /> : <Database className="mr-2 h-3 w-3 inline" />}
              {isOnline ? 'Cloud Authority' : 'On-Device Pulse'}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setActiveView('ALERTS')} className="h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest gap-2 border-2 hover:bg-destructive/5 transition-all">
            <ShieldAlert className="h-4 w-4 text-destructive" /> Tactical Alerts
          </Button>
          <Button onClick={() => setActiveView('REGISTRY')} className="h-12 px-8 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 bg-primary text-primary-foreground group">
            Open Registry <ArrowRight className="ml-3 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>

      {/* Primary Metrics Strip - Now using the AssetSummaryDashboard */}
      <div className="px-1">
        <AssetSummaryDashboard />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-1">
        {/* Intelligence Sidebars */}
        <div className="lg:col-span-4 space-y-8">
          {/* Fidelity Index Card */}
          <Card className="rounded-[2.5rem] border-2 border-border/40 shadow-2xl bg-card/50 overflow-hidden">
            <CardHeader className="p-8 border-b bg-primary/5">
              <CardTitle className="text-xs font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                <TrendingUp className="h-4 w-4" /> Fidelity Index
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-5xl font-black tracking-tighter text-foreground">
                    {stats?.fidelityScore.toFixed(1) || '0.0'}%
                  </span>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Global Integrity Rating</p>
                </div>
                <div className="p-4 bg-primary/10 rounded-[2rem] shadow-inner">
                  <ShieldCheck className="h-10 w-10 text-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase">
                  <span className="opacity-40">Data Precision</span>
                  <span className="text-primary">High</span>
                </div>
                <Progress value={stats?.fidelityScore || 0} className="h-1 bg-primary/10" />
              </div>
            </CardContent>
          </Card>

          {/* Temporal Pulse Card */}
          <Card className="rounded-[2.5rem] border-2 border-border/40 shadow-2xl bg-card/50 overflow-hidden">
            <CardHeader className="p-8 border-b bg-muted/20">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-3">
                <HistoryIcon className="h-4 w-4" /> Temporal Pulse
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <ScrollArea className="h-[180px] pr-4">
                <div className="space-y-5">
                  {stats?.temporalSummary.map((item) => (
                    <div key={item.year} className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase">
                        <span className="opacity-60">{item.year} Register</span>
                        <span className="text-foreground">{item.count} Assets</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={item.percent} className="h-1 flex-1" />
                        <span className="text-[9px] font-mono opacity-40">{item.percent}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Tactical Shortcuts */}
          <div className="grid grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              onClick={() => setActiveView('IMPORT')}
              className="h-20 rounded-3xl border-2 flex flex-col gap-1 transition-all hover:border-primary/40 hover:bg-primary/5"
            >
              <Zap className="h-5 w-5 text-primary" />
              <span className="text-[9px] font-black uppercase">Ingest</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setActiveView('GIS')}
              className="h-20 rounded-3xl border-2 flex flex-col gap-1 transition-all hover:border-primary/40 hover:bg-primary/5"
            >
              <Globe className="h-5 w-5 text-primary" />
              <span className="text-[9px] font-black uppercase">GIS Grid</span>
            </Button>
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col gap-8">
           {/* Placeholder for secondary dashboard content if needed */}
           <Card className="flex-1 rounded-[3rem] border-2 border-border/40 shadow-none bg-muted/5 flex flex-col items-center justify-center p-20 opacity-20 text-center space-y-4">
              <Database className="h-16 w-16" />
              <div className="space-y-1">
                <h3 className="text-xl font-black uppercase tracking-widest">Intelligence Layer Active</h3>
                <p className="text-sm font-medium italic">Monitoring global project telemetry...</p>
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
}

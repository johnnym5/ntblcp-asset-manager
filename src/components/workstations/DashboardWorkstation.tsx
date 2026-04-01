'use client';

/**
 * @fileOverview DashboardWorkstation - The Unified Intelligence Center.
 * Phase 115: Integrated full Registry functionality directly into the Dashboard.
 */

import React, { useMemo } from 'react';
import { 
  ArrowRight, 
  Globe,
  CheckCircle2,
  FolderKanban,
  ChevronDown,
  ShieldAlert,
  Activity,
  History as HistoryIcon,
  Zap,
  TrendingUp,
  ShieldCheck,
  Database,
  Boxes,
  LayoutGrid
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
import { RegistryWorkstation } from './RegistryWorkstation';
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

    return { 
      total, 
      verified, 
      exceptions, 
      dataGaps, 
      temporalSummary, 
      coverage: total > 0 ? Math.round((verified / total) * 100) : 0,
      fidelityScore: Math.max(0, 100 - (exceptions * 5) - (dataGaps * 0.1))
    };
  }, [assets]);

  const activeGrant = appSettings?.grants?.find(g => g.id === activeGrantId);
  const otherGrants = appSettings?.grants?.filter(g => g.id !== activeGrantId) || [];

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      
      {/* 1. Project Context Pulse */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tighter uppercase leading-none text-foreground">Intelligence Center</h2>
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
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <Badge className="bg-primary/5 border-2 border-primary/20 text-primary font-black uppercase text-[9px] tracking-widest px-4 h-7 rounded-full shadow-sm">
              {activeGrant?.name || 'Active Registry Pulse'}
            </Badge>
            <Badge variant="outline" className={cn("font-black uppercase text-[9px] tracking-widest px-4 h-7 rounded-full border-2", isOnline ? "text-green-600 border-green-200" : "text-orange-600 border-orange-200")}>
              {isOnline ? <Globe className="mr-2 h-3 w-3 inline" /> : <Database className="mr-2 h-3 w-3 inline" />}
              {isOnline ? 'CLOUD AUTHORITY' : 'LOCAL DEVICE PULSE'}
            </Badge>
          </div>
        </div>
      </div>

      {/* 2. Interactive Analytics Pulse */}
      <AssetSummaryDashboard />

      {/* 3. Global Registry Workspace */}
      <div className="space-y-6">
        <div className="px-1 flex items-center gap-4">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <Boxes className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-xl font-black uppercase tracking-tight text-foreground">Registry Hub</h3>
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Record Management & Category Orchestration</p>
          </div>
        </div>
        
        {/* Integrating the full RegistryWorkstation component here */}
        <div className="p-1 sm:p-2 rounded-[2.5rem] bg-muted/5 border-2 border-dashed border-border/40 min-h-[600px]">
          <RegistryWorkstation />
        </div>
      </div>

      {/* 4. Temporal Intelligence Sidebar (Floating Style) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-12">
          <Card className="rounded-[3rem] border-2 border-border/40 shadow-2xl bg-card/50 overflow-hidden">
            <CardHeader className="p-8 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                    <HistoryIcon className="h-4 w-4" /> Temporal Pulse Breakdown
                  </CardTitle>
                  <p className="text-[9px] font-medium text-muted-foreground italic">Distribution of assets by acquisition year / batch.</p>
                </div>
                <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary font-black uppercase h-7 px-4 rounded-full">Fidelity Level: High</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
                {stats?.temporalSummary.slice(0, 4).map((item) => (
                  <div key={item.year} className="space-y-4 p-6 rounded-[2rem] bg-background/50 border-2 border-border/40 shadow-inner group hover:border-primary/20 transition-all">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase text-muted-foreground">{item.year} REGISTER</span>
                      <span className="text-[10px] font-mono text-primary font-bold">{item.percent}%</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-3xl font-black text-foreground">{item.count}</p>
                      <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest opacity-40">Total Records</p>
                    </div>
                    <Progress value={item.percent} className="h-1" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}

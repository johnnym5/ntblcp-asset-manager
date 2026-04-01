'use client';

/**
 * @fileOverview DashboardWorkstation - SPA Intelligence Hub.
 * Phase 78: Integrated Regional Analytics and visual performance matrices.
 */

import React, { useMemo } from 'react';
import { 
  ArrowRight, 
  Globe,
  Map,
  FileUp,
  CheckCircle2,
  FolderKanban,
  ChevronDown,
  ShieldAlert,
  Boxes,
  Activity,
  Target,
  History,
  Zap,
  TrendingUp
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
import { VerificationPulse } from '@/components/registry/VerificationPulse';
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
    const dataGaps = assets.filter(a => !a.serialNumber || a.serialNumber === 'N/A').length;
    
    // Regional Aggregation
    const regionalData = assets.reduce((acc, a) => {
      const loc = a.location || 'Unknown';
      if (!acc[loc]) acc[loc] = { total: 0, verified: 0 };
      acc[loc].total++;
      if (a.status === 'VERIFIED') acc[loc].verified++;
      return acc;
    }, {} as Record<string, { total: number, verified: number }>);

    const regionalSummary = Object.entries(regionalData)
      .map(([name, s]) => ({ name, ...s, percent: Math.round((s.verified / s.total) * 100) }))
      .sort((a, b) => b.total - a.total);

    return { total, verified, exceptions, dataGaps, regionalSummary };
  }, [assets]);

  const activeGrant = appSettings?.grants.find(g => g.id === activeGrantId);
  const otherGrants = appSettings?.grants.filter(g => g.id !== activeGrantId) || [];

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-32">
      {/* Contextual Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
        <div className="space-y-1">
          <div className="flex items-center gap-4">
            <h2 className="text-4xl font-black tracking-tighter uppercase leading-none">Intelligence Hub</h2>
            {appSettings && appSettings.grants.length > 1 && (
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
            <ShieldAlert className="h-4 w-4 text-destructive" /> Alerts
          </Button>
          <Button onClick={() => setActiveView('REGISTRY')} className="h-12 px-8 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 bg-primary text-primary-foreground group">
            Open Registry <ArrowRight className="ml-3 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>

      {/* Global Progress Pulse */}
      <div className="px-1">
        <VerificationPulse 
          total={stats?.total || 0} 
          verified={stats?.verified || 0} 
          exceptions={stats?.exceptions || 0} 
          dataGaps={stats?.dataGaps || 0} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-1">
        {/* Regional Performance Matrix */}
        <Card className="lg:col-span-8 rounded-[3rem] border-2 border-border/40 shadow-2xl bg-card/50 overflow-hidden">
          <CardHeader className="p-8 border-b bg-muted/20 flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                <Map className="h-5 w-5 text-primary" /> Regional Pulse
              </CardTitle>
              <p className="text-[10px] font-bold uppercase text-muted-foreground opacity-60">Verification coverage by location scope</p>
            </div>
            <Badge variant="outline" className="font-black h-7 px-4 border-primary/20 text-primary bg-primary/5">
              {stats?.regionalSummary.length || 0} REGIONS
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <div className="divide-y-2 divide-dashed divide-border/20">
                {stats?.regionalSummary.map((region, idx) => (
                  <div key={region.name} className="p-6 flex items-center justify-between group hover:bg-primary/[0.02] transition-colors">
                    <div className="flex items-center gap-6 flex-1">
                      <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center text-[10px] font-black opacity-40 group-hover:bg-primary/10 group-hover:text-primary group-hover:opacity-100 transition-all">
                        {String(idx + 1).padStart(2, '0')}
                      </div>
                      <div className="space-y-3 flex-1 max-w-md">
                        <div className="flex justify-between items-end">
                          <h4 className="text-sm font-black uppercase tracking-tight">{region.name}</h4>
                          <span className="text-[10px] font-black text-primary">{region.percent}%</span>
                        </div>
                        <Progress value={region.percent} className="h-1.5" />
                      </div>
                    </div>
                    <div className="flex items-center gap-8 pl-10">
                      <div className="flex flex-col items-end">
                        <span className="text-[8px] font-black uppercase opacity-40">Registry Pulse</span>
                        <span className="text-sm font-black tabular-nums">{region.total}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[8px] font-black uppercase text-green-600 opacity-60">Verified</span>
                        <span className="text-sm font-black text-green-600 tabular-nums">{region.verified}</span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {(!stats || stats.regionalSummary.length === 0) && (
                  <div className="py-20 text-center opacity-20 flex flex-col items-center gap-4">
                    <Target className="h-16 w-16" />
                    <span className="text-[10px] font-black uppercase tracking-widest">No Regional Data Pulses</span>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Tactical Quick Actions & Shortcuts */}
        <div className="lg:col-span-4 space-y-8">
          <Card className="rounded-[2.5rem] border-2 border-border/40 shadow-2xl bg-card/50 overflow-hidden h-full flex flex-col">
            <CardHeader className="p-8 border-b bg-muted/20">
              <CardTitle className="text-xs font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                <Zap className="h-4 w-4" /> Quick Launch
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3 flex-1">
              <LaunchButton icon={Boxes} title="Asset Registry" sub="Search & Edit" onClick={() => setActiveView('REGISTRY')} />
              <LaunchButton icon={FileUp} title="Import Center" sub="Ingest Data" onClick={() => setActiveView('IMPORT')} />
              <LaunchButton icon={CheckCircle2} title="Verify Assets" sub="Assessment Queue" onClick={() => setActiveView('VERIFY')} />
              <LaunchButton icon={Navigation} title="GIS Spatial Hub" sub="Coordinate Grid" onClick={() => setActiveView('GIS')} />
              <LaunchButton icon={TrendingUp} title="Reports Hub" sub="Generate Extracts" onClick={() => setActiveView('REPORTS')} />
              <LaunchButton icon={Activity} title="Audit Ledger" sub="Traceability" onClick={() => setActiveView('AUDIT_LOG')} />
            </CardContent>
            <div className="p-8 mt-auto border-t bg-muted/5">
              <div className="p-6 rounded-2xl bg-primary/5 border-2 border-dashed border-primary/20 space-y-3">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-primary opacity-60" />
                  <h5 className="text-[10px] font-black uppercase text-primary">System Pulse</h5>
                </div>
                <p className="text-[10px] font-medium text-muted-foreground italic leading-relaxed">
                  Registry version v5.0.4. Database state synchronized across {appSettings?.grants.length} projects.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function LaunchButton({ icon: Icon, title, sub, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className="w-full p-4 rounded-2xl border-2 border-transparent hover:border-primary/20 hover:bg-primary/5 transition-all group flex items-center justify-between text-left"
    >
      <div className="flex items-center gap-4">
        <div className="p-2.5 rounded-xl bg-muted group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-sm">
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-black uppercase tracking-tight">{title}</span>
          <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">{sub}</span>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-40 transition-opacity" />
    </button>
  );
}

'use client';

/**
 * @fileOverview DashboardWorkstation - SPA Intelligence Hub.
 * Phase 77: Hardened analytics pulse and workstation navigation.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  ArrowRight, 
  Database, 
  Globe,
  Map,
  ShieldHalf,
  FileUp,
  CheckCircle2,
  FolderKanban,
  ChevronDown,
  ShieldAlert,
  Fingerprint,
  Search,
  Boxes,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

export function DashboardWorkstation() {
  const { assets, isOnline, appSettings, activeGrantId, setActiveGrantId, setActiveView } = useAppState();
  
  const stats = useMemo(() => {
    if (!assets || assets.length === 0) return null;
    const total = assets.length;
    const verified = assets.filter(a => a.status === 'VERIFIED').length;
    const exceptions = assets.filter(a => ['Stolen', 'Burnt', 'Unsalvageable'].includes(a.condition || '')).length;
    const dataGaps = assets.filter(a => !a.serialNumber || a.serialNumber === 'N/A').length;
    
    return { total, verified, exceptions, dataGaps };
  }, [assets]);

  const activeGrant = appSettings?.grants.find(g => g.id === activeGrantId);
  const otherGrants = appSettings?.grants.filter(g => g.id !== activeGrantId) || [];

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Contextual Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
        <div className="space-y-1">
          <div className="flex items-center gap-4">
            <h2 className="text-4xl font-black tracking-tighter uppercase leading-none">Intelligence Hub</h2>
            {appSettings && appSettings.grants.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-10 px-4 rounded-xl border-2 border-primary/10 bg-card gap-2">
                    <FolderKanban className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Switch Project</span>
                    <ChevronDown className="h-3 w-3 opacity-40" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 rounded-2xl border-2 shadow-2xl p-2">
                  <DropdownMenuItem className="rounded-xl h-12 bg-primary/5 text-primary mb-1">
                    <span className="font-black text-[11px] uppercase truncate">{activeGrant?.name}</span>
                    <CheckCircle2 className="h-4 w-4 ml-auto" />
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {otherGrants.map(grant => (
                    <DropdownMenuItem key={grant.id} onClick={() => setActiveGrantId(grant.id)} className="rounded-xl h-12">
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
          <Button variant="outline" onClick={() => setActiveView('ALERTS')} className="h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest gap-2">
            <ShieldAlert className="h-4 w-4 text-destructive" /> Alerts
          </Button>
          <Button onClick={() => setActiveView('REGISTRY')} className="h-12 px-8 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20">
            Open Registry <ArrowRight className="ml-3 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Metrics Pulse */}
      <div className="px-1">
        <VerificationPulse 
          total={stats?.total || 0} 
          verified={stats?.verified || 0} 
          exceptions={stats?.exceptions || 0} 
          dataGaps={stats?.dataGaps || 0} 
        />
      </div>

      {/* Quick Launch Surface */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-1">
        <LaunchCard icon={Boxes} title="Asset Registry" sub="Search & Edit Records" onClick={() => setActiveView('REGISTRY')} />
        <LaunchCard icon={FileUp} iconColor="text-blue-600" title="Ingestion Center" sub="Process Excel Registers" onClick={() => setActiveView('IMPORT')} />
        <LaunchCard icon={CheckCircle2} iconColor="text-green-600" title="Verify Assets" sub="Field Assessment Queue" onClick={() => setActiveView('VERIFY')} />
        <LaunchCard icon={Activity} iconColor="text-purple-600" title="Audit Ledger" sub="Traceability Timeline" onClick={() => setActiveView('AUDIT_LOG')} />
      </div>
    </div>
  );
}

function LaunchCard({ icon: Icon, iconColor = "text-primary", title, sub, onClick }: any) {
  return (
    <Card className="rounded-[2.5rem] border-2 border-border/40 hover:border-primary/20 cursor-pointer transition-all hover:shadow-xl group" onClick={onClick}>
      <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
        <div className={cn("p-5 rounded-2xl bg-muted/20 group-hover:bg-primary/10 transition-colors shadow-inner", iconColor)}>
          <Icon className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <h4 className="font-black uppercase tracking-tight text-sm">{title}</h4>
          <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}

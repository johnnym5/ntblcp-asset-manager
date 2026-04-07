'use client';

/**
 * @fileOverview Dashboard Workstation - Unified Mission Control.
 * Phase 303: Enforced permission-aware action pulses.
 */

import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard,
  Boxes,
  ShieldCheck,
  Activity,
  FileText,
  History,
  FolderOpen,
  SearchCode,
  Zap,
  ArrowRight,
  FileUp,
  PlusCircle,
  ScanSearch,
  DatabaseZap,
  Settings,
  ChevronDown,
  RefreshCw
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { AssetSummaryDashboard } from '@/components/asset-summary-dashboard';
import { RegistryWorkstation } from './RegistryWorkstation';
import { ReportsWorkstation } from './ReportsWorkstation';
import { SyncQueueWorkstation } from './SyncQueueWorkstation';
import { AssetGroupsWorkstation } from './AssetGroupsWorkstation';
import { DiscrepancyWorkstation } from './DiscrepancyWorkstation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type DashboardTab = 'overview' | 'inventory';

export function DashboardWorkstation() {
  const { assets, appSettings, setActiveView, manualDownload, isSyncing, isOnline } = useAppState();
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  
  const isAdvanced = appSettings?.uxMode === 'advanced';
  const isAdmin = userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPERADMIN';

  const anomalyCount = useMemo(() => {
    return assets.filter(a => a.discrepancies?.some(d => d.status === 'PENDING')).length;
  }, [assets]);

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DashboardTab)} className="space-y-8 sm:space-y-12 animate-in fade-in duration-700 h-full flex flex-col">
      
      <div className="sticky top-[-1rem] sm:top-[-2rem] lg:top-[-2.5rem] z-40 bg-[#050505]/95 backdrop-blur-2xl pt-2 sm:pt-4 pb-6 px-1 border-b border-white/5 mb-8 -mx-1 shrink-0">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 max-w-[1600px] mx-auto w-full">
          <div className="flex items-center gap-4 self-start">
            <div className="p-2.5 sm:p-3 bg-primary/10 rounded-xl sm:rounded-2xl shadow-inner border border-primary/5">
              <LayoutDashboard className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div className="space-y-0.5">
              <h2 className="text-xl sm:text-2xl font-black uppercase text-white tracking-tight leading-none">
                Control Hub
              </h2>
              <p className="text-[8px] sm:text-[10px] font-bold text-white/40 uppercase tracking-[0.25em] leading-none">
                {isAdvanced ? 'Registry Intelligence' : 'Inventory Overview'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-full lg:w-auto bg-white/[0.03] p-1 rounded-xl sm:rounded-2xl border border-white/5 shadow-2xl overflow-x-auto no-scrollbar backdrop-blur-xl shrink-0">
              <TabsList className="bg-transparent border-none p-0 h-auto gap-1 flex items-center min-w-max">
                <TabsTrigger value="overview" className="flex-1 px-6 sm:px-12 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-black uppercase text-[9px] sm:text-[10px] tracking-widest gap-2.5 data-[state=active]:bg-primary data-[state=active]:text-black transition-all whitespace-nowrap">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="inventory" className="flex-1 px-6 sm:px-12 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-black uppercase text-[9px] sm:text-[10px] tracking-widest gap-2.5 data-[state=active]:bg-primary data-[state=active]:text-black transition-all whitespace-nowrap">
                  Inventory
                </TabsTrigger>
              </TabsList>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={manualDownload} 
              disabled={isSyncing || !isOnline}
              className="rounded-xl h-12 w-12 bg-white/5 border border-white/5 text-white/40 hover:text-primary shrink-0"
            >
              <RefreshCw className={cn("h-5 w-5", isSyncing && "animate-spin")} />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <TabsContent value="overview" className="m-0 space-y-16 sm:space-y-24 animate-in fade-in slide-in-from-bottom-2 duration-500 outline-none pb-40">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8">
              <AssetSummaryDashboard />
            </div>
            
            <div className="lg:col-span-4 space-y-6">
              <Card className="bg-[#080808] border-2 border-white/5 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-3xl">
                <div className="p-5 sm:p-6 border-b border-white/5 bg-white/[0.02]">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2">
                    <DatabaseZap className="h-3.5 w-3.5" /> Workstation Pulse
                  </h4>
                </div>
                <CardContent className="p-5 sm:p-6 space-y-3">
                  <Button onClick={() => setActiveView('SETTINGS')} variant="outline" className="w-full h-12 sm:h-14 rounded-xl sm:rounded-2xl border-white/10 text-white font-black uppercase text-[9px] sm:text-[10px] tracking-widest gap-3 hover:bg-white/5 transition-all justify-start px-6">
                    <Settings className="h-4 w-4 text-primary" /> System Settings
                  </Button>
                  
                  {isAdmin && (
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                      <p className="text-[9px] font-bold text-primary uppercase leading-relaxed italic">
                        Administrative clearance active. Template mapping and user governance tools are accessible in Settings.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
          
          <Accordion type="multiple" className="space-y-12">
            <AccordionItem value="folders" className="border-none">
              <div className="flex items-center justify-between px-1 mb-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-2 bg-white/5 rounded-lg sm:rounded-xl"><FolderOpen className="h-5 w-5 text-primary" /></div>
                  <h3 className="text-lg sm:text-xl font-black uppercase text-white tracking-tight">Registry Folders</h3>
                </div>
                <AccordionTrigger className="hover:no-underline p-0 h-auto w-auto">
                  <Badge variant="outline" className="border-white/10 text-white/40 uppercase text-[8px] sm:text-[9px] font-black px-3 py-1 cursor-pointer hover:bg-white/5 transition-all gap-2">
                    View Structural Tree <ChevronDown className="h-3 w-3" />
                  </Badge>
                </AccordionTrigger>
              </div>
              <AccordionContent className="p-0">
                <AssetGroupsWorkstation isEmbedded={true} />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="anomalies" className="border-none">
              <div className="flex items-center justify-between px-1 mb-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-2 bg-red-600/10 rounded-lg sm:rounded-xl"><SearchCode className="h-5 w-5 text-red-600" /></div>
                  <h3 className="text-lg sm:text-xl font-black uppercase text-white tracking-tight">Pattern Review</h3>
                </div>
                <div className="flex items-center gap-3">
                  {anomalyCount > 0 && (
                    <Badge className="bg-red-600 text-white font-black uppercase text-[8px] sm:text-[9px] h-6 px-3 animate-pulse shadow-lg shadow-red-600/20">
                      {anomalyCount} ANOMALIES
                    </Badge>
                  )}
                  <AccordionTrigger className="hover:no-underline p-0 h-auto w-auto">
                    <Badge variant="outline" className="border-white/10 text-white/40 uppercase text-[8px] sm:text-[9px] font-black px-3 py-1 cursor-pointer hover:bg-white/5 transition-all gap-2">
                      Inspect Anomalies <ChevronDown className="h-3 w-3" />
                    </Badge>
                  </AccordionTrigger>
                </div>
              </div>
              <AccordionContent className="p-0">
                <DiscrepancyWorkstation isEmbedded={true} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 sm:gap-24 items-start px-1 border-t border-white/5 pt-16 sm:pt-24">
            <div className="space-y-6 sm:space-y-8">
              <div className="flex items-center gap-3 px-1">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Report Center</h3>
              </div>
              <ReportsWorkstation isEmbedded={true} />
            </div>
            
            <div className="space-y-6 sm:space-y-8">
              <div className="flex items-center gap-3 px-1">
                <Activity className="h-4 w-4 text-primary" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">{isAdvanced ? 'Sync Queue' : 'Pending Sync'}</h3>
              </div>
              <SyncQueueWorkstation isEmbedded={true} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="m-0 animate-in fade-in slide-in-from-bottom-2 duration-500 outline-none pb-40">
          <RegistryWorkstation viewAll />
        </TabsContent>
      </div>
    </Tabs>
  );
}

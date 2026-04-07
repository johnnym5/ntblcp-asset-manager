'use client';

/**
 * @fileOverview Dashboard Workstation - Unified Mission Control.
 * Phase 1100: Consolidated Folders and Anomalies into the Overview pulse.
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
  ArrowRight
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppState } from '@/contexts/app-state-context';
import { AssetSummaryDashboard } from '@/components/asset-summary-dashboard';
import { RegistryWorkstation } from './RegistryWorkstation';
import { ReportsWorkstation } from './ReportsWorkstation';
import { SyncQueueWorkstation } from './SyncQueueWorkstation';
import { AssetGroupsWorkstation } from './AssetGroupsWorkstation';
import { DiscrepancyWorkstation } from './DiscrepancyWorkstation';
import { cn } from '@/lib/utils';

type DashboardTab = 'overview' | 'inventory';

export function DashboardWorkstation() {
  const { assets, appSettings } = useAppState();
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  
  const isAdvanced = appSettings?.uxMode === 'advanced';

  const anomalyCount = useMemo(() => {
    return assets.filter(a => a.discrepancies?.some(d => d.status === 'PENDING')).length;
  }, [assets]);

  return (
    <div className="space-y-8 md:space-y-12 animate-in fade-in duration-700 max-w-[1600px] mx-auto pb-40">
      
      {/* Header & Tab Toggle */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6 px-1">
        <div className="flex items-center gap-4 self-start">
          <div className="p-2.5 md:p-3 bg-primary/10 rounded-2xl shadow-inner border border-primary/5">
            <LayoutDashboard className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          </div>
          <div className="space-y-0.5">
            <h2 className="text-xl md:text-2xl font-black uppercase text-white tracking-tight leading-none">
              Control Hub
            </h2>
            <p className="text-[9px] md:text-[10px] font-bold text-white/40 uppercase tracking-[0.25em] leading-none">
              {isAdvanced ? 'Registry Intelligence' : 'Inventory Overview'}
            </p>
          </div>
        </div>

        <div className="w-full lg:w-auto bg-white/[0.03] p-1 rounded-2xl border border-white/5 shadow-2xl overflow-x-auto no-scrollbar backdrop-blur-xl">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DashboardTab)} className="w-full">
            <TabsList className="bg-transparent border-none p-0 h-auto gap-1 flex items-center min-w-max">
              <TabsTrigger value="overview" className="px-10 md:px-12 py-2.5 md:py-3 rounded-xl font-black uppercase text-[9px] md:text-[10px] tracking-widest gap-2.5 data-[state=active]:bg-primary data-[state=active]:text-black transition-all whitespace-nowrap">
                Overview
              </TabsTrigger>
              <TabsTrigger value="inventory" className="px-10 md:px-12 py-2.5 md:py-3 rounded-xl font-black uppercase text-[9px] md:text-[10px] tracking-widest gap-2.5 data-[state=active]:bg-primary data-[state=active]:text-black transition-all whitespace-nowrap">
                Inventory Categories
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="min-h-0">
        <Tabs value={activeTab} className="w-full">
          <TabsContent value="overview" className="m-0 space-y-16 md:space-y-24 animate-in fade-in slide-in-from-bottom-2 duration-500">
            
            {/* 1. Stats & Quick Start */}
            <AssetSummaryDashboard />
            
            {/* 2. Folders Workstation (Moved to Overview) */}
            <div id="folders-section" className="space-y-8">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white/5 rounded-xl"><FolderOpen className="h-5 w-5 text-primary" /></div>
                  <h3 className="text-xl font-black uppercase text-white tracking-tight">Registry Folders</h3>
                </div>
                <Badge variant="outline" className="border-white/10 text-white/40 uppercase text-[9px] font-black">Structural Discovery</Badge>
              </div>
              <AssetGroupsWorkstation isEmbedded={true} />
            </div>

            {/* 3. Anomalies Workstation (Moved to Overview) */}
            <div id="anomalies-section" className="space-y-8">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-red-600/10 rounded-xl"><SearchCode className="h-5 w-5 text-red-600" /></div>
                  <h3 className="text-xl font-black uppercase text-white tracking-tight">Pattern Review</h3>
                </div>
                {anomalyCount > 0 && (
                  <Badge className="bg-red-600 text-white font-black uppercase text-[9px] h-6 px-3 animate-pulse shadow-lg shadow-red-600/20">
                    {anomalyCount} ANOMALIES DETECTED
                  </Badge>
                )}
              </div>
              <DiscrepancyWorkstation isEmbedded={true} />
            </div>

            {/* 4. Infrastructure & Reports */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 md:gap-12 items-start px-1 border-t border-white/5 pt-16 md:pt-24">
              <div className="space-y-6 md:space-y-8">
                <div className="flex items-center gap-3 px-1">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Report Center</h3>
                </div>
                <ReportsWorkstation isEmbedded={true} />
              </div>
              
              <div className="space-y-6 md:space-y-8">
                <div className="flex items-center gap-3 px-1">
                  <Activity className="h-4 w-4 text-primary" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">{isAdvanced ? 'Sync Queue' : 'Pending Changes'}</h3>
                </div>
                <SyncQueueWorkstation isEmbedded={true} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="inventory" className="m-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <RegistryWorkstation viewAll />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

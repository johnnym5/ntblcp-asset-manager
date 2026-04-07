'use client';

/**
 * @fileOverview Dashboard Workstation - Unified Mission Control.
 * Optimized for mobile-first stacking and responsive spacing.
 */

import React, { useState } from 'react';
import { 
  LayoutDashboard,
  Boxes,
  ShieldCheck,
  Activity,
  FileText,
  History
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppState } from '@/contexts/app-state-context';
import { AssetSummaryDashboard } from '@/components/asset-summary-dashboard';
import { RegistryWorkstation } from './RegistryWorkstation';
import { ReportsWorkstation } from './ReportsWorkstation';
import { AuditLogWorkstation } from './AuditLogWorkstation';
import { SyncQueueWorkstation } from './SyncQueueWorkstation';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

type DashboardTab = 'dashboard' | 'inventory';

export function DashboardWorkstation() {
  const { isOnline, isSyncing, appSettings } = useAppState();
  const [activeTab, setActiveTab] = useState<DashboardTab>('dashboard');
  
  const isAdvanced = appSettings?.uxMode === 'advanced';

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
              {appSettings?.appMode === 'management' ? 'Management Dashboard' : 'Verification Hub'}
            </h2>
            <p className="text-[9px] md:text-[10px] font-bold text-white/40 uppercase tracking-[0.25em] leading-none">
              {isAdvanced ? 'Registry Intelligence' : 'Inventory Overview'}
            </p>
          </div>
        </div>

        <div className="w-full lg:w-auto bg-white/[0.03] p-1 rounded-2xl border border-white/5 shadow-2xl overflow-x-auto no-scrollbar backdrop-blur-xl">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DashboardTab)} className="w-full">
            <TabsList className="bg-transparent border-none p-0 h-auto gap-1 flex items-center min-w-max">
              <TabsTrigger value="dashboard" className="px-5 md:px-6 py-2.5 md:py-3 rounded-xl font-black uppercase text-[9px] md:text-[10px] tracking-widest gap-2.5 data-[state=active]:bg-primary data-[state=active]:text-black transition-all whitespace-nowrap">
                Overview
              </TabsTrigger>
              <TabsTrigger value="inventory" className="px-5 md:px-6 py-2.5 md:py-3 rounded-xl font-black uppercase text-[9px] md:text-[10px] tracking-widest gap-2.5 data-[state=active]:bg-primary data-[state=active]:text-black transition-all whitespace-nowrap">
                Asset Categories
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="min-h-0">
        <Tabs value={activeTab} className="w-full">
          <TabsContent value="dashboard" className="m-0 space-y-12 md:space-y-16 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <AssetSummaryDashboard />
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 md:gap-12 items-start px-1">
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

            <div className="space-y-6 md:space-y-8 px-1 pt-12 border-t border-white/5">
              <div className="flex items-center gap-3 px-1">
                <History className="h-4 w-4 text-primary" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">{isAdvanced ? 'Audit Trail' : 'Activity History'}</h3>
              </div>
              <AuditLogWorkstation isEmbedded={true} />
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
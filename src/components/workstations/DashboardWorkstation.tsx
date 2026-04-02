'use client';

/**
 * @fileOverview DashboardWorkstation - Unified Mission Control.
 * Phase 450: Hardened for mobile horizontal tab navigation.
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
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<DashboardTab>('dashboard');
  
  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700 max-w-[1600px] mx-auto pb-32 md:pb-20">
      
      {/* 1. Unified Navigation Tabs - Optimized for swiping */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6 px-1">
        <div className="flex items-center gap-4 self-start">
          <div className="p-3 bg-primary/10 rounded-2xl shadow-inner border border-primary/5">
            <LayoutDashboard className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-0.5">
            <h2 className="text-2xl font-black uppercase text-white tracking-tight leading-none">
              {appSettings?.appMode === 'management' ? 'Management Center' : 'Verification Hub'}
            </h2>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.25em] leading-none">Registry Intelligence</p>
          </div>
        </div>

        <div className="w-full lg:w-auto bg-white/[0.03] p-1 rounded-2xl md:rounded-[1.5rem] border border-white/5 shadow-2xl overflow-x-auto no-scrollbar backdrop-blur-xl">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DashboardTab)} className="w-full">
            <TabsList className="bg-transparent border-none p-0 h-auto gap-1 flex items-center min-w-max">
              <TabsTrigger value="dashboard" className="px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2.5 data-[state=active]:bg-primary data-[state=active]:text-black transition-all whitespace-nowrap">
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="inventory" className="px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2.5 data-[state=active]:bg-primary data-[state=active]:text-black transition-all whitespace-nowrap">
                Asset Categories
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* 2. Unified Content Surface */}
      <div className="min-h-[50vh]">
        <Tabs value={activeTab} className="w-full">
          <TabsContent value="dashboard" className="m-0 space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Aggregate Stats Pulse */}
            <AssetSummaryDashboard />
            
            {/* Merged Logic Grid: Reports & Sync */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 items-start px-1">
              <div className="space-y-6">
                <div className="flex items-center gap-3 px-1">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Report Center</h3>
                </div>
                <ReportsWorkstation isEmbedded={true} />
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center gap-3 px-1">
                  <Activity className="h-4 w-4 text-primary" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Sync Architecture</h3>
                </div>
                <SyncQueueWorkstation isEmbedded={true} />
              </div>
            </div>

            {/* Merged History Pulse */}
            <div className="space-y-6 px-1 pt-10 border-t border-white/5">
              <div className="flex items-center gap-3 px-1">
                <History className="h-4 w-4 text-primary" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Activity History</h3>
              </div>
              <AuditLogWorkstation isEmbedded={true} />
            </div>
          </TabsContent>

          <TabsContent value="inventory" className="m-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <RegistryWorkstation viewAll />
          </TabsContent>
        </Tabs>
      </div>

      {/* 3. Connection Heartbeat - Responsive Positioning */}
      <div className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-50 pointer-events-none">
        <div className={cn(
          "px-4 py-2 md:px-6 md:py-3 rounded-2xl border-2 backdrop-blur-3xl shadow-3xl flex items-center gap-3 md:gap-4 transition-all duration-700",
          isOnline ? "bg-green-500/5 border-green-500/20 text-green-500" : "bg-red-500/5 border-red-500/20 text-red-500"
        )}>
          <div className={cn("h-2 w-2 md:h-2.5 md:w-2.5 rounded-full", isOnline ? "bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]" : "bg-red-500")} />
          <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.25em]">
            {isOnline ? 'CLOUD SYNC ACTIVE' : 'OFFLINE MODE'}
          </span>
        </div>
      </div>

    </div>
  );
}

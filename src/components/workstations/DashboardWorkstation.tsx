'use client';

/**
 * @fileOverview DashboardWorkstation - Unified Single-Scope Hub.
 * Phase 195: GIS Tab disabled per operational refinement request.
 */

import React, { useMemo, useState } from 'react';
import { 
  LayoutDashboard,
  Boxes,
  ShieldCheck,
  Search,
  ArrowUpDown,
  Filter,
  RefreshCw,
  Activity,
  FileText,
  History
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useAppState } from '@/contexts/app-state-context';
import { AssetSummaryDashboard } from '@/components/asset-summary-dashboard';
import { RegistryWorkstation } from './RegistryWorkstation';
import { VerifyWorkstation } from './VerifyWorkstation';
import { ReportsWorkstation } from './ReportsWorkstation';
import { AuditLogWorkstation } from './AuditLogWorkstation';
import { SyncQueueWorkstation } from './SyncQueueWorkstation';
import { cn } from '@/lib/utils';

type DashboardTab = 'overview' | 'inventory' | 'audit' | 'reports' | 'trail' | 'sync';

export function DashboardWorkstation() {
  const { 
    searchTerm, 
    setSearchTerm,
    isOnline,
    isSyncing,
    refreshRegistry
  } = useAppState();

  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  
  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-[1600px] mx-auto pb-32">
      
      {/* 1. Global Command Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6 px-1">
        <div className="relative group flex-1 w-full lg:max-w-xl">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 group-focus-within:text-primary transition-all" />
          <Input 
            placeholder="Global search: Descriptions, Tag IDs, or Serials..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-14 pl-12 pr-24 rounded-2xl bg-white/[0.03] border-white/5 text-sm font-medium focus-visible:ring-primary/20 text-white placeholder:text-white/20 shadow-2xl"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
            <button className="p-2 hover:bg-white/5 rounded-lg text-white/20 hover:text-white transition-all"><ArrowUpDown className="h-4 w-4" /></button>
            <button className="p-2 hover:bg-white/5 rounded-lg text-white/20 hover:text-white transition-all"><Filter className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-muted/20 p-1.5 rounded-[1.5rem] border border-white/5 shadow-inner overflow-x-auto no-scrollbar">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DashboardTab)} className="w-full">
            <TabsList className="bg-transparent border-none p-0 h-auto gap-1 flex items-center">
              <TabsTrigger value="overview" className="px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-primary data-[state=active]:text-black transition-all">
                <LayoutDashboard className="h-3.5 w-3.5" /> Overview
              </TabsTrigger>
              <TabsTrigger value="inventory" className="px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-primary data-[state=active]:text-black transition-all">
                <Boxes className="h-3.5 w-3.5" /> Inventory
              </TabsTrigger>
              <TabsTrigger value="audit" className="px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-primary data-[state=active]:text-black transition-all">
                <ShieldCheck className="h-3.5 w-3.5" /> Audit Queue
              </TabsTrigger>
              <TabsTrigger value="reports" className="px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-primary data-[state=active]:text-black transition-all">
                <FileText className="h-3.5 w-3.5" /> Reports
              </TabsTrigger>
              <TabsTrigger value="trail" className="px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-primary data-[state=active]:text-black transition-all">
                <History className="h-3.5 w-3.5" /> Trail
              </TabsTrigger>
              <TabsTrigger value="sync" className="px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-primary data-[state=active]:text-black transition-all">
                <Activity className="h-3.5 w-3.5" /> Sync
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* 2. Unified Content Surface */}
      <div className="min-h-[60vh]">
        <Tabs value={activeTab} className="w-full">
          <TabsContent value="overview" className="m-0 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <AssetSummaryDashboard />
            <RegistryWorkstation />
          </TabsContent>

          <TabsContent value="inventory" className="m-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <RegistryWorkstation />
          </TabsContent>

          <TabsContent value="audit" className="m-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <VerifyWorkstation />
          </TabsContent>

          <TabsContent value="reports" className="m-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <ReportsWorkstation />
          </TabsContent>

          <TabsContent value="trail" className="m-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <AuditLogWorkstation />
          </TabsContent>

          <TabsContent value="sync" className="m-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <SyncQueueWorkstation />
          </TabsContent>
        </Tabs>
      </div>

      {/* 3. System Connectivity Status Pill */}
      <div className="fixed bottom-10 right-10 z-50">
        <div className={cn(
          "px-6 py-3 rounded-2xl border-2 backdrop-blur-3xl shadow-3xl flex items-center gap-4 transition-all duration-700",
          isOnline ? "bg-green-500/5 border-green-500/20 text-green-500" : "bg-red-500/5 border-red-500/20 text-red-500"
        )}>
          <div className={cn("h-2.5 w-2.5 rounded-full", isOnline ? "bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]" : "bg-red-500")} />
          <span className="text-[10px] font-black uppercase tracking-widest">
            {isOnline ? 'Registry Online' : 'Offline Mode'}
          </span>
          <div className="w-px h-4 bg-current/20 mx-1" />
          <button onClick={refreshRegistry} disabled={isSyncing} className="hover:scale-110 active:scale-95 transition-transform">
            <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
          </button>
        </div>
      </div>

    </div>
  );
}
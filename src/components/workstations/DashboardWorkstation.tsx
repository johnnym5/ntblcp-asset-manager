'use client';

/**
 * @fileOverview Dashboard Workstation - Unified Mission Control.
 * Optimized for Responsive Fidelity and Executive Density.
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
  DatabaseZap
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppState } from '@/contexts/app-state-context';
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
import AssetForm from '@/components/asset-form';
import { ImportScannerDialog } from '@/components/single-sheet-import-dialog';
import { enqueueMutation } from '@/offline/queue';

type DashboardTab = 'overview' | 'inventory';

export function DashboardWorkstation() {
  const { assets, appSettings, setActiveView, refreshRegistry } = useAppState();
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportScanOpen, setIsImportScanOpen] = useState(false);

  const isAdvanced = appSettings?.uxMode === 'advanced';

  const anomalyCount = useMemo(() => {
    return assets.filter(a => a.discrepancies?.some(d => d.status === 'PENDING')).length;
  }, [assets]);

  return (
    <div className="space-y-8 sm:space-y-12 animate-in fade-in duration-700 max-w-[1600px] mx-auto pb-40">
      
      {/* Header & Tab Toggle - Mobile Optimized */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6 px-1">
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

        <div className="w-full lg:w-auto bg-white/[0.03] p-1 rounded-xl sm:rounded-2xl border border-white/5 shadow-2xl overflow-x-auto no-scrollbar backdrop-blur-xl shrink-0">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DashboardTab)} className="w-full">
            <TabsList className="bg-transparent border-none p-0 h-auto gap-1 flex items-center min-w-max">
              <TabsTrigger value="overview" className="flex-1 px-6 sm:px-12 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-black uppercase text-[9px] sm:text-[10px] tracking-widest gap-2.5 data-[state=active]:bg-primary data-[state=active]:text-black transition-all whitespace-nowrap">
                Overview
              </TabsTrigger>
              <TabsTrigger value="inventory" className="flex-1 px-6 sm:px-12 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-black uppercase text-[9px] sm:text-[10px] tracking-widest gap-2.5 data-[state=active]:bg-primary data-[state=active]:text-black transition-all whitespace-nowrap">
                Inventory
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="min-h-0">
        <Tabs value={activeTab} className="w-full">
          <TabsContent value="overview" className="m-0 space-y-16 sm:space-y-24 animate-in fade-in slide-in-from-bottom-2 duration-500">
            
            {/* 1. Quick Start Hub */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-8">
                <AssetSummaryDashboard />
              </div>
              
              <div className="lg:col-span-4 space-y-6">
                <Card className="bg-[#080808] border-2 border-white/5 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-3xl">
                  <div className="p-5 sm:p-6 border-b border-white/5 bg-white/[0.02]">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2">
                      <DatabaseZap className="h-3.5 w-3.5" /> Data Orchestration
                    </h4>
                  </div>
                  <CardContent className="p-5 sm:p-6 space-y-3">
                    <Button onClick={() => setIsFormOpen(true)} className="w-full h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase text-[9px] sm:text-[10px] tracking-widest gap-3 hover:bg-white/10 transition-all justify-start px-6">
                      <PlusCircle className="h-4 w-4 text-primary" /> Manual Add
                    </Button>
                    <Button onClick={() => setIsImportScanOpen(true)} className="w-full h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase text-[9px] sm:text-[10px] tracking-widest gap-3 hover:bg-white/10 transition-all justify-start px-6">
                      <ScanSearch className="h-4 w-4 text-primary" /> Import Workbook
                    </Button>
                    <Button variant="ghost" onClick={() => setActiveView('IMPORT')} className="w-full h-12 rounded-xl text-white/40 font-black uppercase text-[8px] sm:text-[9px] tracking-widest gap-3 hover:text-white transition-all">
                      <FileUp className="h-3.5 w-3.5" /> Manual Mapping Flow
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            {/* 2. Folders Stack */}
            <div id="folders-section" className="space-y-6 sm:space-y-8">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-2 bg-white/5 rounded-lg sm:rounded-xl"><FolderOpen className="h-5 w-5 text-primary" /></div>
                  <h3 className="text-lg sm:text-xl font-black uppercase text-white tracking-tight">Registry Folders</h3>
                </div>
                <Badge variant="outline" className="border-white/10 text-white/40 uppercase text-[8px] sm:text-[9px] font-black px-3">Structural Discovery</Badge>
              </div>
              <AssetGroupsWorkstation isEmbedded={true} />
            </div>

            {/* 3. Anomalies Review */}
            <div id="anomalies-section" className="space-y-6 sm:space-y-8">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-2 bg-red-600/10 rounded-lg sm:rounded-xl"><SearchCode className="h-5 w-5 text-red-600" /></div>
                  <h3 className="text-lg sm:text-xl font-black uppercase text-white tracking-tight">Pattern Review</h3>
                </div>
                {anomalyCount > 0 && (
                  <Badge className="bg-red-600 text-white font-black uppercase text-[8px] sm:text-[9px] h-6 px-3 animate-pulse shadow-lg shadow-red-600/20">
                    {anomalyCount} ANOMALIES
                  </Badge>
                )}
              </div>
              <DiscrepancyWorkstation isEmbedded={true} />
            </div>

            {/* 4. Infrastructure & Contextual Sync */}
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

      <AssetForm 
        isOpen={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        isReadOnly={false} 
        onSave={async (a) => {
          await enqueueMutation('CREATE', 'assets', a);
          await refreshRegistry();
          setIsFormOpen(false);
          toast({ title: "Asset Added Locally" });
        }}
      />

      <ImportScannerDialog 
        isOpen={isImportScanOpen} 
        onOpenChange={setIsImportScanOpen} 
      />
    </div>
  );
}
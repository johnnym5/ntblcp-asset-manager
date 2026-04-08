'use client';

/**
 * @fileOverview Dashboard - Main Overview Hub.
 * Phase 1302: Implemented background color adaptation for themes.
 * Phase 1303: Overhauled contrast for Light Mode legibility.
 * Phase 1304: Fixed ReferenceError by importing missing icons.
 */

import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard,
  RefreshCw,
  ListFilter,
  DatabaseZap,
  Settings,
  ChevronDown,
  FolderOpen,
  SearchCode,
  FileText,
  Activity
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
  const { filteredAssets, appSettings, setActiveView, manualDownload, isSyncing, isOnline, setIsFilterOpen, activeFilterCount } = useAppState();
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  
  const isAdvanced = appSettings?.uxMode === 'advanced';
  const isAdmin = userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPERADMIN';

  const anomalyCount = useMemo(() => {
    return filteredAssets.filter(a => a.discrepancies?.some(d => d.status === 'PENDING')).length;
  }, [filteredAssets]);

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DashboardTab)} className="space-y-6 sm:space-y-8 animate-in fade-in duration-700 h-full flex flex-col">
      
      {/* STICKY CONTROL HUB */}
      <div className="sticky top-[-1rem] z-50 bg-background/95 backdrop-blur-xl pt-1 pb-3 px-1 border-b border-border mb-4 -mx-1 shrink-0">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 max-w-[1600px] mx-auto w-full">
          <div className="flex items-center gap-3 self-start">
            <div className="p-2 bg-primary/10 rounded-xl shadow-inner border border-primary/5">
              <LayoutDashboard className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-0.5">
              <h2 className="text-base sm:text-lg font-black uppercase text-foreground tracking-tight leading-none">
                Dashboard
              </h2>
              <p className="text-[7px] font-bold text-muted-foreground uppercase tracking-[0.25em] leading-none">
                {isAdvanced ? 'SYSTEM OVERVIEW' : 'ASSET STATUS'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-full lg:w-auto bg-muted/30 p-0.5 rounded-lg border border-border flex items-center shrink-0">
              <TabsList className="bg-transparent border-none p-0 h-auto gap-0.5 flex items-center min-w-max">
                <TabsTrigger value="overview" className="px-6 py-1.5 rounded-md font-black uppercase text-[8px] tracking-widest gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground transition-all">
                  Summary
                </TabsTrigger>
                <TabsTrigger value="inventory" className="px-6 py-1.5 rounded-md font-black uppercase text-[8px] tracking-widest gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground transition-all">
                  Asset Hub
                </TabsTrigger>
              </TabsList>
            </div>
            
            <div className="flex items-center gap-1.5">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setIsFilterOpen(true)} 
                className={cn(
                  "h-10 w-10 rounded-lg border-border bg-muted/50 text-primary relative",
                  activeFilterCount > 0 && "border-primary/40 shadow-lg"
                )}
              >
                <ListFilter className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-black text-[8px] font-black rounded-full flex items-center justify-center border-2 border-background">
                    {activeFilterCount}
                  </span>
                )}
              </Button>

              <Button 
                variant="ghost" 
                size="icon" 
                onClick={manualDownload} 
                disabled={isSyncing || !isOnline}
                className="rounded-lg h-10 w-10 bg-muted border border-border text-muted-foreground hover:text-primary shrink-0"
              >
                <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <TabsContent value="overview" className="m-0 space-y-10 sm:space-y-12 animate-in fade-in slide-in-from-bottom-1 duration-500 outline-none pb-20">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8">
              <AssetSummaryDashboard />
            </div>
            
            <div className="lg:col-span-4 space-y-4">
              <Card className="bg-card border border-border rounded-[1.25rem] overflow-hidden shadow-xl">
                <div className="p-4 border-b border-border bg-muted/10">
                  <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2">
                    <DatabaseZap className="h-3 w-3" /> Quick Access
                  </h4>
                </div>
                <CardContent className="p-4 space-y-2">
                  <Button onClick={() => setActiveView('SETTINGS')} variant="outline" className="w-full h-10 rounded-lg border-border text-foreground font-black uppercase text-[9px] tracking-widest gap-3 hover:bg-muted transition-all justify-start px-4">
                    <Settings className="h-3.5 w-3.5 text-primary" /> App Settings
                  </Button>
                  
                  {isAdmin && (
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                      <p className="text-[8px] font-bold text-primary uppercase leading-relaxed italic">
                        Administrator Access Active.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
          
          <Accordion type="multiple" className="space-y-8">
            <AccordionItem value="folders" className="border-none">
              <div className="flex items-center justify-between px-1 mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-muted rounded-lg"><FolderOpen className="h-4 w-4 text-primary" /></div>
                  <h3 className="text-base font-black uppercase text-foreground tracking-tight">Asset Folders</h3>
                </div>
                <AccordionTrigger className="hover:no-underline p-0 h-auto w-auto">
                  <Badge variant="outline" className="border-border text-muted-foreground uppercase text-[7px] font-black px-2 py-0.5 cursor-pointer hover:bg-muted gap-1.5">
                    Explore <ChevronDown className="h-2.5 w-2.5" />
                  </Badge>
                </AccordionTrigger>
              </div>
              <AccordionContent className="p-0">
                <AssetGroupsWorkstation isEmbedded={true} />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="anomalies" className="border-none">
              <div className="flex items-center justify-between px-1 mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-destructive/10 rounded-lg"><SearchCode className="h-4 w-4 text-destructive" /></div>
                  <h3 className="text-base font-black uppercase text-foreground tracking-tight">Data Review</h3>
                </div>
                <div className="flex items-center gap-2">
                  {anomalyCount > 0 && (
                    <Badge className="bg-destructive text-destructive-foreground font-black uppercase text-[7px] h-5 px-2 animate-pulse">
                      {anomalyCount} ERRORS
                    </Badge>
                  )}
                  <AccordionTrigger className="hover:no-underline p-0 h-auto w-auto">
                    <Badge variant="outline" className="border-border text-muted-foreground uppercase text-[7px] font-black px-2 py-0.5 cursor-pointer hover:bg-muted gap-1.5">
                      Review <ChevronDown className="h-2.5 w-2.5" />
                    </Badge>
                  </AccordionTrigger>
                </div>
              </div>
              <AccordionContent className="p-0">
                <DiscrepancyWorkstation isEmbedded={true} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start px-1 border-t border-border pt-10 sm:pt-12">
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <FileText className="h-3 w-3 text-primary" />
                <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">Reporting</h3>
              </div>
              <ReportsWorkstation isEmbedded={true} />
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <Activity className="h-3 w-3 text-primary" />
                <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">Sync Status</h3>
              </div>
              <SyncQueueWorkstation isEmbedded={true} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="m-0 animate-in fade-in slide-in-from-bottom-1 duration-500 outline-none pb-20">
          <RegistryWorkstation viewAll />
        </TabsContent>
      </div>
    </Tabs>
  );
}
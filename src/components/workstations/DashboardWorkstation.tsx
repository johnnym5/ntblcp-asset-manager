'use client';

/**
 * @fileOverview Intelligence Hub - Executive Overview.
 * Phase 1412: Integrated Issue Scanner and At-a-Glance random asset carousels.
 * Phase 1413: Added Bold Mode Header and expanded Operational Tools.
 * Phase 1414: Fixed missing ArrowRight import.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard,
  RefreshCw,
  DatabaseZap,
  Settings,
  FolderOpen,
  FileText,
  Activity,
  History,
  ShieldCheck,
  Zap,
  Monitor,
  ClipboardCheck,
  FileUp,
  LineChart,
  Trash2,
  AlertCircle,
  Download,
  Palette,
  Users,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Info,
  Maximize2,
  SearchCode,
  FileWarning,
  LayoutGrid,
  Eye
} from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { AssetSummaryDashboard } from '@/components/asset-summary-dashboard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from 'framer-motion';
import { transformAssetToRecord } from '@/lib/registry-utils';
import { AssetDetailSheet } from '@/components/registry/AssetDetailSheet';
import type { Asset } from '@/types/domain';

export function DashboardWorkstation() {
  const { 
    appSettings, 
    setActiveView, 
    manualDownload, 
    isSyncing, 
    isOnline,
    refreshRegistry,
    assets,
    headers,
    setGroupsViewMode
  } = useAppState();
  
  const { userProfile } = useAuth();
  
  const isAdmin = userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPERADMIN';
  const mode = appSettings?.appMode || 'management';

  // --- Carousel State & Logic ---
  const [issueIndex, setIssueIndex] = useState(0);
  const [glanceIndex, setGlanceIndex] = useState(0);
  const [randomSeed, setRandomSeed] = useState(0);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // 1. Issue Scanner Assets (Assets with issues)
  const issueAssets = useMemo(() => {
    const list = assets.filter(a => 
      a.status !== 'VERIFIED' || 
      ['Bad condition', 'Poor', 'Burnt', 'Stolen'].includes(a.condition || '') || 
      !a.assetIdCode || a.assetIdCode === 'N/A'
    );
    return [...list].sort(() => 0.5 - Math.random()).slice(0, 5);
  }, [assets, randomSeed]);

  // 2. At a Glance Assets (Random sample)
  const glanceAssets = useMemo(() => {
    return [...assets].sort(() => 0.5 - Math.random()).slice(0, 5);
  }, [assets, randomSeed]);

  const handleRefreshRandom = () => {
    setRandomSeed(prev => prev + 1);
    setIssueIndex(0);
    setGlanceIndex(0);
  };

  const handleInspect = (id: string) => {
    setSelectedAssetId(id);
    setIsDetailOpen(true);
  };

  const selectedRecord = useMemo(() => {
    if (!selectedAssetId) return undefined;
    const asset = assets.find(a => a.id === selectedAssetId);
    return asset ? transformAssetToRecord(asset, headers, appSettings?.sourceBranding) : undefined;
  }, [selectedAssetId, assets, headers, appSettings?.sourceBranding]);

  const getModeInfo = () => {
    switch(mode) {
      case 'verification': return { icon: ClipboardCheck, label: 'Verification Protocol', desc: 'Optimized for high-speed field assessment and status confirmation.' };
      case 'reporting': return { icon: FileText, label: 'Reporting Protocol', desc: 'Optimized for executive documentation and data quality compliance.' };
      default: return { icon: ShieldCheck, label: 'Management Protocol', desc: 'Optimized for registry governance, structural updates, and user orchestration.' };
    }
  };

  const modeInfo = getModeInfo();

  return (
    <div className="space-y-10 sm:space-y-12 animate-in fade-in duration-700 h-full flex flex-col">
      
      {/* HUB HEADER */}
      <div className="sticky top-[-1rem] sm:top-[-2rem] lg:top-[-2.5rem] z-40 bg-background/95 backdrop-blur-2xl pt-2 pb-4 px-1 border-b border-border mb-4 -mx-1 shrink-0">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 max-w-[1600px] mx-auto w-full">
          <div className="flex items-center gap-3 self-start">
            <div className="p-2.5 bg-primary/10 rounded-xl shadow-inner border border-primary/5">
              <LayoutDashboard className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-0.5">
              <h2 className="text-xl font-black uppercase text-foreground tracking-tight leading-none">
                Intelligence Hub
              </h2>
              <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em] leading-none">
                {mode.toUpperCase()} WORKSTATION
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={handleRefreshRandom} className="h-9 px-4 rounded-xl font-black text-[9px] uppercase tracking-widest border-2">
                    <RefreshCw className="h-3.5 w-3.5 mr-2" /> Refresh Carousels
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Get 5 new random sets</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={manualDownload} 
              disabled={isSyncing || !isOnline}
              className="rounded-xl h-10 w-10 bg-muted border border-border text-muted-foreground hover:text-primary transition-colors"
            >
              <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
            </Button>
          </div>
        </div>
      </div>

      {/* SYSTEM PROTOCOL HEADER */}
      <div className="px-1">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-8 sm:p-10 rounded-[3rem] border-2 border-primary/20 bg-primary/[0.03] flex flex-col md:flex-row items-center justify-between gap-8 shadow-3xl shadow-primary/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity">
            <modeInfo.icon className="h-40 w-40 text-primary" />
          </div>
          <div className="flex items-center gap-8 relative z-10 text-center md:text-left flex-col md:flex-row">
            <div className="p-6 bg-primary rounded-[2rem] shadow-2xl shadow-primary/30">
              <modeInfo.icon className="h-10 w-10 text-black stroke-[2.5]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-3xl font-black uppercase text-foreground tracking-tighter leading-none">{modeInfo.label}</h3>
              <p className="text-xs font-medium text-muted-foreground italic leading-relaxed max-w-xl">{modeInfo.desc}</p>
            </div>
          </div>
          <Badge className="bg-primary text-black font-black uppercase text-[10px] tracking-widest px-6 h-10 rounded-full shadow-lg relative z-10">Live Registry Protocol</Badge>
        </motion.div>
      </div>

      <div className="flex-1 min-h-0">
        <div className="space-y-16 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-32">
          
          {/* ANALYTICS SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8">
              <AssetSummaryDashboard />
            </div>
            
            <div className="lg:col-span-4 space-y-6">
              <div className="flex items-center gap-2 px-1">
                <Zap className="h-3 w-3 text-primary" />
                <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">Operational Tools</h3>
              </div>
              <Card className="bg-card border-border rounded-[2.5rem] overflow-hidden shadow-2xl">
                <CardContent className="p-6 space-y-3">
                  <Button onClick={() => setActiveView('REGISTRY')} variant="outline" className="w-full h-12 rounded-xl border-border font-black uppercase text-[10px] tracking-widest gap-4 justify-start px-5 group">
                    <FolderOpen className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" /> Asset Hub
                  </Button>
                  <Button onClick={() => { setGroupsViewMode('category'); setActiveView('GROUPS'); }} variant="outline" className="w-full h-12 rounded-xl border-border font-black uppercase text-[10px] tracking-widest gap-4 justify-start px-5">
                    <LayoutGrid className="h-4 w-4 text-primary" /> Browse Folders
                  </Button>
                  <Button onClick={() => { setGroupsViewMode('condition'); setActiveView('GROUPS'); }} variant="outline" className="w-full h-12 rounded-xl border-border font-black uppercase text-[10px] tracking-widest gap-4 justify-start px-5">
                    <Activity className="h-4 w-4 text-primary" /> Asset Conditions
                  </Button>
                  <Button onClick={() => setActiveView('ANOMALIES')} variant="outline" className="w-full h-12 rounded-xl border-border font-black uppercase text-[10px] tracking-widest gap-4 justify-start px-5">
                    <SearchCode className="h-4 w-4 text-primary" /> Pattern Anomalies
                  </Button>
                  {isAdmin && (
                    <Button onClick={() => setActiveView('SETTINGS')} variant="outline" className="w-full h-12 rounded-xl border-border font-black uppercase text-[10px] tracking-widest gap-4 justify-start px-5">
                      <Settings className="h-4 w-4 text-primary" /> System Settings
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* DYNAMIC CAROUSELS */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            
            {/* 1. ISSUE SCANNER */}
            <div className="space-y-6">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-red-500/10 rounded-lg border border-red-500/20"><FileWarning className="h-4 w-4 text-red-600" /></div>
                  <h3 className="text-sm font-black uppercase text-foreground tracking-tight">Issue Scanner</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" disabled={issueIndex === 0} onClick={() => setIssueIndex(i => i - 1)} className="h-8 w-8 rounded-full border border-border"><ChevronLeft className="h-4 w-4" /></Button>
                  <span className="text-[10px] font-mono font-bold text-muted-foreground">{issueIndex + 1} / {issueAssets.length || 1}</span>
                  <Button variant="ghost" size="icon" disabled={issueIndex === issueAssets.length - 1} onClick={() => setIssueIndex(i => i + 1)} className="h-8 w-8 rounded-full border border-border"><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {issueAssets.length > 0 ? (
                  <motion.div key={`issue-${issueIndex}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <Card className="rounded-[2.5rem] border-2 border-red-500/20 bg-red-500/[0.02] p-8 shadow-3xl group cursor-pointer" onClick={() => handleInspect(issueAssets[issueIndex].id)}>
                      <div className="flex flex-col sm:flex-row items-center gap-8">
                        <div className="p-6 bg-white rounded-[2rem] border-2 border-red-500/10 shadow-inner shrink-0 relative">
                          <Activity className="h-12 w-12 text-red-600" />
                          <Badge className="absolute -top-3 -right-3 bg-red-600 text-white font-black text-[8px] px-2 h-6 border-2 border-black">URGENT</Badge>
                        </div>
                        <div className="space-y-4 flex-1 text-center sm:text-left">
                          <div className="space-y-1">
                            <h4 className="text-xl font-black uppercase text-foreground leading-tight line-clamp-2">{issueAssets[issueIndex].description}</h4>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{issueAssets[issueIndex].location} &bull; {issueAssets[issueIndex].category}</p>
                          </div>
                          <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 space-y-2">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-red-600"><AlertCircle className="h-3 w-3" /> Potential Issues Detected:</div>
                            <ul className="text-[9px] font-bold text-muted-foreground uppercase list-disc pl-4 space-y-1">
                              {!issueAssets[issueIndex].assetIdCode && <li>Missing System Tag ID</li>}
                              {issueAssets[issueIndex].status !== 'VERIFIED' && <li>Pending Physical Verification</li>}
                              {['Bad condition', 'Poor', 'Burnt', 'Stolen'].includes(issueAssets[issueIndex].condition || '') && <li>Critical condition alert: {issueAssets[issueIndex].condition}</li>}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ) : (
                  <Card className="rounded-[2.5rem] border-2 border-dashed border-border p-20 text-center opacity-20"><Info className="h-12 w-12 mx-auto mb-4" /><p className="text-sm font-black uppercase tracking-widest">No issues found in sample</p></Card>
                )}
              </AnimatePresence>
            </div>

            {/* 2. AT A GLANCE */}
            <div className="space-y-6">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-primary/10 rounded-lg border border-primary/20"><Eye className="h-4 w-4 text-primary" /></div>
                  <h3 className="text-sm font-black uppercase text-foreground tracking-tight">At a Glance</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" disabled={glanceIndex === 0} onClick={() => setGlanceIndex(i => i - 1)} className="h-8 w-8 rounded-full border border-border"><ChevronLeft className="h-4 w-4" /></Button>
                  <span className="text-[10px] font-mono font-bold text-muted-foreground">{glanceIndex + 1} / {glanceAssets.length || 1}</span>
                  <Button variant="ghost" size="icon" disabled={glanceIndex === glanceAssets.length - 1} onClick={() => setGlanceIndex(i => i + 1)} className="h-8 w-8 rounded-full border border-border"><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {glanceAssets.length > 0 ? (
                  <motion.div key={`glance-${glanceIndex}`} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}>
                    <Card className="rounded-[2.5rem] border-2 border-border/40 bg-card p-8 shadow-3xl group cursor-pointer" onClick={() => handleInspect(glanceAssets[glanceIndex].id)}>
                      <div className="flex flex-col sm:flex-row items-center gap-8">
                        <div className="p-6 bg-muted/30 rounded-[2rem] border-2 border-border/40 shadow-inner shrink-0">
                          <LayoutGrid className="h-12 w-12 text-primary/40" />
                        </div>
                        <div className="space-y-4 flex-1 text-center sm:text-left">
                          <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Sample Profile</span>
                            <h4 className="text-xl font-black uppercase text-foreground leading-tight line-clamp-2">{glanceAssets[glanceIndex].description}</h4>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-0.5">
                              <p className="text-[8px] font-black text-muted-foreground uppercase opacity-40">Assigned State</p>
                              <p className="text-xs font-black uppercase truncate">{glanceAssets[glanceIndex].location}</p>
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-[8px] font-black text-muted-foreground uppercase opacity-40">Status Pulse</p>
                              <Badge className={cn("h-5 px-2 text-[8px] font-black uppercase", glanceAssets[glanceIndex].status === 'VERIFIED' ? "bg-green-600" : "bg-orange-600")}>{glanceAssets[glanceIndex].status}</Badge>
                            </div>
                          </div>
                          <Button variant="ghost" className="h-10 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest text-primary hover:bg-primary/10 w-full sm:w-auto">View Full Profile <Maximize2 className="ml-2 h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ) : (
                  <Card className="rounded-[2.5rem] border-2 border-dashed border-border p-20 text-center opacity-20"><Search className="h-12 w-12 mx-auto mb-4" /><p className="text-sm font-black uppercase tracking-widest">Registry Silent</p></Card>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* SYSTEM GRID */}
          <div className="space-y-8">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-muted rounded-lg border border-border"><Monitor className="h-4 w-4 text-primary" /></div>
                <h3 className="text-base font-black uppercase text-foreground tracking-tight">Infrastructure Monitor</h3>
              </div>
              <Badge variant="outline" className="border-border text-muted-foreground uppercase text-[8px] font-black tracking-widest">System Operational</Badge>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
              <div className="space-y-6">
                <div className="flex items-center gap-2 px-1">
                  <Activity className="h-3.5 w-3.5 text-primary" />
                  <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">Synchronization Ledger</h3>
                </div>
                <Card className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-xl p-8 flex flex-col items-center justify-center text-center space-y-6 group cursor-pointer hover:border-primary/20 transition-all" onClick={() => setActiveView('AUDIT_LOG')}>
                  <div className="p-6 bg-primary/10 rounded-full group-hover:scale-110 transition-transform"><History className="h-10 w-10 text-primary" /></div>
                  <div className="space-y-2">
                    <h4 className="text-lg font-black uppercase text-foreground tracking-tight">Activity History</h4>
                    <p className="text-[10px] font-medium text-muted-foreground italic leading-relaxed max-w-xs">Immutable trace of every modification pulse within the project register.</p>
                  </div>
                  <Button variant="ghost" className="font-black uppercase text-[10px] tracking-widest text-primary gap-2">Explore History <ArrowRight className="h-3 w-3" /></Button>
                </Card>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center gap-2 px-1">
                  <FileText className="h-3.5 w-3.5 text-blue-500" />
                  <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">Reporting Extraction</h3>
                </div>
                <Card className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-xl p-8 flex flex-col items-center justify-center text-center space-y-6 group cursor-pointer hover:border-blue-500/20 transition-all" onClick={() => setActiveView('REPORTS')}>
                  <div className="p-6 bg-blue-500/10 rounded-full group-hover:scale-110 transition-transform"><FileText className="h-10 w-10 text-blue-600" /></div>
                  <div className="space-y-2">
                    <h4 className="text-lg font-black uppercase text-foreground tracking-tight">Executive Documentation</h4>
                    <p className="text-[10px] font-medium text-muted-foreground italic leading-relaxed max-w-xs">Automated Travel Report generation and data quality compliance pulses.</p>
                  </div>
                  <Button variant="ghost" className="font-black uppercase text-[10px] tracking-widest text-blue-600 gap-2">Open Reports <ArrowRight className="h-3 w-3" /></Button>
                </Card>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="pt-12 border-t border-border flex flex-col items-center gap-4 opacity-30">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">Assetain v5.0.4</span>
            </div>
            <p className="text-[8px] font-medium uppercase tracking-widest italic text-center">Professional Asset Management Enterprise System</p>
          </div>

        </div>
      </div>

      <AssetDetailSheet 
        isOpen={isDetailOpen} 
        onOpenChange={setIsDetailOpen} 
        record={selectedRecord}
        onEdit={(id) => setActiveView('REGISTRY')}
      />
    </div>
  );
}

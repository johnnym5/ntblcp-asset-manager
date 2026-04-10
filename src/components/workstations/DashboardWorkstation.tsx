'use client';

/**
 * @fileOverview Intelligence Hub - Executive Overview.
 * Phase 1600: Integrated Carousel Controls & Swipe Support.
 * Phase 1601: Added Refresh Pulse for random data sampling.
 */

import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard,
  RefreshCw,
  Settings,
  FolderOpen,
  FileText,
  Activity,
  History,
  ShieldCheck,
  Zap,
  Monitor,
  ClipboardCheck,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Info,
  Maximize2,
  SearchCode,
  FileWarning,
  Eye,
  AlertCircle
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
import { TactileMenu } from '@/components/TactileMenu';

export function DashboardWorkstation() {
  const { 
    appSettings, 
    setActiveView, 
    isSyncing, 
    isOnline,
    assets,
    headers,
    setGroupsViewMode,
    refreshRegistry
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

  // 1. At a Glance Assets - Random healthy samples
  const glanceAssets = useMemo(() => {
    return [...assets].sort(() => 0.5 - Math.random()).slice(0, 8);
  }, [assets, randomSeed]);

  // 2. Issue Scanner Assets
  const issueAssets = useMemo(() => {
    const list = assets.filter(a => {
      const isUnverified = mode === 'verification' && a.status !== 'VERIFIED';
      const isBadCondition = ['Bad condition', 'Poor', 'Burnt', 'Stolen', 'Unsalvageable'].includes(a.condition || '');
      const hasAssetId = !!a.assetIdCode && a.assetIdCode !== 'N/A' && a.assetIdCode.trim() !== '';
      const cat = (a.category || '').toLowerCase();
      const isVehicle = cat.includes('motor') || cat.includes('vehicle');
      
      let hasTechId = false;
      if (isVehicle) {
        hasTechId = !!a.chassisNo && a.chassisNo !== 'N/A' && !!a.engineNo && a.engineNo !== 'N/A';
      } else {
        hasTechId = !!a.serialNumber && a.serialNumber !== 'N/A' && !!a.modelNumber && a.modelNumber !== 'N/A';
      }

      return isUnverified || isBadCondition || !hasAssetId || !hasTechId;
    });
    return [...list].sort(() => 0.5 - Math.random()).slice(0, 8);
  }, [assets, mode, randomSeed]);

  const handleRefreshRandom = () => {
    setRandomSeed(prev => prev + 1);
    setIssueIndex(0);
    setGlanceIndex(0);
  };

  const nextGlance = () => setGlanceIndex(prev => (prev + 1) % glanceAssets.length);
  const prevGlance = () => setGlanceIndex(prev => (prev - 1 + glanceAssets.length) % glanceAssets.length);
  
  const nextIssue = () => setIssueIndex(prev => (prev + 1) % issueAssets.length);
  const prevIssue = () => setIssueIndex(prev => (prev - 1 + issueAssets.length) % issueAssets.length);

  const handleInspect = (id: string) => {
    setSelectedAssetId(id);
    setIsDetailOpen(true);
  };

  const selectedRecord = useMemo(() => {
    if (!selectedAssetId) return undefined;
    const asset = assets.find(a => a.id === selectedAssetId);
    return asset ? transformAssetToRecord(asset, headers, appSettings?.sourceBranding) : undefined;
  }, [selectedAssetId, assets, headers, appSettings?.sourceBranding]);

  const modeInfo = useMemo(() => {
    switch(mode) {
      case 'verification': return { icon: ClipboardCheck, label: 'Verification Protocol', desc: 'Optimized for high-speed field assessment.' };
      case 'reporting': return { icon: FileText, label: 'Reporting Protocol', desc: 'Optimized for executive documentation.' };
      default: return { icon: ShieldCheck, label: 'Management Protocol', desc: 'Optimized for registry governance.' };
    }
  }, [mode]);

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => Math.abs(offset) * velocity;

  return (
    <div className="space-y-10 sm:space-y-12 animate-in fade-in duration-700 h-full flex flex-col">
      
      {/* 1. DYNAMIC CAROUSELS - ABSOLUTE TOP */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 px-1">
        
        {/* AT A GLANCE CAROUSEL */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-primary/10 rounded-lg border border-primary/20"><Eye className="h-4 w-4 text-primary" /></div>
              <h3 className="text-[10px] font-black uppercase text-foreground/60 tracking-[0.2em]">At a Glance</h3>
            </div>
          </div>

          <div className="relative group">
            <AnimatePresence mode="wait">
              {glanceAssets.length > 0 ? (
                <motion.div 
                  key={`glance-${glanceIndex}-${randomSeed}`} 
                  initial={{ opacity: 0, x: 20 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0, x: -20 }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={1}
                  onDragEnd={(e, { offset, velocity }) => {
                    const swipe = swipePower(offset.x, velocity.x);
                    if (swipe < -swipeConfidenceThreshold) nextGlance();
                    else if (swipe > swipeConfidenceThreshold) prevGlance();
                  }}
                >
                  <Card className="rounded-[2.5rem] border-2 border-border/40 bg-card p-8 shadow-3xl min-h-[220px] flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={handleRefreshRandom} className="h-8 w-8 rounded-full hover:bg-primary/10 text-primary transition-all">
                              <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="text-[8px] font-black uppercase">Refresh Sample</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-8 relative z-10">
                      <div className="p-6 bg-muted/30 rounded-[2rem] border-2 border-border/40 shadow-inner shrink-0 cursor-pointer" onClick={() => handleInspect(glanceAssets[glanceIndex].id)}>
                        <LayoutGrid className="h-12 w-12 text-primary/40" />
                      </div>
                      <div className="space-y-4 flex-1 text-center sm:text-left min-w-0">
                        <div className="space-y-1">
                          <span className="text-[9px] font-black uppercase text-primary tracking-[0.2em]">Asset Profile</span>
                          <h4 className="text-xl font-black uppercase text-foreground leading-tight line-clamp-2">{glanceAssets[glanceIndex].description}</h4>
                        </div>
                        <div className="flex items-center justify-center sm:justify-start gap-4">
                          <Badge className={cn("h-5 px-3 text-[8px] font-black uppercase border-none", glanceAssets[glanceIndex].status === 'VERIFIED' ? "bg-green-600 text-white" : "bg-orange-600 text-white")}>{glanceAssets[glanceIndex].status}</Badge>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">{glanceAssets[glanceIndex].location}</span>
                        </div>
                      </div>
                    </div>

                    {/* Integrated Controls */}
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="outline" size="icon" onClick={prevGlance} className="h-10 w-10 rounded-full border-2 bg-background/80 backdrop-blur-md"><ChevronLeft className="h-5 w-5" /></Button>
                    </div>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="outline" size="icon" onClick={nextGlance} className="h-10 w-10 rounded-full border-2 bg-background/80 backdrop-blur-md"><ChevronRight className="h-5 w-5" /></Button>
                    </div>
                  </Card>
                </motion.div>
              ) : (
                <Card className="rounded-[2.5rem] border-2 border-dashed border-border p-20 text-center opacity-20"><Monitor className="h-12 w-12 mx-auto mb-4" /><p className="text-sm font-black uppercase tracking-widest">Registry Silent</p></Card>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ISSUE SCANNER CAROUSEL */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-red-500/10 rounded-lg border border-red-500/20"><FileWarning className="h-4 w-4 text-red-600" /></div>
              <h3 className="text-[10px] font-black uppercase text-foreground/60 tracking-[0.2em]">Issue Scanner</h3>
            </div>
          </div>

          <div className="relative group">
            <AnimatePresence mode="wait">
              {issueAssets.length > 0 ? (
                <motion.div 
                  key={`issue-${issueIndex}-${randomSeed}`} 
                  initial={{ opacity: 0, x: 20 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0, x: -20 }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={1}
                  onDragEnd={(e, { offset, velocity }) => {
                    const swipe = swipePower(offset.x, velocity.x);
                    if (swipe < -swipeConfidenceThreshold) nextIssue();
                    else if (swipe > swipeConfidenceThreshold) prevIssue();
                  }}
                >
                  <Card className="rounded-[2.5rem] border-2 border-red-500/20 bg-red-500/[0.02] p-8 shadow-3xl min-h-[220px] flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
                      <Button variant="ghost" size="icon" onClick={handleRefreshRandom} className="h-8 w-8 rounded-full hover:bg-red-500/10 text-red-600 transition-all">
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-8 relative z-10">
                      <div className="p-6 bg-white rounded-[2rem] border-2 border-red-500/10 shadow-inner shrink-0 relative cursor-pointer" onClick={() => handleInspect(issueAssets[issueIndex].id)}>
                        <Activity className="h-12 w-12 text-red-600" />
                        <Badge className="absolute -top-2 -right-2 bg-red-600 text-white font-black text-[7px] px-1.5 h-5 border-2 border-black uppercase">Review</Badge>
                      </div>
                      <div className="space-y-3 flex-1 text-center sm:text-left min-w-0">
                        <h4 className="text-lg font-black uppercase text-foreground leading-tight line-clamp-1">{issueAssets[issueIndex].description}</h4>
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                          {(!issueAssets[issueIndex].assetIdCode || issueAssets[issueIndex].assetIdCode === 'N/A') && <Badge variant="outline" className="text-[7px] border-red-500/20 text-red-600">MISSING ID</Badge>}
                          {mode === 'verification' && issueAssets[issueIndex].status !== 'VERIFIED' && <Badge variant="outline" className="text-[7px] border-red-500/20 text-red-600">UNVERIFIED</Badge>}
                          {['Stolen', 'Burnt'].includes(issueAssets[issueIndex].condition || '') && <Badge className="bg-red-600 text-white text-[7px]">{issueAssets[issueIndex].condition?.toUpperCase()}</Badge>}
                        </div>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter truncate opacity-60">{issueAssets[issueIndex].location} &bull; {issueAssets[issueIndex].category}</p>
                      </div>
                    </div>

                    {/* Integrated Controls */}
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="outline" size="icon" onClick={prevIssue} className="h-10 w-10 rounded-full border-2 bg-background/80 backdrop-blur-md"><ChevronLeft className="h-5 w-5" /></Button>
                    </div>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="outline" size="icon" onClick={nextIssue} className="h-10 w-10 rounded-full border-2 bg-background/80 backdrop-blur-md"><ChevronRight className="h-5 w-5" /></Button>
                    </div>
                  </Card>
                </motion.div>
              ) : (
                <Card className="rounded-[2.5rem] border-2 border-dashed border-border p-20 text-center opacity-20"><Info className="h-12 w-12 mx-auto mb-4" /><p className="text-sm font-black uppercase tracking-widest">No issues found</p></Card>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* 2. MODE PROTOCOL HEADER */}
      <div className="px-1">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-8 sm:p-10 rounded-[3rem] border-2 border-primary/20 bg-primary/[0.03] flex flex-col md:flex-row items-center justify-between gap-8 shadow-3xl shadow-primary/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity">
            {React.createElement(modeInfo.icon, { className: "h-40 w-40 text-primary" })}
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
          <div className="flex items-center gap-3 relative z-10">
            <TactileMenu 
              title="Operational Tools"
              options={[
                { label: 'Asset Hub', icon: FolderOpen, onClick: () => setActiveView('REGISTRY') },
                { label: 'Browse Folders', icon: LayoutGrid, onClick: () => { setGroupsViewMode('category'); setActiveView('GROUPS'); } },
                { label: 'Asset Conditions', icon: Activity, onClick: () => { setGroupsViewMode('condition'); setActiveView('GROUPS'); } },
                { label: 'Pattern Anomalies', icon: SearchCode, onClick: () => setActiveView('ANOMALIES') },
                ...(isAdmin ? [{ label: 'System Settings', icon: Settings, onClick: () => setActiveView('SETTINGS') }] : [])
              ]}
            >
              <Badge 
                onClick={() => setActiveView('REGISTRY')}
                className="cursor-pointer bg-primary text-black font-black uppercase text-[10px] tracking-widest px-6 h-10 rounded-full shadow-lg border-2 border-black hover:scale-105 transition-transform active:scale-95"
              >
                LIVE REGISTRY PROTOCOL
              </Badge>
            </TactileMenu>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={refreshRegistry} disabled={isSyncing} className="h-10 w-10 rounded-xl bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center">
                    <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Re-sync protocol rules</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </motion.div>
      </div>
      
      {/* 3. ANALYTICS SECTION */}
      <div className="px-1">
        <AssetSummaryDashboard />
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

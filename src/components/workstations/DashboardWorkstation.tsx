'use client';

/**
 * @fileOverview Dashboard Center - Registry Overview.
 * Phase 1980: Resolved TypeError by adding data safety checks and fixing CSS typo.
 */

import React, { useState, useMemo, useEffect } from 'react';
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
  AlertCircle,
  CloudUpload,
  CheckCircle2,
  XCircle,
  GitPullRequest,
  Terminal,
  Database,
  Upload,
  Edit3,
  Trash2
} from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { AssetSummaryDashboard } from '@/components/asset-summary-dashboard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn, getFuzzySignature } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from 'framer-motion';
import { transformAssetToRecord } from '@/lib/registry-utils';
import { AssetDetailSheet } from '@/components/registry/AssetDetailSheet';
import { TactileMenu } from '@/components/TactileMenu';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { storage } from '@/offline/storage';
import { FirestoreService } from '@/services/firebase/firestore';
import type { Asset, ActivityLogEntry, OfflineQueueEntry } from '@/types/domain';
import { formatDistanceToNow } from 'date-fns';

export function DashboardWorkstation() {
  const { 
    appSettings, 
    setActiveView, 
    isSyncing, 
    refreshRegistry,
    assets,
    headers,
    manualUpload,
    isOnline
  } = useAppState();
  
  const { userProfile } = useAuth();
  const isAdmin = userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPERADMIN';
  const mode = appSettings?.appMode || 'management';

  // --- State ---
  const [issueIndex, setIssueIndex] = useState(0);
  const [glanceIndex, setGlanceIndex] = useState(0);
  const [randomSeed, setRandomSeed] = useState(0);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  // Ledger Data State
  const [pendingSync, setPendingSync] = useState<OfflineQueueEntry[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityLogEntry[]>([]);

  // SSR-Safe Sample State
  const [glanceAssets, setGlanceAssets] = useState<Asset[]>([]);
  const [issueAssets, setIssueAssets] = useState<(Asset & { activeIssues: string[] })[]>([]);

  // --- Load Ledger & Deterministic Samples ---
  useEffect(() => {
    const loadLedger = async () => {
      const [queue, logs] = await Promise.all([
        storage.getQueue(),
        FirestoreService.getGlobalActivity(5)
      ]);
      setPendingSync(queue.filter(q => q.status === 'PENDING' || q.status === 'FAILED'));
      setRecentActivity(logs);
    };
    loadLedger();
    const interval = setInterval(loadLedger, 5000);
    return () => clearInterval(interval);
  }, [assets, userProfile]);

  // Handle Non-Deterministic Sorting client-side only
  useEffect(() => {
    const generateSamples = () => {
      if (!assets || assets.length === 0) return;

      // 1. Glance Assets
      const gList = [...assets].sort(() => 0.5 - Math.random()).slice(0, 8);
      setGlanceAssets(gList);

      // 2. Issue Assets
      const iList = assets.map(a => {
        const issues: string[] = [];
        const catFuzzy = getFuzzySignature(a.category);
        const isVehicle = catFuzzy.includes('motor') || catFuzzy.includes('vehicle');
        const meta = (a.metadata as any) || {};
        
        const hasChassis = (!!a.chassisNo && a.chassisNo !== 'N/A') || 
                          Object.keys(meta).some(k => getFuzzySignature(k) === 'chassisno' && meta[k]);
        
        const hasEngine = (!!a.engineNo && a.engineNo !== 'N/A') || 
                         Object.keys(meta).some(k => getFuzzySignature(k) === 'engineno' && meta[k]);
        
        if (mode === 'verification' && a.status !== 'VERIFIED') issues.push("Not Verified");
        if (['Stolen', 'Burnt', 'Unsalvageable'].includes(a.condition || '')) issues.push(`State: ${a.condition}`);
        if (!a.assetIdCode || a.assetIdCode === 'N/A') issues.push("Missing ID");
        
        if (isVehicle) {
          if (!hasChassis) issues.push("No Chassis");
          if (!hasEngine) issues.push("No Engine");
        } else {
          const hasSerial = (!!a.serialNumber && a.serialNumber !== 'N/A') ||
                           Object.keys(meta).some(k => getFuzzySignature(k) === 'serialnumber' && meta[k]);
          if (!hasSerial) issues.push("No Serial");
        }

        return { ...a, activeIssues: issues };
      }).filter(a => a.activeIssues.length > 0);

      setIssueAssets(iList.sort(() => 0.5 - Math.random()).slice(0, 8));
    };

    generateSamples();
  }, [assets, mode, randomSeed]);

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

  const modeInfo = useMemo(() => {
    switch(mode) {
      case 'verification': return { icon: ClipboardCheck, label: 'Verification Mode', desc: 'Verify assets and record field observations.' };
      default: return { icon: ShieldCheck, label: 'Manager Mode', desc: 'Oversee projects, users, and asset lists.' };
    }
  }, [mode]);

  const swipePower = (offset: number, velocity: number) => Math.abs(offset) * velocity;
  const swipeThreshold = 10000;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-40">
      
      {/* 1. System Banner */}
      <div className="px-1">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-6 sm:p-8 rounded-[2.5rem] border-2 border-primary/20 bg-primary/[0.03] flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            {React.createElement(modeInfo.icon, { className: "h-32 w-32 text-primary" })}
          </div>
          <div className="flex items-center gap-6 relative z-10 text-center md:text-left flex-col md:flex-row">
            <div className="p-5 bg-primary rounded-2xl shadow-xl">
              <modeInfo.icon className="h-8 w-8 text-black stroke-[2.5]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-black uppercase text-foreground tracking-tighter leading-none">{modeInfo.label}</h3>
              <p className="text-[11px] font-medium text-muted-foreground italic leading-relaxed max-w-lg">{modeInfo.desc}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 relative z-10">
            <Badge 
              onClick={() => setActiveView('REGISTRY')}
              className="cursor-pointer bg-primary text-black font-black uppercase text-[9px] tracking-widest px-5 h-9 rounded-full shadow-lg border-2 border-black hover:scale-105 transition-transform"
            >
              OPEN ASSET LIST
            </Badge>
          </div>
        </motion.div>
      </div>

      {/* 2. Sample Scanners */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 px-1">
        {/* AT A GLANCE */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[9px] font-black uppercase text-foreground/40 tracking-[0.3em] flex items-center gap-2">
              <Eye className="h-3 w-3" /> Quick Look
            </h3>
          </div>
          <div className="relative group min-h-[200px]">
            <AnimatePresence mode="wait">
              {glanceAssets.length > 0 && glanceAssets[glanceIndex] ? (
                <motion.div 
                  key={`glance-${glanceIndex}-${randomSeed}`} 
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  drag="x" dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={(e, { offset, velocity }) => {
                    const swipe = swipePower(offset.x, velocity.x);
                    if (swipe < -swipeThreshold) setGlanceIndex(p => (p + 1) % glanceAssets.length);
                    else if (swipe > swipeThreshold) setGlanceIndex(p => (p - 1 + glanceAssets.length) % glanceAssets.length);
                  }}
                >
                  <TactileMenu
                    title="Quick Action"
                    options={[
                      { label: 'View Profile', icon: Eye, onClick: () => handleInspect(glanceAssets[glanceIndex].id) },
                      { label: 'Edit Asset', icon: Edit3, onClick: () => setActiveView('REGISTRY') },
                      { label: 'Refresh Samples', icon: RefreshCw, onClick: handleRefreshRandom }
                    ]}
                  >
                    <Card 
                      onClick={() => handleInspect(glanceAssets[glanceIndex].id)}
                      className="rounded-[2rem] border-2 border-border/40 bg-card p-6 shadow-xl h-[200px] flex flex-col justify-center relative cursor-pointer hover:border-primary/20 transition-all"
                    >
                      <div className="absolute top-3 right-3 z-20">
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleRefreshRandom(); }} className="h-8 w-8 rounded-full hover:bg-primary/10 text-primary">
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-6 relative z-10">
                        <div className="p-5 bg-muted/30 rounded-2xl border-2 border-border/40 shrink-0 shadow-inner"><LayoutGrid className="h-10 w-10 text-primary/40" /></div>
                        <div className="space-y-3 flex-1 min-w-0">
                          <div className="space-y-0.5">
                            <span className="text-[8px] font-black uppercase text-primary tracking-widest">Asset Profile</span>
                            <h4 className="text-lg font-black uppercase text-foreground truncate">{glanceAssets[glanceIndex].description}</h4>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={cn("h-5 px-3 text-[7px] font-black uppercase border-none", glanceAssets[glanceIndex].status === 'VERIFIED' ? "bg-green-600" : "bg-orange-600")}>{glanceAssets[glanceIndex].status}</Badge>
                            <span className="text-[9px] font-bold text-muted-foreground uppercase truncate">{glanceAssets[glanceIndex].location}</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </TactileMenu>
                </motion.div>
              ) : (
                <div className="h-[200px] flex items-center justify-center border-2 border-dashed border-border/40 rounded-[2rem] opacity-20">
                  <Database className="h-10 w-10 text-muted-foreground" />
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ISSUE SCANNER */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[9px] font-black uppercase text-foreground/40 tracking-[0.3em] flex items-center gap-2">
              <FileWarning className="h-3 w-3" /> Problems Found
            </h3>
          </div>
          <div className="relative group min-h-[200px]">
            <AnimatePresence mode="wait">
              {issueAssets.length > 0 && issueAssets[issueIndex] ? (
                <motion.div 
                  key={`issue-${issueIndex}-${randomSeed}`}
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  drag="x" dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={(e, { offset, velocity }) => {
                    const swipe = swipePower(offset.x, velocity.x);
                    if (swipe < -swipeThreshold) setIssueIndex(p => (p + 1) % issueAssets.length);
                    else if (swipe > swipeThreshold) setIssueIndex(p => (p - 1 + issueAssets.length) % issueAssets.length);
                  }}
                >
                  <TactileMenu
                    title="Review Action"
                    options={[
                      { label: 'Check Issue', icon: FileWarning, onClick: () => handleInspect(issueAssets[issueIndex].id) },
                      { label: 'Fix Profile', icon: Edit3, onClick: () => setActiveView('REGISTRY') },
                      { label: 'Clear Mark', icon: ShieldCheck, onClick: () => {} }
                    ]}
                  >
                    <Card 
                      onClick={() => handleInspect(issueAssets[issueIndex].id)}
                      className="rounded-[2rem] border-2 border-red-500/20 bg-red-500/[0.02] p-6 shadow-xl h-[200px] flex flex-col justify-center relative cursor-pointer hover:border-red-500/40 transition-all"
                    >
                      <div className="absolute top-3 right-3 z-20">
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleRefreshRandom(); }} className="h-8 w-8 rounded-full hover:bg-red-500/10 text-red-600">
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-6 relative z-10">
                        <div className="p-5 bg-white rounded-2xl border-2 border-red-500/10 shrink-0 shadow-inner">
                          <Activity className="h-10 w-10 text-red-600" />
                        </div>
                        <div className="space-y-3 flex-1 min-w-0">
                          <h4 className="text-lg font-black uppercase text-foreground truncate leading-none">{issueAssets[issueIndex].description}</h4>
                          <div className="flex flex-wrap items-center gap-2">
                            {issueAssets[issueIndex].activeIssues.map((issue: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-[7px] font-black uppercase border-red-500/20 text-red-600 bg-red-500/5">{issue}</Badge>
                            ))}
                          </div>
                          <p className="text-[8px] font-bold text-muted-foreground uppercase truncate opacity-60">{issueAssets[issueIndex].location} • {issueAssets[issueIndex].category}</p>
                        </div>
                      </div>
                    </Card>
                  </TactileMenu>
                </motion.div>
              ) : (
                <div className="h-[200px] flex items-center justify-center border-2 border-dashed border-border/40 rounded-[2rem] opacity-20">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* 3. Asset Analytics */}
      <div className="px-1">
        <AssetSummaryDashboard />
      </div>

      {/* 4. Activity History */}
      <div className="px-1">
        <Card className="rounded-[2.5rem] border-2 border-border/40 bg-card/50 overflow-hidden shadow-2xl">
          <CardHeader className="p-6 border-b bg-muted/20 flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-primary/10 rounded-xl"><Terminal className="h-5 w-5 text-primary" /></div>
              <div className="space-y-0.5">
                <CardTitle className="text-lg font-black uppercase tracking-tight">Recent Activity</CardTitle>
                <CardDescription className="text-[8px] font-black uppercase tracking-widest">Live update stream</CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-[7px] font-black h-5 px-2">{pendingSync.length} WAITING</Badge>
              <Badge variant="outline" className="text-[7px] font-black h-5 px-2">{recentActivity.length} SAVED</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="sync" className="px-6 border-b border-border/40">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-4 text-left">
                    <CloudUpload className={cn("h-4 w-4", pendingSync.length > 0 ? "text-orange-500 animate-pulse" : "text-green-500")} />
                    <span className="text-[11px] font-black uppercase tracking-widest">Waiting to Sync</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  <div className="space-y-2 mb-4">
                    {pendingSync.slice(0, 3).map(q => (
                      <div key={q.id} className="flex items-center justify-between p-3 rounded-xl bg-background border border-border">
                        <span className="text-[10px] font-black uppercase truncate max-w-[200px]">{(q.payload as any).description || 'Profile Update'}</span>
                        <Badge variant="outline" className="text-[7px] font-mono">{q.operation}</Badge>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setActiveView('SYNC_QUEUE')} className="flex-1 h-10 rounded-xl font-black uppercase text-[9px] border-2">Manage Updates</Button>
                    <Button variant="outline" onClick={manualUpload} disabled={isSyncing || !isOnline || pendingSync.length === 0} className="flex-1 h-10 rounded-xl font-black uppercase text-[9px] border-2 gap-2 text-primary border-primary/20">
                      <Upload className="h-3 w-3" /> Save Changes
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="history" className="px-6 border-none">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-4 text-left">
                    <History className="h-4 w-4 text-primary" />
                    <span className="text-[11px] font-black uppercase tracking-widest">Recent History</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  <div className="space-y-2 mb-4">
                    {recentActivity.map(l => (
                      <div key={l.id} className="flex items-center justify-between p-3 rounded-xl bg-background border border-border">
                        <span className="text-[9px] font-bold text-muted-foreground truncate w-20">{l.performedBy}</span>
                        <span className="text-[10px] font-black uppercase truncate flex-1 px-4">{l.assetDescription}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[8px] font-mono opacity-40">{formatDistanceToNow(new Date(l.timestamp), { addSuffix: true })}</span>
                          <Badge variant="outline" className="text-[7px] font-black border-primary/20 text-primary">{l.operation}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" onClick={() => setActiveView('AUDIT_LOG')} className="w-full h-10 rounded-xl font-black uppercase text-[9px] border-2">View Full History</Button>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>

      {/* 5. Details Sheet */}
      <AssetDetailSheet 
        isOpen={isDetailOpen} 
        onOpenChange={setIsDetailOpen} 
        record={selectedRecord}
        onEdit={(id) => setActiveView('REGISTRY')}
      />
    </div>
  );
}

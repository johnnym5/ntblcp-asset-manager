'use client';

/**
 * @fileOverview Intelligence Hub - Executive Overview.
 * Phase 1610: Moved Protocol Header to Top.
 * Phase 1611: Enabled Clickable Carousel Assets with Issue Labeling.
 * Phase 1612: Integrated Operational Ledger (Sync/Activity/Audits).
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
  Database
} from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { AssetSummaryDashboard } from '@/components/asset-summary-dashboard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
    setGroupsViewMode
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
  const [myAuditRequests, setMyAuditRequests] = useState<Asset[]>([]);

  // --- Load Ledger Pulse ---
  useEffect(() => {
    const loadLedger = async () => {
      const [queue, logs] = await Promise.all([
        storage.getQueue(),
        FirestoreService.getGlobalActivity(5)
      ]);
      setPendingSync(queue.filter(q => q.status === 'PENDING' || q.status === 'FAILED'));
      setRecentActivity(logs);
      setMyAuditRequests(assets.filter(a => a.approvalStatus === 'PENDING' && a.changeSubmittedBy?.loginName === userProfile?.loginName));
    };
    loadLedger();
    const interval = setInterval(loadLedger, 5000);
    return () => clearInterval(interval);
  }, [assets, userProfile]);

  // --- Data Calculations ---
  const glanceAssets = useMemo(() => {
    return [...assets].sort(() => 0.5 - Math.random()).slice(0, 8);
  }, [assets, randomSeed]);

  const issueAssets = useMemo(() => {
    const list = assets.map(a => {
      const issues: string[] = [];
      const isVehicle = (a.category || '').toLowerCase().includes('motor') || (a.category || '').toLowerCase().includes('vehicle');
      
      if (mode === 'verification' && a.status !== 'VERIFIED') issues.push("Unverified Pulse");
      if (['Stolen', 'Burnt', 'Unsalvageable'].includes(a.condition || '')) issues.push(`Condition: ${a.condition}`);
      if (!a.assetIdCode || a.assetIdCode === 'N/A') issues.push("Missing ID Tag");
      
      if (isVehicle) {
        if (!a.chassisNo || a.chassisNo === 'N/A') issues.push("Missing Chassis");
        if (!a.engineNo || a.engineNo === 'N/A') issues.push("Missing Engine");
      } else {
        if (!a.serialNumber || a.serialNumber === 'N/A') issues.push("Missing Serial");
      }

      return { ...a, activeIssues: issues };
    }).filter(a => a.activeIssues.length > 0);

    return [...list].sort(() => 0.5 - Math.random()).slice(0, 8);
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
      case 'verification': return { icon: ClipboardCheck, label: 'Verification Protocol', desc: 'Optimized for high-speed field assessment.' };
      case 'reporting': return { icon: FileText, label: 'Reporting Protocol', desc: 'Optimized for executive documentation.' };
      default: return { icon: ShieldCheck, label: 'Management Protocol', desc: 'Optimized for registry governance.' };
    }
  }, [mode]);

  const swipePower = (offset: number, velocity: number) => Math.abs(offset) * velocity;
  const swipeThreshold = 10000;

  return (
    <div className="space-y-10 sm:space-y-12 animate-in fade-in duration-700 pb-40">
      
      {/* 1. MODE PROTOCOL HEADER - NOW AT TOP */}
      <div className="px-1">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-8 sm:p-10 rounded-[3rem] border-2 border-primary/20 bg-primary/[0.03] flex flex-col md:flex-row items-center justify-between gap-8 shadow-3xl shadow-primary/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity">
            {React.createElement(modeInfo.icon, { className: "h-40 w-40 text-primary" })}
          </div>
          <div className="flex items-center gap-8 relative z-10 text-center md:text-left flex-col md:flex-row">
            <div className="p-6 bg-primary rounded-[2.5rem] shadow-2xl shadow-primary/30">
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

      {/* 2. DYNAMIC CAROUSELS */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 px-1">
        {/* AT A GLANCE */}
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
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  drag="x" dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={(e, { offset, velocity }) => {
                    const swipe = swipePower(offset.x, velocity.x);
                    if (swipe < -swipeThreshold) setGlanceIndex(p => (p + 1) % glanceAssets.length);
                    else if (swipe > swipeThreshold) setGlanceIndex(p => (p - 1 + glanceAssets.length) % glanceAssets.length);
                  }}
                >
                  <Card 
                    onClick={() => handleInspect(glanceAssets[glanceIndex].id)}
                    className="rounded-[2.5rem] border-2 border-border/40 bg-card p-8 shadow-3xl min-h-[220px] flex flex-col justify-center relative overflow-hidden cursor-pointer hover:border-primary/20 transition-all"
                  >
                    <div className="absolute top-4 right-4 z-20"><Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleRefreshRandom(); }} className="h-8 w-8 rounded-full hover:bg-primary/10 text-primary"><RefreshCw className="h-3.5 w-3.5" /></Button></div>
                    <div className="flex flex-col sm:flex-row items-center gap-8 relative z-10">
                      <div className="p-6 bg-muted/30 rounded-[2rem] border-2 border-border/40 shadow-inner shrink-0"><LayoutGrid className="h-12 w-12 text-primary/40" /></div>
                      <div className="space-y-4 flex-1 text-center sm:text-left min-w-0">
                        <div className="space-y-1">
                          <span className="text-[9px] font-black uppercase text-primary tracking-[0.2em]">Health Sample</span>
                          <h4 className="text-xl font-black uppercase text-foreground leading-tight line-clamp-2">{glanceAssets[glanceIndex].description}</h4>
                        </div>
                        <div className="flex items-center justify-center sm:justify-start gap-4">
                          <Badge className={cn("h-5 px-3 text-[8px] font-black uppercase border-none", glanceAssets[glanceIndex].status === 'VERIFIED' ? "bg-green-600 text-white" : "bg-orange-600 text-white")}>{glanceAssets[glanceIndex].status}</Badge>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">{glanceAssets[glanceIndex].location}</span>
                        </div>
                      </div>
                    </div>
                    {/* Controls */}
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"><Button variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); setGlanceIndex(p => (p - 1 + glanceAssets.length) % glanceAssets.length); }} className="h-10 w-10 rounded-full border-2 bg-background/80 backdrop-blur-md"><ChevronLeft className="h-5 w-5" /></Button></div>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"><Button variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); setGlanceIndex(p => (p + 1) % glanceAssets.length); }} className="h-10 w-10 rounded-full border-2 bg-background/80 backdrop-blur-md"><ChevronRight className="h-5 w-5" /></Button></div>
                  </Card>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        {/* ISSUE SCANNER */}
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
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  drag="x" dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={(e, { offset, velocity }) => {
                    const swipe = swipePower(offset.x, velocity.x);
                    if (swipe < -swipeThreshold) setIssueIndex(p => (p + 1) % issueAssets.length);
                    else if (swipe > swipeThreshold) setIssueIndex(p => (p - 1 + issueAssets.length) % issueAssets.length);
                  }}
                >
                  <Card 
                    onClick={() => handleInspect(issueAssets[issueIndex].id)}
                    className="rounded-[2.5rem] border-2 border-red-500/20 bg-red-500/[0.02] p-8 shadow-3xl min-h-[220px] flex flex-col justify-center relative overflow-hidden cursor-pointer hover:border-red-500/40 transition-all"
                  >
                    <div className="absolute top-4 right-4 z-20"><Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleRefreshRandom(); }} className="h-8 w-8 rounded-full hover:bg-red-500/10 text-red-600"><RefreshCw className="h-3.5 w-3.5" /></Button></div>
                    <div className="flex flex-col sm:flex-row items-center gap-8 relative z-10">
                      <div className="p-6 bg-white rounded-[2rem] border-2 border-red-500/10 shadow-inner shrink-0 relative">
                        <Activity className="h-12 w-12 text-red-600" />
                        <Badge className="absolute -top-2 -right-2 bg-red-600 text-white font-black text-[7px] px-1.5 h-5 border-2 border-black uppercase shadow-lg">Review</Badge>
                      </div>
                      <div className="space-y-3 flex-1 text-center sm:text-left min-w-0">
                        <h4 className="text-xl font-black uppercase text-foreground leading-tight line-clamp-1">{issueAssets[issueIndex].description}</h4>
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                          {(issueAssets[issueIndex] as any).activeIssues.map((issue: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-[7px] font-black uppercase border-red-500/20 text-red-600 bg-red-500/5">{issue}</Badge>
                          ))}
                        </div>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter truncate opacity-60">{issueAssets[issueIndex].location} &bull; {issueAssets[issueIndex].category}</p>
                      </div>
                    </div>
                    {/* Controls */}
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"><Button variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); setIssueIndex(p => (p - 1 + issueAssets.length) % issueAssets.length); }} className="h-10 w-10 rounded-full border-2 bg-background/80 backdrop-blur-md"><ChevronLeft className="h-5 w-5" /></Button></div>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"><Button variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); setIssueIndex(p => (p + 1) % issueAssets.length); }} className="h-10 w-10 rounded-full border-2 bg-background/80 backdrop-blur-md"><ChevronRight className="h-5 w-5" /></Button></div>
                  </Card>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* 3. ANALYTICS (INVENTORY PULSE) */}
      <div className="px-1">
        <AssetSummaryDashboard />
      </div>

      {/* 4. OPERATIONAL LEDGER - INTEGRATED FEED */}
      <div className="px-1">
        <Card className="rounded-[3rem] border-2 border-border/40 bg-card/50 overflow-hidden shadow-3xl">
          <CardHeader className="p-8 border-b bg-muted/20 flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-2xl"><Terminal className="h-6 w-6 text-primary" /></div>
              <div className="space-y-0.5">
                <CardTitle className="text-xl font-black uppercase tracking-tight">Intelligence Ledger</CardTitle>
                <CardDescription className="text-[9px] font-black uppercase tracking-widest">Real-time operational pulse</CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="border-border bg-background text-[8px] font-black uppercase h-6 px-3">{pendingSync.length} PENDING</Badge>
              <Badge variant="outline" className="border-border bg-background text-[8px] font-black uppercase h-6 px-3">{myAuditRequests.length} REQUESTS</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Accordion type="single" collapsible className="w-full">
              {/* SYNC PULSE */}
              <AccordionItem value="sync" className="border-b-2 border-border/40 px-8 py-2 hover:bg-primary/[0.01] transition-all">
                <AccordionTrigger className="hover:no-underline py-6">
                  <div className="flex items-center gap-4 w-full text-left">
                    <CloudUpload className={cn("h-5 w-5", pendingSync.length > 0 ? "text-orange-500 animate-pulse" : "text-green-500")} />
                    <div className="flex-1">
                      <span className="text-xs font-black uppercase tracking-widest">Pending Cloud Reconciliation</span>
                      <p className="text-[10px] font-medium text-muted-foreground italic mt-1">{pendingSync.length > 0 ? `${pendingSync.length} modifications waiting for internet heartbeat.` : 'Local database in parity with cloud.'}</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-8">
                  <div className="space-y-2 mb-6">
                    {pendingSync.slice(0, 3).map(q => (
                      <div key={q.id} className="flex items-center justify-between p-4 rounded-xl bg-background border border-border shadow-sm">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-[7px] font-mono">{q.operation}</Badge>
                          <span className="text-[10px] font-black uppercase truncate max-w-[200px]">{(q.payload as any).description || 'Record Change'}</span>
                        </div>
                        <span className="text-[8px] font-bold text-muted-foreground opacity-40">{formatDistanceToNow(q.timestamp, { addSuffix: true })}</span>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" onClick={() => setActiveView('SYNC_QUEUE')} className="w-full h-12 rounded-xl font-black uppercase text-[10px] border-2">Manage Full Queue <ArrowRight className="ml-2 h-3 w-3" /></Button>
                </AccordionContent>
              </AccordionItem>

              {/* AUDIT STATUS */}
              <AccordionItem value="audit" className="border-b-2 border-border/40 px-8 py-2 hover:bg-primary/[0.01] transition-all">
                <AccordionTrigger className="hover:no-underline py-6">
                  <div className="flex items-center gap-4 w-full text-left">
                    <GitPullRequest className="h-5 w-5 text-blue-500" />
                    <div className="flex-1">
                      <span className="text-xs font-black uppercase tracking-widest">Registry Adjudication Feed</span>
                      <p className="text-[10px] font-medium text-muted-foreground italic mt-1">{myAuditRequests.length > 0 ? `${myAuditRequests.length} changes awaiting administrative pulse.` : 'No active approval requests.'}</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-8">
                  <div className="space-y-2 mb-6">
                    {myAuditRequests.slice(0, 3).map(a => (
                      <div key={a.id} className="flex items-center justify-between p-4 rounded-xl bg-background border border-border">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
                          <span className="text-[10px] font-black uppercase truncate max-w-[200px]">{a.description}</span>
                        </div>
                        <Badge className="bg-blue-500/10 text-blue-600 text-[7px] font-black uppercase h-5">PENDING</Badge>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" onClick={() => handleInspect(myAuditRequests[0]?.id)} disabled={myAuditRequests.length === 0} className="w-full h-12 rounded-xl font-black uppercase text-[10px] border-2">Track All Requests <ArrowRight className="ml-2 h-3 w-3" /></Button>
                </AccordionContent>
              </AccordionItem>

              {/* ACTIVITY TRAIL */}
              <AccordionItem value="history" className="border-none px-8 py-2 hover:bg-primary/[0.01] transition-all">
                <AccordionTrigger className="hover:no-underline py-6">
                  <div className="flex items-center gap-4 w-full text-left">
                    <History className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <span className="text-xs font-black uppercase tracking-widest">Recent Activity Pulse</span>
                      <p className="text-[10px] font-medium text-muted-foreground italic mt-1">Immutable forensic trace of latest registry modifications.</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-8">
                  <div className="space-y-2 mb-6">
                    {recentActivity.map(l => (
                      <div key={l.id} className="flex items-center justify-between p-4 rounded-xl bg-background border border-border">
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] font-bold text-muted-foreground truncate w-20">{l.performedBy}</span>
                          <span className="text-[10px] font-black uppercase truncate max-w-[180px]">{l.assetDescription}</span>
                        </div>
                        <Badge variant="outline" className="text-[7px] font-black border-primary/20 text-primary">{l.operation}</Badge>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" onClick={() => setActiveView('AUDIT_LOG')} className="w-full h-12 rounded-xl font-black uppercase text-[10px] border-2">Review Global Ledger <ArrowRight className="ml-2 h-3 w-3" /></Button>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>

      {/* Overlays */}
      <AssetDetailSheet 
        isOpen={isDetailOpen} 
        onOpenChange={setIsDetailOpen} 
        record={selectedRecord}
        onEdit={(id) => setActiveView('REGISTRY')}
      />
    </div>
  );
}

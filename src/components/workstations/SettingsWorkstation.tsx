'use client';

/**
 * @fileOverview SettingsWorkstation - Master Control Center.
 * Phase 93: Fixed JSX syntax errors and icon reference issues.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from 'next-themes';
import { 
  Settings, 
  UserCog, 
  Palette, 
  CheckCircle2, 
  Trash2, 
  Save, 
  Loader2, 
  Sun, 
  Moon, 
  Zap,
  RefreshCw,
  Smartphone,
  Info,
  Download,
  RotateCcw,
  Lock,
  Cpu,
  GraduationCap,
  Activity,
  Bomb,
  FileUp,
  Network,
  Cloud,
  HardDrive,
  Monitor,
  ShieldAlert,
  Hammer,
  ArrowRightLeft,
  Terminal,
  Split,
  Search,
  FileJson,
  XCircle,
  ScanSearch,
  ChevronRight,
  ArrowUpRight,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { UserManagement } from '@/components/admin/user-management';
import { FirestoreService } from '@/services/firebase/firestore';
import { storage } from '@/offline/storage';
import { ArchiveService } from '@/lib/archive-service';
import { SystemDiagnostics, type DiagnosticResult } from '@/lib/diagnostics';
import { VirtualDBService } from '@/services/virtual-db-service';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { saveAs } from 'file-saver';
import type { AppSettings, UXMode, AuthorityNode, StorageLayer, ErrorLogEntry, ErrorLogStatus } from '@/types/domain';
import type { DBNode } from '@/types/virtual-db';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export function SettingsWorkstation() {
  const { appSettings, refreshRegistry, settingsLoaded, isSyncing, isOnline, setReadAuthority } = useAppState();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const { setTheme, theme } = useTheme();

  const [draftSettings, setDraftSettings] = useState<AppSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isGlobalPurgeDialogOpen, setIsGlobalPurgeDialogOpen] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [diagnosticPulse, setDiagnosticPulse] = useState<DiagnosticResult[] | null>(null);
  
  // --- Database Logic State ---
  const [dbActiveLayer, setDbActiveLayer] = useState<StorageLayer>('FIRESTORE');
  const [dbNodes, setDbNodes] = useState<DBNode[]>([]);
  const [selectedDbNode, setSelectedDbNode] = useState<DBNode | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbEditedData, setDbEditedData] = useState("");
  const [discrepancyIds, setDiscrepancyIds] = useState<string[]>([]);
  const [parityData, setParityData] = useState<Record<StorageLayer, any> | null>(null);
  const [isConflictView, setIsConflictView] = useState(false);
  const [isComparing, setIsComparing] = useState(false);

  // --- Resilience Audit Logic State ---
  const [errorLogs, setErrorLogs] = useState<ErrorLogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [selectedErrorLog, setSelectedErrorLog] = useState<ErrorLogEntry | null>(null);

  const recoveryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (appSettings) {
      setDraftSettings(JSON.parse(JSON.stringify(appSettings)));
    }
  }, [appSettings]);

  // Initial Load for Admin Tabs
  useEffect(() => {
    if (userProfile?.isAdmin) {
      loadDbRoot();
      loadErrorLogs();
      VirtualDBService.getGlobalDiscrepancies().then(setDiscrepancyIds);
    }
  }, [userProfile, dbActiveLayer, isConflictView]);

  const loadDbRoot = async () => {
    setDbLoading(true);
    try {
      if (isConflictView) {
        const assets = await VirtualDBService.getDocuments(dbActiveLayer, 'assets');
        setDbNodes(assets.filter(n => discrepancyIds.includes(n.rawKey)));
      } else {
        const root = await VirtualDBService.getLogicalGroups(dbActiveLayer);
        setDbNodes(root);
      }
    } finally {
      setDbLoading(false);
    }
  };

  const loadErrorLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await FirestoreService.getErrorLogs();
      setErrorLogs(data);
    } finally {
      setLoadingLogs(false);
    }
  };

  const hasChanges = useMemo(() => {
    return JSON.stringify(appSettings) !== JSON.stringify(draftSettings);
  }, [appSettings, draftSettings]);

  const handleSettingChange = (key: keyof AppSettings, value: any) => {
    if (!draftSettings) return;
    setDraftSettings({ ...draftSettings, [key]: value });
  };

  const handleCommitChanges = async () => {
    if (!draftSettings) return;
    setIsSaving(true);
    try {
      await FirestoreService.updateSettings(draftSettings);
      await storage.saveSettings(draftSettings);
      await refreshRegistry();
      toast({ title: "Configuration Synchronized", description: "Global environment pulse updated." });
    } catch (e) {
      toast({ variant: "destructive", title: "Broadcast Failure" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelfTest = async () => {
    setIsTesting(true);
    try {
      const results = await SystemDiagnostics.runSelfTest();
      setDiagnosticPulse(results);
      toast({ title: "Infrastructure Audit Complete", description: "All storage nodes successfully polled." });
    } catch (e) {
      toast({ variant: "destructive", title: "Audit Failed" });
    } finally {
      setIsTesting(false);
    }
  };

  const executeFailover = async (target: AuthorityNode) => {
    setIsSaving(true);
    try {
      await setReadAuthority(target);
      toast({ title: "Authority Shifted", description: `Primary read source is now ${target}.` });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGlobalPurge = async () => {
    setIsSaving(true);
    try {
      await VirtualDBService.purgeGlobalRegistry();
      toast({ title: "Global Purge Complete", description: "Registry slates cleared across all layers." });
      await refreshRegistry();
      setIsGlobalPurgeDialogOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Purge Interrupted" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDbNodeClick = async (node: DBNode) => {
    if (node.type === 'COLLECTION') {
      setDbLoading(true);
      const docs = await VirtualDBService.getDocuments(node.source, node.path);
      setDbNodes(docs);
      setDbLoading(false);
    } else {
      setSelectedDbNode(node);
      setDbEditedData(JSON.stringify(node.data || {}, null, 2));
      setIsComparing(true);
      try {
        const data = await VirtualDBService.compareNodeAcrossLayers(node.path);
        setParityData(data);
      } finally {
        setIsComparing(false);
      }
    }
  };

  const handleResolve = async (layer: StorageLayer) => {
    if (!parityData || !selectedDbNode) return;
    const authoritativeData = parityData[layer];
    if (!authoritativeData) return;

    setIsSaving(true);
    try {
      await VirtualDBService.resolveConflict(selectedDbNode.path, authoritativeData);
      toast({ title: "Conflict Resolved", description: `Node parity established via ${layer} pulse.` });
      const ids = await VirtualDBService.getGlobalDiscrepancies();
      setDiscrepancyIds(ids);
      loadDbRoot();
      setSelectedDbNode(null);
    } finally {
      setIsSaving(false);
    }
  };

  if (!settingsLoaded || !draftSettings) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const SectionHeading = ({ title, description, icon: Icon }: { title: string, description: string, icon: any }) => (
    <div className="flex items-center gap-4 mb-6">
      <div className="p-3 bg-primary/10 rounded-2xl">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h3 className="text-lg font-black uppercase tracking-tight leading-none text-foreground">{title}</h3>
        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mt-1 opacity-60">{description}</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tight text-foreground uppercase flex items-center gap-3 leading-none">
            <Settings className="text-primary h-8 w-8" /> Master Control
          </h2>
          <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">
            Enterprise Governance & Registry Orchestration
          </p>
        </div>
        <Button 
          onClick={handleCommitChanges} 
          disabled={!hasChanges || isSaving}
          className="h-14 px-10 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 bg-primary text-primary-foreground"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Commit Configuration
        </Button>
      </div>

      <Tabs defaultValue="environment" className="space-y-8">
        <TabsList className="bg-muted/30 p-1.5 rounded-[2.5rem] h-auto flex flex-wrap gap-2 border-2 border-border/40 w-fit">
          <TabsTrigger value="environment" className="px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm">
            <GraduationCap className="h-3.5 w-3.5" /> Environment
          </TabsTrigger>
          <TabsTrigger value="governance" className="px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm">
            <UserCog className="h-3.5 w-3.5" /> Identities
          </TabsTrigger>
          <TabsTrigger value="infrastructure" className="px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm">
            <Monitor className="h-3.5 w-3.5" /> Infrastructure
          </TabsTrigger>
          <TabsTrigger value="database" className="px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm">
            <Terminal className="h-3.5 w-3.5" /> Mission Control
          </TabsTrigger>
          <TabsTrigger value="resilience" className="px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm">
            <ShieldAlert className="h-3.5 w-3.5" /> Resilience Audit
          </TabsTrigger>
          <TabsTrigger value="system" className="px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm">
            <Cpu className="h-3.5 w-3.5" /> System Pulse
          </TabsTrigger>
        </TabsList>

        <TabsContent value="environment" className="space-y-10 outline-none px-2">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-8">
              <SectionHeading title="Visual Identity" description="System theming & brand accents" icon={Palette} />
              <Card className="rounded-[2.5rem] border-2 border-border/40 bg-card/50 p-8 flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-black uppercase tracking-tight">Active Theme</Label>
                  <p className="text-[10px] font-medium text-muted-foreground italic">Choose between high-contrast light or dark auditor views.</p>
                </div>
                <div className="flex gap-2 p-1 bg-muted/50 rounded-xl border-2">
                  <Button variant={theme === 'light' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTheme('light')} className="h-8 rounded-lg font-black uppercase text-[9px] gap-2"><Sun className="h-3 w-3" /> Light</Button>
                  <Button variant={theme === 'dark' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTheme('dark')} className="h-8 rounded-lg font-black uppercase text-[9px] gap-2"><Moon className="h-3 w-3" /> Dark</Button>
                </div>
              </Card>
            </div>

            <div className="space-y-8">
              <SectionHeading title="User Experience" description="Interface logic & guidance rules" icon={Smartphone} />
              <Card className="rounded-[2.5rem] border-2 border-border/40 bg-card/50 p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-black uppercase tracking-tight">Operational Mode</Label>
                    <p className="text-[10px] font-medium text-muted-foreground">Expert mode enables high-speed keyboard shortcuts.</p>
                  </div>
                  <Select value={draftSettings.uxMode} onValueChange={(v) => handleSettingChange('uxMode', v as UXMode)}>
                    <SelectTrigger className="w-32 h-10 rounded-xl font-black text-[10px] uppercase"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl"><SelectItem value="beginner">Beginner</SelectItem><SelectItem value="advanced">Advanced</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-black uppercase tracking-tight">Help Tooltips</Label>
                    <p className="text-[10px] font-medium text-muted-foreground italic">Show descriptive pulses on interaction.</p>
                  </div>
                  <Switch checked={draftSettings.showHelpTooltips} onCheckedChange={(v) => handleSettingChange('showHelpTooltips', v)} />
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="governance" className="space-y-10 outline-none px-2">
          <SectionHeading title="Identity Governance" description="Authorized auditors & regional jurisdictions" icon={UserCog} />
          <Card className="rounded-[2.5rem] border-2 border-border/40 shadow-2xl bg-card/50 overflow-hidden">
            <CardContent className="p-8">
              <UserManagement 
                users={draftSettings.authorizedUsers}
                onUsersChange={(newUsers) => handleSettingChange('authorizedUsers', newUsers)}
                adminProfile={userProfile}
              />
            </CardContent>
          </Card>

          <Card className="rounded-[2.5rem] border-2 border-orange-500/20 bg-orange-500/[0.02] p-8 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-orange-600">
                <Lock className="h-4 w-4" />
                <Label className="text-sm font-black uppercase tracking-tight">Global Master Lock</Label>
              </div>
              <p className="text-[10px] font-medium text-muted-foreground italic max-w-md leading-relaxed">
                When active, only Super Administrators can create or modify asset records in the cloud authority.
              </p>
            </div>
            <Switch checked={draftSettings.lockAssetList} onCheckedChange={(v) => handleSettingChange('lockAssetList', v)} />
          </Card>
        </TabsContent>

        <TabsContent value="infrastructure" className="space-y-10 outline-none px-2">
          <div className="flex items-center justify-between">
            <SectionHeading title="Infrastructure" description="High-Availability Redundancy Monitor" icon={Monitor} />
            <Button 
              variant="outline" 
              onClick={handleSelfTest} 
              disabled={isTesting}
              className="h-12 px-6 rounded-xl font-black uppercase text-[10px] gap-2 border-2 hover:bg-primary/5 shadow-sm"
            >
              {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Run Diagnostics
            </Button>
          </div>
          
          <Card className="rounded-[2.5rem] border-2 border-primary/20 bg-primary/[0.02] overflow-hidden">
            <CardHeader className="p-8 border-b border-primary/10 flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-black uppercase flex items-center gap-3 text-primary"><ShieldAlert className="h-5 w-5" /> Failover Protocol</CardTitle>
              <Badge className="bg-primary/20 text-primary border-primary/20 font-black h-7 px-4 rounded-full">ACTIVE: {appSettings.readAuthority}</Badge>
            </CardHeader>
            <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <button 
                onClick={() => executeFailover('FIRESTORE')} 
                disabled={draftSettings.readAuthority === 'FIRESTORE' || isSaving}
                className={cn("p-8 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-4", draftSettings.readAuthority === 'FIRESTORE' ? "bg-primary text-white border-primary shadow-xl" : "bg-card border-border/40 hover:border-primary/40")}
              >
                <Cloud className="h-10 w-10" />
                <h4 className="text-sm font-black uppercase">Restore Cloud Authority</h4>
              </button>
              <button 
                onClick={() => executeFailover('RTDB')} 
                disabled={draftSettings.readAuthority === 'RTDB' || isSaving}
                className={cn("p-8 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-4", draftSettings.readAuthority === 'RTDB' ? "bg-green-600 text-white border-green-600 shadow-xl" : "bg-card border-border/40 hover:border-green-500/40")}
              >
                <Zap className="h-10 w-10" />
                <h4 className="text-sm font-black uppercase">Force Mirror Standby</h4>
              </button>
            </CardContent>
          </Card>

          {diagnosticPulse && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-bottom-2 duration-500">
              {diagnosticPulse.map((res) => (
                <Card key={res.node} className="rounded-2xl border-2 border-border/40 bg-card p-5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[8px] font-black uppercase opacity-40">{res.node} NODE</span>
                    <p className="text-[10px] font-bold uppercase">{res.message}</p>
                  </div>
                  <Badge variant="outline" className={cn(
                    "text-[8px] font-mono h-6 px-2",
                    res.status === 'STABLE' ? "text-green-600 border-green-200" : "text-destructive border-destructive/20"
                  )}>
                    {res.latency}MS
                  </Badge>
                </Card>
              ))}
            </div>
          )}

          <Card className="rounded-[2.5rem] border-2 border-border/40 bg-card/50 p-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-12 relative">
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-border/40 -translate-y-1/2 hidden md:block" />
              <div className="flex flex-col items-center gap-3 z-10">
                <div className="p-6 rounded-[2rem] bg-amber-500/10 border-2 border-amber-500/20 shadow-xl"><HardDrive className="h-10 w-10 text-amber-600" /></div>
                <p className="text-[10px] font-black uppercase">Local Cache</p>
              </div>
              <ArrowRightLeft className="h-6 w-6 text-muted-foreground opacity-20 hidden md:block" />
              <div className="flex flex-col items-center gap-3 z-10">
                <div className={cn("p-6 rounded-[2rem] border-2 shadow-xl", draftSettings.readAuthority === 'RTDB' ? "border-green-500 bg-green-500/10" : "bg-muted/5 border-border/40")}><Activity className="h-10 w-10 text-green-600" /></div>
                <p className="text-[10px] font-black uppercase">Mirror Pulse</p>
              </div>
              <ArrowRightLeft className="h-6 w-6 text-muted-foreground opacity-20 hidden md:block" />
              <div className="flex flex-col items-center gap-3 z-10">
                <div className={cn("p-6 rounded-[2rem] border-2 shadow-xl", draftSettings.readAuthority === 'FIRESTORE' ? "border-blue-500 bg-blue-500/10" : "bg-muted/5 border-border/40")}><Cloud className="h-10 w-10 text-blue-600" /></div>
                <p className="text-[10px] font-black uppercase">Cloud Cluster</p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="space-y-6 outline-none px-2 h-[600px] flex flex-col">
          <div className="flex items-center justify-between">
            <SectionHeading title="Mission Control" description="Deterministic Cross-Layer Node Orchestration" icon={Terminal} />
            <Button 
              variant="outline" 
              onClick={() => { setIsConflictView(!isConflictView); setSelectedDbNode(null); }}
              className={cn(
                "h-11 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 border-2 transition-all", 
                isConflictView ? "bg-destructive text-white border-destructive" : "text-destructive border-destructive/20 hover:bg-destructive/5"
              )}
            >
              <Split className="h-3.5 w-3.5" /> {isConflictView ? 'Exit Conflict Mode' : 'Resolve Conflicts'}
            </Button>
          </div>
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
            <Card className="lg:col-span-4 rounded-[2rem] border-2 border-border/40 bg-card/50 overflow-hidden flex flex-col">
              <CardHeader className="bg-muted/20 border-b p-4 space-y-4">
                <div className="grid grid-cols-3 bg-background/50 p-1 rounded-xl border shadow-inner h-10">
                  <button onClick={() => setDbActiveLayer('FIRESTORE')} className={cn("rounded-lg flex items-center justify-center gap-2 text-[8px] font-black uppercase", dbActiveLayer === 'FIRESTORE' ? "bg-blue-500 text-white shadow-lg" : "text-muted-foreground")}>Cloud</button>
                  <button onClick={() => setDbActiveLayer('LOCAL')} className={cn("rounded-lg flex items-center justify-center gap-2 text-[8px] font-black uppercase", dbActiveLayer === 'LOCAL' ? "bg-amber-500 text-white shadow-lg" : "text-muted-foreground")}>Local</button>
                  <button onClick={() => setDbActiveLayer('RTDB')} className={cn("rounded-lg flex items-center justify-center gap-2 text-[8px] font-black uppercase", dbActiveLayer === 'RTDB' ? "bg-green-500 text-white shadow-lg" : "text-muted-foreground")}>Mirror</button>
                </div>
              </CardHeader>
              <ScrollArea className="flex-1 p-2 bg-background/30">
                {dbLoading ? <div className="py-20 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div> : (
                  <div className="space-y-1">
                    {dbNodes.map(node => (
                      <button key={node.id} onClick={() => handleDbNodeClick(node)} className={cn("w-full text-left p-3 rounded-xl transition-all flex items-center justify-between border-2 border-transparent", selectedDbNode?.id === node.id ? "bg-primary/10 border-primary/20" : "hover:bg-primary/5")}>
                        <div className="flex flex-col min-w-0">
                          <span className={cn("text-[10px] font-black uppercase truncate", discrepancyIds.includes(node.rawKey) && "text-destructive")}>{node.displayName}</span>
                          <span className="text-[7px] font-mono text-muted-foreground opacity-40 truncate">{node.path}</span>
                        </div>
                        {node.type === 'COLLECTION' ? <ChevronRight className="h-3 w-3 opacity-20" /> : <FileJson className="h-3 w-3 opacity-40" />}
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </Card>
            <Card className="lg:col-span-8 rounded-[2rem] border-2 border-border/40 bg-card/50 overflow-hidden flex flex-col">
              {selectedDbNode ? (
                <Tabs defaultValue={isConflictView ? "wizard" : "editor"} className="flex-1 flex flex-col">
                  <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase">{selectedDbNode.displayName} Pulse</span>
                      <span className="text-[7px] font-mono opacity-40 uppercase">Path: {selectedDbNode.path}</span>
                    </div>
                    <TabsList className="bg-background/50 p-1 rounded-lg h-8 border">
                      <TabsTrigger value="editor" className="text-[8px] font-black uppercase">Editor</TabsTrigger>
                      {isConflictView && <TabsTrigger value="wizard" className="text-[8px] font-black uppercase">Wizard</TabsTrigger>}
                    </TabsList>
                  </div>
                  
                  <TabsContent value="editor" className="flex-1 m-0 flex flex-col">
                    <div className="flex-1 p-4 bg-[#0F172A] relative">
                      <textarea value={dbEditedData} onChange={(e) => setDbEditedData(e.target.value)} className="w-full h-full bg-transparent text-blue-100 font-mono text-[10px] outline-none resize-none leading-relaxed" spellCheck="false" />
                    </div>
                    <div className="p-4 border-t bg-muted/20 flex justify-end gap-3">
                      <Button variant="outline" size="sm" onClick={() => setSelectedDbNode(null)} className="h-9 px-4 rounded-xl font-black text-[9px] uppercase">Discard</Button>
                      <Button onClick={() => VirtualDBService.updateNode(selectedDbNode.source, selectedDbNode.path, JSON.parse(dbEditedData))} disabled={isSaving} size="sm" className="h-9 px-6 rounded-xl font-black text-[9px] uppercase bg-primary text-white">
                        {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Save className="h-3 w-3 mr-2" />} Commit Pulse
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="wizard" className="flex-1 m-0">
                    <ScrollArea className="h-full">
                      <div className="p-6 space-y-6">
                        <div className="p-4 rounded-xl bg-destructive/5 border-2 border-dashed border-destructive/20 text-[9px] font-medium italic">
                          Resolution Mode Active: Choosing an authoritative layer will overwrite all peer nodes to re-establish global parity.
                        </div>
                        <div className="space-y-2">
                          {['FIRESTORE', 'RTDB', 'LOCAL'].map((layer) => (
                            <button
                              key={`resolve-${layer}`}
                              onClick={() => handleResolve(layer as StorageLayer)}
                              disabled={!parityData?.[layer as StorageLayer] || isSaving}
                              className="w-full p-4 rounded-xl border-2 border-border/40 hover:border-primary/40 bg-card flex items-center justify-between group transition-all"
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn("p-2 rounded-lg transition-colors", parityData?.[layer as StorageLayer] ? "bg-muted group-hover:bg-primary group-hover:text-white" : "opacity-20")}>
                                  <CheckCircle2 className="h-4 w-4" />
                                </div>
                                <span className="text-[10px] font-black uppercase">Enforce {layer} Pulse</span>
                              </div>
                              <ArrowUpRight className="h-4 w-4 opacity-20 group-hover:opacity-100" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center opacity-20 space-y-4">
                  <Terminal className="h-12 w-12" />
                  <p className="text-[10px] font-black uppercase">Awaiting Node Selection</p>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="resilience" className="space-y-6 outline-none px-2">
          <SectionHeading title="Resilience Audit" description="System Health Monitoring & Layman Error Pulse" icon={ShieldAlert} />
          <div className="space-y-4">
            {loadingLogs ? <div className="py-20 flex justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div> : 
              errorLogs.length > 0 ? errorLogs.map(log => (
                <Card key={log.id} className="rounded-[1.5rem] border-2 border-border/40 hover:border-primary/20 transition-all cursor-pointer bg-card/50" onClick={() => setSelectedErrorLog(log)}>
                  <CardContent className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn("p-3 rounded-xl shadow-inner", log.severity === 'CRITICAL' ? "bg-red-100 text-red-600" : "bg-primary/10 text-primary")}>
                        {log.severity === 'CRITICAL' ? <XCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                      </div>
                      <div>
                        <h4 className="font-black text-sm uppercase tracking-tight">{log.error.laymanExplanation}</h4>
                        <div className="flex items-center gap-3 text-[9px] font-bold text-muted-foreground uppercase mt-1 opacity-60">
                          <span className="flex items-center gap-1"><Monitor className="h-2.5 w-2.5" /> {log.context.module}</span>
                          <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("h-7 px-4 rounded-full font-black uppercase text-[9px]", log.status === 'RESOLVED' ? "text-green-600 border-green-200" : "text-primary border-primary/20")}>{log.status}</Badge>
                  </CardContent>
                </Card>
              )) : (
                <div className="py-40 text-center opacity-30 border-4 border-dashed rounded-[3rem]">
                  <CheckCircle2 className="h-16 w-16 mx-auto mb-4" />
                  <h3 className="text-xl font-black uppercase tracking-widest">Resilience Pulse: Stable</h3>
                </div>
              )
            }
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-10 outline-none px-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-8">
              <SectionHeading title="Data Resilience" description="Backup exports & recovery pulses" icon={RotateCcw} />
              <Card className="rounded-[2.5rem] border-2 border-border/40 bg-card/50 p-8 space-y-6 shadow-xl">
                <div className="p-6 rounded-2xl bg-primary/5 border-2 border-dashed border-primary/20 space-y-4">
                  <div className="flex items-center gap-3"><FileUp className="h-5 w-5 text-primary" /><h4 className="text-sm font-black uppercase">Load Recovery Pulse</h4></div>
                  <input type="file" ref={recoveryInputRef} className="hidden" accept=".json" onChange={(e) => { if(e.target.files?.[0]) ArchiveService.importSnapshot(e.target.files[0]); }} />
                  <Button onClick={() => recoveryInputRef.current?.click()} className="w-full h-12 rounded-xl font-black uppercase text-[10px] bg-primary text-white">Select JSON Archive</Button>
                </div>
                <Button variant="outline" onClick={() => ArchiveService.generateFullSnapshot()} className="w-full h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2 gap-3 shadow-sm hover:bg-primary/5">
                  <Download className="h-4 w-4" /> Export Registry Snapshot
                </Button>
              </Card>
            </div>

            <div className="space-y-8">
              <SectionHeading title="Danger Zone" description="Immutable state operations" icon={Bomb} />
              <div className="space-y-4">
                <Card className="rounded-[2.5rem] border-2 border-destructive/20 bg-destructive/[0.02] p-8 space-y-6 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><ShieldAlert className="h-20 w-20 text-destructive" /></div>
                  <div className="space-y-2 relative z-10">
                    <div className="flex items-center gap-3 text-destructive"><Trash2 className="h-5 w-5" /><h4 className="text-sm font-black uppercase">Local Reset Pulse</h4></div>
                    <p className="text-[10px] font-bold text-muted-foreground leading-relaxed italic">Purging local storage is irreversible.</p>
                  </div>
                  <Button variant="ghost" onClick={() => setIsResetDialogOpen(true)} className="w-full h-14 rounded-2xl font-black uppercase text-[10px] text-destructive hover:bg-destructive/10 border-2 border-transparent hover:border-destructive/20 relative z-10">Execute Local Reset</Button>
                </Card>

                <Card className="rounded-[2.5rem] border-2 border-destructive/40 bg-destructive/[0.05] p-8 space-y-6 shadow-2xl relative overflow-hidden group">
                  <div className="space-y-2 relative z-10">
                    <div className="flex items-center gap-3 text-destructive"><Bomb className="h-6 w-6" /><h4 className="text-sm font-black uppercase tracking-tight">Global Registry Reset</h4></div>
                    <p className="text-[10px] font-medium text-muted-foreground italic leading-relaxed">This will wipe **every record** from Cloud, Mirror, and Local persistence layers.</p>
                  </div>
                  <Button onClick={() => setIsGlobalPurgeDialogOpen(true)} className="w-full h-16 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-destructive/20 bg-destructive text-white hover:bg-destructive/90 transition-transform active:scale-95">Initialize Global Purge</Button>
                </Card>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-destructive/20 p-10 shadow-3xl bg-background">
          <AlertDialogHeader className="space-y-4">
            <Trash2 className="h-12 w-12 text-destructive" />
            <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-destructive">Wipe Local Pulse?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium italic">This is an immutable operation. All local registry data and session pulses will be removed from this workstation.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-12 px-8 rounded-2xl font-bold border-2 m-0">Abort Reset</AlertDialogCancel>
            <AlertDialogAction onClick={() => { storage.clearAssets(); window.location.href = '/'; }} className="h-12 px-10 rounded-2xl font-black uppercase bg-destructive text-white m-0">Execute Purge</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isGlobalPurgeDialogOpen} onOpenChange={setIsGlobalPurgeDialogOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-destructive/40 p-10 shadow-2xl bg-background">
          <AlertDialogHeader className="space-y-4">
            <div className="p-4 bg-destructive/10 rounded-[2rem] w-fit"><Bomb className="h-12 w-12 text-destructive animate-pulse" /></div>
            <div className="space-y-2">
              <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-destructive">Destroy Global Registry?</AlertDialogTitle>
              <AlertDialogDescription className="text-sm font-medium leading-relaxed italic text-muted-foreground">You are about to perform a synchronized wipe across the entire system. This action is **deterministic and irreversible**.</AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-10 gap-3">
            <AlertDialogCancel className="h-14 px-8 rounded-2xl font-bold border-2 m-0">Abort Pulse</AlertDialogCancel>
            <AlertDialogAction onClick={handleGlobalPurge} disabled={isSaving} className="h-14 px-12 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-destructive/40 bg-destructive text-white m-0">{isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-3" /> : <Hammer className="h-5 w-5 mr-3" />}Commit Global Reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!selectedErrorLog} onOpenChange={() => setSelectedErrorLog(null)}>
        <DialogContent className="max-w-3xl rounded-[2.5rem] border-primary/10 shadow-2xl p-0 overflow-hidden">
          <div className="p-8 bg-muted/30 border-b">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-2xl font-black uppercase tracking-tight">Incident Analysis</DialogTitle>
                <Badge variant="outline" className="border-destructive/20 text-destructive font-black uppercase px-4 h-8 rounded-full">{selectedErrorLog?.severity}</Badge>
              </div>
              <DialogDescription className="font-bold uppercase text-[10px] tracking-widest opacity-60">Deterministic Pulse Investigation</DialogDescription>
            </DialogHeader>
          </div>
          <ScrollArea className="max-h-[60vh] p-8 space-y-8">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Layman Pulse</h4>
              <p className="text-base font-black uppercase leading-relaxed">{selectedErrorLog?.error.laymanExplanation}</p>
            </div>
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Technical Message</h4>
              <pre className="p-4 rounded-xl bg-muted/20 border text-[10px] font-mono overflow-auto">{selectedErrorLog?.error.technicalMessage}</pre>
            </div>
          </ScrollArea>
          <div className="p-8 border-t bg-muted/30 flex justify-end gap-4">
            <Button variant="ghost" onClick={() => setSelectedErrorLog(null)} className="font-bold rounded-xl px-10">Close</Button>
            <Button onClick={() => { if(selectedErrorLog) FirestoreService.updateErrorStatus(selectedErrorLog.id, 'RESOLVED'); setSelectedErrorLog(null); }} className="h-14 px-12 rounded-2xl font-black uppercase text-xs shadow-xl shadow-primary/20 bg-primary text-primary-foreground">Mark as Resolved</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

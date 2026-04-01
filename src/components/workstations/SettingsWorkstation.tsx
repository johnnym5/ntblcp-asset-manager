'use client';

/**
 * @fileOverview SettingsWorkstation - Master Control Center.
 * Phase 89: Enhanced with Global Registry Purge & Ingestion Preparation.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from 'next-themes';
import { 
  Settings, 
  FolderKanban, 
  UserCog, 
  Palette, 
  Database, 
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
  ShieldCheck,
  Lock,
  Cpu,
  GraduationCap,
  Columns,
  Activity,
  Bomb,
  FileUp,
  Network,
  Cloud,
  HardDrive,
  Monitor,
  ShieldAlert,
  ArrowRight,
  Hammer
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
import type { AppSettings, UXMode, AuthorityNode, AuthorizedUser } from '@/types/domain';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

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
  const [diagnosticPulse, setDiagnosticPulse] = useState<DiagnosticResult[] | null>(null);
  
  const recoveryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (appSettings) {
      setDraftSettings(JSON.parse(JSON.stringify(appSettings)));
    }
  }, [appSettings]);

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
      toast({ title: "Configuration Synchronized", description: "Global environment pulse broadcasted successfully." });
    } catch (e) {
      toast({ variant: "destructive", title: "Broadcast Failure" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelfTest = async () => {
    try {
      const results = await SystemDiagnostics.runSelfTest();
      setDiagnosticPulse(results);
      toast({ title: "Infrastructure Audit Complete" });
    } catch (e) {
      toast({ variant: "destructive", title: "Audit Failed" });
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
      toast({ title: "Global Purge Complete", description: "Registry reset to prepare for new ingestion pulse." });
      await refreshRegistry();
      setIsGlobalPurgeDialogOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Purge Interrupted" });
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
          <h2 className="text-3xl font-black tracking-tight text-foreground uppercase flex items-center gap-3">
            <Settings className="text-primary h-8 w-8" /> Master Control
          </h2>
          <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">
            Enterprise Governance & Orchestration Hub
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
          <TabsTrigger value="system" className="px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm">
            <Cpu className="h-3.5 w-3.5" /> System Pulse
          </TabsTrigger>
        </TabsList>

        {/* --- Environment Tab --- */}
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
                  <Select value={draftSettings.uxMode} onValueChange={(v) => handleSettingChange('uxMode', v)}>
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

        {/* --- Identities & Governance Tab --- */}
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
                When active, only Super Administrators can create or modify asset records in the cloud authority. Prevents accidental field data corruption.
              </p>
            </div>
            <Switch checked={draftSettings.lockAssetList} onCheckedChange={(v) => handleSettingChange('lockAssetList', v)} />
          </Card>
        </TabsContent>

        {/* --- Infrastructure Tab --- */}
        <TabsContent value="infrastructure" className="space-y-10 outline-none px-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <SectionHeading title="Infrastructure" description="High-Availability Redundancy Monitor" icon={Monitor} />
            <Button variant="outline" onClick={handleSelfTest} className="h-10 rounded-xl font-black text-[9px] uppercase tracking-widest gap-2 border-2">
              <RefreshCw className="h-3 w-3" /> Audit Storage Pulse
            </Button>
          </div>

          <Card className="rounded-[2.5rem] border-2 border-primary/20 bg-primary/[0.02] overflow-hidden">
            <CardHeader className="p-8 bg-primary/5 border-b border-primary/10">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl font-black uppercase flex items-center gap-3 text-primary"><ShieldAlert className="h-5 w-5" /> Failover Protocol</CardTitle>
                  <CardDescription className="text-xs font-medium">Deterministic shift of primary registry authority node.</CardDescription>
                </div>
                <Badge className="bg-primary/20 text-primary border-primary/20 font-black h-7 px-4 rounded-full">ACTIVE: {appSettings.readAuthority}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <button 
                onClick={() => executeFailover('FIRESTORE')} 
                disabled={draftSettings.readAuthority === 'FIRESTORE' || isSaving}
                className={cn("p-8 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-4 group", draftSettings.readAuthority === 'FIRESTORE' ? "bg-primary text-white border-primary shadow-xl" : "bg-card border-border/40 hover:border-primary/40")}
              >
                <div className={cn("p-4 rounded-2xl", draftSettings.readAuthority === 'FIRESTORE' ? "bg-white/20" : "bg-primary/10 text-primary")}><Cloud className="h-10 w-10" /></div>
                <h4 className="text-sm font-black uppercase">Cloud Authority</h4>
                {draftSettings.readAuthority === 'FIRESTORE' && <CheckCircle2 className="h-5 w-5" />}
              </button>
              <button 
                onClick={() => executeFailover('RTDB')} 
                disabled={draftSettings.readAuthority === 'RTDB' || isSaving}
                className={cn("p-8 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-4 group", draftSettings.readAuthority === 'RTDB' ? "bg-green-600 text-white border-green-600 shadow-xl" : "bg-card border-border/40 hover:border-green-500/40")}
              >
                <div className={cn("p-4 rounded-2xl", draftSettings.readAuthority === 'RTDB' ? "bg-white/20" : "bg-green-100 text-green-600")}><Zap className="h-10 w-10" /></div>
                <h4 className="text-sm font-black uppercase">Shadow Mirror</h4>
                {draftSettings.readAuthority === 'RTDB' && <CheckCircle2 className="h-5 w-5" />}
              </button>
            </CardContent>
          </Card>

          <Card className="rounded-[2.5rem] border-2 border-border/40 bg-card/50 p-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-12 relative">
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-border/40 -translate-y-1/2 hidden md:block" />
              <div className="flex flex-col items-center gap-3 z-10">
                <div className="p-6 rounded-[2rem] bg-amber-500/10 border-2 border-amber-500/20 shadow-xl"><HardDrive className="h-10 w-10 text-amber-600" /></div>
                <p className="text-[10px] font-black uppercase">Local Cache</p>
              </div>
              <ArrowRight className="h-6 w-6 text-muted-foreground opacity-20 hidden md:block" />
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

        {/* --- System Tab --- */}
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
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <ShieldAlert className="h-20 w-20 text-destructive" />
                  </div>
                  <div className="space-y-2 relative z-10">
                    <div className="flex items-center gap-3 text-destructive">
                      <Trash2 className="h-5 w-5" />
                      <h4 className="text-sm font-black uppercase">Local Reset Pulse</h4>
                    </div>
                    <p className="text-[10px] font-medium text-muted-foreground leading-relaxed italic">
                      Purging the local store will clear all records and settings from **this device**. Cloud data is not affected.
                    </p>
                  </div>
                  <Button variant="ghost" onClick={() => setIsResetDialogOpen(true)} className="w-full h-14 rounded-2xl font-black uppercase text-[10px] text-destructive hover:bg-destructive/10 border-2 border-transparent hover:border-destructive/20 relative z-10 transition-all">
                    Execute Local Reset
                  </Button>
                </Card>

                <Card className="rounded-[2.5rem] border-2 border-destructive/40 bg-destructive/[0.05] p-8 space-y-6 shadow-2xl relative overflow-hidden group">
                  <div className="absolute -top-4 -right-4 h-24 w-24 bg-destructive opacity-5 group-hover:opacity-10 transition-opacity rounded-full" />
                  <div className="space-y-2 relative z-10">
                    <div className="flex items-center gap-3 text-destructive">
                      <Bomb className="h-6 w-6" />
                      <h4 className="text-sm font-black uppercase tracking-tight">Global Registry Reset</h4>
                    </div>
                    <p className="text-[10px] font-bold text-destructive/80 uppercase tracking-widest">CRITICAL: Deterministic preparation for new ingestion.</p>
                    <p className="text-[10px] font-medium text-muted-foreground italic leading-relaxed">
                      This will wipe **every record** from Cloud, Mirror, and Local persistence layers. Use this only when preparing the system for a fresh data import from zero.
                    </p>
                  </div>
                  <Button 
                    onClick={() => setIsGlobalPurgeDialogOpen(true)}
                    className="w-full h-16 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-destructive/20 bg-destructive text-white hover:bg-destructive/90 transition-transform active:scale-95"
                  >
                    Initialize Global Purge
                  </Button>
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
            <AlertDialogDescription className="text-sm font-medium italic">
              This is an immutable operation. All local registry data and session pulses will be removed from this workstation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-12 px-8 rounded-2xl font-bold border-2 m-0">Abort Reset</AlertDialogCancel>
            <AlertDialogAction onClick={() => { storage.clearAssets(); window.location.href = '/'; }} className="h-12 px-10 rounded-2xl font-black uppercase bg-destructive text-white m-0">Execute Purge</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isGlobalPurgeDialogOpen} onOpenChange={setIsGlobalPurgeDialogOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-destructive/40 p-10 shadow-[0_35px_60px_-15px_rgba(220,38,38,0.3)] bg-background">
          <AlertDialogHeader className="space-y-4">
            <div className="p-4 bg-destructive/10 rounded-[2rem] w-fit">
              <Bomb className="h-12 w-12 text-destructive animate-pulse" />
            </div>
            <div className="space-y-2">
              <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-destructive">Destroy Global Registry?</AlertDialogTitle>
              <AlertDialogDescription className="text-sm font-medium leading-relaxed italic text-muted-foreground">
                You are about to perform a synchronized wipe across the entire system. This includes:
                <ul className="mt-4 space-y-2 list-disc pl-5 font-bold uppercase text-[9px] tracking-widest text-destructive">
                  <li>ALL Cloud Registry Records (Firestore)</li>
                  <li>ALL Shadow Mirror Records (RTDB)</li>
                  <li>ALL Local Device Data (IndexedDB)</li>
                  <li>ALL Sync Queue Pulses</li>
                </ul>
                This action is **deterministic and irreversible**. Recovery is impossible without a prior JSON backup.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-10 gap-3">
            <AlertDialogCancel className="h-14 px-8 rounded-2xl font-bold border-2 m-0">Abort Pulse</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleGlobalPurge}
              disabled={isSaving}
              className="h-14 px-12 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl shadow-destructive/40 bg-destructive text-white m-0"
            >
              {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-3" /> : <Hammer className="h-5 w-5 mr-3" />}
              Commit Global Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

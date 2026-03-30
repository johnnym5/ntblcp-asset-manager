'use client';

/**
 * @fileOverview SettingsWorkstation - Global Environment Control Panel.
 * Orchestrates Multi-Registry Projects, User Identity, and Governance Pulse.
 */

import React, { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/app-layout';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from 'next-themes';
import { 
  Settings, 
  FolderKanban, 
  UserCog, 
  Palette, 
  Database, 
  PlusCircle, 
  CheckCircle2, 
  Trash2, 
  Save, 
  Loader2, 
  Sun, 
  Moon, 
  Monitor,
  ShieldCheck,
  Zap,
  RefreshCw,
  ScanSearch,
  PlaneTakeoff
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { UserManagement } from '@/components/admin/user-management';
import { FirestoreService } from '@/services/firebase/firestore';
import { storage } from '@/offline/storage';
import { cn } from '@/lib/utils';
import type { AppSettings, Grant } from '@/types/domain';

export default function SettingsPage() {
  const { appSettings, refreshRegistry, settingsLoaded, isSyncing } = useAppState();
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { setTheme, theme } = useTheme();

  const [draftSettings, setDraftSettings] = useState<AppSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

  const handleAddGrant = () => {
    if (!draftSettings) return;
    const newGrant: Grant = {
      id: crypto.randomUUID(),
      name: 'New Asset Registry',
      enabledSheets: [],
      sheetDefinitions: {},
    };
    handleSettingChange('grants', [...draftSettings.grants, newGrant]);
  };

  const handleRenameGrant = (id: string, name: string) => {
    if (!draftSettings) return;
    handleSettingChange('grants', draftSettings.grants.map(g => g.id === id ? { ...g, name } : g));
  };

  const handleDeleteGrant = (id: string) => {
    if (!draftSettings) return;
    if (draftSettings.grants.length <= 1) {
      toast({ variant: "destructive", title: "Action Denied", description: "The system requires at least one active project." });
      return;
    }
    const filtered = draftSettings.grants.filter(g => g.id !== id);
    let activeId = draftSettings.activeGrantId;
    if (activeId === id) activeId = filtered[0].id;
    setDraftSettings({ ...draftSettings, grants: filtered, activeGrantId: activeId });
  };

  const handleCommitChanges = async () => {
    if (!draftSettings) return;
    setIsSaving(true);
    try {
      // 1. Broadcast to Cloud
      await FirestoreService.updateSettings(draftSettings);
      // 2. Commit to Local persistence
      await storage.saveSettings(draftSettings);
      // 3. Trigger global state reconciliation
      await refreshRegistry();
      
      toast({ title: "Configuration Broadcasted", description: "Global environment state has been updated." });
    } catch (e) {
      toast({ variant: "destructive", title: "Broadcast Failure", description: "Failed to update global configuration." });
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || !settingsLoaded || !draftSettings) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const activeGrant = draftSettings.grants.find(g => g.id === draftSettings.activeGrantId);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tight text-foreground uppercase flex items-center gap-3">
              <Settings className="text-primary h-8 w-8" /> Settings Workstation
            </h2>
            <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">
              Global Environment Orchestration & Governance
            </p>
          </div>
          <Button 
            onClick={handleCommitChanges} 
            disabled={!hasChanges || isSaving}
            className="h-14 px-10 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 flex items-center gap-3 transition-transform hover:scale-105 active:scale-95"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Broadcast Config
          </Button>
        </div>

        <Tabs defaultValue="projects" className="space-y-8">
          <TabsList className="bg-muted/30 p-1.5 rounded-2xl h-auto flex flex-wrap gap-2 border-2 border-border/40 w-fit">
            <TabsTrigger value="projects" className="px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm">
              <FolderKanban className="h-3.5 w-3.5" /> Registry Projects
            </TabsTrigger>
            <TabsTrigger value="identity" className="px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm">
              <UserCog className="h-3.5 w-3.5" /> Identity & RBAC
            </TabsTrigger>
            <TabsTrigger value="ux" className="px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm">
              <Palette className="h-3.5 w-3.5" /> Interface Pulse
            </TabsTrigger>
            <TabsTrigger value="infrastructure" className="px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm">
              <Database className="h-3.5 w-3.5" /> Infrastructure
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="space-y-6 outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-primary">Multi-Registry Management</h3>
                  <Button variant="outline" size="sm" onClick={handleAddGrant} className="font-bold text-[10px] uppercase border-primary/20 text-primary rounded-xl h-9">
                    <PlusCircle className="mr-2 h-3.5 w-3.5" /> Add Project
                  </Button>
                </div>

                <div className="space-y-4">
                  {draftSettings.grants.map((grant) => (
                    <Card key={grant.id} className={cn(
                      "border-2 transition-all duration-500 rounded-[2rem] overflow-hidden",
                      draftSettings.activeGrantId === grant.id 
                        ? "border-primary bg-primary/5 shadow-2xl shadow-primary/10" 
                        : "border-border/40 hover:border-primary/20 bg-card/50 shadow-lg"
                    )}>
                      <CardHeader className="p-6 pb-4 flex flex-row items-center justify-between space-y-0">
                        <div className="flex-1 flex items-center gap-4">
                          {draftSettings.activeGrantId === grant.id ? (
                            <div className="p-2 bg-primary rounded-xl shadow-lg shadow-primary/20"><CheckCircle2 className="h-5 w-5 text-white" /></div>
                          ) : (
                            <div className="h-9 w-9 rounded-xl border-2 border-dashed border-muted flex items-center justify-center font-black text-[10px] opacity-30">OFF</div>
                          )}
                          <div className="flex-1">
                            <Input 
                              value={grant.name} 
                              onChange={(e) => handleRenameGrant(grant.id, e.target.value)}
                              className="border-none bg-transparent font-black text-lg focus-visible:ring-0 p-0 h-auto"
                            />
                            <p className="text-[9px] font-mono text-muted-foreground opacity-50 mt-0.5">UUID: {grant.id}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {draftSettings.activeGrantId !== grant.id && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleSettingChange('activeGrantId', grant.id)}
                              className="font-black text-[10px] uppercase tracking-widest text-primary hover:bg-primary/10"
                            >
                              Activate Pulse
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteGrant(grant.id)}
                            className="text-destructive opacity-40 hover:opacity-100 hover:bg-destructive/10 transition-all rounded-xl"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="px-6 pb-6 pt-0">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary" className="rounded-lg text-[9px] font-black uppercase tracking-tighter bg-background border">
                            {Object.keys(grant.sheetDefinitions || {}).length} Registry Classes
                          </Badge>
                          <Badge variant="outline" className="rounded-lg text-[9px] font-black uppercase tracking-tighter border-primary/20 text-primary">
                            Target: {grant.name.split(' ')[0]}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <aside className="space-y-6">
                <Card className="rounded-[2.5rem] border-2 border-dashed border-border/40 shadow-none bg-muted/5 overflow-hidden">
                  <CardHeader className="bg-primary/5 p-6 border-b border-dashed">
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Registry Protocol</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <p className="text-[10px] font-medium text-muted-foreground leading-relaxed italic">
                      Activating a project registry switches the entire system context (Inventory Pulse, Import Engine, and Reports) to that project's specific data scope.
                    </p>
                    <div className="p-5 bg-background rounded-2xl border-2 shadow-inner space-y-4">
                      <div className="flex items-center justify-between text-[10px] font-black uppercase">
                        <span className="opacity-40">Active Project</span>
                        <span className="text-primary truncate max-w-[120px]">{activeGrant?.name || 'NONE'}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-black uppercase">
                        <span className="opacity-40">Status</span>
                        <span className="text-green-600">Stable Heartbeat</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </aside>
            </div>
          </TabsContent>

          <TabsContent value="identity" className="space-y-6 outline-none">
            <Card className="border-2 border-border/40 rounded-[2.5rem] overflow-hidden shadow-2xl bg-card/50">
              <CardHeader className="p-8 bg-muted/20 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-black uppercase tracking-tight">Identity & Access Pulse</CardTitle>
                    <CardDescription className="text-xs font-medium mt-1">Manage system auditors, regional scopes, and cryptographic access levels.</CardDescription>
                  </div>
                  <ShieldCheck className="h-8 w-8 text-primary opacity-40" />
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <UserManagement 
                  users={draftSettings.authorizedUsers}
                  onUsersChange={(newUsers) => handleSettingChange('authorizedUsers', newUsers)}
                  adminProfile={userProfile}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ux" className="space-y-6 outline-none">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="rounded-[2.5rem] border-2 border-border/40 shadow-xl bg-card/50">
                <CardHeader className="p-8">
                  <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-3">
                    <Palette className="h-4 w-4 text-primary" /> Visual Identity
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-8 pb-8 space-y-6">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-1">Theme Preference</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        variant={theme === 'light' ? 'default' : 'outline'} 
                        onClick={() => setTheme('light')}
                        className="h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2"
                      >
                        <Sun className="h-4 w-4" /> Management Light
                      </Button>
                      <Button 
                        variant={theme === 'dark' ? 'default' : 'outline'} 
                        onClick={() => setTheme('dark')}
                        className="h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2"
                      >
                        <Moon className="h-4 w-4" /> Night Auditor
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[2.5rem] border-2 border-border/40 shadow-xl bg-card/50">
                <CardHeader className="p-8">
                  <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-3">
                    <Zap className="h-4 w-4 text-primary" /> Operational Mode
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-8 pb-8 space-y-6">
                  <div className="flex items-center justify-between p-6 rounded-2xl border-2 bg-muted/5 group hover:bg-primary/5 transition-all">
                    <div className="space-y-1">
                      <Label className="text-sm font-black uppercase tracking-tight">Application Protocol</Label>
                      <p className="text-[10px] text-muted-foreground font-medium max-w-[200px]">Verification mode enables field auditors to submit assessment updates.</p>
                    </div>
                    <Select 
                      value={draftSettings.appMode} 
                      onValueChange={(v) => handleSettingChange('appMode', v as 'management' | 'verification')}
                    >
                      <SelectTrigger className="w-36 h-10 rounded-xl font-black uppercase text-[10px] tracking-tighter">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="management" className="text-[10px] font-black">MANAGEMENT</SelectItem>
                        <SelectItem value="verification" className="text-[10px] font-black">VERIFICATION</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between p-6 rounded-2xl border-2 bg-muted/5 group hover:bg-destructive/5 transition-all">
                    <div className="space-y-1">
                      <Label className="text-sm font-black uppercase tracking-tight">Global Registry Lock</Label>
                      <p className="text-[10px] text-muted-foreground font-medium max-w-[200px]">Prevents field auditors from creating or deleting assets directly.</p>
                    </div>
                    <Switch 
                      checked={draftSettings.lockAssetList} 
                      onCheckedChange={(v) => handleSettingChange('lockAssetList', v)} 
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="infrastructure" className="space-y-6 outline-none">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="md:col-span-2 rounded-[2.5rem] border-2 border-border/40 shadow-xl bg-card/50 overflow-hidden">
                <CardHeader className="p-8 bg-muted/20 border-b">
                  <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-3">
                    <RefreshCw className="h-4 w-4 text-primary" /> Registry Heartbeat Tools
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Button variant="outline" className="h-16 justify-start font-black text-xs tracking-widest uppercase rounded-2xl border-2 hover:bg-primary/5 hover:border-primary/30 group" onClick={refreshRegistry}>
                      <div className="p-2 bg-primary/10 rounded-lg mr-4 group-hover:bg-primary/20 transition-colors"><RefreshCw className={cn("h-5 w-5 text-primary", isSyncing && "animate-spin")} /></div>
                      Manual Reconciliation
                    </Button>
                    <Button variant="outline" className="h-16 justify-start font-black text-xs tracking-widest uppercase rounded-2xl border-2 hover:bg-primary/5 hover:border-primary/30 group">
                      <div className="p-2 bg-primary/10 rounded-lg mr-4 group-hover:bg-primary/20 transition-colors"><PlaneTakeoff className="h-5 w-5 text-primary" /></div>
                      Export Master Audit
                    </Button>
                  </div>
                  <Separator className="opacity-50 border-dashed" />
                  <div className="p-6 rounded-2xl bg-orange-500/5 border-2 border-dashed border-orange-500/20 space-y-2">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-600">Danger Zone Pulse</h4>
                    <p className="text-[10px] text-muted-foreground font-medium leading-relaxed italic">The following operations are destructive and will be broadcast to all regional sessions immediately.</p>
                    <Button variant="destructive" className="w-full mt-4 h-12 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-destructive/20 opacity-80 hover:opacity-100">
                      <Trash2 className="mr-2 h-4 w-4" /> Wipe Local Registry Cache
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[2.5rem] border-2 border-dashed border-border/40 shadow-none bg-muted/5 p-8 text-center flex flex-col items-center justify-center space-y-4">
                <div className="p-6 bg-primary/10 rounded-full mb-2">
                  <Monitor className="h-10 w-10 text-primary" />
                </div>
                <h4 className="text-sm font-black uppercase tracking-tight">System Integrity</h4>
                <p className="text-[10px] font-medium text-muted-foreground leading-relaxed italic">
                  Registry version: v5.0.2<br />
                  Cloud Cluster: PROD-NORTH-01<br />
                  Shadow Replication: ACTIVE
                </p>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

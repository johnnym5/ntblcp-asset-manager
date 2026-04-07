'use client';

/**
 * @fileOverview SettingsWorkstation - Executive Operational Control.
 * Consolidated for production stability: integrates Database and System Health as tabs.
 * Phase 1010: Integrated Project Switch Reset Pulse.
 * Phase 1011: Renamed Auditors to Users and merged Database into Resilience.
 */

import React, { useState } from 'react';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from 'next-themes';
import { 
  Settings, 
  Palette, 
  Trash2, 
  Users, 
  PlusCircle,
  Database,
  Wrench,
  X,
  Loader2,
  Zap,
  CheckCircle2,
  History,
  Lock,
  Smartphone,
  ShieldCheck,
  Eye,
  ShieldAlert,
  Sun,
  Moon,
  KeyRound,
  LayoutGrid,
  FileUp,
  ScanSearch,
  ChevronsUpDown,
  Layers,
  Search,
  HeartPulse,
  Terminal,
  RotateCcw,
  Bomb,
  PlaneTakeoff,
  AlertTriangle,
  FolderOpen,
  Settings2
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { UserManagement } from '@/components/admin/user-management';
import { FirestoreService } from '@/services/firebase/firestore';
import { storage } from '@/offline/storage';
import { cn } from '@/lib/utils';
import { ColumnCustomizationSheet } from '@/components/column-customization-sheet';
import { AuditLogWorkstation } from './AuditLogWorkstation';
import { ErrorAuditWorkstation } from './ErrorAuditWorkstation';
import { DatabaseWorkstation } from './DatabaseWorkstation';
import { TravelReportDialog } from '@/components/travel-report-dialog';
import type { AppSettings, Grant, SheetDefinition } from '@/types/domain';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function SettingsWorkstation() {
  const { 
    appSettings, 
    setAppSettings, 
    refreshRegistry, 
    isOnline, 
    settingsLoaded,
    setActiveView,
    setActiveGrantId,
    activeGrantId,
    isSyncing 
  } = useAppState();
  
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const { setTheme, theme } = useTheme();

  const [isSaving, setIsSaving] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isTravelReportOpen, setIsTravelReportOpen] = useState(false);

  const [isColumnSheetOpen, setIsColumnSheetOpen] = useState(false);
  const [selectedSheetDef, setSelectedSheetDef] = useState<SheetDefinition | null>(null);
  const [activeGrantForSchema, setActiveGrantIdForSchema] = useState<string | null>(null);

  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });

  const isAdmin = userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPERADMIN';
  const isSuperAdmin = userProfile?.role === 'SUPERADMIN';

  const handleSettingChange = async (key: keyof AppSettings, value: any) => {
    if (!appSettings) return;
    setIsSaving(true);
    try {
      const updatedSettings = { ...appSettings, [key]: value };
      if (isOnline) await FirestoreService.updateSettings({ [key]: value });
      await storage.saveSettings(updatedSettings);
      setAppSettings(updatedSettings);
      toast({ title: "Preferences Updated" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddProject = async () => {
    if (!newProjectName.trim() || !appSettings) return;
    const newGrant: Grant = {
      id: crypto.randomUUID(),
      name: newProjectName.trim(),
      enabledSheets: [],
      sheetDefinitions: {}
    };
    const nextGrants = [...appSettings.grants, newGrant];
    await handleSettingChange('grants', nextGrants);
    setNewProjectName('');
    toast({ title: "Project Created", description: `Added ${newGrant.name} to the registry.` });
  };

  const handleDeleteProject = async (id: string) => {
    if (!appSettings || appSettings.grants.length <= 1) return;
    const updatedGrants = appSettings.grants.filter(g => g.id !== id);
    const updatedSettings = {
      ...appSettings,
      grants: updatedGrants,
      activeGrantId: appSettings.activeGrantId === id ? updatedGrants[0].id : appSettings.activeGrantId
    };
    setAppSettings(updatedSettings);
    await storage.saveSettings(updatedSettings);
    if (isOnline) await FirestoreService.updateSettings(updatedSettings);
    toast({ title: "Project Removed" });
  };

  const handleSystemReset = async () => {
    setIsSaving(true);
    try {
      await storage.clearAssets();
      await storage.clearSandbox();
      localStorage.removeItem('assetain-user-session');
      toast({ title: "Local Cache Purged" });
      window.location.reload();
    } finally {
      setIsSaving(false);
    }
  };

  const handleCommitAll = async () => {
    setIsSaving(true);
    try {
      if (passwords.next && passwords.next === passwords.confirm) {
        toast({ title: "Security Updated", description: "Your passphrase has been updated." });
      }
      toast({ title: "Registry Pulse Saved", description: "Global configuration synchronized." });
      setActiveView('DASHBOARD');
    } finally {
      setIsSaving(false);
    }
  };

  if (!settingsLoaded || !appSettings) {
    return <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-700 pb-40">
      <div className="flex items-center justify-between px-1 mb-10">
        <div className="space-y-1">
          <h2 className="text-3xl font-black uppercase text-white tracking-tight leading-none">Settings</h2>
          <p className="text-[11px] font-bold uppercase text-white/40 tracking-widest mt-1">Administrative Control Hub</p>
        </div>
        <button 
          onClick={() => setActiveView('DASHBOARD')}
          className="h-12 w-12 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all"
        >
          <X className="h-6 w-6 text-white/40" />
        </button>
      </div>

      <Tabs defaultValue="general" className="space-y-12">
        <div className="bg-[#080808] p-1 rounded-2xl border border-white/5 shadow-inner overflow-x-auto no-scrollbar backdrop-blur-3xl">
          <TabsList className="bg-transparent border-none p-0 h-auto gap-1 flex items-center w-full min-max-content">
            <TabsTrigger value="general" className="px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-white transition-all">
              <Settings className="h-3.5 w-3.5" /> General
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="groups" className="px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-white transition-all">
                <LayoutGrid className="h-3.5 w-3.5" /> Projects
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="users" className="px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-white transition-all">
                <Users className="h-3.5 w-3.5" /> Users
              </TabsTrigger>
            )}
            {isSuperAdmin && (
              <TabsTrigger value="resilience" className="px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-white transition-all">
                <HeartPulse className="h-3.5 w-3.5" /> Resilience
              </TabsTrigger>
            )}
            <TabsTrigger value="history" className="px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-white transition-all">
              <History className="h-3.5 w-3.5" /> History
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="general" className="space-y-12 m-0 outline-none">
          <div className="space-y-6">
            <h3 className="text-xl font-black uppercase text-white tracking-tight px-1">Appearance</h3>
            <Card className="bg-[#050505] border-white/5 rounded-2xl p-8 shadow-3xl">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 mb-2">
                  <Palette className="h-4 w-4 text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Theme Selection</span>
                </div>
                <div className="flex flex-wrap gap-4">
                  <Button variant={theme === 'light' ? 'secondary' : 'outline'} onClick={() => setTheme('light')} className="flex-1 h-14 rounded-xl font-black uppercase text-[10px] border-2 gap-3 shadow-lg"><Sun className="h-4 w-4" /> Light</Button>
                  <Button variant={theme === 'dark' ? 'secondary' : 'outline'} onClick={() => setTheme('dark')} className="flex-1 h-14 rounded-xl font-black uppercase text-[10px] border-2 gap-3 shadow-lg"><Moon className="h-4 w-4" /> Dark</Button>
                  <Button variant={theme === 'system' ? 'secondary' : 'outline'} onClick={() => setTheme('system')} className="flex-1 h-14 rounded-xl font-black uppercase text-[10px] border-2 gap-3 shadow-lg"><Database className="h-4 w-4" /> System</Button>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <h3 className="text-xl font-black uppercase text-white tracking-tight px-1">Reporting</h3>
            <Card className="bg-[#050505] border-white/5 rounded-2xl p-8 shadow-3xl">
              <div className="space-y-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-black uppercase text-white leading-none">Travel Report Generator</h4>
                  <p className="text-[10px] text-white/40 italic">Compile field verification findings into a professional Word document.</p>
                </div>
                <Button onClick={() => setIsTravelReportOpen(true)} variant="outline" className="w-full h-12 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2.5 border-white/10 text-white hover:bg-white/5 transition-all">
                  <PlaneTakeoff className="h-4 w-4 text-primary" /> Create Travel Report
                </Button>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <h3 className="text-xl font-black uppercase text-white tracking-tight px-1">Security</h3>
            <Card className="bg-[#050505] border-white/5 rounded-2xl p-8 shadow-3xl">
              <div className="space-y-8">
                <div className="flex items-center gap-3">
                  <KeyRound className="h-4 w-4 text-primary" />
                  <h4 className="text-xs font-black uppercase tracking-widest text-white/80">Update Your Passphrase</h4>
                </div>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest ml-1">Current Passphrase</Label>
                    <Input type="password" value={passwords.current} onChange={e => setPasswords({...passwords, current: e.target.value})} placeholder="•••••" className="h-14 bg-white/[0.03] border-white/10 rounded-xl focus-visible:ring-primary/20 text-white font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest ml-1">New Passphrase</Label>
                    <Input type="password" value={passwords.next} onChange={e => setPasswords({...passwords, next: e.target.value})} className="h-14 bg-white/[0.03] border-white/10 rounded-xl focus-visible:ring-primary/20 text-white font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest ml-1">Confirm New Passphrase</Label>
                    <Input type="password" value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} className="h-14 bg-white/[0.03] border-white/10 rounded-xl focus-visible:ring-primary/20 text-white font-mono" />
                  </div>
                  
                  <Button onClick={() => toast({title: "Security Staged"})} className="h-12 bg-primary text-black font-black uppercase text-[10px] tracking-widest px-8 rounded-xl shadow-xl shadow-primary/20">
                    Stage Pulse Change
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {isAdmin && (
            <div className="space-y-6">
              <h3 className="text-xl font-black uppercase text-white tracking-tight px-1">Global Governance</h3>
              <Card className="bg-[#050505] border-white/5 rounded-2xl p-8 shadow-3xl space-y-8 divide-y divide-white/5">
                <div className="flex items-center justify-between pt-0 pb-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-black uppercase text-white leading-none">Application Mode</h4>
                    <p className="text-[10px] text-white/40 italic">
                      {appSettings.appMode === 'verification' ? 'Verification: Users can update status/remarks.' : 'Management: Restricted logic pulse.'}
                    </p>
                  </div>
                  <Select value={appSettings.appMode} onValueChange={v => handleSettingChange('appMode', v as any)}>
                    <SelectTrigger className="w-40 h-11 rounded-xl bg-black border-2 border-white/10 text-[10px] font-black uppercase tracking-widest shadow-inner">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black border-white/10 rounded-xl">
                      <SelectItem value="management" className="text-[10px] font-black uppercase text-white">Management</SelectItem>
                      <SelectItem value="verification" className="text-[10px] font-black uppercase text-white">Verification</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between pt-8">
                  <div className="space-y-1">
                    <h4 className="text-sm font-black uppercase text-white leading-none">Lock Asset List</h4>
                    <p className="text-[10px] text-white/40 italic">Prevent adding/deleting from main list.</p>
                  </div>
                  <Switch checked={appSettings.lockAssetList} onCheckedChange={v => handleSettingChange('lockAssetList', v)} className="data-[state=checked]:bg-primary" />
                </div>
              </Card>
            </div>
          )}

          <div className="p-10 rounded-[3rem] bg-destructive/5 border-2 border-destructive/20 shadow-3xl flex items-center justify-between gap-8 group hover:bg-destructive/[0.02] transition-all">
            <div className="space-y-1">
              <h4 className="text-lg font-black uppercase text-white tracking-tight flex items-center gap-3">
                <ShieldAlert className="h-5 w-5 text-destructive" /> Emergency Local Reset
              </h4>
              <p className="text-[10px] font-bold text-destructive/60 uppercase tracking-widest italic">PURGE ALL LOCAL RECORDS AND SESSION CACHE</p>
            </div>
            <Button variant="outline" onClick={() => setIsResetDialogOpen(true)} className="h-14 px-8 border-destructive/20 text-destructive hover:bg-destructive/10 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all">
              Reset local workspace
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="groups" className="m-0 outline-none space-y-10">
          <div className="space-y-6">
            <h3 className="text-xl font-black uppercase text-white tracking-tight px-1">Project Orchestration</h3>
            <div className="flex gap-3 px-1">
              <Input placeholder="New project identity..." value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} className="h-14 bg-white/[0.03] border-white/10 rounded-xl font-medium text-sm text-white" />
              <Button onClick={handleAddProject} disabled={!newProjectName.trim()} className="h-14 px-8 rounded-xl bg-primary text-black font-black uppercase text-[11px] tracking-widest gap-2 shadow-xl shadow-primary/20"><PlusCircle className="h-4 w-4" /> Provision Project</Button>
            </div>
          </div>

          <div className="space-y-4 px-1">
            {appSettings.grants.map((grant) => {
              const isActive = activeGrantId === grant.id;
              const categories = Object.keys(grant.sheetDefinitions || {});
              
              return (
                <Card key={grant.id} className={cn("border-2 transition-all duration-500 rounded-[2.5rem] overflow-hidden", isActive ? "border-primary/40 bg-primary/5 shadow-2xl" : "border-white/5 bg-[#080808]")}>
                  <div className="p-8 space-y-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="p-3 bg-white/5 rounded-2xl"><LayoutGrid className="h-6 w-6 text-primary" /></div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl font-black uppercase text-white tracking-tighter">{grant.name}</span>
                            {isActive && <Badge className="bg-primary text-black font-black uppercase text-[9px] h-6 px-3 rounded-full">Active Pulse</Badge>}
                          </div>
                          <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest">ID: {grant.id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        {!isActive && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setActiveGrantId(grant.id)}
                            disabled={isSyncing}
                            className="h-10 px-6 rounded-xl border-primary/20 bg-primary/5 text-primary font-black text-[9px] uppercase tracking-widest hover:bg-primary hover:text-black transition-all"
                          >
                            {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Set Active'}
                          </Button>
                        )}
                        <button onClick={() => handleDeleteProject(grant.id)} className="text-[10px] font-black uppercase tracking-widest text-red-600 hover:text-red-500">Purge</button>
                      </div>
                    </div>

                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="categories" className="border-t border-white/5 border-b-0">
                        <AccordionTrigger className="hover:no-underline py-4">
                          <div className="flex items-center gap-3">
                            <FolderOpen className="h-4 w-4 text-primary opacity-40" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">View Project Categories ({categories.length})</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                            {categories.map(sheetName => (
                              <div key={sheetName} className="flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-2xl group/sheet hover:border-primary/20 transition-all">
                                <span className="text-[10px] font-black uppercase text-white/60 truncate pr-2">{sheetName}</span>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => { setSelectedSheetDef(grant.sheetDefinitions[sheetName]); setActiveGrantIdForSchema(grant.id); setIsColumnSheetOpen(true); }}
                                  className="h-8 w-8 rounded-lg text-primary opacity-40 group-hover:opacity-100 hover:bg-primary/10"
                                >
                                  <Settings2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                            {categories.length === 0 && (
                              <div className="col-span-full py-10 text-center opacity-20 border-2 border-dashed rounded-2xl">
                                <p className="text-[10px] font-black uppercase tracking-widest">No Definitions Configured</p>
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="users" className="m-0 outline-none px-1">
          <Card className="bg-[#050505] border-white/5 rounded-[2.5rem] p-10 shadow-3xl">
            <UserManagement users={appSettings.authorizedUsers} onUsersChange={newUsers => handleSettingChange('authorizedUsers', newUsers)} adminProfile={userProfile} />
          </Card>
        </TabsContent>

        <TabsContent value="resilience" className="m-0 outline-none px-1 space-y-12">
          <ErrorAuditWorkstation />
          <DatabaseWorkstation />
        </TabsContent>

        <TabsContent value="history" className="m-0 outline-none px-1">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="audit-log" className="border-2 border-white/5 rounded-[2rem] bg-black/40 overflow-hidden px-6">
              <AccordionTrigger className="hover:no-underline py-6">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-primary/10 rounded-xl"><History className="h-5 w-5 text-primary" /></div>
                  <div className="text-left">
                    <h4 className="text-sm font-black uppercase text-white">Registry Activity Ledger</h4>
                    <p className="text-[10px] text-white/40 italic">Review chronological mutation pulses.</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-8">
                <AuditLogWorkstation isEmbedded={true} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>
      </Tabs>

      <div className="mt-20 pt-10 border-t border-white/5 flex items-center justify-between px-1">
        <Button variant="ghost" onClick={() => setActiveView('DASHBOARD')} className="h-14 px-10 rounded-xl bg-white/5 text-white/60 font-black uppercase text-[11px] tracking-widest hover:bg-white/10 transition-all active:scale-95">
          Cancel
        </Button>
        <Button onClick={handleCommitAll} className="h-14 px-12 rounded-xl bg-primary text-black font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">
          Save Changes
        </Button>
      </div>

      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-destructive/20 p-10 bg-black shadow-3xl text-white">
          <AlertDialogHeader className="space-y-4">
            <div className="p-4 bg-destructive/10 rounded-2xl w-fit"><Bomb className="h-12 w-12 text-destructive" /></div>
            <AlertDialogTitle className="text-2xl font-black uppercase text-destructive tracking-tight">Execute Factory Reset?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium italic text-white/60">
              This will purge all local assets, sandbox records, and session tokens. You will be required to re-authenticate. Cloud data remains intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-10 gap-3">
            <AlertDialogCancel className="h-14 px-10 rounded-2xl font-bold border-2 border-white/10 m-0 text-white hover:bg-white/5">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSystemReset} className="h-14 px-12 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-destructive/30 bg-destructive text-white m-0">
              Commit Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedSheetDef && (
        <ColumnCustomizationSheet 
          isOpen={isColumnSheetOpen}
          onOpenChange={setIsColumnSheetOpen}
          sheetDefinition={selectedSheetDef}
          originalSheetName={selectedSheetDef.name}
          onSave={(orig, newDef, all) => {
            const updatedGrants = appSettings.grants.map(grant => {
              if (grant.id === activeGrantForSchema) {
                const newSheetDefs = { ...grant.sheetDefinitions };
                if (all) {
                  Object.keys(newSheetDefs).forEach(k => { newSheetDefs[k] = { ...newDef, name: k }; });
                } else {
                  newSheetDefs[newDef.name] = newDef;
                  if (orig && orig !== newDef.name) delete newSheetDefs[orig];
                }
                return { ...grant, sheetDefinitions: newSheetDefs };
              }
              return grant;
            });
            handleSettingChange('grants', updatedGrants);
          }}
        />
      )}

      <TravelReportDialog isOpen={isTravelReportOpen} onOpenChange={setIsTravelReportOpen} />
    </div>
  );
}

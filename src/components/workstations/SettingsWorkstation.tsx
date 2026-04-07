'use client';

/**
 * @fileOverview SettingsWorkstation - Executive Operational Control.
 * Consolidated for production stability: integrates Database and System Health as tabs.
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
  Bomb
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
    activeGrantId 
  } = useAppState();
  
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const { setTheme, theme } = useTheme();

  const [isSaving, setIsSaving] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

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

  if (!settingsLoaded || !appSettings) {
    return <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-700 pb-40">
      <div className="flex items-center justify-between px-1 mb-10">
        <div className="space-y-1">
          <h2 className="text-3xl font-black uppercase text-white tracking-tight">Settings</h2>
          <p className="text-[11px] font-bold uppercase text-white/40 tracking-widest">Administrative Control Hub</p>
        </div>
        <button 
          onClick={() => setActiveView('DASHBOARD')}
          className="h-12 w-12 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all"
        >
          <X className="h-6 w-6 text-white/40" />
        </button>
      </div>

      <Tabs defaultValue="general" className="space-y-12">
        <div className="bg-[#080808] p-1 rounded-2xl border border-white/5 shadow-inner overflow-x-auto no-scrollbar">
          <TabsList className="bg-transparent border-none p-0 h-auto gap-1 flex items-center w-full min-w-max">
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
                <Users className="h-3.5 w-3.5" /> Auditors
              </TabsTrigger>
            )}
            {isSuperAdmin && (
              <TabsTrigger value="database" className="px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-white transition-all">
                <Terminal className="h-3.5 w-3.5" /> Database
              </TabsTrigger>
            )}
            {isSuperAdmin && (
              <TabsTrigger value="system" className="px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-white transition-all">
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
            <Card className="bg-[#050505] border-white/5 rounded-[2rem] p-8 shadow-3xl">
              <div className="flex flex-wrap gap-4">
                <Button variant={theme === 'light' ? 'secondary' : 'outline'} onClick={() => setTheme('light')} className="flex-1 h-14 rounded-xl font-black uppercase text-[10px] border-2 gap-3"><Sun className="h-4 w-4" /> Light</Button>
                <Button variant={theme === 'dark' ? 'secondary' : 'outline'} onClick={() => setTheme('dark')} className="flex-1 h-14 rounded-xl font-black uppercase text-[10px] border-2 gap-3"><Moon className="h-4 w-4" /> Dark</Button>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <h3 className="text-xl font-black uppercase text-white tracking-tight px-1">Safety Protocols</h3>
            <Card className="bg-destructive/5 border-2 border-destructive/20 rounded-[2rem] p-10 shadow-3xl">
              <div className="flex items-center justify-between gap-8">
                <div className="space-y-1">
                  <h4 className="text-lg font-black uppercase text-white leading-none">Emergency Local Reset</h4>
                  <p className="text-[10px] font-bold text-destructive/60 uppercase tracking-widest italic">PURGE ALL LOCAL RECORDS AND SESSION CACHE</p>
                </div>
                <Button variant="outline" onClick={() => setIsResetDialogOpen(true)} className="h-14 px-8 border-destructive/20 text-destructive hover:bg-destructive/10 rounded-xl font-black uppercase text-[10px] tracking-widest">
                  Reset local workspace
                </Button>
              </div>
            </Card>
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
            {appSettings.grants.map((grant) => (
              <Card key={grant.id} className={cn("border-2 transition-all duration-500 rounded-2xl overflow-hidden", activeGrantId === grant.id ? "bg-white/[0.03] border-white/10 shadow-2xl" : "bg-transparent border-white/5")}>
                <div className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-black uppercase text-white tracking-tight">{grant.name}</span>
                      {activeGrantId === grant.id && <Badge className="bg-primary text-black font-black uppercase text-[9px] h-6 px-3 rounded-full">Active Pulse</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    {activeGrantId !== grant.id && <button onClick={() => setActiveGrantId(grant.id)} className="text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-80">Set Active</button>}
                    <button onClick={() => handleDeleteProject(grant.id)} className="text-[10px] font-black uppercase tracking-widest text-red-600 hover:text-red-500">Purge</button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="users" className="m-0 outline-none px-1">
          <Card className="bg-[#050505] border-white/5 rounded-[2.5rem] p-10 shadow-3xl">
            <UserManagement users={appSettings.authorizedUsers} onUsersChange={newUsers => handleSettingChange('authorizedUsers', newUsers)} adminProfile={userProfile} />
          </Card>
        </TabsContent>

        <TabsContent value="database" className="m-0 outline-none px-1">
          <DatabaseWorkstation />
        </TabsContent>

        <TabsContent value="system" className="m-0 outline-none px-1">
          <ErrorAuditWorkstation />
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
    </div>
  );
}

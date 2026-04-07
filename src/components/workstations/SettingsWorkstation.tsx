
'use client';

/**
 * @fileOverview SettingsWorkstation - Executive Operational Control.
 * Phase 308: Integrated success notifications for governance pulses.
 */

import React, { useState, useRef } from 'react';
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
  ShieldCheck,
  Sun,
  Moon,
  LayoutGrid,
  FileUp,
  ScanSearch,
  ChevronsUpDown,
  HeartPulse,
  Terminal,
  Settings2,
  HelpCircle,
  GraduationCap,
  DatabaseZap,
  Check
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
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
import { ImportScannerDialog } from '@/components/single-sheet-import-dialog';
import AssetForm from '@/components/asset-form';
import { enqueueMutation } from '@/offline/queue';
import { parseExcelForTemplate } from '@/lib/excel-parser';
import { addNotification } from '@/hooks/use-notifications';
import type { AppSettings, Grant, SheetDefinition, UXMode } from '@/types/domain';
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
  const [isImportScanOpen, setIsImportScanOpen] = useState(false);
  const [isAssetFormOpen, setIsAssetFormOpen] = useState(false);

  const [isColumnSheetOpen, setIsColumnSheetOpen] = useState(false);
  const [selectedSheetDef, setSelectedSheetDef] = useState<SheetDefinition | null>(null);
  const [activeGrantForSchema, setActiveGrantIdForSchema] = useState<string | null>(null);

  const templateInputRef = useRef<HTMLInputElement>(null);

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
      addNotification({ title: "Governance Pulse", description: `Updated ${key} successfully.`, variant: "success" });
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
    addNotification({ title: "Project Created", description: `Added ${newProjectName} to the registry.`, variant: "success" });
  };

  const handleTemplateImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !appSettings || !activeGrantId) return;

    try {
      const templates = await parseExcelForTemplate(file);
      const nextSettings = { ...appSettings };
      const grantIdx = nextSettings.grants.findIndex(g => g.id === activeGrantId);
      
      if (grantIdx > -1) {
        const currentDefs = { ...nextSettings.grants[grantIdx].sheetDefinitions };
        templates.forEach(t => { currentDefs[t.name] = t; });
        nextSettings.grants[grantIdx].sheetDefinitions = currentDefs;
        await storage.saveSettings(nextSettings);
        if (isOnline) await FirestoreService.updateSettings(nextSettings);
        setAppSettings(nextSettings);
        addNotification({ title: "Templates Discovered", description: `Saved ${templates.length} sheet definitions.`, variant: "success" });
      }
    } catch (err) {
      addNotification({ title: "Template Failure", description: "Could not discover nodes.", variant: "destructive" });
    }
  };

  const handleCommitAll = async () => {
    addNotification({ title: "Broadcasting Configuration", description: "Establishing global state parity..." });
    await refreshRegistry();
    setActiveView('DASHBOARD');
    addNotification({ title: "Environment Ready", description: "Governance settings synchronized.", variant: "success" });
  };

  if (!settingsLoaded || !appSettings) return null;

  const SectionTitle = ({ title, description, icon: Icon }: { title: string, description: string, icon: any }) => (
    <div className="space-y-1 px-1 mb-6">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-primary" />
        <h3 className="text-xl font-black uppercase text-white tracking-tight leading-none">{title}</h3>
      </div>
      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">{description}</p>
    </div>
  );

  return (
    <Tabs defaultValue="general" className="animate-in fade-in duration-700 h-full flex flex-col relative">
      <div className="sticky top-[-1rem] sm:top-[-2rem] lg:top-[-2.5rem] z-40 bg-[#050505]/95 backdrop-blur-2xl pt-2 pb-4 px-1 border-b border-white/5 mb-4 -mx-1 shrink-0">
        <div className="flex flex-col gap-6 max-w-[1600px] mx-auto w-full">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight leading-none">Settings</h2>
              <p className="text-[11px] font-bold uppercase text-white/40 tracking-widest mt-1">Operational Control Hub</p>
            </div>
            <button onClick={() => setActiveView('DASHBOARD')} className="h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all"><X className="h-5 w-5 sm:h-6 sm:w-6 text-white/40" /></button>
          </div>
          <div className="bg-[#080808] p-1 rounded-2xl border border-white/5 shadow-inner overflow-x-auto no-scrollbar backdrop-blur-3xl">
            <TabsList className="bg-transparent border-none p-0 h-auto gap-1 flex items-center w-full min-max-content">
              <TabsTrigger value="general" className="px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-white transition-all"><Settings className="h-3.5 w-3.5" /> General</TabsTrigger>
              {isAdmin && <TabsTrigger value="groups" className="px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-white transition-all"><LayoutGrid className="h-3.5 w-3.5" /> Projects & Sheets</TabsTrigger>}
              {isAdmin && <TabsTrigger value="users" className="px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-white transition-all"><Users className="h-3.5 w-3.5" /> Users</TabsTrigger>}
              {isSuperAdmin && <TabsTrigger value="resilience" className="px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-white transition-all"><HeartPulse className="h-3.5 w-3.5" /> Resilience</TabsTrigger>}
              <TabsTrigger value="history" className="px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-white transition-all"><History className="h-3.5 w-3.5" /> History</TabsTrigger>
            </TabsList>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 pt-4 overflow-y-auto custom-scrollbar pb-40">
        <TabsContent value="general" className="space-y-12 m-0 outline-none">
          <section><SectionTitle title="Experience Mode" description="Choose your guidance level" icon={GraduationCap} /><Card className="bg-[#050505] border-white/5 rounded-2xl p-8 shadow-3xl"><div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center"><div className="space-y-2"><h4 className="text-sm font-black uppercase text-white">Usage Mode</h4><p className="text-[11px] text-white/40 leading-relaxed italic">{appSettings.uxMode === 'beginner' ? "Beginner Mode Active" : "Advanced Mode Active"}</p></div><Select value={appSettings.uxMode} onValueChange={v => handleSettingChange('uxMode', v as UXMode)}><SelectTrigger className="h-14 rounded-xl bg-black border-2 border-white/10 font-black uppercase text-[10px] tracking-widest"><SelectValue /></SelectTrigger><SelectContent className="bg-black border-white/10 rounded-xl"><SelectItem value="beginner" className="text-[10px] font-black uppercase">Beginner Mode</SelectItem><SelectItem value="advanced" className="text-[10px] font-black uppercase">Advanced Mode</SelectItem></SelectContent></Select></div></Card></section>
          <section><SectionTitle title="Appearance" description="Visual surface & identity" icon={Palette} /><Card className="bg-[#050505] border-white/5 rounded-2xl p-8 shadow-3xl"><div className="flex flex-wrap gap-4"><Button variant={theme === 'light' ? 'secondary' : 'outline'} onClick={() => setTheme('light')} className="flex-1 h-14 rounded-xl font-black uppercase text-[10px] border-2 shadow-lg"><Sun className="h-4 w-4" /> Light</Button><Button variant={theme === 'dark' ? 'secondary' : 'outline'} onClick={() => setTheme('dark')} className="flex-1 h-14 rounded-xl font-black uppercase text-[10px] border-2 shadow-lg"><Moon className="h-4 w-4" /> Dark</Button></div></Card></section>
        </TabsContent>

        <TabsContent value="groups" className="m-0 outline-none space-y-10 px-1">
          <div className="space-y-6"><h3 className="text-xl font-black uppercase text-white tracking-tight leading-none">Manage Projects</h3><div className="flex gap-3"><Input placeholder="New project name..." value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} className="h-14 bg-black border-white/10 rounded-xl font-medium text-sm text-white" /><Button onClick={handleAddProject} disabled={!newProjectName.trim()} className="h-14 px-8 rounded-xl bg-primary text-black font-black uppercase text-[11px] tracking-widest gap-2 shadow-xl shadow-primary/20"><PlusCircle className="h-4 w-4" /> Add Project</Button></div></div>
          <Accordion type="single" collapsible className="space-y-4">{appSettings.grants.map((grant) => (<AccordionItem key={grant.id} value={grant.id} className={cn("border-2 rounded-[1.5rem] overflow-hidden bg-black", activeGrantId === grant.id ? "border-primary/40 shadow-2xl" : "border-white/5")}><div className="flex items-center justify-between bg-black pr-6"><AccordionTrigger className="hover:no-underline p-6 border-none flex-1 justify-start gap-4 [&>svg]:hidden"><ChevronsUpDown className="h-4 w-4 text-white/20" /><div className="flex items-center gap-3"><span className="text-lg font-black uppercase text-white tracking-tight">{grant.name}</span>{activeGrantId === grant.id && <Badge className="bg-primary text-black font-black uppercase text-[9px] h-6 px-3 rounded-full">Active</Badge>}</div></AccordionTrigger><div className="flex items-center gap-6">{activeGrantId !== grant.id && <Button variant="outline" size="sm" onClick={() => setActiveGrantId(grant.id)} className="h-9 px-5 rounded-xl border-white/10 font-black text-[10px] uppercase bg-black/40">Set Active</Button>}</div></div><AccordionContent className="bg-white/[0.02] border-t border-white/5 p-8 space-y-8"><div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><Button onClick={() => setIsAssetFormOpen(true)} className="h-14 rounded-2xl bg-black/40 border border-white/10 text-white font-black uppercase text-[10px] tracking-widest gap-3"><PlusCircle className="h-4 w-4" /> Add Manually</Button><Button onClick={() => setIsImportScanOpen(true)} className="h-14 rounded-2xl bg-black/40 border border-white/10 text-white font-black uppercase text-[10px] tracking-widest gap-3"><ScanSearch className="h-4 w-4" /> Scan & Import Data</Button></div></AccordionContent></AccordionItem>))}</Accordion>
        </TabsContent>

        <TabsContent value="users" className="m-0 outline-none px-1"><Card className="bg-[#050505] border-white/5 rounded-[2.5rem] p-10 shadow-3xl"><UserManagement users={appSettings.authorizedUsers} onUsersChange={newUsers => handleSettingChange('authorizedUsers', newUsers)} adminProfile={userProfile} /></Card></TabsContent>
        <TabsContent value="resilience" className="m-0 outline-none px-1"><Accordion type="multiple" className="w-full space-y-4"><AccordionItem value="error-audit" className="border-2 border-white/5 rounded-[2rem] bg-black/40 overflow-hidden px-6"><AccordionTrigger className="hover:no-underline py-6"><div className="flex items-center gap-4"><div className="p-2.5 bg-destructive/10 rounded-xl"><HeartPulse className="h-5 w-5 text-destructive" /></div><div className="text-left"><h4 className="text-sm font-black uppercase text-white">Resilience Audit</h4></div></div></AccordionTrigger><AccordionContent className="pb-8"><ErrorAuditWorkstation isEmbedded={true} /></AccordionContent></AccordionItem><AccordionItem value="db-admin" className="border-2 border-white/5 rounded-[2rem] bg-black/40 overflow-hidden px-6"><AccordionTrigger className="hover:no-underline py-6"><div className="flex items-center gap-4"><div className="p-2.5 bg-primary/10 rounded-xl"><Terminal className="h-5 w-5 text-primary" /></div><div className="text-left"><h4 className="text-sm font-black uppercase text-white">Database Management</h4></div></div></AccordionTrigger><AccordionContent className="pb-8"><DatabaseWorkstation isEmbedded={true} /></AccordionContent></AccordionItem></Accordion></TabsContent>
        <TabsContent value="history" className="m-0 outline-none px-1"><AuditLogWorkstation isEmbedded={true} /></TabsContent>
      </div>

      <div className="mt-2 pt-10 border-t border-white/5 flex items-center justify-between px-1 shrink-0 pb-10"><Button variant="ghost" onClick={() => setActiveView('DASHBOARD')} className="h-14 px-10 rounded-xl bg-[#0A0A0A] text-white/60 font-black uppercase text-[11px] tracking-widest">Cancel</Button><Button onClick={handleCommitAll} className="h-14 px-12 rounded-xl bg-primary text-black font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl">Save Changes</Button></div>
      <AssetForm isOpen={isAssetFormOpen} onOpenChange={setIsAssetFormOpen} isReadOnly={false} onSave={async (a) => { await enqueueMutation('UPDATE', 'assets', a); await refreshRegistry(); setIsAssetFormOpen(false); addNotification({ title: "Record Added", description: "Created new identity pulse.", variant: "success" }); }} />
      <ImportScannerDialog isOpen={isImportScanOpen} onOpenChange={setIsImportScanOpen} />
    </Tabs>
  );
}

'use client';

/**
 * @fileOverview SettingsWorkstation - Executive Operational Control.
 * Phase 304: Integrated permission-aware User Management toggles.
 * Phase 305: Resilience tab content wrapped in closed accordions.
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
  Smartphone,
  ShieldCheck,
  Eye,
  ShieldAlert,
  Sun,
  Moon,
  LayoutGrid,
  FileUp,
  ScanSearch,
  ChevronsUpDown,
  Layers,
  HeartPulse,
  Terminal,
  RotateCcw,
  Bomb,
  Settings2,
  HelpCircle,
  GraduationCap,
  DatabaseZap,
  Type,
  Check
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
import { ImportScannerDialog } from '@/components/single-sheet-import-dialog';
import AssetForm from '@/components/asset-form';
import { enqueueMutation } from '@/offline/queue';
import { parseExcelForTemplate } from '@/lib/excel-parser';
import type { AppSettings, Grant, SheetDefinition, UXMode, Asset, AuthorizedUser } from '@/types/domain';
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
    toast({ title: "Project Created", description: `Added ${newProjectName} to the registry.` });
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

  const handleTemplateImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !appSettings || !activeGrantId) return;

    try {
      const templates = await parseExcelForTemplate(file);
      const nextSettings = { ...appSettings };
      const grantIdx = nextSettings.grants.findIndex(g => g.id === activeGrantId);
      
      if (grantIdx > -1) {
        const currentDefs = { ...nextSettings.grants[grantIdx].sheetDefinitions };
        templates.forEach(t => {
          currentDefs[t.name] = t;
        });
        nextSettings.grants[grantIdx].sheetDefinitions = currentDefs;
        
        await storage.saveSettings(nextSettings);
        if (isOnline) await FirestoreService.updateSettings(nextSettings);
        setAppSettings(nextSettings);
        toast({ title: "Templates Extracted", description: `Saved ${templates.length} sheet definitions.` });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Template Failure", description: "Could not discover registry nodes in file." });
    } finally {
      if (templateInputRef.current) templateInputRef.current.value = '';
    }
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
    toast({ title: "Synchronizing State", description: "Broadcasting configuration pulse..." });
    await refreshRegistry();
    setActiveView('DASHBOARD');
  };

  if (!settingsLoaded || !appSettings) {
    return <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

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
            <button 
              onClick={() => setActiveView('DASHBOARD')}
              className="h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all"
            >
              <X className="h-5 w-5 sm:h-6 sm:w-6 text-white/40" />
            </button>
          </div>

          <div className="bg-[#080808] p-1 rounded-2xl border border-white/5 shadow-inner overflow-x-auto no-scrollbar backdrop-blur-3xl">
            <TabsList className="bg-transparent border-none p-0 h-auto gap-1 flex items-center w-full min-max-content">
              <TabsTrigger value="general" className="px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-white transition-all">
                <Settings className="h-3.5 w-3.5" /> General
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="groups" className="px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-white transition-all">
                  <LayoutGrid className="h-3.5 w-3.5" /> Projects & Sheets
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
        </div>
      </div>

      <div className="flex-1 min-h-0 pt-4 overflow-y-auto custom-scrollbar pb-40">
        <TabsContent value="general" className="space-y-12 m-0 outline-none">
          <div className="space-y-10">
            <section>
              <SectionTitle title="Experience Mode" description="Choose your guidance level" icon={GraduationCap} />
              <Card className="bg-[#050505] border-white/5 rounded-2xl p-8 shadow-3xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="space-y-2">
                    <h4 className="text-sm font-black uppercase text-white">Usage Mode</h4>
                    <p className="text-[11px] text-white/40 leading-relaxed italic">
                      {appSettings.uxMode === 'beginner' 
                        ? "Beginner: Expanded explanations and guided steps are shown throughout the app."
                        : "Advanced: Minimal guidance, higher density views, and faster shortcuts are enabled."}
                    </p>
                  </div>
                  <Select value={appSettings.uxMode} onValueChange={v => handleSettingChange('uxMode', v as UXMode)}>
                    <SelectTrigger className="h-14 rounded-xl bg-black border-2 border-white/10 font-black uppercase text-[10px] tracking-widest">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black border-white/10 rounded-xl">
                      <SelectItem value="beginner" className="text-[10px] font-black uppercase">Beginner Mode</SelectItem>
                      <SelectItem value="advanced" className="text-[10px] font-black uppercase">Advanced Mode</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </Card>
            </section>

            <section>
              <SectionTitle title="Appearance" description="Visual surface & identity" icon={Palette} />
              <Card className="bg-[#050505] border-white/5 rounded-2xl p-8 shadow-3xl">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Palette className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Theme selection</span>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <Button variant={theme === 'light' ? 'secondary' : 'outline'} onClick={() => setTheme('light')} className="flex-1 h-14 rounded-xl font-black uppercase text-[10px] border-2 gap-3 shadow-lg"><Sun className="h-4 w-4" /> Light</Button>
                    <Button variant={theme === 'dark' ? 'secondary' : 'outline'} onClick={() => setTheme('dark')} className="flex-1 h-14 rounded-xl font-black uppercase text-[10px] border-2 gap-3 shadow-lg"><Moon className="h-4 w-4" /> Dark</Button>
                    <Button variant={theme === 'system' ? 'secondary' : 'outline'} onClick={() => setTheme('system')} className="flex-1 h-14 rounded-xl font-black uppercase text-[10px] border-2 gap-3 shadow-lg"><Database className="h-4 w-4" /> System</Button>
                  </div>
                </div>
              </Card>
            </section>

            <section>
              <SectionTitle title="Guided Assistance" description="Help center & tips" icon={HelpCircle} />
              <Card className="bg-[#050505] border-white/5 rounded-2xl p-8 shadow-3xl space-y-8 divide-y divide-white/5">
                <div className="flex items-center justify-between pb-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-black uppercase text-white leading-none">Contextual Tooltips</h4>
                    <p className="text-[10px] text-white/40 italic">Show short hints when hovering over buttons.</p>
                  </div>
                  <Switch checked={appSettings.showHelpTooltips} onCheckedChange={v => handleSettingChange('showHelpTooltips', v)} className="data-[state=checked]:bg-primary" />
                </div>
                <div className="flex items-center justify-between pt-8">
                  <div className="space-y-1">
                    <h4 className="text-sm font-black uppercase text-white leading-none">Onboarding Restart</h4>
                    <p className="text-[10px] text-white/40 italic">Show the welcome tour again on next reload.</p>
                  </div>
                  <Button variant="ghost" onClick={() => handleSettingChange('onboardingComplete', false)} className="text-[10px] font-black uppercase text-primary hover:bg-primary/10 h-10 px-4 rounded-lg">Reset Tour</Button>
                </div>
              </Card>
            </section>

            {isAdmin && (
              <section>
                <SectionTitle title="Global Governance" description="Project-wide integrity rules" icon={Lock} />
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
                      <p className="text-[10px] text-white/40 italic">Prevent non-admins from adding or deleting records from the main list.</p>
                    </div>
                    <Switch checked={appSettings.lockAssetList} onCheckedChange={v => handleSettingChange('lockAssetList', v)} className="data-[state=checked]:bg-primary" />
                  </div>
                </Card>
              </section>
            )}
          </div>

          <div className="p-10 rounded-[3rem] bg-destructive/5 border-2 border-destructive/20 shadow-3xl flex items-center justify-between gap-8 group hover:bg-destructive/[0.02] transition-all">
            <div className="space-y-1">
              <h4 className="text-lg font-black uppercase text-white tracking-tight flex items-center gap-3">
                <ShieldAlert className="h-5 w-5 text-destructive" /> Emergency Local Reset
              </h4>
              <p className="text-[10px] font-bold text-destructive/60 uppercase tracking-widest italic">PURGE ALL LOCAL RECORDS AND SESSION CACHE</p>
            </div>
            <Button variant="outline" onClick={() => setIsResetDialogOpen(true)} className="h-14 px-8 border-destructive/20 text-destructive hover:bg-destructive/10 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all">
              Reset workspace
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="groups" className="m-0 outline-none space-y-10 px-1">
          <div className="space-y-6">
            <h3 className="text-xl font-black uppercase text-white tracking-tight leading-none">Manage Projects (Grants)</h3>
            <div className="flex gap-3">
              <Input 
                placeholder="New project name..." 
                value={newProjectName} 
                onChange={(e) => setNewProjectName(e.target.value)} 
                className="h-14 bg-black border-white/10 rounded-xl font-medium text-sm text-white placeholder:text-white/20" 
              />
              <Button 
                onClick={handleAddProject} 
                disabled={!newProjectName.trim()} 
                className="h-14 px-8 rounded-xl bg-primary text-black font-black uppercase text-[11px] tracking-widest gap-2 shadow-xl shadow-primary/20"
              >
                <PlusCircle className="h-4 w-4" /> Add Project
              </Button>
            </div>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {appSettings.grants.map((grant) => {
              const isActive = activeGrantId === grant.id;
              const categories = Object.keys(grant.sheetDefinitions || {});
              
              return (
                <AccordionItem 
                  key={grant.id} 
                  value={grant.id}
                  className={cn(
                    "border-2 transition-all duration-500 rounded-[1.5rem] overflow-hidden bg-black",
                    isActive ? "border-primary/40 shadow-2xl" : "border-white/5"
                  )}
                >
                  <div className="flex items-center justify-between bg-black pr-6">
                    <div className="flex-1">
                      <AccordionTrigger className="hover:no-underline p-6 border-none group/trigger justify-start gap-4 [&>svg]:hidden">
                        <ChevronsUpDown className="h-4 w-4 text-white/20 shrink-0 group-hover/trigger:text-primary transition-colors" />
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-black uppercase text-white tracking-tight">{grant.name}</span>
                          {isActive && <Badge className="bg-primary text-black font-black uppercase text-[9px] h-6 px-3 rounded-full">Active</Badge>}
                        </div>
                      </AccordionTrigger>
                    </div>
                    
                    <div className="flex items-center gap-6 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {!isActive && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setActiveGrantId(grant.id)}
                          disabled={isSyncing}
                          className="h-9 px-5 rounded-xl border-white/10 font-black text-[10px] uppercase tracking-widest bg-black/40 hover:bg-primary hover:text-black transition-all"
                        >
                          {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Set Active'}
                        </Button>
                      )}
                      <button className="text-[11px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-colors">Rename</button>
                      <button 
                        onClick={() => handleDeleteProject(grant.id)}
                        className="text-[11px] font-black uppercase tracking-widest text-red-600 hover:text-red-500 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <AccordionContent className="bg-white/[0.02] border-t border-white/5 p-8 space-y-8">
                    <div className="space-y-4">
                      <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-white/40 px-1">Sheet Definitions for this Project</h4>
                      <div className="p-10 border-2 border-dashed border-white/5 rounded-2xl bg-black/40 flex items-center justify-center">
                        {categories.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 w-full">
                            {categories.map(sheetName => (
                              <div key={sheetName} className="flex items-center justify-between p-4 bg-black/60 border border-white/10 rounded-xl group/sheet hover:border-primary/20 transition-all">
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
                          </div>
                        ) : (
                          <p className="text-[10px] font-black uppercase tracking-widest text-white/20">No sheets defined for this project.</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Button onClick={() => setIsAssetFormOpen(true)} className="h-14 rounded-2xl bg-black/40 border border-white/10 text-white font-black uppercase text-[10px] tracking-widest gap-3 hover:bg-white/10 transition-all">
                        <PlusCircle className="h-4 w-4" /> Add Manually
                      </Button>
                      <Button onClick={() => templateInputRef.current?.click()} className="h-14 rounded-2xl bg-black/40 border border-white/10 text-white font-black uppercase text-[10px] tracking-widest gap-3 hover:bg-white/10 transition-all">
                        <FileUp className="h-4 w-4" /> Import Template
                      </Button>
                      <input type="file" ref={templateInputRef} onChange={handleTemplateImport} className="hidden" accept=".xlsx,.xls" />
                      <Button onClick={() => setIsImportScanOpen(true)} className="h-14 rounded-2xl bg-black/40 border border-white/10 text-white font-black uppercase text-[10px] tracking-widest gap-3 hover:bg-white/10 transition-all">
                        <ScanSearch className="h-4 w-4" /> Scan & Import Data
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </TabsContent>

        <TabsContent value="users" className="m-0 outline-none px-1">
          <Card className="bg-[#050505] border-white/5 rounded-[2.5rem] p-10 shadow-3xl">
            <UserManagement users={appSettings.authorizedUsers} onUsersChange={newUsers => handleSettingChange('authorizedUsers', newUsers)} adminProfile={userProfile} />
          </Card>
        </TabsContent>

        <TabsContent value="resilience" className="m-0 outline-none px-1">
          <Accordion type="multiple" className="w-full space-y-4">
            <AccordionItem value="error-audit" className="border-2 border-white/5 rounded-[2rem] bg-black/40 overflow-hidden px-6">
              <AccordionTrigger className="hover:no-underline py-6">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-destructive/10 rounded-xl"><HeartPulse className="h-5 w-5 text-destructive" /></div>
                  <div className="text-left">
                    <h4 className="text-sm font-black uppercase text-white">Resilience Audit</h4>
                    <p className="text-[10px] text-white/40 italic">Autonomous Health Log & Recovery Traceability</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-8">
                <ErrorAuditWorkstation isEmbedded={true} />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="database-orchestration" className="border-2 border-white/5 rounded-[2rem] bg-black/40 overflow-hidden px-6">
              <AccordionTrigger className="hover:no-underline py-6">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-primary/10 rounded-xl"><Terminal className="h-5 w-5 text-primary" /></div>
                  <div className="text-left">
                    <h4 className="text-sm font-black uppercase text-white">Database Management</h4>
                    <p className="text-[10px] text-white/40 italic">Primary Storage: Firestore & Hybrid Shadow: RTDB</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-8">
                <DatabaseWorkstation isEmbedded={true} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
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
      </div>

      <div className="mt-2 pt-10 border-t border-white/5 flex items-center justify-between px-1 shrink-0 pb-10">
        <Button variant="ghost" onClick={() => setActiveView('DASHBOARD')} className="h-14 px-10 rounded-xl bg-[#0A0A0A] text-white/60 font-black uppercase text-[11px] tracking-widest hover:bg-white/5 transition-all active:scale-95">
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
      <ImportScannerDialog isOpen={isImportScanOpen} onOpenChange={setIsImportScanOpen} />
      <AssetForm 
        isOpen={isAssetFormOpen} 
        onOpenChange={setIsAssetFormOpen} 
        isReadOnly={false} 
        onSave={async (a) => {
          await enqueueMutation('UPDATE', 'assets', a);
          await refreshRegistry();
          setIsAssetFormOpen(false);
          toast({ title: "Asset Added Locally" });
        }}
      />
    </Tabs>
  );
}

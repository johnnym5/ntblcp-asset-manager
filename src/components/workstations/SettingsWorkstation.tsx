'use client';

/**
 * @fileOverview SettingsWorkstation - Executive Operational Control.
 * Phase 312: Integrated Security section for self-service passphrase management.
 * Phase 313: Activated Sheet Ledger dropdowns for fine-grained schema control.
 * Phase 314: Restored accordion triggers and added explicit template scan pulse.
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
  Check,
  Columns,
  Eye,
  RefreshCw,
  Info,
  Smartphone,
  KeyRound,
  ShieldAlert,
  ChevronDown
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
import { ImportScannerDialog } from '@/components/single-sheet-import-dialog';
import AssetForm from '@/components/asset-form';
import { enqueueMutation } from '@/offline/queue';
import { addNotification } from '@/hooks/use-notifications';
import type { AppSettings, Grant, SheetDefinition, UXMode, AuthorizedUser } from '@/types/domain';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

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
  const { setTheme } = useTheme();

  const [isSaving, setIsSaving] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isImportScanOpen, setIsImportScanOpen] = useState(false);
  const [isAssetFormOpen, setIsAssetFormOpen] = useState(false);

  // Password Change State
  const [isPassphraseDialogOpen, setIsPassphraseDialogOpen] = useState(false);
  const [newPassphrase, setNewPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');

  const [isColumnSheetOpen, setIsColumnSheetOpen] = useState(false);
  const [selectedSheetDef, setSelectedSheetDef] = useState<SheetDefinition | null>(null);
  const [activeGrantForSchema, setActiveGrantIdForSchema] = useState<string | null>(null);

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

  const handleUpdatePassphrase = async () => {
    if (!appSettings || !userProfile) return;
    if (newPassphrase !== confirmPassphrase) {
      addNotification({ title: "Security Mismatch", description: "Passphrases do not match.", variant: "destructive" });
      return;
    }
    if (newPassphrase.length < 4) {
      addNotification({ title: "Passphrase Too Weak", description: "Minimum 4 characters required.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const nextUsers = appSettings.authorizedUsers.map(u => 
        u.loginName === userProfile.loginName ? { ...u, password: newPassphrase } : u
      );
      
      const updatedSettings = { ...appSettings, authorizedUsers: nextUsers };
      if (isOnline) await FirestoreService.updateSettings({ authorizedUsers: nextUsers });
      await storage.saveSettings(updatedSettings);
      setAppSettings(updatedSettings);
      
      setIsPassphraseDialogOpen(false);
      setNewPassphrase('');
      setConfirmPassphrase('');
      addNotification({ title: "Passphrase Updated", description: "Your security credentials have been rotated.", variant: "success" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSchema = (grantId: string, sheetDef: SheetDefinition) => {
    setActiveGrantIdForSchema(grantId);
    setSelectedSheetDef(sheetDef);
    setIsColumnSheetOpen(true);
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
          
          {/* Security Section */}
          <section>
            <SectionTitle title="Security & Credentials" description="Manage your access passphrase" icon={Lock} />
            <Card className="bg-[#050505] border-white/5 rounded-2xl p-8 shadow-3xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-1">
                  <h4 className="text-sm font-black uppercase text-white">Access Passphrase</h4>
                  <p className="text-[11px] text-white/40 leading-relaxed italic max-w-sm">
                    Rotate your secure login credentials to maintain regional scope integrity.
                  </p>
                </div>
                <Button onClick={() => setIsPassphraseDialogOpen(true)} variant="outline" className="h-12 px-8 rounded-xl border-white/10 text-white font-black uppercase text-[10px] tracking-widest gap-3 hover:bg-white/5">
                  <KeyRound className="h-4 w-4 text-primary" /> Change Passphrase
                </Button>
              </div>
            </Card>
          </section>

          {/* Usage Mode Section */}
          <section>
            <SectionTitle title="Experience Mode" description="Choose your guidance level" icon={GraduationCap} />
            <Card className="bg-[#050505] border-white/5 rounded-2xl p-8 shadow-3xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-2">
                  <h4 className="text-sm font-black uppercase text-white">Usage Mode</h4>
                  <p className="text-[11px] text-white/40 leading-relaxed italic">
                    {appSettings.uxMode === 'beginner' ? "Beginner Mode Active: Full guidance pulse." : "Advanced Mode Active: High-speed auditor interface."}
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

          {/* Global Admin Settings Section */}
          {isAdmin && (
            <section>
              <SectionTitle title="Global Admin" description="Registry authority & lifecycle" icon={ShieldCheck} />
              <Card className="bg-[#050505] border-white/5 rounded-2xl p-8 shadow-3xl">
                <div className="divide-y divide-white/5 space-y-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-1">
                    <div className="space-y-1">
                      <Label className="text-sm font-black uppercase text-white">Application Mode</Label>
                      <p className="text-[10px] text-white/40 italic max-w-sm">
                        {appSettings.appMode === 'management'
                          ? 'Management Pulse: Registry is locked. Only administrators can perform mutations.'
                          : 'Verification Pulse: Field auditors can update status and remarks.'
                        }
                      </p>
                    </div>
                    <Select value={appSettings.appMode} onValueChange={(v) => handleSettingChange('appMode', v as any)}>
                      <SelectTrigger className="w-full sm:w-[200px] h-14 bg-black border-2 border-white/10 rounded-xl font-black uppercase text-[10px] tracking-widest">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-black border-white/10">
                        <SelectItem value="management" className="text-[10px] font-black uppercase">Management</SelectItem>
                        <SelectItem value="verification" className="text-[10px] font-black uppercase">Verification</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between pt-8">
                    <div className="space-y-1">
                      <Label className="text-sm font-black uppercase text-white">Lock Asset List</Label>
                      <p className="text-[10px] text-white/40 italic max-w-sm">Prevent creation or deletion of records in the main list.</p>
                    </div>
                    <Switch 
                      checked={appSettings.lockAssetList} 
                      onCheckedChange={(v) => handleSettingChange('lockAssetList', v)}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                </div>
              </Card>
            </section>
          )}

          {/* Interface Toggles */}
          <section>
            <SectionTitle title="Interface Logic" description="Help & Guidance preferences" icon={Info} />
            <Card className="bg-[#050505] border-white/5 rounded-2xl p-8 shadow-3xl">
              <div className="divide-y divide-white/5 space-y-8">
                <div className="flex items-center justify-between pt-1">
                  <div className="space-y-1">
                    <Label className="text-sm font-black uppercase text-white">Help Tooltips</Label>
                    <p className="text-[10px] text-white/40 italic">Show descriptive popups when hovering over technical controls.</p>
                  </div>
                  <Switch 
                    checked={appSettings.showHelpTooltips} 
                    onCheckedChange={(v) => handleSettingChange('showHelpTooltips', v)}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>

                <div className="flex items-center justify-between pt-8">
                  <div className="space-y-1">
                    <Label className="text-sm font-black uppercase text-white">Reset Onboarding</Label>
                    <p className="text-[10px] text-white/40 italic">Show the Welcome Experience tour again on next login.</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleSettingChange('onboardingComplete', false)} className="h-9 px-4 rounded-xl font-black uppercase text-[9px] tracking-widest border border-white/10 hover:bg-white/5 text-white/60">
                    Reset Pulse
                  </Button>
                </div>
              </div>
            </Card>
          </section>

          {/* Appearance Section */}
          <section>
            <SectionTitle title="Appearance" description="Visual surface & identity" icon={Palette} />
            <Card className="bg-[#050505] border-white/5 rounded-2xl p-8 shadow-3xl">
              <div className="flex flex-wrap gap-4">
                <Button variant={theme === 'light' ? 'secondary' : 'outline'} onClick={() => setTheme('light')} className="flex-1 h-14 rounded-xl font-black uppercase text-[10px] border-2 shadow-lg">
                  <Sun className="h-4 w-4 mr-2" /> Light
                </Button>
                <Button variant={theme === 'dark' ? 'secondary' : 'outline'} onClick={() => setTheme('dark')} className="flex-1 h-14 rounded-xl font-black uppercase text-[10px] border-2 shadow-lg">
                  <Moon className="h-4 w-4 mr-2" /> Dark
                </Button>
              </div>
            </Card>
          </section>
        </TabsContent>

        <TabsContent value="groups" className="m-0 outline-none space-y-10 px-1">
          <div className="space-y-6">
            <h3 className="text-xl font-black uppercase text-white tracking-tight leading-none px-1">Project Management</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input 
                placeholder="New project name..." 
                value={newProjectName} 
                onChange={(e) => setNewProjectName(e.target.value)} 
                className="h-12 bg-black border-white/10 rounded-xl font-medium text-sm text-white" 
              />
              <div className="flex gap-2">
                <Button 
                  onClick={handleAddProject} 
                  disabled={!newProjectName.trim()} 
                  className="h-12 px-6 rounded-xl bg-primary text-black font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl"
                >
                  <PlusCircle className="h-4 w-4" /> Add Project
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setIsImportScanOpen(true)} 
                  className="h-12 px-6 rounded-xl border-white/10 text-white font-black uppercase text-[10px] tracking-widest gap-2 hover:bg-white/5"
                >
                  <ScanSearch className="h-4 w-4 text-primary" /> Scan Workbook Pulse
                </Button>
              </div>
            </div>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {appSettings.grants.map((grant) => (
              <AccordionItem key={grant.id} value={grant.id} className={cn("border-2 rounded-[1.5rem] overflow-hidden bg-black", activeGrantId === grant.id ? "border-primary/40 shadow-2xl" : "border-white/5")}>
                <div className="flex items-center justify-between bg-black pr-6">
                  <AccordionTrigger className="hover:no-underline p-6 border-none flex-1 justify-start gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-black uppercase text-white tracking-tight leading-none">{grant.name}</span>
                      {activeGrantId === grant.id && <Badge className="bg-primary text-black font-black uppercase text-[9px] h-6 px-3 rounded-full">Active</Badge>}
                    </div>
                  </AccordionTrigger>
                  <div className="flex items-center gap-6">
                    {activeGrantId !== grant.id && (
                      <Button variant="outline" size="sm" onClick={() => setActiveGrantId(grant.id)} className="h-9 px-5 rounded-xl border-white/10 font-black text-[10px] uppercase bg-black/40">
                        Set Active
                      </Button>
                    )}
                  </div>
                </div>
                <AccordionContent className="bg-white/[0.02] border-t border-white/5 p-8 space-y-8">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 flex items-center gap-2">
                      <Columns className="h-3 w-3" /> Indexed Sheets / Categories
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.entries(grant.sheetDefinitions || {}).map(([name, def]) => (
                        <div key={name} className="flex items-center justify-between p-4 bg-black/40 border border-white/10 rounded-2xl group transition-all hover:border-primary/20">
                          <span className="text-xs font-black uppercase text-white/80">{name}</span>
                          <div className="flex items-center gap-3 opacity-20 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEditSchema(grant.id, def)} className="p-2 hover:bg-primary/10 hover:text-primary rounded-lg" title="Edit Columns"><Wrench className="h-4 w-4" /></button>
                            <button className="p-2 hover:bg-white/10 rounded-lg" title="Toggle View"><Eye className="h-4 w-4" /></button>
                          </div>
                        </div>
                      ))}
                      {Object.keys(grant.sheetDefinitions || {}).length === 0 && (
                        <div className="col-span-2 py-12 text-center border-2 border-dashed border-white/5 rounded-3xl opacity-20">
                          <p className="text-[10px] font-black uppercase tracking-widest">No definitions staged.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-white/5">
                    <Button onClick={() => setIsAssetFormOpen(true)} className="h-14 rounded-2xl bg-black/40 border border-white/10 text-white font-black uppercase text-[10px] tracking-widest gap-3">
                      <PlusCircle className="h-4 w-4" /> Add Manual Asset
                    </Button>
                    <Button onClick={() => setIsImportScanOpen(true)} className="h-14 rounded-2xl bg-black/40 border border-white/10 text-white font-black uppercase text-[10px] tracking-widest gap-3">
                      <ScanSearch className="h-4 w-4" /> Scan & Import Data Block
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </TabsContent>

        <TabsContent value="users" className="m-0 outline-none px-1">
          <Card className="bg-[#050505] border-white/5 rounded-[2.5rem] p-10 shadow-3xl">
            <UserManagement 
              users={appSettings.authorizedUsers} 
              onUsersChange={newUsers => handleSettingChange('authorizedUsers', newUsers)} 
              adminProfile={userProfile} 
            />
          </Card>
        </TabsContent>

        <TabsContent value="resilience" className="m-0 outline-none px-1">
          <Accordion type="multiple" className="w-full space-y-4">
            <AccordionItem value="error-audit" className="border-2 border-white/5 rounded-[2rem] bg-black/40 overflow-hidden px-6">
              <AccordionTrigger className="hover:no-underline py-6">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-destructive/10 rounded-xl"><HeartPulse className="h-5 w-5 text-destructive" /></div>
                  <div className="text-left"><h4 className="text-sm font-black uppercase text-white">Resilience Audit</h4></div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-8">
                <ErrorAuditWorkstation isEmbedded={true} />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="db-admin" className="border-2 border-white/5 rounded-[2rem] bg-black/40 overflow-hidden px-6">
              <AccordionTrigger className="hover:no-underline py-6">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-primary/10 rounded-xl"><Terminal className="h-5 w-5 text-primary" /></div>
                  <div className="text-left"><h4 className="text-sm font-black uppercase text-white">Database Management</h4></div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-8">
                <DatabaseWorkstation isEmbedded={true} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        <TabsContent value="history" className="m-0 outline-none px-1">
          <AuditLogWorkstation isEmbedded={true} />
        </TabsContent>
      </div>

      <div className="mt-2 pt-10 border-t border-white/5 flex items-center justify-between px-1 shrink-0 pb-10">
        <Button variant="ghost" onClick={() => setActiveView('DASHBOARD')} className="h-14 px-10 rounded-xl bg-[#0A0A0A] text-white/60 font-black uppercase text-[11px] tracking-widest">Cancel</Button>
        <Button onClick={handleCommitAll} className="h-14 px-12 rounded-xl bg-primary text-black font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl">
          Commit Environment Pulse
        </Button>
      </div>

      {/* Security Passphrase Dialog */}
      <Dialog open={isPassphraseDialogOpen} onOpenChange={setIsPassphraseDialogOpen}>
        <DialogContent className="max-w-md rounded-[2rem] border-white/10 bg-black p-0 overflow-hidden shadow-3xl text-white">
          <div className="p-8 border-b border-white/5 bg-white/[0.02]">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-xl"><KeyRound className="h-6 w-6 text-primary" /></div>
                <DialogTitle className="text-2xl font-black uppercase tracking-tight">Access Rotation</DialogTitle>
              </div>
              <DialogDescription className="text-[10px] font-bold uppercase text-white/40 tracking-widest mt-2">Update your regional access passphrase.</DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-primary">New Passphrase</Label>
              <Input type="password" value={newPassphrase} onChange={(e) => setNewPassphrase(e.target.value)} className="h-12 bg-white/5 border-white/10 rounded-xl font-bold" placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Confirm Passphrase</Label>
              <Input type="password" value={confirmPassphrase} onChange={(e) => setConfirmPassphrase(e.target.value)} className="h-12 bg-white/5 border-white/10 rounded-xl font-bold" placeholder="••••••••" />
            </div>
            <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/20 flex items-start gap-3">
              <ShieldAlert className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
              <p className="text-[9px] font-medium text-orange-600/80 leading-relaxed uppercase">Rotate passphrases regularly to maintain high-integrity regional scope protection.</p>
            </div>
          </div>
          <DialogFooter className="p-8 bg-white/[0.02] border-t border-white/5 flex flex-row items-center gap-3">
            <Button variant="ghost" onClick={() => setIsPassphraseDialogOpen(false)} className="flex-1 h-12 font-black uppercase text-[10px] rounded-xl text-white/40">Cancel</Button>
            <Button onClick={handleUpdatePassphrase} disabled={isSaving} className="flex-[2] h-12 rounded-xl bg-primary text-black font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Commit Rotation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AssetForm 
        isOpen={isAssetFormOpen} 
        onOpenChange={setIsAssetFormOpen} 
        isReadOnly={false} 
        onSave={async (a) => { 
          await enqueueMutation('UPDATE', 'assets', a); 
          await refreshRegistry(); 
          setIsAssetFormOpen(false); 
          addNotification({ title: "Record Added", description: "Created new identity pulse.", variant: "success" }); 
        }} 
      />
      <ImportScannerDialog isOpen={isImportScanOpen} onOpenChange={setIsImportScanOpen} />
      
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
    </Tabs>
  );
}
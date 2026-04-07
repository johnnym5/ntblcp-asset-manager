'use client';

/**
 * @fileOverview SettingsWorkstation - Executive Operational Control.
 * Phase 317: Fixed ReferenceErrors (handleCommitAll, originalSheetName).
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
  ChevronDown,
  FolderOpen
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  const { theme, setTheme } = useTheme();

  const [isSaving, setIsSaving] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isImportScanOpen, setIsImportScanOpen] = useState(false);

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
      addNotification({ title: "Passphrase Updated", variant: "success" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSchema = (grantId: string, sheetDef: SheetDefinition) => {
    setActiveGrantIdForSchema(grantId);
    setSelectedSheetDef(sheetDef);
    setIsColumnSheetOpen(true);
  };

  const handleAddSheetManually = () => {
    const newSheet: SheetDefinition = {
      name: 'New Asset Group',
      headers: ['S/N', 'Description', 'Location'],
      displayFields: [
        { key: 'sn', label: 'S/N', table: true, quickView: true },
        { key: 'description', label: 'Description', table: true, quickView: true },
        { key: 'location', label: 'Location', table: true, quickView: true },
        { key: 'status', label: 'Status', table: true, quickView: true },
      ]
    };
    setSelectedSheetDef(newSheet);
    setActiveGrantIdForSchema(activeGrantId);
    setIsColumnSheetOpen(true);
  };

  const handleCommitAll = async () => {
    setIsSaving(true);
    try {
      await refreshRegistry();
      addNotification({ title: "System Synchronized", description: "All storage nodes are in absolute parity.", variant: "success" });
    } finally {
      setIsSaving(false);
    }
  };

  if (!settingsLoaded || !appSettings) return null;

  const SectionTitle = ({ title, description, icon: Icon }: { title: string, description: string, icon: any }) => (
    <div className="space-y-1 px-1 mb-4">
      <div className="flex items-center gap-2.5">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-base font-black uppercase text-white tracking-tight leading-none">{title}</h3>
      </div>
      <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest mt-0.5">{description}</p>
    </div>
  );

  return (
    <Tabs defaultValue="general" className="animate-in fade-in duration-700 h-full flex flex-col relative">
      <div className="sticky top-[-1rem] sm:top-[-2rem] lg:top-[-2.5rem] z-40 bg-[#050505]/95 backdrop-blur-2xl pt-1 pb-3 px-1 border-b border-white/5 mb-2 -mx-1 shrink-0">
        <div className="flex flex-col gap-4 max-w-[1600px] mx-auto w-full">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-xl font-black uppercase text-white tracking-tight leading-none">Settings</h2>
              <p className="text-[9px] font-bold uppercase text-white/40 tracking-widest mt-0.5">Operational Control Hub</p>
            </div>
            <button onClick={() => setActiveView('DASHBOARD')} className="h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all"><X className="h-4 w-4 text-white/40" /></button>
          </div>
          <div className="bg-[#080808] p-0.5 rounded-xl border border-white/5 shadow-inner overflow-x-auto no-scrollbar backdrop-blur-3xl">
            <TabsList className="bg-transparent border-none p-0 h-auto gap-0.5 flex items-center w-full min-max-content">
              <TabsTrigger value="general" className="px-6 py-2 rounded-lg font-black uppercase text-[8px] tracking-widest gap-2 data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-white transition-all"><Settings className="h-3 w-3" /> General</TabsTrigger>
              {isAdmin && <TabsTrigger value="groups" className="px-6 py-2 rounded-lg font-black uppercase text-[8px] tracking-widest gap-2 data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-white transition-all"><LayoutGrid className="h-3 w-3" /> Projects</TabsTrigger>}
              {isAdmin && <TabsTrigger value="users" className="px-6 py-2 rounded-lg font-black uppercase text-[8px] tracking-widest gap-2 data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-white transition-all"><Users className="h-3 w-3" /> Users</TabsTrigger>}
              {isSuperAdmin && <TabsTrigger value="resilience" className="px-6 py-2 rounded-lg font-black uppercase text-[8px] tracking-widest gap-2 data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-white transition-all"><HeartPulse className="h-3 w-3" /> Resilience</TabsTrigger>}
              <TabsTrigger value="history" className="px-6 py-2 rounded-lg font-black uppercase text-[8px] tracking-widest gap-2 data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-white transition-all"><History className="h-3 w-3" /> History</TabsTrigger>
            </TabsList>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 pt-2 overflow-y-auto custom-scrollbar pb-20 px-1">
        <TabsContent value="general" className="space-y-8 m-0 outline-none">
          <section>
            <SectionTitle title="Security" description="Passphrase Management" icon={Lock} />
            <Card className="bg-[#050505] border-white/5 rounded-xl p-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-black uppercase text-white">Access Pulse</h4>
                  <p className="text-[9px] text-white/40 leading-relaxed italic max-w-sm">Rotate login credentials regularly.</p>
                </div>
                <Button onClick={() => setIsPassphraseDialogOpen(true)} variant="outline" className="h-9 px-6 rounded-lg border-white/10 text-white font-black uppercase text-[8px] tracking-widest gap-2 hover:bg-white/5">
                  <KeyRound className="h-3.5 w-3.5 text-primary" /> Change Passphrase
                </Button>
              </div>
            </Card>
          </section>

          <section>
            <SectionTitle title="Experience" description="Interface Guidance" icon={GraduationCap} />
            <Card className="bg-[#050505] border-white/5 rounded-xl p-4 shadow-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase text-white">Usage Mode</h4>
                  <p className="text-[9px] text-white/40 leading-relaxed italic">Switch between beginner guidance and high-speed workstation pulses.</p>
                </div>
                <Select value={appSettings.uxMode} onValueChange={v => handleSettingChange('uxMode', v as UXMode)}>
                  <SelectTrigger className="h-10 rounded-lg bg-black border border-white/10 font-black uppercase text-[9px] tracking-widest">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-white/10 rounded-xl">
                    <SelectItem value="beginner" className="text-[9px] font-black uppercase">Beginner</SelectItem>
                    <SelectItem value="advanced" className="text-[9px] font-black uppercase">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>
          </section>

          <section>
            <SectionTitle title="Appearance" description="Visual Identity" icon={Palette} />
            <Card className="bg-[#050505] border-white/5 rounded-xl p-4 shadow-xl">
              <div className="flex flex-wrap gap-2">
                <Button variant={theme === 'light' ? 'secondary' : 'outline'} onClick={() => setTheme('light')} className="flex-1 h-10 rounded-lg font-black uppercase text-[9px] border shadow-sm">
                  <Sun className="h-3.5 w-3.5 mr-2" /> Light
                </Button>
                <Button variant={theme === 'dark' ? 'secondary' : 'outline'} onClick={() => setTheme('dark')} className="flex-1 h-10 rounded-lg font-black uppercase text-[9px] border shadow-sm">
                  <Moon className="h-3.5 w-3.5 mr-2" /> Dark
                </Button>
              </div>
            </Card>
          </section>
        </TabsContent>

        <TabsContent value="groups" className="m-0 outline-none space-y-8">
          <div className="space-y-4">
            <h3 className="text-lg font-black uppercase text-white tracking-tight leading-none px-1">Project Registry</h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input 
                placeholder="New project label..." 
                value={newProjectName} 
                onChange={(e) => setNewProjectName(e.target.value)} 
                className="h-9 bg-black border-white/10 rounded-lg font-medium text-xs text-white" 
              />
              <div className="flex gap-2">
                <Button onClick={handleAddProject} disabled={!newProjectName.trim()} className="h-9 px-4 rounded-lg bg-primary text-black font-black uppercase text-[8px] tracking-widest gap-2">
                  <PlusCircle className="h-3 w-3" /> Add Project
                </Button>
                <Button variant="outline" onClick={() => setIsImportScanOpen(true)} className="h-9 px-4 rounded-lg border-white/10 text-white font-black uppercase text-[8px] tracking-widest gap-2">
                  <ScanSearch className="h-3.5 w-3.5 text-primary" /> Scan Pulse
                </Button>
              </div>
            </div>
          </div>

          <Accordion type="single" collapsible className="space-y-3">
            {appSettings.grants.map((grant) => (
              <AccordionItem key={grant.id} value={grant.id} className={cn("border-2 rounded-[1.5rem] overflow-hidden bg-black transition-all", activeGrantId === grant.id ? "border-primary/40 shadow-xl" : "border-white/5")}>
                <div className="flex items-center justify-between bg-black pr-4">
                  <AccordionTrigger className="hover:no-underline p-4 border-none flex-1 justify-start gap-3">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-1.5 rounded-lg", activeGrantId === grant.id ? "bg-primary/10 text-primary" : "bg-white/5 text-white/20")}>
                        <FolderOpen className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-black uppercase text-white tracking-tight leading-none">{grant.name}</span>
                      {activeGrantId === grant.id && <Badge className="bg-primary text-black font-black uppercase text-[7px] h-5 px-2 rounded-full">Active</Badge>}
                    </div>
                  </AccordionTrigger>
                  <div className="flex items-center gap-4">
                    {activeGrantId !== grant.id && (
                      <button onClick={() => setActiveGrantId(grant.id)} className="text-[9px] font-black uppercase tracking-widest text-primary hover:opacity-80 transition-all">Activate</button>
                    )}
                    <button className="text-[9px] font-black uppercase tracking-widest text-white/20 hover:text-white">Rename</button>
                  </div>
                </div>
                <AccordionContent className="bg-white/[0.02] border-t border-white/5 p-6 space-y-8 animate-in slide-in-from-top-2 duration-500">
                  <div className="space-y-4">
                    <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 flex items-center gap-2">
                      <Columns className="h-3 w-3" /> Schema Definitions
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {Object.entries(grant.sheetDefinitions || {}).map(([name, def]) => (
                        <div key={name} className="flex items-center justify-between p-4 bg-black/40 border border-white/10 rounded-xl group transition-all hover:border-primary/20 shadow-inner">
                          <span className="text-[10px] font-black uppercase text-white/80 truncate pr-4">{name}</span>
                          <div className="flex items-center gap-2 opacity-20 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEditSchema(grant.id, def)} className="p-1.5 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"><Wrench className="h-3.5 w-3.5" /></button>
                            <button className="p-1.5 hover:bg-red-600/10 hover:text-red-600 rounded-lg transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t border-white/5">
                    <Button variant="outline" onClick={handleAddSheetManually} className="flex-1 h-10 rounded-xl bg-white/[0.02] border-white/10 font-black uppercase text-[8px] tracking-widest gap-2 hover:bg-white/5 text-white/80">
                      <PlusCircle className="h-3 w-3" /> Add Manually
                    </Button>
                    <Button variant="outline" className="flex-1 h-10 rounded-xl bg-white/[0.02] border-white/10 font-black uppercase text-[8px] tracking-widest gap-2 hover:bg-white/5 text-white/80">
                      <FileUp className="h-3 w-3" /> Import Template
                    </Button>
                    <Button variant="outline" onClick={() => setIsImportScanOpen(true)} className="flex-1 h-10 rounded-xl bg-white/[0.02] border-white/10 font-black uppercase text-[8px] tracking-widest gap-2 hover:bg-white/5 text-white/80">
                      <ScanSearch className="h-3 w-3 text-primary" /> Scan & Import Data
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </TabsContent>

        <TabsContent value="users" className="m-0 outline-none">
          <Card className="bg-[#050505] border-white/5 rounded-2xl p-5 shadow-xl">
            <UserManagement 
              users={appSettings.authorizedUsers} 
              onUsersChange={newUsers => handleSettingChange('authorizedUsers', newUsers)} 
              adminProfile={userProfile} 
            />
          </Card>
        </TabsContent>

        <TabsContent value="resilience" className="m-0 outline-none space-y-8">
          <DatabaseWorkstation isEmbedded={true} />
          <ErrorAuditWorkstation isEmbedded={true} />
        </TabsContent>

        <TabsContent value="history" className="m-0 outline-none">
          <AuditLogWorkstation isEmbedded={true} />
        </TabsContent>
      </div>

      <div className="mt-2 pt-4 border-t border-white/5 flex items-center justify-between px-1 shrink-0 pb-10">
        <Button variant="ghost" onClick={() => setActiveView('DASHBOARD')} className="h-10 px-8 rounded-lg bg-[#0A0A0A] text-white/60 font-black uppercase text-[9px] tracking-widest">Dismiss</Button>
        <Button onClick={handleCommitAll} className="h-10 px-10 rounded-lg bg-primary text-black font-black uppercase text-[9px] tracking-[0.2em] shadow-xl transition-all hover:scale-105 active:scale-95">
          Establish Parity
        </Button>
      </div>

      <Dialog open={isPassphraseDialogOpen} onOpenChange={setIsPassphraseDialogOpen}>
        <DialogContent className="max-w-xs rounded-2xl border-white/10 bg-black p-0 overflow-hidden shadow-3xl text-white">
          <div className="p-6 border-b border-white/5 bg-white/[0.02]">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary/10 rounded-lg"><KeyRound className="h-4 w-4 text-primary" /></div>
                <DialogTitle className="text-lg font-black uppercase tracking-tight">Access Rotation</DialogTitle>
              </div>
            </DialogHeader>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-1">
              <Label className="text-[8px] font-black uppercase tracking-widest text-primary">New Passphrase</Label>
              <Input type="password" value={newPassphrase} onChange={(e) => setNewPassphrase(e.target.value)} className="h-9 bg-white/5 border-white/10 rounded-lg font-bold text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[8px] font-black uppercase tracking-widest text-primary">Confirm Passphrase</Label>
              <Input type="password" value={confirmPassphrase} onChange={(e) => setConfirmPassphrase(e.target.value)} className="h-9 bg-white/5 border-white/10 rounded-lg font-bold text-xs" />
            </div>
          </div>
          <DialogFooter className="p-6 bg-white/[0.02] border-t border-white/5 flex flex-row items-center gap-2">
            <Button variant="ghost" onClick={() => setIsPassphraseDialogOpen(false)} className="flex-1 h-9 font-black uppercase text-[8px] rounded-lg text-white/40">Cancel</Button>
            <Button onClick={handleUpdatePassphrase} disabled={isSaving} className="flex-[2] h-9 rounded-lg bg-primary text-black font-black uppercase text-[8px] tracking-widest">
              {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />} Commit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportScannerDialog isOpen={isImportScanOpen} onOpenChange={setIsImportScanOpen} />
      
      {selectedSheetDef && (
        <ColumnCustomizationSheet 
          isOpen={isColumnSheetOpen}
          onOpenChange={setIsColumnSheetOpen}
          sheetDefinition={selectedSheetDef}
          originalSheetName={selectedSheetDef.name}
          onSave={(orig, newDef, all) => {
            const updatedGrants = appSettings.grants.map(grant => {
              if (grant.id === activeGrantId) {
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

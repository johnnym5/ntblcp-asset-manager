'use client';

/**
 * @fileOverview Settings - Main Operational Control Center.
 * Simplified for deployment with standard Asset Management language.
 * Phase 1800: Fixed TabsContent error by ensuring Tabs root is correctly placed.
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from 'next-themes';
import { 
  Settings as SettingsIcon, 
  Palette, 
  Users, 
  PlusCircle,
  Wrench,
  X,
  Loader2,
  CheckCircle2,
  Lock,
  Sun,
  Moon,
  LayoutGrid,
  FileUp,
  ScanSearch,
  ChevronsUpDown,
  Smartphone,
  KeyRound,
  ShieldCheck as ShieldIcon,
  FileText,
  FolderOpen,
  ClipboardCheck,
  RefreshCw,
  Info,
  HeartPulse,
  Database,
  Truck,
  Hash,
  SortAsc,
  Trash2,
  Eye,
  FileDown,
  Check,
  Activity,
  History
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { UserManagement } from '@/components/admin/user-management';
import { FirestoreService } from '@/services/firebase/firestore';
import { storage } from '@/offline/storage';
import { cn } from '@/lib/utils';
import { ColumnCustomizationSheet } from '@/components/column-customization-sheet';
import { AuditLogWorkstation } from './AuditLogWorkstation';
import { ErrorAuditWorkstation } from './ErrorAuditWorkstation';
import { DatabaseWorkstation } from './DatabaseWorkstation';
import { parseExcelForTemplate } from '@/lib/excel-parser';
import { addNotification } from '@/hooks/use-notifications';
import { enqueueMutation } from '@/offline/queue';
import type { AppSettings, Grant, SheetDefinition, Asset } from '@/types/domain';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

export function SettingsWorkstation() {
  const { 
    appSettings, 
    setAppSettings, 
    refreshRegistry, 
    isOnline, 
    settingsLoaded,
    setActiveView,
    activeGrantIds,
    assets,
    isSyncing 
  } = useAppState();
  
  const { userProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const [isSaving, setIsSaving] = useState(false);
  const [isPatching, setIsPatching] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editProjectValue, setEditProjectValue] = useState('');
  const [draftSettings, setDraftSettings] = useState<AppSettings | null>(null);
  
  // Passcode Manager State
  const [currentPasscode, setCurrentPasscode] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [isUpdatingPasscode, setIsUpdatingPasscode] = useState(false);

  const [isColumnSheetOpen, setIsColumnSheetOpen] = useState(false);
  const [selectedSheetDef, setSelectedSheetDef] = useState<SheetDefinition | null>(null);
  const [originalSheetName, setOriginalSheetName] = useState<string | null>(null);
  const [activeGrantIdForSchema, setActiveGrantIdForSchema] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // RBAC Gating
  const isSuperAdmin = userProfile?.role === 'SUPERADMIN';
  const isAdmin = userProfile?.role === 'ADMIN' || isSuperAdmin;

  useEffect(() => {
    if (appSettings) {
      setDraftSettings(JSON.parse(JSON.stringify(appSettings)));
    }
  }, [appSettings]);

  const hasChanges = useMemo(() => {
    if (!appSettings || !draftSettings) return false;
    return JSON.stringify(appSettings) !== JSON.stringify(draftSettings);
  }, [appSettings, draftSettings]);

  const handleSettingChange = (key: keyof AppSettings, value: any) => {
    if (!draftSettings) return;
    setDraftSettings(prev => prev ? ({ ...prev, [key]: value }) : null);
  };

  const handleSaveChange = async () => {
    if (!draftSettings) return;
    setIsSaving(true);
    try {
      const updatedSettings = { ...draftSettings };
      if (isOnline) await FirestoreService.updateSettings(updatedSettings);
      await storage.saveSettings(updatedSettings);
      setAppSettings(updatedSettings);
      await refreshRegistry();
      addNotification({ title: `Settings Saved Successfully`, variant: "success" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePasscode = async () => {
    if (newPasscode !== confirmPasscode) {
      toast({ variant: "destructive", title: "Passcodes Match Failure", description: "The new passcodes do not match." });
      return;
    }
    if (newPasscode.length < 4) {
      toast({ variant: "destructive", title: "Passcode Too Short", description: "Minimum 4 characters required." });
      return;
    }

    setIsUpdatingPasscode(true);
    try {
      // Find the user in settings and update
      if (!draftSettings) return;
      const updatedUsers = draftSettings.authorizedUsers.map(u => {
        if (u.loginName === userProfile?.loginName) {
          return { ...u, password: newPasscode };
        }
        return u;
      });
      
      const updatedSettings = { ...draftSettings, authorizedUsers: updatedUsers };
      if (isOnline) await FirestoreService.updateSettings(updatedSettings);
      await storage.saveSettings(updatedSettings);
      setAppSettings(updatedSettings);
      
      toast({ title: "Passcode Updated", description: "Your system access credentials have been changed." });
      setCurrentPasscode('');
      setNewPasscode('');
      setConfirmPasscode('');
    } catch (e) {
      toast({ variant: "destructive", title: "Update Failed" });
    } finally {
      setIsUpdatingPasscode(false);
    }
  };

  const handleAddProject = () => {
    if (!newProjectName.trim() || !draftSettings) return;
    const newGrant: Grant = { 
      id: crypto.randomUUID(), 
      name: newProjectName.trim(), 
      enabledSheets: [], 
      sheetDefinitions: {} 
    };
    handleSettingChange('grants', [...draftSettings.grants, newGrant]);
    setNewProjectName('');
  };

  const toggleProject = (id: string, enabled: boolean) => {
    if (!draftSettings) return;
    const current = draftSettings.activeGrantIds || [];
    const next = enabled 
      ? [...current, id]
      : current.filter(cid => cid !== id);
    handleSettingChange('activeGrantIds', next);
  };

  const handleImportTemplate = () => {
    fileInputRef.current?.click();
  };

  const handleFileImportTemplate = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!draftSettings) return;
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const templates = await parseExcelForTemplate(file);
      const targetId = draftSettings.activeGrantIds[0] || draftSettings.grants[0]?.id;
      if (!targetId) return;

      const activeGrantIdx = draftSettings.grants.findIndex(g => g.id === targetId);
      if (activeGrantIdx === -1) return;

      const nextGrant = { ...draftSettings.grants[activeGrantIdx] };
      const nextSheetDefs = { ...nextGrant.sheetDefinitions };
      templates.forEach(t => { nextSheetDefs[t.name] = t; });
      nextGrant.sheetDefinitions = nextSheetDefs;
      
      const nextGrants = [...draftSettings.grants];
      nextGrants[activeGrantIdx] = nextGrant;
      handleSettingChange('grants', nextGrants);
      toast({ title: 'Templates Imported', description: `${templates.length} sheet definitions identified.` });
    } catch (error) {
      toast({ title: 'Import Failed', description: (error as Error).message, variant: 'destructive' });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!settingsLoaded || !draftSettings) return null;

  const SettingSection = ({ title, description, icon: Icon, children }: { title: string, description: string, icon: any, children: React.ReactNode }) => (
    <div className="space-y-4">
      <div className="flex items-center gap-3 px-1">
        <div className="p-2 bg-primary/10 rounded-xl"><Icon className="h-4 w-4 text-primary" /></div>
        <div className="space-y-0.5">
          <h3 className="text-sm font-black uppercase text-foreground tracking-tight leading-none">{title}</h3>
          <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-none">{description}</p>
        </div>
      </div>
      <Card className="bg-card border-border rounded-[1.5rem] overflow-hidden shadow-xl">
        <CardContent className="p-6 space-y-6">
          {children}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-background">
      <Tabs defaultValue="general" className="flex-1 flex flex-col min-h-0">
        <div className="px-1 mb-6 shrink-0">
          <TabsList className="bg-muted/30 p-1.5 rounded-2xl h-auto flex flex-wrap gap-2 border-2 border-border/40 w-fit">
            <TabsTrigger value="general" className="px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-primary data-[state=active]:text-black shadow-sm">
              <SettingsIcon className="h-3.5 w-3.5" /> General
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="projects" className="px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-primary data-[state=active]:text-black shadow-sm">
                <LayoutGrid className="h-3.5 w-3.5" /> Project Scope
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="users" className="px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-primary data-[state=active]:text-black shadow-sm">
                <Users className="h-3.5 w-3.5" /> Personnel
              </TabsTrigger>
            )}
            <TabsTrigger value="history" className="px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-primary data-[state=active]:text-black shadow-sm">
              <History className="h-3.5 w-3.5" /> History
            </TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger value="health" className="px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-primary data-[state=active]:text-black shadow-sm">
                <HeartPulse className="h-3.5 w-3.5" /> System Health
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <ScrollArea className="flex-1 px-1">
          <div className="pb-40">
            <TabsContent value="general" className="space-y-10 m-0 outline-none">
              <SettingSection title="Visual Identity" description="Appearance settings" icon={Palette}>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant={theme === 'light' ? 'default' : 'outline'} onClick={() => setTheme('light')} className="h-14 rounded-xl font-black uppercase text-[10px] gap-3">
                    <Sun className="h-4 w-4" /> Light Mode
                  </Button>
                  <Button variant={theme === 'dark' ? 'default' : 'outline'} onClick={() => setTheme('dark')} className="h-14 rounded-xl font-black uppercase text-[10px] gap-3">
                    <Moon className="h-4 w-4" /> Dark Mode
                  </Button>
                </div>
              </SettingSection>

              <SettingSection title="My Security" description="Passcode management" icon={KeyRound}>
                <div className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">New System Passcode</Label>
                    <Input type="password" value={newPasscode} onChange={(e) => setNewPasscode(e.target.value)} placeholder="Minimum 4 characters" className="h-12 bg-muted/20 border-border rounded-xl font-bold" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Confirm Passcode</Label>
                    <Input type="password" value={confirmPasscode} onChange={(e) => setConfirmPasscode(e.target.value)} placeholder="Repeat new passcode" className="h-12 bg-muted/20 border-border rounded-xl font-bold" />
                  </div>
                  <Button 
                    onClick={handleUpdatePasscode} 
                    disabled={isUpdatingPasscode || !newPasscode} 
                    className="w-full h-14 rounded-xl bg-primary text-black font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20"
                  >
                    {isUpdatingPasscode ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldIcon className="h-4 w-4 mr-2" />}
                    Change My Passcode
                  </Button>
                </div>
              </SettingSection>

              {isAdmin && (
                <SettingSection title="Registry Mode" description="Operational logic" icon={Smartphone}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { id: 'management', label: 'Registry Admin', desc: 'Full governance and data engineering system.' },
                      { id: 'verification', label: 'Field Assessment', desc: 'Optimized for mobile auditors and reporting.' }
                    ].map(m => (
                      <button 
                        key={m.id}
                        onClick={() => handleSettingChange('appMode', m.id)}
                        className={cn(
                          "p-6 rounded-2xl border-2 text-left transition-all relative group",
                          draftSettings.appMode === m.id ? "border-primary bg-primary/[0.03]" : "border-border bg-muted/20"
                        )}
                      >
                        {draftSettings.appMode === m.id && <CheckCircle2 className="absolute top-4 right-4 h-4 w-4 text-primary" />}
                        <h4 className="text-sm font-black uppercase text-foreground mb-1 group-hover:text-primary transition-colors">{m.label}</h4>
                        <p className="text-[10px] font-medium text-muted-foreground italic">{m.desc}</p>
                      </button>
                    ))}
                  </div>
                </SettingSection>
              )}
            </TabsContent>

            <TabsContent value="projects" className="space-y-10 m-0 outline-none">
              <SettingSection title="Project Scope" description="Multi-Project enablement" icon={LayoutGrid}>
                <div className="space-y-8">
                  <div className="flex gap-3">
                    <Input placeholder="New project label..." value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} className="h-14 bg-background border-border rounded-xl font-bold text-sm" />
                    <Button onClick={handleAddProject} disabled={!newProjectName.trim()} className="h-14 px-8 rounded-xl bg-primary text-black font-black uppercase text-[10px] tracking-widest shadow-lg">Create Project</Button>
                  </div>

                  <div className="space-y-4">
                    {draftSettings.grants.map((grant) => {
                      const isActive = draftSettings.activeGrantIds?.includes(grant.id);
                      return (
                        <Card key={grant.id} className={cn("border-2 rounded-2xl overflow-hidden transition-all", isActive ? "border-primary bg-primary/[0.02] shadow-xl" : "border-border bg-muted/10")}>
                          <div className="p-6 flex items-center justify-between group">
                            <div className="flex items-center gap-4 flex-1">
                              <div className={cn("p-2 rounded-lg", isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}><FolderOpen className="h-5 w-5" /></div>
                              <div className="flex flex-col min-w-0">
                                <h4 className="text-base font-black uppercase text-foreground truncate">{grant.name}</h4>
                                <span className="text-[8px] font-mono opacity-40 uppercase mt-1">ID: {grant.id.split('-')[0]}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 pr-6 border-r border-border/40">
                              <span className="text-[9px] font-black uppercase text-muted-foreground opacity-60">Enabled</span>
                              <Checkbox checked={isActive} onCheckedChange={(checked) => toggleProject(grant.id, !!checked)} className="h-6 w-6 rounded-lg border-2 border-border data-[state=checked]:bg-primary" />
                            </div>
                          </div>
                          {isActive && (
                            <div className="px-6 pb-8 pt-2 space-y-6 border-t border-dashed border-border/40 animate-in fade-in">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {Object.entries(grant.sheetDefinitions || {}).map(([name, def]) => (
                                  <div key={name} className="flex items-center justify-between p-4 bg-background border border-border rounded-xl group/folder hover:border-primary/20 transition-all">
                                    <span className="text-[11px] font-black uppercase text-foreground/80 truncate pr-4">{name}</span>
                                    <Button variant="ghost" size="icon" onClick={() => { setSelectedSheetDef(def); setOriginalSheetName(name); setActiveGrantIdForSchema(grant.id); setIsColumnSheetOpen(true); }} className="h-8 w-8 rounded-lg text-primary opacity-20 group-hover/folder:opacity-100"><Wrench className="h-3.5 w-3.5" /></Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </SettingSection>
            </TabsContent>

            <TabsContent value="users" className="m-0 outline-none">
              <SettingSection title="Personnel directory" description="System access management" icon={Users}>
                <UserManagement users={draftSettings.authorizedUsers} onUsersChange={newUsers => handleSettingChange('authorizedUsers', newUsers)} adminProfile={userProfile} />
              </SettingSection>
            </TabsContent>

            <TabsContent value="history" className="m-0 outline-none">
              <AuditLogWorkstation isEmbedded={true} />
            </TabsContent>

            <TabsContent value="health" className="m-0 outline-none space-y-10">
              <DatabaseWorkstation isEmbedded={true} />
              <ErrorAuditWorkstation isEmbedded={true} />
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>

      <div className="sticky bottom-0 bg-background/95 backdrop-blur-xl pt-4 pb-10 px-1 border-t border-border flex items-center justify-between shrink-0 z-50">
        <Button variant="ghost" onClick={() => setActiveView('DASHBOARD')} className="h-12 px-10 rounded-xl font-black uppercase text-[10px] text-muted-foreground hover:text-foreground">Exit Settings</Button>
        <Button onClick={handleSaveChange} disabled={!hasChanges || isSaving} className="h-14 px-12 rounded-xl bg-primary text-black font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 gap-3 transition-transform active:scale-95">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldIcon className="h-4 w-4" />}
          Apply Global Settings
        </Button>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileImportTemplate} className="hidden" accept=".xlsx,.xls" />

      {selectedSheetDef && (
        <ColumnCustomizationSheet 
          isOpen={isColumnSheetOpen}
          onOpenChange={setIsColumnSheetOpen}
          sheetDefinition={selectedSheetDef}
          originalSheetName={originalSheetName}
          onSave={(orig, newDef, all) => {
            if (!activeGrantIdForSchema || !draftSettings) return;
            const updatedGrants = draftSettings.grants.map(grant => {
              if (grant.id === activeGrantIdForSchema) {
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
    </div>
  );
}

'use client';

/**
 * @fileOverview SettingsWorkstation - Control Center.
 * Cleaned naming and simplified workflows.
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
  Zap,
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
  Info
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
import { parseExcelForTemplate } from '@/lib/excel-parser';
import { addNotification } from '@/hooks/use-notifications';
import type { AppSettings, Grant, SheetDefinition } from '@/types/domain';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  const [isSaving, setIsSaving] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [draftSettings, setDraftSettings] = useState<AppSettings | null>(null);
  
  const [isColumnSheetOpen, setIsColumnSheetOpen] = useState(false);
  const [selectedSheetDef, setSelectedSheetDef] = useState<SheetDefinition | null>(null);
  const [originalSheetName, setOriginalSheetName] = useState<string | null>(null);
  const [activeGrantIdForSchema, setActiveGrantIdForSchema] = useState<string | null>(null);

  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPERADMIN';
  const isSuperAdmin = userProfile?.role === 'SUPERADMIN';

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
    setDraftSettings({ ...draftSettings, [key]: value });
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
      addNotification({ title: `Settings Saved`, variant: "success" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateMyPassword = async () => {
    if (!newPassword || newPassword.length < 4) {
      toast({ variant: "destructive", title: "Security Alert", description: "Password must be at least 4 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Password Mismatch", description: "Passwords do not match." });
      return;
    }

    if (!draftSettings || !userProfile) return;

    const updatedUsers = draftSettings.authorizedUsers.map(u => {
      if (u.loginName === userProfile.loginName) {
        return { ...u, password: newPassword };
      }
      return u;
    });

    handleSettingChange('authorizedUsers', updatedUsers);
    setIsPasswordDialogOpen(false);
    setNewPassword('');
    setConfirmPassword('');
    addNotification({ title: "Password Staged", description: "Save changes to finalize.", variant: "success" });
  };

  const handleAddProject = () => {
    if (!newProjectName.trim() || !draftSettings) return;
    const newGrant: Grant = { id: crypto.randomUUID(), name: newProjectName.trim(), enabledSheets: [], sheetDefinitions: {} };
    handleSettingChange('grants', [...draftSettings.grants, newGrant]);
    setNewProjectName('');
  };

  const handleEditSchema = (grantId: string, sheetDef: SheetDefinition) => {
    setActiveGrantIdForSchema(grantId);
    setSelectedSheetDef(sheetDef);
    setOriginalSheetName(sheetDef.name);
    setIsColumnSheetOpen(true);
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!draftSettings || !activeGrantId) return;
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const templates = await parseExcelForTemplate(file);
      const activeGrant = draftSettings.grants.find(g => g.id === activeGrantId);
      if (!activeGrant) return;

      const nextSheetDefs = { ...activeGrant.sheetDefinitions };
      templates.forEach(t => {
        nextSheetDefs[t.name] = t;
      });

      const updatedGrants = draftSettings.grants.map(g => 
        g.id === activeGrantId ? { ...g, sheetDefinitions: nextSheetDefs } : g
      );

      const nextSettings = { ...draftSettings, grants: updatedGrants };
      setDraftSettings(nextSettings);

      addNotification({ title: 'Template Added', description: `${templates.length} categories staged.` });
    } catch (error) {
      addNotification({ title: 'Import Failed', description: (error as Error).message, variant: 'destructive' });
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
    <Tabs defaultValue="general" className="animate-in fade-in duration-700 h-full flex flex-col relative max-w-6xl mx-auto w-full">
      <div className="sticky top-[-1rem] sm:top-[-2rem] lg:top-[-2.5rem] z-40 bg-background/95 backdrop-blur-2xl pt-1 pb-3 px-1 border-b border-border mb-6 -mx-1 shrink-0">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl shadow-inner"><SettingsIcon className="h-5 w-5 text-primary" /></div>
              <div className="space-y-0.5">
                <h2 className="text-xl font-black uppercase text-foreground tracking-tight leading-none">Settings</h2>
                <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Application Setup</p>
              </div>
            </div>
            <button onClick={() => setActiveView('DASHBOARD')} className="h-10 w-10 flex items-center justify-center bg-muted/50 hover:bg-muted border border-border rounded-xl transition-all"><X className="h-5 w-5 text-muted-foreground" /></button>
          </div>
          <div className="bg-muted/30 p-0.5 rounded-xl border border-border shadow-inner flex overflow-x-auto no-scrollbar">
            <TabsList className="bg-transparent border-none p-0 h-auto gap-0.5 flex items-center min-w-max">
              <TabsTrigger value="general" className="px-6 py-2 rounded-lg font-black uppercase text-[8px] tracking-widest gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground transition-all">General</TabsTrigger>
              {isAdmin && <TabsTrigger value="groups" className="px-6 py-2 rounded-lg font-black uppercase text-[8px] tracking-widest gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground transition-all">Projects</TabsTrigger>}
              {isAdmin && <TabsTrigger value="users" className="px-6 py-2 rounded-lg font-black uppercase text-[8px] tracking-widest gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground transition-all">Users</TabsTrigger>}
              {isAdmin && <TabsTrigger value="history" className="px-6 py-2 rounded-lg font-black uppercase text-[8px] tracking-widest gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground transition-all">History</TabsTrigger>}
              {isSuperAdmin && <TabsTrigger value="health" className="px-6 py-2 rounded-lg font-black uppercase text-[8px] tracking-widest gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground transition-all">System Health</TabsTrigger>}
            </TabsList>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-1">
        <TabsContent value="general" className="space-y-10 m-0 outline-none pb-20">
          <SettingSection title="Appearance" description="Visual themes" icon={Palette}>
            <div className="grid grid-cols-2 gap-3">
              <Button variant={theme === 'light' ? 'default' : 'outline'} onClick={() => setTheme('light')} className="h-14 rounded-xl font-black uppercase text-[10px] gap-3">
                <Sun className="h-4 w-4" /> Light Mode
              </Button>
              <Button variant={theme === 'dark' ? 'default' : 'outline'} onClick={() => setTheme('dark')} className="h-14 rounded-xl font-black uppercase text-[10px] gap-3">
                <Moon className="h-4 w-4" /> Dark Mode
              </Button>
            </div>
          </SettingSection>

          <SettingSection title="Security" description="Password Management" icon={KeyRound}>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border">
                <div className="space-y-0.5">
                  <Label className="text-xs font-black uppercase tracking-tight">Your Password</Label>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60 italic">Update your login credentials.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsPasswordDialogOpen(true)} className="h-10 px-6 rounded-xl font-black uppercase text-[9px] border-2">Change Password</Button>
              </div>

              {isAdmin && (
                <div className="flex items-center justify-between p-4 rounded-2xl bg-primary/5 border border-primary/10">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-black uppercase tracking-tight text-primary">Global User Management</Label>
                    <p className="text-[9px] font-bold text-primary/60 uppercase italic">Manage passwords for all users.</p>
                  </div>
                  <TabsList className="bg-transparent h-auto p-0 border-none">
                    <TabsTrigger value="users" className="h-10 px-6 rounded-xl font-black uppercase text-[9px] bg-primary text-black shadow-lg">Manage Users</TabsTrigger>
                  </TabsList>
                </div>
              )}
            </div>
          </SettingSection>

          <SettingSection title="App Mode" description="Workstation Logic" icon={Smartphone}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button 
                onClick={() => handleSettingChange('appMode', 'management')}
                className={cn("p-6 rounded-2xl border-2 text-left transition-all", draftSettings.appMode === 'management' ? "border-primary bg-primary/5 shadow-lg" : "border-border bg-muted/20")}
              >
                <ShieldIcon className={cn("h-5 w-5 mb-4", draftSettings.appMode === 'management' ? "text-primary" : "text-muted-foreground")} />
                <h4 className="text-sm font-black uppercase text-foreground mb-1">Management</h4>
                <p className="text-[10px] font-medium text-muted-foreground italic">Full Registry Control.</p>
              </button>

              <button 
                onClick={() => handleSettingChange('appMode', 'verification')}
                className={cn("p-6 rounded-2xl border-2 text-left transition-all", draftSettings.appMode === 'verification' ? "border-green-500 bg-green-500/5 shadow-lg" : "border-border bg-muted/20")}
              >
                <ClipboardCheck className={cn("h-5 w-5 mb-4", draftSettings.appMode === 'verification' ? "text-green-500" : "text-muted-foreground")} />
                <h4 className="text-sm font-black uppercase text-foreground mb-1">Verification</h4>
                <p className="text-[10px] font-medium text-muted-foreground italic">Field Audit Mode.</p>
              </button>

              <button 
                onClick={() => handleSettingChange('appMode', 'reporting')}
                className={cn("p-6 rounded-2xl border-2 text-left transition-all", draftSettings.appMode === 'reporting' ? "border-blue-500 bg-blue-500/5 shadow-lg" : "border-border bg-muted/20")}
              >
                <FileText className={cn("h-5 w-5 mb-4", draftSettings.appMode === 'reporting' ? "text-blue-500" : "text-muted-foreground")} />
                <h4 className="text-sm font-black uppercase text-foreground mb-1">Reporting</h4>
                <p className="text-[10px] font-medium text-muted-foreground italic">Document Extraction.</p>
              </button>
            </div>
          </SettingSection>

          <SettingSection title="Registry Rules" description="Access Restrictions" icon={Lock}>
            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border">
              <div className="space-y-0.5">
                <Label className="text-xs font-black uppercase tracking-tight">Lock Asset List</Label>
                <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Prevent unauthorized additions/deletions.</p>
              </div>
              <Switch checked={draftSettings.lockAssetList} onCheckedChange={(v) => handleSettingChange('lockAssetList', v)} />
            </div>
          </SettingSection>
        </TabsContent>

        <TabsContent value="groups" className="m-0 outline-none pb-20">
          <SettingSection title="Projects" description="Authorized Registers" icon={LayoutGrid}>
            <div className="space-y-6">
              <div className="flex gap-2">
                <Input placeholder="New project name..." value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} className="h-12 bg-background border-border rounded-xl font-bold text-sm" />
                <Button onClick={handleAddProject} disabled={!newProjectName.trim()} className="h-12 px-8 rounded-xl bg-primary text-black font-black uppercase text-[10px] tracking-widest shadow-lg">Add Project</Button>
              </div>

              <div className="space-y-3">
                {draftSettings.grants.map((grant) => (
                  <Card key={grant.id} className={cn("border-2 rounded-2xl overflow-hidden transition-all", activeGrantId === grant.id ? "border-primary bg-primary/[0.02]" : "border-border bg-muted/10")}>
                    <div className="p-5 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <FolderOpen className={cn("h-5 w-5", activeGrantId === grant.id ? "text-primary" : "text-muted")} />
                        <h4 className="text-base font-black uppercase text-foreground leading-none">{grant.name}</h4>
                      </div>
                      {activeGrantId !== grant.id && (
                        <Button variant="outline" size="sm" onClick={() => setActiveGrantId(grant.id)} className="h-8 rounded-lg font-black uppercase text-[8px] border-2">Set Active</Button>
                      )}
                    </div>
                    {activeGrantId === grant.id && (
                      <div className="px-5 pb-5 pt-2 border-t border-dashed border-border space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {Object.entries(grant.sheetDefinitions || {}).map(([name, def]) => (
                            <div key={name} className="flex items-center justify-between p-3 bg-background border border-border rounded-xl">
                              <span className="text-[9px] font-black uppercase text-muted-foreground">{name}</span>
                              <button onClick={() => handleEditSchema(grant.id, def)} className="p-1.5 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"><Wrench className="h-3.5 w-3.5" /></button>
                            </div>
                          ))}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="w-full h-10 rounded-xl bg-muted/50 border-border font-black uppercase text-[8px] gap-2">
                          <FileUp className="h-3.5 w-3.5" /> Import Template
                        </Button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          </SettingSection>
        </TabsContent>

        <TabsContent value="users" className="m-0 outline-none pb-20">
          <SettingSection title="User Management" description="Auditors & Access" icon={Users}>
            <UserManagement users={draftSettings.authorizedUsers} onUsersChange={newUsers => handleSettingChange('authorizedUsers', newUsers)} adminProfile={userProfile} />
          </SettingSection>
        </TabsContent>

        <TabsContent value="history" className="m-0 outline-none pb-20">
          <AuditLogWorkstation isEmbedded={true} />
        </TabsContent>

        <TabsContent value="health" className="m-0 outline-none space-y-10 pb-20">
          <DatabaseWorkstation isEmbedded={true} />
          <ErrorAuditWorkstation isEmbedded={true} />
        </TabsContent>
      </div>

      <div className="sticky bottom-0 bg-background/95 backdrop-blur-xl pt-4 pb-10 px-1 border-t border-border flex items-center justify-between shrink-0">
        <Button variant="ghost" onClick={() => setActiveView('DASHBOARD')} className="h-12 px-10 rounded-xl font-black uppercase text-[10px] text-muted-foreground hover:text-foreground">Cancel</Button>
        <Button onClick={handleSaveChange} disabled={!hasChanges || isSaving} className="h-14 px-12 rounded-xl bg-primary text-black font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-3" /> : <ShieldIcon className="h-4 w-4 mr-3" />}
          Save Changes
        </Button>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept=".xlsx,.xls" />
      
      {selectedSheetDef && (
        <ColumnCustomizationSheet 
          isOpen={isColumnSheetOpen}
          onOpenChange={setIsColumnSheetOpen}
          sheetDefinition={selectedSheetDef}
          originalSheetName={originalSheetName}
          onSave={(orig, newDef, all) => {
            if (!draftSettings) return;
            const updatedGrants = draftSettings.grants.map(grant => {
              if (grant.id === activeGrantIdForSchema) {
                const newSheetDefs = { ...grant.sheetDefinitions };
                if (all) Object.keys(newSheetDefs).forEach(k => { newSheetDefs[k] = { ...newDef, name: k }; });
                else { newSheetDefs[newDef.name] = newDef; if (orig && orig !== newDef.name) delete newSheetDefs[orig]; }
                return { ...grant, sheetDefinitions: newSheetDefs };
              }
              return grant;
            });
            setDraftSettings({ ...draftSettings, grants: updatedGrants });
          }}
        />
      )}

      {/* Password Update Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-0 overflow-hidden bg-background">
          <div className="p-8 pb-4 bg-muted/20 border-b">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase">Change Password</DialogTitle>
              <DialogDescription className="text-[10px] font-bold uppercase opacity-60">Update your account credentials.</DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase opacity-40">New Password</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-14 rounded-2xl bg-muted/20 border-2 border-transparent focus:border-primary/20" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase opacity-40">Confirm Password</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-14 rounded-2xl bg-muted/20 border-2 border-transparent focus:border-primary/20" />
            </div>
          </div>
          <DialogFooter className="p-8 bg-muted/20 border-t flex gap-3">
            <Button variant="ghost" onClick={() => setIsPasswordDialogOpen(false)} className="flex-1 h-12 font-bold">Cancel</Button>
            <Button onClick={handleUpdateMyPassword} className="flex-[2] h-12 rounded-xl bg-primary text-black font-black uppercase text-[10px]">Update Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}

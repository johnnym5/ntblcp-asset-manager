'use client';

/**
 * @fileOverview SettingsWorkstation - Control Center.
 * Deployment Pulse: Hardened RBAC logic and deterministic patch reflection.
 * Phase 1610: Fixed Admin tab visibility and implemented Global S/N Normalization.
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
  Info,
  HeartPulse,
  Database,
  Truck,
  Hash,
  SortAsc
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
    assets,
    isSyncing 
  } = useAppState();
  
  const { userProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const [isSaving, setIsSaving] = useState(false);
  const [isPatching, setIsPatching] = useState(false);
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

  // RBAC Checks - Hardened for ADMIN role
  const isAdmin = userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPERADMIN';
  const isSuperAdmin = userProfile?.role === 'SUPERADMIN';
  const isZonalAdmin = !!userProfile?.isZonalAdmin;

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

  /**
   * RE-INDEXING PATCH
   * Sorts assets in every folder by Asset ID Tag and assigns S/N sequentially.
   */
  const handleApplyGlobalSNPatch = async () => {
    if (!assets || assets.length === 0) return;
    setIsPatching(true);
    try {
      const categories = Array.from(new Set(assets.map(a => a.category)));
      const updatedAssets = [...assets];
      let patchCount = 0;

      for (const cat of categories) {
        // 1. Get and sort assets for this folder specifically
        const catAssets = assets.filter(a => a.category === cat)
          .sort((a, b) => (a.assetIdCode || '').localeCompare(b.assetIdCode || '', undefined, { numeric: true }));
        
        // 2. Map back to main array with new S/N
        catAssets.forEach((asset, idx) => {
          const mainIdx = updatedAssets.findIndex(a => a.id === asset.id);
          if (mainIdx > -1) {
            const updated: Asset = {
              ...updatedAssets[mainIdx],
              sn: String(idx + 1),
              lastModified: new Date().toISOString(),
              lastModifiedBy: userProfile?.displayName || 'System Normalization'
            };
            updatedAssets[mainIdx] = updated;
            enqueueMutation('UPDATE', 'assets', updated);
            patchCount++;
          }
        });
      }

      await storage.saveAssets(updatedAssets);
      await refreshRegistry();
      
      addNotification({ 
        title: "S/N Normalization Complete", 
        description: `Successfully re-indexed ${patchCount} records across all folders.`,
        variant: "success"
      });
    } catch (e) {
      toast({ variant: "destructive", title: "Normalization Failure" });
    } finally {
      setIsPatching(false);
    }
  };

  const handleApplyMotorbikePatch = async () => {
    if (!assets || assets.length === 0) return;
    setIsPatching(true);
    try {
      const motorbikeAssets = assets.filter(a => {
        const cat = (a.category || '').toUpperCase();
        return cat.includes('MOTORCYCLE') || cat.includes('MOTORBIKE');
      });

      if (motorbikeAssets.length === 0) {
        toast({ title: "Patch Scope Empty", description: "No transport records discovered in active registry." });
        return;
      }

      const updatedAssets = [...assets];
      let patchCount = 0;

      for (let i = 0; i < updatedAssets.length; i++) {
        const asset = updatedAssets[i];
        const cat = (asset.category || '').toUpperCase();
        if (cat.includes('MOTORCYCLE') || cat.includes('MOTORBIKE')) {
          const idMatch = (asset.assetIdCode || '').match(/\/(\d+)$/);
          const extractedSn = idMatch ? idMatch[1] : asset.sn;

          const updated: Asset = {
            ...asset,
            manufacturer: 'Bajaj',
            sn: extractedSn,
            lastModified: new Date().toISOString(),
            lastModifiedBy: userProfile?.displayName || 'System Patch'
          };

          updatedAssets[i] = updated;
          await enqueueMutation('UPDATE', 'assets', updated);
          patchCount++;
        }
      }

      await storage.saveAssets(updatedAssets);
      await refreshRegistry();
      
      addNotification({ 
        title: "Motorbike Patch Applied", 
        description: `Successfully normalized ${patchCount} records to Bajaj identity.`,
        variant: "success"
      });
    } catch (e) {
      toast({ variant: "destructive", title: "Patch Failure" });
    } finally {
      setIsPatching(false);
    }
  };

  const handleUpdateMyPassword = async () => {
    if (!newPassword || newPassword.length < 4) {
      toast({ variant: "destructive", title: "Security Alert", description: "Password must be at least 4 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Password Mismatch" });
      return;
    }
    if (!draftSettings || !userProfile) return;
    const updatedUsers = draftSettings.authorizedUsers.map(u => {
      if (u.loginName === userProfile.loginName) return { ...u, password: newPassword };
      return u;
    });
    handleSettingChange('authorizedUsers', updatedUsers);
    setIsPasswordDialogOpen(false);
    setNewPassword('');
    setConfirmPassword('');
    addNotification({ title: "Passphrase Staged", description: "Save protocol to commit changes.", variant: "success" });
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
      addNotification({ title: `Control Protocol Saved`, variant: "success" });
    } finally {
      setIsSaving(false);
    }
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
    <Tabs defaultValue={isZonalAdmin ? "users" : "general"} className="animate-in fade-in duration-700 h-full flex flex-col relative max-w-6xl mx-auto w-full">
      <div className="sticky top-[-1rem] sm:top-[-2rem] lg:top-[-2.5rem] z-40 bg-background/95 backdrop-blur-2xl pt-1 pb-3 px-1 border-b border-border mb-6 -mx-1 shrink-0">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl shadow-inner"><SettingsIcon className="h-5 w-5 text-primary" /></div>
              <div className="space-y-0.5">
                <h2 className="text-xl font-black uppercase text-foreground tracking-tight leading-none">Control Center</h2>
                <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Protocol Setup</p>
              </div>
            </div>
            <button onClick={() => setActiveView('DASHBOARD')} className="h-10 w-10 flex items-center justify-center bg-muted/50 hover:bg-muted border border-border rounded-xl transition-all shadow-sm"><X className="h-5 w-5 text-muted-foreground" /></button>
          </div>
          <div className="bg-muted/30 p-0.5 rounded-xl border border-border shadow-inner flex overflow-x-auto no-scrollbar">
            <TabsList className="bg-transparent border-none p-0 h-auto gap-0.5 flex items-center min-w-max">
              <TabsTrigger value="general" className="px-6 py-2 rounded-lg font-black uppercase text-[8px] tracking-widest data-[state=active]:bg-background data-[state=active]:text-foreground transition-all">Environment</TabsTrigger>
              {isAdmin && <TabsTrigger value="groups" className="px-6 py-2 rounded-lg font-black uppercase text-[8px] tracking-widest data-[state=active]:bg-background data-[state=active]:text-foreground transition-all">Project Scope</TabsTrigger>}
              {(isAdmin || isZonalAdmin) && <TabsTrigger value="users" className="px-6 py-2 rounded-lg font-black uppercase text-[8px] tracking-widest data-[state=active]:bg-background data-[state=active]:text-foreground transition-all">Personnel</TabsTrigger>}
              {isAdmin && <TabsTrigger value="history" className="px-6 py-2 rounded-lg font-black uppercase text-[8px] tracking-widest data-[state=active]:bg-background data-[state=active]:text-foreground transition-all">Activity Log</TabsTrigger>}
              {isSuperAdmin && <TabsTrigger value="health" className="px-6 py-2 rounded-lg font-black uppercase text-[8px] tracking-widest data-[state=active]:bg-background data-[state=active]:text-foreground transition-all">Infrastructure</TabsTrigger>}
            </TabsList>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-1">
        <TabsContent value="general" className="space-y-10 m-0 outline-none pb-20">
          <SettingSection title="Workstation Theme" description="Visual pulse settings" icon={Palette}>
            <div className="grid grid-cols-2 gap-3">
              <Button variant={theme === 'light' ? 'default' : 'outline'} onClick={() => setTheme('light')} className="h-14 rounded-xl font-black uppercase text-[10px] gap-3">
                <Sun className="h-4 w-4" /> High-Contrast
              </Button>
              <Button variant={theme === 'dark' ? 'default' : 'outline'} onClick={() => setTheme('dark')} className="h-14 rounded-xl font-black uppercase text-[10px] gap-3">
                <Moon className="h-4 w-4" /> Dark Mode
              </Button>
            </div>
          </SettingSection>

          <SettingSection title="Security Protocol" description="Credential Management" icon={KeyRound}>
            <div className="flex items-center justify-between p-5 rounded-2xl bg-muted/30 border border-border shadow-sm">
              <div className="space-y-0.5">
                <Label className="text-xs font-black uppercase tracking-tight">System Passphrase</Label>
                <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Authorized rotation required every 90 days.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsPasswordDialogOpen(true)} className="h-10 px-6 rounded-xl font-black uppercase text-[9px] border-2">Rotate Access</Button>
            </div>
          </SettingSection>

          {isAdmin && (
            <SettingSection title="Data Governance" description="Technical Pulse Maintenance" icon={Wrench}>
              <div className="space-y-6">
                {/* Global SN Patch */}
                <div className="p-6 rounded-[1.5rem] bg-primary/[0.03] border-2 border-dashed border-primary/20 space-y-4 shadow-inner">
                  <div className="flex items-center gap-3">
                    <SortAsc className="h-5 w-5 text-primary" />
                    <h4 className="text-sm font-black uppercase">Normalize Global S/N Pulse</h4>
                  </div>
                  <p className="text-[10px] font-medium text-muted-foreground italic leading-relaxed">
                    Re-indexes all assets sequentially based on Asset ID Tag sort order, unique to each folder.
                  </p>
                  <Button 
                    onClick={handleApplyGlobalSNPatch} 
                    disabled={isPatching}
                    className="w-full h-14 rounded-xl bg-primary text-black font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 transition-transform active:scale-95"
                  >
                    {isPatching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Hash className="h-4 w-4 mr-2" />}
                    Execute S/N Normalization
                  </Button>
                </div>

                {/* Motorbike Patch */}
                <div className="p-6 rounded-[1.5rem] bg-primary/[0.03] border-2 border-dashed border-primary/20 space-y-4 shadow-inner">
                  <div className="flex items-center gap-3">
                    <Truck className="h-5 w-5 text-primary" />
                    <h4 className="text-sm font-black uppercase">Normalized Transport Patch</h4>
                  </div>
                  <p className="text-[10px] font-medium text-muted-foreground italic leading-relaxed">
                    Bulk patches all motorbikes: Sets manufacturer to Bajaj and extracts short serials from ID codes.
                  </p>
                  <Button 
                    onClick={handleApplyMotorbikePatch} 
                    disabled={isPatching}
                    className="w-full h-14 rounded-xl bg-primary text-black font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 transition-transform active:scale-95"
                  >
                    {isPatching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                    Execute Motorbike Patch
                  </Button>
                </div>
              </div>
            </SettingSection>
          )}

          {isAdmin && (
            <SettingSection title="Application Logic" description="Operational Standards" icon={Smartphone}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(['management', 'verification'] as const).map(m => (
                  <button 
                    key={m}
                    onClick={() => handleSettingChange('appMode', m)}
                    className={cn(
                      "p-6 rounded-2xl border-2 text-left transition-all relative overflow-hidden",
                      draftSettings.appMode === m ? "border-primary bg-primary/[0.03] shadow-lg" : "border-border bg-muted/20"
                    )}
                  >
                    {draftSettings.appMode === m && <div className="absolute top-2 right-2"><CheckCircle2 className="h-4 w-4 text-primary" /></div>}
                    <h4 className="text-sm font-black uppercase text-foreground mb-1">{m} Mode</h4>
                    <p className="text-[10px] font-medium text-muted-foreground italic">Standardizes registry interaction.</p>
                  </button>
                ))}
              </div>
            </SettingSection>
          )}
        </TabsContent>

        <TabsContent value="groups" className="m-0 outline-none pb-20">
          <SettingSection title="Project Directory" description="Active Registry Scope" icon={LayoutGrid}>
            <div className="space-y-6">
              <div className="flex gap-2">
                <Input placeholder="Enter project identifier..." value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} className="h-12 bg-background border-border rounded-xl font-bold text-sm shadow-inner" />
                <Button onClick={handleAddProject} disabled={!newProjectName.trim()} className="h-12 px-8 rounded-xl bg-primary text-black font-black uppercase text-[10px] tracking-widest shadow-lg">Create Grant</Button>
              </div>
              <div className="space-y-3">
                {draftSettings.grants.map((grant) => {
                  const isActive = activeGrantId === grant.id;
                  return (
                    <Card key={grant.id} className={cn("border-2 rounded-2xl overflow-hidden transition-all shadow-md", isActive ? "border-primary bg-primary/[0.02]" : "border-border bg-muted/10")}>
                      <div className="p-5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={cn("p-2 rounded-lg", isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                            <FolderOpen className="h-5 w-5" />
                          </div>
                          <h4 className="text-base font-black uppercase text-foreground leading-none">{grant.name}</h4>
                        </div>
                        {!isActive && <Button variant="outline" size="sm" onClick={() => setActiveGrantId(grant.id)} className="h-8 rounded-lg font-black uppercase text-[8px] border-2 shadow-sm">Enable Node</Button>}
                      </div>
                      {isActive && (
                        <div className="px-5 pb-5 pt-2 border-t border-dashed border-border space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {Object.entries(grant.sheetDefinitions || {}).map(([name, def]) => (
                              <div key={name} className="flex items-center justify-between p-3 bg-background border border-border rounded-xl shadow-inner">
                                <span className="text-[9px] font-black uppercase text-muted-foreground truncate pr-4">{name}</span>
                                <button onClick={() => handleEditSchema(grant.id, def)} className="p-1.5 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"><Wrench className="h-3.5 w-3.5" /></button>
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

        <TabsContent value="users" className="m-0 outline-none pb-20">
          <SettingSection title="Personnel Registry" description="Identity & Regional Scope" icon={Users}>
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
        <Button variant="ghost" onClick={() => setActiveView('DASHBOARD')} className="h-12 px-10 rounded-xl font-black uppercase text-[10px] text-muted-foreground hover:text-foreground">Discard Protocol</Button>
        <Button onClick={handleSaveChange} disabled={!hasChanges || isSaving} className="h-14 px-12 rounded-xl bg-primary text-black font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 gap-3">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldIcon className="h-4 w-4" />}
          Commit Control Changes
        </Button>
      </div>

      {/* Password Update Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-0 overflow-hidden bg-background border-primary/10 shadow-3xl">
          <div className="p-8 pb-4 bg-muted/20 border-b">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase tracking-tight text-foreground">Rotate Credentials</DialogTitle>
              <DialogDescription className="text-[10px] font-bold uppercase opacity-60 tracking-widest mt-1">Personnel Security Refresh</DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase opacity-40 tracking-widest ml-1">New Passphrase</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-14 rounded-2xl bg-muted/20 border-2 border-transparent focus:border-primary/20 shadow-inner" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase opacity-40 tracking-widest ml-1">Confirm Identity</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-14 rounded-2xl bg-muted/20 border-2 border-transparent focus:border-primary/20 shadow-inner" />
            </div>
          </div>
          <DialogFooter className="p-8 bg-muted/20 border-t flex gap-3">
            <Button variant="ghost" onClick={() => setIsPasswordDialogOpen(false)} className="flex-1 h-12 font-bold rounded-xl">Abort</Button>
            <Button onClick={handleUpdateMyPassword} className="flex-[2] h-12 rounded-xl bg-primary text-black font-black uppercase text-[10px] shadow-lg">Update System Credentials</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}

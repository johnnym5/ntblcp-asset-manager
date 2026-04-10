'use client';

/**
 * @fileOverview SettingsWorkstation - Control Center.
 * Hardened RBAC logic and optimized visual identity controls.
 * Phase 1620: Fixed Admin tab visibility and streamlined role derivations.
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

  // RBAC Gating
  const isSuperAdmin = userProfile?.role === 'SUPERADMIN';
  const isAdmin = userProfile?.role === 'ADMIN' || isSuperAdmin;
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

  const handleApplyGlobalSNPatch = async () => {
    if (!assets || assets.length === 0) return;
    setIsPatching(true);
    try {
      const categories = Array.from(new Set(assets.map(a => a.category)));
      const updatedAssets = [...assets];
      let patchCount = 0;

      for (const cat of categories) {
        const catAssets = assets.filter(a => a.category === cat)
          .sort((a, b) => (a.assetIdCode || '').localeCompare(b.assetIdCode || '', undefined, { numeric: true }));
        
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
      addNotification({ title: "S/N Normalization Complete", description: `Re-indexed ${patchCount} records.`, variant: "success" });
    } catch (e) {
      toast({ variant: "destructive", title: "Normalization Failure" });
    } finally {
      setIsPatching(false);
    }
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
                <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest">System Orchestration</p>
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
          <SettingSection title="Visual Identity" description="Surface language settings" icon={Palette}>
            <div className="grid grid-cols-2 gap-3">
              <Button variant={theme === 'light' ? 'default' : 'outline'} onClick={() => setTheme('light')} className="h-14 rounded-xl font-black uppercase text-[10px] gap-3">
                <Sun className="h-4 w-4" /> Light Mode
              </Button>
              <Button variant={theme === 'dark' ? 'default' : 'outline'} onClick={() => setTheme('dark')} className="h-14 rounded-xl font-black uppercase text-[10px] gap-3">
                <Moon className="h-4 w-4" /> Dark Mode
              </Button>
            </div>
          </SettingSection>

          {isAdmin && (
            <SettingSection title="Data Governance" description="Technical Pulse Maintenance" icon={Wrench}>
              <div className="p-6 rounded-[1.5rem] bg-primary/[0.03] border-2 border-dashed border-primary/20 space-y-4 shadow-inner">
                <div className="flex items-center gap-3">
                  <SortAsc className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-black uppercase">Normalize Global S/N Pulse</h4>
                </div>
                <p className="text-[10px] font-medium text-muted-foreground italic leading-relaxed">
                  Re-indexes all assets sequentially based on Asset ID Tag sort order.
                </p>
                <Button 
                  onClick={handleApplyGlobalSNPatch} 
                  disabled={isPatching}
                  className="w-full h-14 rounded-xl bg-primary text-black font-black uppercase text-[10px] tracking-widest shadow-xl"
                >
                  {isPatching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Hash className="h-4 w-4 mr-2" />}
                  Execute S/N Normalization
                </Button>
              </div>
            </SettingSection>
          )}

          {isAdmin && (
            <SettingSection title="Operational Standard" description="Registry Logic Mode" icon={Smartphone}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(['management', 'verification'] as const).map(m => (
                  <button 
                    key={m}
                    onClick={() => handleSettingChange('appMode', m)}
                    className={cn(
                      "p-6 rounded-2xl border-2 text-left transition-all relative",
                      draftSettings.appMode === m ? "border-primary bg-primary/[0.03]" : "border-border bg-muted/20"
                    )}
                  >
                    {draftSettings.appMode === m && <CheckCircle2 className="absolute top-4 right-4 h-4 w-4 text-primary" />}
                    <h4 className="text-sm font-black uppercase text-foreground mb-1">{m} Mode</h4>
                    <p className="text-[10px] font-medium text-muted-foreground italic">Affects global accent and verification permissions.</p>
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
                <Button onClick={handleAddProject} disabled={!newProjectName.trim()} className="h-12 px-8 rounded-xl bg-primary text-black font-black uppercase text-[10px] tracking-widest shadow-lg">Create Project</Button>
              </div>
              <div className="space-y-3">
                {draftSettings.grants.map((grant) => (
                  <Card key={grant.id} className={cn("border-2 rounded-2xl overflow-hidden transition-all shadow-md", activeGrantId === grant.id ? "border-primary bg-primary/[0.02]" : "border-border bg-muted/10")}>
                    <div className="p-5 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn("p-2 rounded-lg", activeGrantId === grant.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                          <FolderOpen className="h-5 w-5" />
                        </div>
                        <h4 className="text-base font-black uppercase text-foreground leading-none">{grant.name}</h4>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setActiveGrantId(grant.id)} className="h-8 rounded-lg font-black uppercase text-[8px] border-2">Set Active</Button>
                    </div>
                  </Card>
                ))}
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
          Commit Protocol
        </Button>
      </div>
    </Tabs>
  );
}

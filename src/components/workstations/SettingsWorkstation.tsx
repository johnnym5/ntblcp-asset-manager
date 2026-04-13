'use client';

/**
 * @fileOverview Settings - Main Operational Control Center.
 * Restoration Pulse: Re-integrated Projects, Personnel, and Folder Setup.
 * Phase 1700: Implemented Multi-Project selection via Checkboxes.
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
  SortAsc,
  Trash2,
  Eye,
  FileDown,
  Check
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
    setSelectedProjectIds,
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
  
  const [isColumnSheetOpen, setIsColumnSheetOpen] = useState(false);
  const [selectedSheetDef, setSelectedSheetDef] = useState<SheetDefinition | null>(null);
  const [originalSheetName, setOriginalSheetName] = useState<string | null>(null);
  const [activeGrantIdForSchema, setActiveGrantIdForSchema] = useState<string | null>(null);

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

  const handleSaveChange = async () => {
    if (!draftSettings) return;
    setIsSaving(true);
    try {
      const updatedSettings = { ...draftSettings };
      if (isOnline) await FirestoreService.updateSettings(updatedSettings);
      await storage.saveSettings(updatedSettings);
      setAppSettings(updatedSettings);
      await refreshRegistry();
      addNotification({ title: `Registry Protocol Saved`, variant: "success" });
    } finally {
      setIsSaving(false);
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

  const handleRenameProject = async (id: string) => {
    if (!editProjectValue.trim() || !draftSettings) return;
    const updated = draftSettings.grants.map(g => g.id === id ? { ...g, name: editProjectValue.trim() } : g);
    handleSettingChange('grants', updated);
    setEditingProjectId(null);
  };

  const toggleProject = (id: string, enabled: boolean) => {
    if (!draftSettings) return;
    const current = draftSettings.activeGrantIds || [];
    const next = enabled 
      ? [...current, id]
      : current.filter(cid => cid !== id);
    handleSettingChange('activeGrantIds', next);
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

  const handleImportTemplate = () => {
    fileInputRef.current?.click();
  };

  const handleFileImportTemplate = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!draftSettings) return;
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const templates = await parseExcelForTemplate(file);
      // For multi-select, we apply to the first selected project as target or ask user
      const targetId = draftSettings.activeGrantIds[0] || draftSettings.grants[0]?.id;
      if (!targetId) return;

      const activeGrantIdx = draftSettings.grants.findIndex(g => g.id === targetId);
      if (activeGrantIdx === -1) return;

      const nextGrant = { ...draftSettings.grants[activeGrantIdx] };
      const nextSheetDefs = { ...nextGrant.sheetDefinitions };
      
      templates.forEach(t => {
        nextSheetDefs[t.name] = t;
      });

      nextGrant.sheetDefinitions = nextSheetDefs;
      const nextGrants = [...draftSettings.grants];
      nextGrants[activeGrantIdx] = nextGrant;

      handleSettingChange('grants', nextGrants);
      toast({ title: 'Templates Imported', description: `${templates.length} group definitions identified.` });
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
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto custom-scrollbar px-1">
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
            <SettingSection title="Registry Admin" description="Technical Normalization" icon={Wrench}>
              <div className="p-6 rounded-[1.5rem] bg-primary/[0.03] border-2 border-dashed border-primary/20 space-y-4 shadow-inner">
                <div className="flex items-center gap-3">
                  <SortAsc className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-black uppercase">Normalize Global S/N Pulse</h4>
                </div>
                <p className="text-[10px] font-medium text-muted-foreground italic leading-relaxed">
                  Re-indexes all assets sequentially based on Asset ID Tag sort order per folder.
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
            <SettingSection title="Operational Mode" description="Registry Logic Mode" icon={Smartphone}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { id: 'management', label: 'Registry Admin', desc: 'Full governance and data engineering pulse.' },
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

        <TabsContent value="projects" className="space-y-10 m-0 outline-none pb-20">
          <SettingSection title="Project Directory" description="Multi-Project Enablement" icon={LayoutGrid}>
            <div className="space-y-8">
              <div className="flex gap-3">
                <Input 
                  placeholder="New project label..." 
                  value={newProjectName} 
                  onChange={(e) => setNewProjectName(e.target.value)} 
                  className="h-14 bg-background border-border rounded-xl font-bold text-sm shadow-inner" 
                />
                <Button 
                  onClick={handleAddProject} 
                  disabled={!newProjectName.trim()} 
                  className="h-14 px-8 rounded-xl bg-primary text-black font-black uppercase text-[10px] tracking-widest shadow-lg"
                >
                  Create Project
                </Button>
              </div>

              <div className="space-y-4">
                {draftSettings.grants.map((grant) => {
                  const isActive = draftSettings.activeGrantIds?.includes(grant.id);
                  const isRenaming = editingProjectId === grant.id;

                  return (
                    <Card key={grant.id} className={cn(
                      "border-2 rounded-2xl overflow-hidden transition-all duration-500", 
                      isActive ? "border-primary bg-primary/[0.02] shadow-2xl" : "border-border bg-muted/10"
                    )}>
                      <div className="p-6 flex items-center justify-between group/project">
                        <div className="flex items-center gap-4 flex-1">
                          <div className={cn("p-2 rounded-lg", isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                            <FolderOpen className="h-5 w-5" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            {isRenaming ? (
                              <div className="flex items-center gap-2">
                                <Input 
                                  value={editProjectValue} 
                                  onChange={(e) => setEditProjectValue(e.target.value)}
                                  className="h-9 bg-background border-primary/40 text-sm font-black uppercase rounded-lg"
                                  autoFocus
                                />
                                <Button size="sm" onClick={() => handleRenameProject(grant.id)} className="h-9 w-9 p-0"><CheckCircle2 className="h-4 w-4"/></Button>
                              </div>
                            ) : (
                              <h4 className="text-base font-black uppercase text-foreground leading-none truncate">{grant.name}</h4>
                            )}
                            <span className="text-[8px] font-mono opacity-40 uppercase mt-1">ID: {grant.id.split('-')[0]}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-3 pr-6 border-r border-border/40">
                            <span className="text-[9px] font-black uppercase text-muted-foreground opacity-60">Enabled</span>
                            <Checkbox 
                              checked={isActive} 
                              onCheckedChange={(checked) => toggleProject(grant.id, !!checked)} 
                              className="h-6 w-6 rounded-lg border-2 border-border data-[state=checked]:bg-primary"
                            />
                          </div>
                          <div className="flex items-center gap-4 opacity-40 group-hover/project:opacity-100 transition-opacity">
                            {!isRenaming && (
                              <button onClick={() => { setEditingProjectId(grant.id); setEditProjectValue(grant.name); }} className="text-[10px] font-black uppercase text-primary hover:underline">Rename</button>
                            )}
                          </div>
                        </div>
                      </div>

                      {isActive && (
                        <div className="px-6 pb-8 pt-2 space-y-6 border-t border-dashed border-border/40 animate-in fade-in slide-in-from-top-2">
                          <div className="flex items-center justify-between px-1">
                            <h5 className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">Registered Folder Nodes</h5>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" onClick={handleImportTemplate} className="h-8 px-3 rounded-lg font-black text-[8px] uppercase gap-2 hover:bg-primary/10 text-primary"><FileDown className="h-3.5 w-3.5"/> Import Template</Button>
                              <Button variant="ghost" size="sm" onClick={() => setActiveView('IMPORT')} className="h-8 px-3 rounded-lg font-black text-[8px] uppercase gap-2 hover:bg-primary/10 text-primary"><ScanSearch className="h-3.5 w-3.5"/> Import Assets</Button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {Object.entries(grant.sheetDefinitions || {}).map(([name, def]) => (
                              <div key={name} className="flex items-center justify-between p-4 bg-background border border-border rounded-xl group/folder hover:border-primary/20 transition-all">
                                <span className="text-[11px] font-black uppercase text-foreground/80 truncate pr-4">{name}</span>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => { setSelectedSheetDef(def); setOriginalSheetName(name); setActiveGrantIdForSchema(grant.id); setIsColumnSheetOpen(true); }}
                                  className="h-8 w-8 rounded-lg text-primary opacity-20 group-hover/folder:opacity-100 hover:bg-primary/5 transition-all"
                                >
                                  <Wrench className="h-3.5 w-3.5" />
                                </Button>
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
          <SettingSection title="Personnel Directory" description="Identity & Regional Scope" icon={Users}>
            <UserManagement 
              users={draftSettings.authorizedUsers} 
              onUsersChange={newUsers => handleSettingChange('authorizedUsers', newUsers)} 
              adminProfile={userProfile} 
            />
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
        <Button 
          variant="ghost" 
          onClick={() => setActiveView('DASHBOARD')} 
          className="h-12 px-10 rounded-xl font-black uppercase text-[10px] text-muted-foreground hover:text-foreground"
        >
          Discard Pulse
        </Button>
        <Button 
          onClick={handleSaveChange} 
          disabled={!hasChanges || isSaving} 
          className="h-14 px-12 rounded-xl bg-primary text-black font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 gap-3 transition-transform active:scale-95"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldIcon className="h-4 w-4" />}
          Save Settings
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

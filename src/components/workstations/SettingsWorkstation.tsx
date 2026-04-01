'use client';

/**
 * @fileOverview SettingsWorkstation - Master Settings Manager.
 * Phase 162: Resolved Discovery Failure error and optimized button typography.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from 'next-themes';
import { 
  Settings, 
  Palette, 
  CheckCircle2, 
  Trash2, 
  Save, 
  Sun, 
  Moon, 
  Zap,
  Lock,
  PlusCircle,
  FileUp,
  ScanSearch,
  Wrench,
  Users,
  Loader2,
  Database,
  Monitor,
  PlaneTakeoff,
  Globe,
  Columns,
  Eye,
  ChevronsUpDown,
  Activity,
  Bomb,
  ShieldAlert,
  GraduationCap,
  Smartphone,
  Info,
  RotateCcw,
  Download,
  ShieldCheck,
  RefreshCw,
  LayoutGrid,
  FileCode,
  SlidersHorizontal,
  X,
  Plus
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { UserManagement } from '@/components/admin/user-management';
import { ColumnCustomizationSheet } from '@/components/column-customization-sheet';
import { FirestoreService } from '@/services/firebase/firestore';
import { storage } from '@/offline/storage';
import { parseExcelForTemplate } from '@/lib/excel-parser';
import { cn } from '@/lib/utils';
import type { AppSettings, SheetDefinition, Grant, UXMode } from '@/types/domain';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ImportScannerDialog } from '@/components/single-sheet-import-dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
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
  const { appSettings, setAppSettings, refreshRegistry, isOnline, setActiveGrantId, setActiveView } = useAppState();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const { setTheme, theme } = useTheme();

  const [draftSettings, setDraftSettings] = useState<AppSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isNukeDialogOpen, setIsNukeDialogOpen] = useState(false);
  const [isImportScanOpen, setIsImportScanOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  
  const [isColumnSheetOpen, setIsColumnSheetOpen] = useState(false);
  const [selectedSheetDef, setSelectedSheetDef] = useState<SheetDefinition | null>(null);
  const [activeGrantIdForSchema, setActiveGrantIdForSchema] = useState<string | null>(null);
  
  const templateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (appSettings) {
      setDraftSettings(JSON.parse(JSON.stringify(appSettings)));
    }
  }, [appSettings]);

  const hasChanges = useMemo(() => {
    return JSON.stringify(appSettings) !== JSON.stringify(draftSettings);
  }, [appSettings, draftSettings]);

  const handleSettingChange = (key: keyof AppSettings, value: any) => {
    if (!draftSettings) return;
    setDraftSettings(prev => prev ? ({ ...prev, [key]: value }) : null);
  };

  const handleCommitChanges = async () => {
    if (!draftSettings) return;
    setIsSaving(true);
    try {
      await storage.saveSettings(draftSettings);
      if (isOnline) {
        await FirestoreService.updateSettings(draftSettings);
      }
      await refreshRegistry();
      toast({ title: "Environment Synchronized", description: "Global configuration pulse broadcasted successfully." });
    } catch (e) {
      toast({ variant: "destructive", title: "Broadcast Failure" });
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
    toast({ title: "Project Staged", description: "Save configuration to commit this project pulse." });
  };

  const handleDeleteProject = (id: string) => {
    if (!draftSettings || draftSettings.grants.length <= 1) {
      toast({ variant: "destructive", title: "Operation Blocked", description: "At least one project scope is required." });
      return;
    }
    const updatedGrants = draftSettings.grants.filter(g => g.id !== id);
    handleSettingChange('grants', updatedGrants);
    if (draftSettings.activeGrantId === id) {
      handleSettingChange('activeGrantId', updatedGrants[0].id);
    }
  };

  const handleDeleteSheet = (grantId: string, sheetName: string) => {
    if (!draftSettings) return;
    const updatedGrants = draftSettings.grants.map(g => {
      if (g.id === grantId) {
        const nextDefs = { ...g.sheetDefinitions };
        delete nextDefs[sheetName];
        return { 
          ...g, 
          sheetDefinitions: nextDefs,
          enabledSheets: g.enabledSheets.filter(s => s !== sheetName)
        };
      }
      return g;
    });
    handleSettingChange('grants', updatedGrants);
  };

  const handleTemplateDiscovery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !draftSettings) return;

    setIsDiscovering(true);
    try {
      const discovered = await parseExcelForTemplate(file);
      const activeId = draftSettings.activeGrantId;
      if (!activeId) throw new Error("Select an active project scope first.");

      const updatedGrants = draftSettings.grants.map(g => {
        if (g.id === activeId) {
          const nextDefs = { ...g.sheetDefinitions };
          discovered.forEach(d => { nextDefs[d.name] = d; });
          return { 
            ...g, 
            sheetDefinitions: nextDefs, 
            enabledSheets: Array.from(new Set([...g.enabledSheets, ...discovered.map(d => d.name)])) 
          };
        }
        return g;
      });

      handleSettingChange('sheetDefinitions', updatedGrants);
      toast({ title: "Schema Synchronized", description: `Discovered ${discovered.length} record categories.` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Discovery Failure", description: err.message });
    } finally {
      setIsDiscovering(false);
      if (templateInputRef.current) templateInputRef.current.value = "";
    }
  };

  const handleNukeRegistry = async () => {
    setIsSaving(true);
    try {
      await storage.clearAssets();
      await refreshRegistry();
      toast({ title: "Inventory Purged", description: "Local asset data has been reset." });
      setIsNukeDialogOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  if (!settingsLoaded || !draftSettings) return (
    <div className="flex h-[400px] items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  );

  const SectionHeading = ({ title, description, icon: Icon }: { title: string, description: string, icon: any }) => (
    <div className="flex items-center gap-4 mb-6">
      <div className="p-3 bg-primary/10 rounded-2xl shadow-inner">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h3 className="text-lg font-black uppercase tracking-tight leading-none text-foreground">{title}</h3>
        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mt-1.5 opacity-60">{description}</p>
      </div>
    </div>
  );

  const SettingRow = ({ label, description, children, icon: Icon, disabled = false }: { label: string, description: string, children: React.ReactNode, icon?: any, disabled?: boolean }) => (
    <div className={cn(
      "flex flex-col sm:flex-row sm:items-center justify-between p-6 rounded-[2rem] border-2 border-border/40 bg-card/50 hover:border-primary/20 transition-all gap-4 group",
      disabled && "opacity-40 grayscale pointer-events-none"
    )}>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-3.5 w-3.5 text-primary opacity-40 group-hover:opacity-100 transition-opacity" />}
          <Label className="text-sm font-black uppercase tracking-tight">{label}</Label>
        </div>
        <p className="text-[10px] text-muted-foreground font-medium leading-relaxed max-w-sm italic opacity-70">
          {description}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {children}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-40 animate-in fade-in duration-700">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
        <div className="space-y-1">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tighter text-foreground uppercase flex items-center gap-4 leading-none">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <SlidersHorizontal className="h-8 w-8 text-primary" />
            </div>
            Settings Manager
          </h2>
          <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">
            System Configuration & Inventory Control
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={handleCommitChanges} 
            disabled={!hasChanges || isSaving}
            className="h-14 px-10 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 bg-primary text-primary-foreground flex items-center gap-3 transition-transform hover:scale-105 active:scale-95"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Configuration
          </Button>
        </div>
      </div>

      <Tabs defaultValue="environment" className="space-y-10">
        <div className="bg-muted/20 p-1.5 rounded-[2rem] border-2 border-border/40 overflow-hidden shadow-sm">
          <TabsList className="bg-transparent border-none p-0 h-auto gap-1.5 flex items-center w-full">
            <TabsTrigger value="environment" className="flex-1 px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm">
              <GraduationCap className="h-3.5 w-3.5" /> General
            </TabsTrigger>
            <TabsTrigger value="registry" className="flex-1 px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm">
              <Columns className="h-3.5 w-3.5" /> Inventory
            </TabsTrigger>
            <TabsTrigger value="security" className="flex-1 px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm">
              <Users className="h-3.5 w-3.5" /> Users
            </TabsTrigger>
            <TabsTrigger value="system" className="flex-1 px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm">
              <RefreshCw className="h-3.5 w-3.5" /> Maintenance
            </TabsTrigger>
          </TabsList>
        </div>

        {/* --- 1. GENERAL TAB --- */}
        <TabsContent value="environment" className="space-y-10 outline-none m-0 animate-in fade-in slide-in-from-bottom-2">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 px-1">
            <div className="space-y-10">
              <div>
                <SectionHeading title="System Appearance" description="Theme and visual identity" icon={Palette} />
                <div className="space-y-4">
                  <SettingRow label="Color Theme" description="Choose between high-contrast Light mode or Dark amoled view." icon={Sun}>
                    <div className="flex gap-2 p-1 bg-muted/50 rounded-xl border-2">
                      <Button 
                        variant={theme === 'light' ? 'secondary' : 'ghost'} 
                        size="sm" 
                        onClick={() => setTheme('light')} 
                        className="h-9 px-4 rounded-lg font-black uppercase text-[9px] tracking-widest gap-2"
                      >
                        <Sun className="h-3 w-3" /> Light
                      </Button>
                      <Button 
                        variant={theme === 'dark' ? 'secondary' : 'ghost'} 
                        size="sm" 
                        onClick={() => setTheme('dark')} 
                        className="h-9 px-4 rounded-lg font-black uppercase text-[9px] tracking-widest gap-2"
                      >
                        <Moon className="h-3 w-3" /> Dark
                      </Button>
                    </div>
                  </SettingRow>
                </div>
              </div>
            </div>

            <div className="space-y-10">
              <div>
                <SectionHeading title="User Interface" description="Control complexity and help levels" icon={GraduationCap} />
                <div className="space-y-4">
                  <SettingRow label="Interface Mode" description="Switch between beginner-friendly guidance and expert view." icon={Smartphone}>
                    <Select value={draftSettings.uxMode} onValueChange={(v) => handleSettingChange('uxMode', v as UXMode)}>
                      <SelectTrigger className="w-40 h-11 rounded-xl font-black uppercase text-[10px] tracking-widest border-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="beginner" className="text-[10px] font-black uppercase">Beginner Mode</SelectItem>
                        <SelectItem value="advanced" className="text-[10px] font-black uppercase">Advanced View</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingRow>
                  
                  <SettingRow label="Contextual Help" description="Show tooltips and descriptions for interface elements." icon={Info}>
                    <Switch checked={draftSettings.showHelpTooltips} onCheckedChange={(v) => handleSettingChange('showHelpTooltips', v)} />
                  </SettingRow>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* --- 2. INVENTORY TAB --- */}
        <TabsContent value="registry" className="space-y-10 outline-none m-0 animate-in fade-in slide-in-from-bottom-2 px-1">
          <div className="space-y-10">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <h3 className="text-lg font-black uppercase text-foreground tracking-tight leading-none px-1">Manage Projects</h3>
                <div className="flex gap-3 flex-1 sm:flex-none">
                  <Input 
                    placeholder="New project name..." 
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="h-14 bg-white/[0.03] border-white/10 rounded-xl font-medium text-sm focus-visible:ring-primary/20 text-white placeholder:text-white/20"
                  />
                  <Button 
                    onClick={handleAddProject}
                    disabled={!newProjectName.trim()}
                    className="h-14 px-8 rounded-xl bg-primary text-black font-black uppercase text-[11px] tracking-widest gap-2 shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 shrink-0"
                  >
                    <PlusCircle className="h-4 w-4" /> Add Project
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {draftSettings.grants.map((grant) => {
                  const isActive = draftSettings.activeGrantId === grant.id;
                  return (
                    <Card key={grant.id} className={cn(
                      "border-2 transition-all duration-500 rounded-[2.5rem] overflow-hidden bg-card/50 shadow-xl",
                      isActive ? "border-primary/40 ring-4 ring-primary/5" : "border-border/40"
                    )}>
                      <CardHeader className="p-8 pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <ChevronsUpDown className="h-4 w-4 text-white/20 shrink-0" />
                            <div className="flex items-center gap-3">
                              <span className="text-xl font-black uppercase text-white tracking-tight leading-none">{grant.name}</span>
                              {isActive && (
                                <Badge className="bg-primary text-black font-black uppercase text-[9px] h-6 px-3 rounded-full shadow-lg shadow-primary/10">Active</Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            {!isActive && (
                              <button onClick={() => handleSettingChange('activeGrantId', grant.id)} className="text-[11px] font-black uppercase tracking-widest text-primary hover:opacity-80 transition-colors">Set Active</button>
                            )}
                            <button className="text-[11px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-colors">Rename</button>
                            <button onClick={() => handleDeleteProject(grant.id)} className="text-[11px] font-black uppercase tracking-widest text-red-600 hover:text-red-500 transition-colors">Delete</button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-8 pt-4 space-y-8">
                        <div className="space-y-4">
                          <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-white/40 px-1">Sheet Definitions</h4>
                          <div className="space-y-2.5">
                            {Object.keys(grant.sheetDefinitions || {}).length > 0 ? (
                              Object.keys(grant.sheetDefinitions || {}).map(sheetName => (
                                <div key={sheetName} className="flex items-center justify-between p-5 bg-black border border-white/5 rounded-2xl group/sheet hover:border-white/20 transition-all shadow-inner">
                                  <span className="text-xs font-black uppercase text-white/80">{sheetName}</span>
                                  <div className="flex items-center gap-5 text-white/20">
                                    <button onClick={() => setActiveView('REGISTRY')} className="hover:text-white transition-colors" title="View Records"><Eye className="h-4 w-4" /></button>
                                    <button onClick={() => setActiveView('USERS')} className="hover:text-white transition-colors" title="Audit Users"><Users className="h-4 w-4" /></button>
                                    <button 
                                      onClick={() => { setSelectedSheetDef(grant.sheetDefinitions[sheetName]); setActiveGrantIdForSchema(grant.id); setIsColumnSheetOpen(true); }}
                                      className="hover:text-primary transition-colors" 
                                      title="Configure Headers"
                                    >
                                      <Wrench className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => handleDeleteSheet(grant.id, sheetName)} className="hover:text-red-600 transition-colors" title="Delete Sheet"><Trash2 className="h-4 w-4" /></button>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-2xl opacity-20">
                                <p className="text-[10px] font-black uppercase tracking-widest">No Definitions Configured</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {isActive && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <Button variant="outline" className="h-12 sm:h-14 rounded-2xl bg-white/[0.02] border-white/10 font-black uppercase text-[9px] sm:text-[10px] tracking-wider px-2 gap-2 hover:bg-white/5 text-white/60 transition-all active:scale-95">
                              <PlusCircle className="h-4 w-4" /> Add Manually
                            </Button>
                            <input type="file" ref={templateInputRef} onChange={handleTemplateDiscovery} className="hidden" accept=".xlsx,.xls" />
                            <Button variant="outline" onClick={() => templateInputRef.current?.click()} disabled={isDiscovering} className="h-12 sm:h-14 rounded-2xl bg-white/[0.02] border-white/10 font-black uppercase text-[9px] sm:text-[10px] tracking-wider px-2 gap-2 hover:bg-white/5 text-white/60 transition-all active:scale-95">
                              {isDiscovering ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                              Import Template
                            </Button>
                            <Button variant="outline" onClick={() => setIsImportScanOpen(true)} className="h-12 sm:h-14 rounded-2xl bg-white/[0.02] border-white/10 font-black uppercase text-[9px] sm:text-[10px] tracking-wider px-2 gap-2 hover:bg-white/5 text-white/60 transition-all active:scale-95">
                              <ScanSearch className="h-4 w-4" /> Scan & Import
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* --- 3. USERS TAB --- */}
        <TabsContent value="security" className="space-y-10 outline-none m-0 animate-in fade-in slide-in-from-bottom-2 px-1">
          <div>
            <SectionHeading title="User Management" description="Manage authorized auditors and access levels" icon={Users} />
            <Card className="rounded-[3rem] border-2 border-border/40 shadow-2xl bg-card/50 overflow-hidden">
              <CardContent className="p-10">
                <UserManagement 
                  users={draftSettings.authorizedUsers}
                  onUsersChange={(newUsers) => handleSettingChange('authorizedUsers', newUsers)}
                  adminProfile={userProfile}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* --- 4. MAINTENANCE TAB --- */}
        <TabsContent value="system" className="space-y-10 outline-none m-0 animate-in fade-in slide-in-from-bottom-2 px-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-10">
              <div>
                <SectionHeading title="System Health" description="Database reconciliation and backups" icon={Activity} />
                <div className="space-y-4">
                  <SettingRow label="Cloud Refresh" description="Manually synchronize local data with the cloud database." icon={RefreshCw}>
                    <Button variant="outline" size="sm" onClick={refreshRegistry} className="h-10 px-6 rounded-xl font-black uppercase text-[9px] tracking-widest border-2 gap-2">
                      <RefreshCw className="h-3.5 w-3.5" /> Reconcile
                    </Button>
                  </SettingRow>
                  
                  <SettingRow label="Inventory Backup" description="Export the entire inventory as a JSON data file." icon={Download}>
                    <Button variant="outline" size="sm" className="h-10 px-6 rounded-xl font-black uppercase text-[9px] tracking-widest border-2">Export Backup</Button>
                  </SettingRow>
                </div>
              </div>

              <div>
                <SectionHeading title="Data Security" description="System access and locks" icon={Lock} />
                <div className="space-y-4">
                  <SettingRow label="Global Data Lock" description="Prevent non-admin users from creating or deleting records." icon={ShieldCheck}>
                    <Switch checked={draftSettings.lockAssetList} onCheckedChange={(v) => handleSettingChange('lockAssetList', v)} />
                  </SettingRow>
                </div>
              </div>
            </div>

            <div className="space-y-10">
              <div>
                <SectionHeading title="Advanced Actions" description="Irreversible state operations" icon={Bomb} />
                <div className="p-8 rounded-[3rem] bg-destructive/[0.02] border-2 border-dashed border-destructive/20 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-destructive/10 rounded-2xl">
                      <Trash2 className="h-6 w-6 text-destructive" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-black uppercase tracking-tight text-destructive">Wipe Local Storage</h4>
                      <p className="text-[10px] font-medium text-muted-foreground italic leading-relaxed">Deletes all locally cached records and import data from this device.</p>
                    </div>
                  </div>
                  <Button variant="ghost" onClick={() => setIsNukeDialogOpen(true)} className="w-full h-14 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] text-destructive border-2 border-transparent hover:border-destructive/20 hover:bg-destructive/10 transition-all">
                    Reset Local Register
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialogs */}
      <AlertDialog open={isNukeDialogOpen} onOpenChange={setIsNukeDialogOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-destructive/20 p-10 shadow-3xl bg-background">
          <AlertDialogHeader className="space-y-4">
            <div className="p-4 bg-destructive/10 rounded-2xl w-fit"><Bomb className="h-10 w-10 text-destructive" /></div>
            <AlertDialogTitle className="text-2xl font-black uppercase text-destructive tracking-tight">Clear Local Data?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium italic text-muted-foreground leading-relaxed">
              This will permanently delete all local asset records and pending updates from this device. Records already synced to the cloud will remain safe.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-12 px-8 rounded-2xl font-bold border-2 m-0">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleNukeRegistry} className="h-12 px-10 rounded-2xl bg-destructive text-white font-black uppercase text-[10px] m-0 shadow-xl shadow-destructive/20">Execute Wipe</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportScannerDialog isOpen={isImportScanOpen} onOpenChange={setIsImportScanOpen} />

      {selectedSheetDef && (
        <ColumnCustomizationSheet 
          isOpen={isColumnSheetOpen}
          onOpenChange={setIsColumnSheetOpen}
          sheetDefinition={selectedSheetDef}
          originalSheetName={selectedSheetDef.name}
          onSave={(orig, newDef) => {
            const updatedGrants = draftSettings.grants.map(g => {
              if (g.id === activeGrantIdForSchema) {
                const next = { ...g.sheetDefinitions };
                next[newDef.name] = newDef;
                if (orig && orig !== newDef.name) delete next[orig];
                return { ...g, sheetDefinitions: next };
              }
              return g;
            });
            handleSettingChange('grants', updatedGrants);
          }}
        />
      )}
    </div>
  );
}

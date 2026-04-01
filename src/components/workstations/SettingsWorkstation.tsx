'use client';

/**
 * @fileOverview SettingsWorkstation - Master Settings Manager.
 * Phase 131: Renamed naming scheme to be asset manager friendly.
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
  SlidersHorizontal
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
import { discoverTemplatesFromWorkbook } from '@/lib/excel-parser';
import { cn } from '@/lib/utils';
import type { AppSettings, SheetDefinition, Grant, UXMode } from '@/types/domain';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { TravelReportDialog } from '@/components/travel-report-dialog';
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
  const { appSettings, refreshRegistry, settingsLoaded, isOnline } = useAppState();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const { setTheme, theme } = useTheme();

  const [draftSettings, setDraftSettings] = useState<AppSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isNukeDialogOpen, setIsNukeDialogOpen] = useState(false);
  
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
    setDraftSettings({ ...draftSettings, [key]: value });
  };

  const handleCommitChanges = async () => {
    if (!draftSettings) return;
    setIsSaving(true);
    try {
      await FirestoreService.updateSettings(draftSettings);
      await storage.saveSettings(draftSettings);
      await refreshRegistry();
      toast({ title: "Configuration Updated", description: "Global settings have been saved successfully." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTemplateDiscovery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !draftSettings) return;

    setIsDiscovering(true);
    try {
      const discovered = await discoverTemplatesFromWorkbook(file);
      const activeGrantId = draftSettings.activeGrantId;
      if (!activeGrantId) throw new Error("Please select an active project scope first.");

      const updatedGrants = draftSettings.grants.map(g => {
        if (g.id === activeGrantId) {
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

      handleSettingChange('grants', updatedGrants);
      toast({ title: "Template Discovered", description: `Found ${discovered.length} record categories.` });
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
      toast({ title: "Cache Cleared", description: "Local asset data has been reset." });
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
              <SectionHeading title="Project Management" description="Manage active projects and data schemas" icon={LayoutGrid} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {draftSettings.grants.map((grant) => {
                  const isActive = draftSettings.activeGrantId === grant.id;
                  return (
                    <Card key={grant.id} className={cn(
                      "border-2 transition-all duration-500 rounded-[2.5rem] overflow-hidden bg-card/50 shadow-xl",
                      isActive ? "border-primary/40 ring-4 ring-primary/5" : "border-border/40"
                    )}>
                      <CardHeader className="p-8 pb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={cn("p-2 rounded-xl shadow-inner", isActive ? "bg-primary text-primary-foreground" : "bg-muted")}>
                              <Database className="h-5 w-5" />
                            </div>
                            <div>
                              <Input 
                                value={grant.name} 
                                onChange={(e) => handleSettingChange('grants', draftSettings.grants.map(g => g.id === grant.id ? { ...g, name: e.target.value } : g))}
                                className="border-none bg-transparent font-black text-xl uppercase tracking-tighter p-0 h-auto focus-visible:ring-0 shadow-none"
                              />
                              <p className="text-[9px] font-mono text-muted-foreground uppercase mt-1 opacity-40">PROJECT_ID: {grant.id.split('-')[0]}</p>
                            </div>
                          </div>
                          {isActive ? (
                            <Badge className="bg-primary text-primary-foreground font-black uppercase text-[8px] h-6 px-3 rounded-full">SELECTED</Badge>
                          ) : (
                            <Button variant="ghost" size="sm" onClick={() => handleSettingChange('activeGrantId', grant.id)} className="h-8 px-4 rounded-xl text-[9px] font-black uppercase border-2 border-border/40 hover:bg-primary/5">Activate</Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="p-8 pt-4 space-y-6">
                        <div className="space-y-3">
                          <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60 pl-1">Record Categories</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {Object.keys(grant.sheetDefinitions || {}).map(sheetName => (
                              <div key={sheetName} className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/40 group hover:border-primary/20 transition-all">
                                <span className="text-[10px] font-black uppercase truncate max-w-[120px]">{sheetName}</span>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => { setSelectedSheetDef(grant.sheetDefinitions[sheetName]); setActiveGrantIdForSchema(grant.id); setIsColumnSheetOpen(true); }}
                                  className="h-8 w-8 rounded-lg text-primary opacity-40 group-hover:opacity-100 hover:bg-primary/10 transition-all"
                                  title="Configure Headers"
                                >
                                  <Wrench className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                        {isActive && (
                          <div className="grid grid-cols-2 gap-3 pt-2">
                            <input type="file" ref={templateInputRef} onChange={handleTemplateDiscovery} className="hidden" accept=".xlsx,.xls" />
                            <Button variant="outline" onClick={() => templateInputRef.current?.click()} disabled={isDiscovering} className="h-12 rounded-2xl border-white/10 text-foreground font-black uppercase text-[9px] tracking-widest gap-2 bg-muted/10">
                              {isDiscovering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileCode className="h-3.5 w-3.5" />}
                              Sync Schema
                            </Button>
                            <Button variant="outline" className="h-12 rounded-2xl border-white/10 text-foreground font-black uppercase text-[9px] tracking-widest gap-2 bg-muted/10">
                              <PlusCircle className="h-3.5 w-3.5" /> New Category
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
                <SectionHeading title="Advanced Actions" description="Caution: Irreversible data operations" icon={Bomb} />
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

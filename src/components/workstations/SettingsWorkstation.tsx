'use client';

/**
 * @fileOverview SettingsWorkstation - Master Settings Manager.
 * Phase 180: Unified Administration workstation with consolidated Infrastructure and Database tabs.
 * Resolved template import bug by correctly mapping schema discovery results.
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
  Plus,
  Network,
  Cpu,
  Hammer,
  Terminal,
  Server,
  Cloud
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
import { VirtualDBService } from '@/services/virtual-db-service';
import { SystemDiagnostics, type DiagnosticResult } from '@/lib/diagnostics';
import { cn } from '@/lib/utils';
import type { AppSettings, SheetDefinition, Grant, UXMode, AuthorityNode } from '@/types/domain';
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
  const { 
    appSettings, 
    setAppSettings, 
    refreshRegistry, 
    isOnline, 
    setReadAuthority,
    settingsLoaded 
  } = useAppState();
  
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

  // Diagnostics and Health states
  const [diagnosticPulse, setDiagnosticPulse] = useState<DiagnosticResult[] | null>(null);
  const [isTesting, setIsTesting] = useState(false);

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
      toast({ title: "Configuration Broadcast Complete" });
    } catch (e) {
      toast({ variant: "destructive", title: "Broadcast Failure" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTemplateDiscovery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !draftSettings) return;

    setIsDiscovering(true);
    try {
      const discovered = await parseExcelForTemplate(file);
      const activeId = draftSettings.activeGrantId;
      if (!activeId) throw new Error("Select an active project scope first.");

      // CRITICAL FIX: Map discovered templates to the correct 'grants' key in draft state
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

      handleSettingChange('grants', updatedGrants);
      toast({ title: "Template Found", description: `Synchronized ${discovered.length} sheet schemas.` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Scan Failed", description: err.message });
    } finally {
      setIsDiscovering(false);
      if (templateInputRef.current) templateInputRef.current.value = "";
    }
  };

  const handleRunDiagnostics = async () => {
    setIsTesting(true);
    try {
      const res = await SystemDiagnostics.runSelfTest();
      setDiagnosticPulse(res);
      toast({ title: "Heartbeat Stable" });
    } finally {
      setIsTesting(false);
    }
  };

  const executeFailover = async (target: AuthorityNode) => {
    setIsSaving(true);
    try {
      await setReadAuthority(target);
      toast({ title: "Authority Shifted", description: `Read source: ${target}` });
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

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-40 animate-in fade-in duration-700">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
        <div className="space-y-1">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tighter text-foreground uppercase flex items-center gap-4 leading-none">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <SlidersHorizontal className="h-8 w-8 text-primary" />
            </div>
            Settings Manager
          </h2>
          <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">
            Unified System Administration & Technical Governance
          </p>
        </div>
        <Button 
          onClick={handleCommitChanges} 
          disabled={!hasChanges || isSaving}
          className="h-14 px-10 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 bg-primary text-black flex items-center gap-3 transition-transform hover:scale-105 active:scale-95"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Configuration
        </Button>
      </div>

      <Tabs defaultValue="environment" className="space-y-10">
        <div className="bg-muted/20 p-1.5 rounded-[2rem] border-2 border-border/40 overflow-hidden shadow-sm">
          <TabsList className="bg-transparent border-none p-0 h-auto gap-1.5 flex items-center w-full">
            <TabsTrigger value="environment" className="flex-1 px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm">
              General
            </TabsTrigger>
            <TabsTrigger value="registry" className="flex-1 px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm">
              Inventory
            </TabsTrigger>
            <TabsTrigger value="users" className="flex-1 px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm">
              Users
            </TabsTrigger>
            <TabsTrigger value="database" className="flex-1 px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm">
              Database
            </TabsTrigger>
            <TabsTrigger value="infrastructure" className="flex-1 px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm">
              Infrastructure
            </TabsTrigger>
          </TabsList>
        </div>

        {/* --- 1. GENERAL TAB --- */}
        <TabsContent value="environment" className="space-y-10 outline-none m-0 animate-in fade-in slide-in-from-bottom-2">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 px-1">
            <div className="space-y-10">
              <SectionHeading title="Visual Identity" description="System theming and surface logic" icon={Palette} />
              <div className="flex gap-4 p-6 rounded-[2rem] border-2 border-border/40 bg-card/50 items-center justify-between">
                <span className="text-sm font-black uppercase">Color Theme</span>
                <div className="flex gap-2 p-1 bg-muted/50 rounded-xl border-2">
                  <Button variant={theme === 'light' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTheme('light')} className="h-9 px-4 rounded-lg font-black uppercase text-[9px]">Light</Button>
                  <Button variant={theme === 'dark' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTheme('dark')} className="h-9 px-4 rounded-lg font-black uppercase text-[9px]">Dark</Button>
                </div>
              </div>
            </div>
            <div className="space-y-10">
              <SectionHeading title="Operational Mode" description="Control complexity level" icon={GraduationCap} />
              <div className="p-6 rounded-[2rem] border-2 border-border/40 bg-card/50 flex items-center justify-between">
                <span className="text-sm font-black uppercase">Interface</span>
                <Select value={draftSettings.uxMode} onValueChange={(v) => handleSettingChange('uxMode', v as UXMode)}>
                  <SelectTrigger className="w-40 h-11 rounded-xl font-black uppercase text-[10px] border-2"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="beginner" className="text-[10px] font-black uppercase">Beginner</SelectItem>
                    <SelectItem value="advanced" className="text-[10px] font-black uppercase">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* --- 2. INVENTORY TAB --- */}
        <TabsContent value="registry" className="space-y-10 outline-none m-0 animate-in fade-in slide-in-from-bottom-2 px-1">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-lg font-black uppercase px-1">Active Projects</h3>
              <div className="flex gap-3">
                <Input placeholder="Project name..." value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} className="h-14 bg-white/[0.03] border-white/10 rounded-xl font-medium text-sm text-white" />
                <Button onClick={handleAddProject} className="h-14 px-8 rounded-xl bg-primary text-black font-black uppercase text-[11px] gap-2"><PlusCircle className="h-4 w-4" /> Add</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {draftSettings.grants.map((grant) => {
                const isActive = draftSettings.activeGrantId === grant.id;
                return (
                  <Card key={grant.id} className={cn("border-2 rounded-[2.5rem] overflow-hidden bg-card/50", isActive ? "border-primary/40 ring-4 ring-primary/5" : "border-border/40")}>
                    <CardHeader className="p-8 pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <ChevronsUpDown className="h-4 w-4 opacity-20" />
                          <span className="text-xl font-black uppercase text-white tracking-tight">{grant.name}</span>
                          {isActive && <Badge className="bg-primary text-black font-black uppercase text-[9px] h-6 px-3 rounded-full">Active</Badge>}
                        </div>
                        <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
                          {!isActive && <button onClick={() => handleSettingChange('activeGrantId', grant.id)} className="text-primary">Set Active</button>}
                          <button className="text-white/40">Rename</button>
                          <button onClick={() => handleDeleteProject(grant.id)} className="text-red-600">Delete</button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-8 pt-4 space-y-6">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">Sheet Definitions</h4>
                      <div className="space-y-2">
                        {Object.keys(grant.sheetDefinitions || {}).map(sheetName => (
                          <div key={sheetName} className="flex items-center justify-between p-4 bg-black border border-white/5 rounded-2xl group hover:border-white/20 transition-all">
                            <span className="text-xs font-black uppercase text-white/80">{sheetName}</span>
                            <div className="flex items-center gap-4 text-white/20">
                              <button><Eye className="h-4 w-4 hover:text-white" /></button>
                              <button onClick={() => { setSelectedSheetDef(grant.sheetDefinitions[sheetName]); setActiveGrantIdForSchema(grant.id); setIsColumnSheetOpen(true); }}><Wrench className="h-4 w-4 hover:text-primary" /></button>
                              <button onClick={() => handleDeleteSheet(grant.id, sheetName)}><Trash2 className="h-4 w-4 hover:text-red-600" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                      {isActive && (
                        <div className="grid grid-cols-3 gap-2">
                          <Button variant="outline" className="h-12 text-[8px] font-black uppercase rounded-xl">Add Manually</Button>
                          <input type="file" ref={templateInputRef} onChange={handleTemplateDiscovery} className="hidden" accept=".xlsx,.xls" />
                          <Button variant="outline" onClick={() => templateInputRef.current?.click()} className="h-12 text-[8px] font-black uppercase rounded-xl">Import Template</Button>
                          <Button variant="outline" onClick={() => setIsImportScanOpen(true)} className="h-12 text-[8px] font-black uppercase rounded-xl">Scan Workbook</Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* --- 3. USERS TAB --- */}
        <TabsContent value="users" className="outline-none m-0 animate-in fade-in slide-in-from-bottom-2 px-1">
          <SectionHeading title="User Management" description="Auditor directory and regional scope" icon={Users} />
          <Card className="rounded-[2.5rem] border-2 border-border/40 bg-card/50 p-8 shadow-2xl">
            <UserManagement users={draftSettings.authorizedUsers} onUsersChange={(newUsers) => handleSettingChange('authorizedUsers', newUsers)} adminProfile={userProfile} />
          </Card>
        </TabsContent>

        {/* --- 4. DATABASE TAB --- */}
        <TabsContent value="database" className="outline-none m-0 animate-in fade-in slide-in-from-bottom-2 px-1">
          <SectionHeading title="Database Management" description="Global register controls" icon={Database} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="bg-card/50 border-border/40 rounded-2xl p-8 space-y-6">
              <h3 className="text-xl font-black uppercase">Synchronization</h3>
              <Button variant="outline" onClick={refreshRegistry} className="w-full h-12 rounded-xl font-black uppercase text-[10px] gap-3 justify-start"><RefreshCw className="h-4 w-4 text-primary" /> Reconcile Cloud & Local</Button>
              <Button variant="outline" onClick={refreshRegistry} className="w-full h-12 rounded-xl font-black uppercase text-[10px] gap-3 justify-start"><Download className="h-4 w-4 text-primary" /> Pull Full State</Button>
            </Card>
            <Card className="bg-destructive/5 border-destructive/20 border-2 border-dashed rounded-2xl p-8 space-y-6">
              <h3 className="text-xl font-black uppercase text-destructive">Danger Zone</h3>
              <Button onClick={() => setIsNukeDialogOpen(true)} className="w-full h-14 bg-destructive text-white rounded-xl font-black uppercase text-xs tracking-widest"><Bomb className="h-5 w-5 mr-3" /> RESET GLOBAL REGISTER</Button>
            </Card>
          </div>
        </TabsContent>

        {/* --- 5. INFRASTRUCTURE TAB --- */}
        <TabsContent value="infrastructure" className="outline-none m-0 animate-in fade-in slide-in-from-bottom-2 px-1">
          <SectionHeading title="System Infrastructure" description="Tiered storage redundancy" icon={Monitor} />
          <Card className="rounded-[2.5rem] border-2 border-primary/20 bg-primary/[0.02] p-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="flex flex-col items-center gap-4">
                <div className="p-6 rounded-[2rem] bg-amber-500/10 border-2 border-amber-500/20"><Smartphone className="h-10 w-10 text-amber-600" /></div>
                <p className="text-[10px] font-black uppercase text-amber-700">Local Cache</p>
              </div>
              <ArrowRightLeft className="h-6 w-6 text-white/10" />
              <div className="flex flex-col items-center gap-4 relative">
                <div className={cn("p-6 rounded-[2rem] border-2", appSettings?.readAuthority === 'RTDB' ? "border-green-500 bg-green-500/10" : "border-white/5")}><Zap className="h-10 w-10 text-green-600" /></div>
                <p className="text-[10px] font-black uppercase text-green-700">Standby Mirror</p>
                {appSettings?.readAuthority === 'RTDB' && <Badge className="absolute -top-4 bg-green-600 text-[8px] font-black uppercase h-5 px-2">Primary</Badge>}
              </div>
              <ArrowRightLeft className="h-6 w-6 text-white/10" />
              <div className="flex flex-col items-center gap-4 relative">
                <div className={cn("p-6 rounded-[2rem] border-2", appSettings?.readAuthority === 'FIRESTORE' ? "border-blue-500 bg-blue-500/10" : "border-white/5")}><Cloud className="h-10 w-10 text-blue-600" /></div>
                <p className="text-[10px] font-black uppercase text-blue-700">Cloud Authority</p>
                {appSettings?.readAuthority === 'FIRESTORE' && <Badge className="absolute -top-4 bg-blue-600 text-[8px] font-black uppercase h-5 px-2">Primary</Badge>}
              </div>
            </div>
            <div className="mt-12 flex justify-center">
              <Button variant="outline" onClick={handleRunDiagnostics} disabled={isTesting} className="h-12 px-8 rounded-xl font-black uppercase text-[10px] border-2">{isTesting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Cpu className="h-4 w-4 mr-2" />} Run Diagnostics</Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <ColumnCustomizationSheet isOpen={isColumnSheetOpen} onOpenChange={setIsColumnSheetOpen} sheetDefinition={selectedSheetDef!} originalSheetName={originalSheetName} onSave={(orig, newDef) => {
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
      }} />
      <ImportScannerDialog isOpen={isImportScanOpen} onOpenChange={setIsImportScanOpen} />
      <AlertDialog open={isNukeDialogOpen} onOpenChange={setIsNukeDialogOpen}><AlertDialogContent className="rounded-3xl p-10"><AlertDialogHeader className="space-y-4"><Bomb className="h-10 w-10 text-destructive" /><AlertDialogTitle className="text-2xl font-black uppercase text-destructive">Wipe Global Register?</AlertDialogTitle><AlertDialogDescription className="text-sm font-medium italic">This will delete all local, cloud, and mirror assets. Irreversible.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="mt-8 gap-3"><AlertDialogCancel className="h-12 px-8 rounded-2xl font-bold border-2">Abort</AlertDialogCancel><AlertDialogAction onClick={handleNukeRegistry} className="h-12 px-10 rounded-2xl bg-destructive text-white font-black uppercase">Confirm Wipe</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}

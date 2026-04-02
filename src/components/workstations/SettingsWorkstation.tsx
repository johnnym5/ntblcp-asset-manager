'use client';

/**
 * @fileOverview SettingsWorkstation - Master Settings Manager.
 * Phase 240: Overhauled Sheet Definitions to include Structural Template Inspection.
 * Implemented separation of Template Discovery from Asset Ingestion.
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
  Database, 
  Zap,
  Lock,
  PlusCircle,
  FileUp,
  ScanSearch,
  Wrench,
  Users,
  Loader2,
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
  Cloud,
  ArrowRightLeft,
  KeyRound,
  History,
  Check,
  DatabaseZap,
  ListFilter,
  ChevronDown
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
import { Separator } from '@/components/ui/separator';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export function SettingsWorkstation() {
  const { 
    appSettings, 
    setAppSettings, 
    refreshRegistry, 
    isOnline, 
    setReadAuthority,
    settingsLoaded,
    setActiveView
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
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isColumnSheetOpen, setIsColumnSheetOpen] = useState(false);
  const [selectedSheetDef, setSelectedSheetDef] = useState<SheetDefinition | null>(null);
  const [originalSheetName, setOriginalSheetName] = useState<string | null>(null);
  const [activeGrantIdForSchema, setActiveGrantIdForSchema] = useState<string | null>(null);
  
  const templateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (appSettings) {
      setDraftSettings(JSON.parse(JSON.stringify(appSettings)));
    }
  }, [appSettings]);

  const isAdmin = userProfile?.isAdmin || false;

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
      setAppSettings(draftSettings);
      toast({ title: "Configuration Applied", description: "Global registry settings have been synchronized." });
      await refreshRegistry();
    } catch (e: any) {
      const errorMessage = e?.message || "Connectivity pulse lost during commit.";
      toast({ 
        variant: "destructive", 
        title: "Save Interrupted", 
        description: errorMessage 
      });
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
    toast({ title: "Project Added to Draft" });
  };

  const handleDeleteProject = (id: string) => {
    if (!draftSettings || draftSettings.grants.length <= 1) return;
    const updatedGrants = draftSettings.grants.filter(g => g.id !== id);
    handleSettingChange('grants', updatedGrants);
    if (draftSettings.activeGrantId === id) {
      handleSettingChange('activeGrantId', updatedGrants[0]?.id || null);
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
      if (!activeId) throw new Error("Select a project first.");

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
      toast({ title: "Template Discovered", description: `Added ${discovered.length} sheet definitions.` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Scan Failed", description: err.message });
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleNukeRegistry = async () => {
    setIsSaving(true);
    try {
      await VirtualDBService.purgeGlobalRegistry();
      toast({ title: "Global Register Reset" });
      await refreshRegistry();
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

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-700 pb-40">
      
      {/* 1. Master Header */}
      <div className="flex items-center justify-between px-1 mb-8">
        <div className="space-y-1">
          <h2 className="text-2xl font-black uppercase text-white tracking-tight">Settings</h2>
          <p className="text-[11px] font-medium text-white/40">Manage application settings and preferences.</p>
        </div>
        <button 
          onClick={() => setActiveView('DASHBOARD')}
          className="h-10 w-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl transition-all"
        >
          <X className="h-5 w-5 text-white/40" />
        </button>
      </div>

      <Tabs defaultValue="general" className="space-y-10">
        <div className="bg-[#080808] p-1 rounded-2xl border border-white/5 shadow-inner">
          <TabsList className="bg-transparent border-none p-0 h-auto gap-1 flex items-center w-full">
            <TabsTrigger value="general" className="flex-1 px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-white transition-all">
              <Settings className="h-3.5 w-3.5" /> General
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="projects" className="flex-1 px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-white transition-all">
                <PlusCircle className="h-3.5 w-3.5" /> Projects & Sheets
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="users" className="flex-1 px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-white transition-all">
                <Users className="h-3.5 w-3.5" /> Users
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="history" className="flex-1 px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-white transition-all">
                <History className="h-3.5 w-3.5" /> History
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="general" className="space-y-12 m-0">
          <div className="space-y-6">
            <h3 className="text-xl font-black uppercase text-white tracking-tight px-1">Appearance</h3>
            <Card className="bg-[#050505] border-white/5 rounded-[1.5rem] p-8 shadow-xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-2 bg-white/5 rounded-lg"><Globe className="h-4 w-4 text-white/40" /></div>
                <span className="text-[11px] font-black uppercase tracking-widest text-white/60">Theme Selection</span>
              </div>
              <div className="flex flex-wrap gap-4">
                <Button variant={theme === 'light' ? 'secondary' : 'outline'} onClick={() => setTheme('light')} className="h-14 px-12 rounded-2xl font-black uppercase text-[10px] tracking-widest border-white/10">Light</Button>
                <Button variant={theme === 'dark' ? 'secondary' : 'outline'} onClick={() => setTheme('dark')} className="h-14 px-12 rounded-2xl font-black uppercase text-[10px] tracking-widest border-white/10">Dark</Button>
                <Button variant={theme === 'system' ? 'secondary' : 'outline'} onClick={() => setTheme('system')} className="h-14 px-12 rounded-2xl font-black uppercase text-[10px] tracking-widest border-white/10">System</Button>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projects" className="space-y-10 m-0">
          {isAdmin && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
                <h3 className="text-xl font-black uppercase text-white tracking-tight">Manage Projects</h3>
                <div className="flex gap-3">
                  <Input placeholder="New project name..." value={newProjectName} onChange={e => setNewProjectName(e.target.value)} className="h-14 bg-white/[0.03] border-white/10 rounded-xl font-medium text-sm text-white" />
                  <Button onClick={handleAddProject} className="h-14 px-8 rounded-xl bg-primary text-black font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl shadow-primary/20">
                    <PlusCircle className="h-4 w-4" /> Add Project
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {draftSettings.grants.map(grant => {
                  const isActive = draftSettings.activeGrantId === grant.id;
                  return (
                    <Card key={grant.id} className={cn(
                      "bg-[#050505] border-2 rounded-[2rem] overflow-hidden shadow-xl transition-all duration-500",
                      isActive ? "border-primary/40 ring-4 ring-primary/5" : "border-white/5"
                    )}>
                      <CardHeader className="p-8 pb-4 border-b border-white/5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <ChevronsUpDown className="h-4 w-4 text-white/20" />
                            <span className="text-xl font-black uppercase text-white tracking-tight">{grant.name}</span>
                            {isActive && <Badge className="bg-primary text-black font-black uppercase text-[9px] h-6 px-3 rounded-full">Active</Badge>}
                          </div>
                          <div className="flex items-center gap-6">
                            {!isActive && <button onClick={() => handleSettingChange('activeGrantId', grant.id)} className="text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-80 transition-opacity">Set Active</button>}
                            <button onClick={() => handleDeleteProject(grant.id)} className="text-[10px] font-black uppercase tracking-widest text-red-600 hover:text-red-500">Delete</button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-8 pt-6 space-y-10">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between px-1">
                            <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-white/40">Registered Templates</h4>
                            <Badge variant="outline" className="h-6 px-3 border-white/10 text-white/40 font-black text-[9px]">{Object.keys(grant.sheetDefinitions || {}).length} SHEETS</Badge>
                          </div>
                          
                          <div className="space-y-3">
                            {Object.keys(grant.sheetDefinitions || {}).map(sheetName => {
                              const definition = grant.sheetDefinitions[sheetName];
                              return (
                                <Collapsible key={sheetName}>
                                  <div className="flex flex-col rounded-2xl bg-black border border-white/5 overflow-hidden group hover:border-white/20 transition-all shadow-inner">
                                    <div className="flex items-center justify-between p-5">
                                      <CollapsibleTrigger asChild>
                                        <div className="flex items-center gap-4 cursor-pointer group-hover:text-primary transition-colors">
                                          <div className="p-2 bg-white/5 rounded-lg"><LayoutGrid className="h-4 w-4 text-white/40 group-hover:text-primary" /></div>
                                          <div className="flex flex-col">
                                            <span className="text-xs font-black uppercase text-white/80">{sheetName}</span>
                                            <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Structural Template</span>
                                          </div>
                                          <ChevronDown className="h-3 w-3 opacity-20" />
                                        </div>
                                      </CollapsibleTrigger>
                                      
                                      <div className="flex items-center gap-4">
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          onClick={() => setActiveView('IMPORT')}
                                          className="h-8 px-3 rounded-lg font-black uppercase text-[8px] tracking-widest gap-2 bg-white/5 hover:bg-primary hover:text-black"
                                        >
                                          <ScanSearch className="h-3 w-3" /> Sync Data
                                        </Button>
                                        <div className="flex items-center gap-3 text-white/20 border-l border-white/5 pl-4">
                                          <button onClick={() => { setSelectedSheetDef(definition); setActiveGrantIdForSchema(grant.id); setOriginalSheetName(sheetName); setIsColumnSheetOpen(true); }} className="hover:text-primary transition-all"><Wrench className="h-4 w-4" /></button>
                                          <button onClick={() => handleDeleteSheet(grant.id, sheetName)} className="hover:text-red-600 transition-all"><Trash2 className="h-4 w-4" /></button>
                                        </div>
                                      </div>
                                    </div>

                                    <CollapsibleContent className="px-5 pb-5 animate-in slide-in-from-top-2 duration-300">
                                      <div className="pt-4 border-t border-white/5 space-y-6">
                                        {definition.groups && definition.groups.length > 0 ? (
                                          <div className="space-y-4">
                                            <p className="text-[9px] font-black uppercase text-white/20 tracking-widest">Discovered Structural Nodes</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                              {definition.groups.map((group: any, idx: number) => (
                                                <Collapsible key={idx}>
                                                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3 group/node">
                                                    <CollapsibleTrigger asChild>
                                                      <div className="flex items-center justify-between cursor-pointer">
                                                        <div className="flex items-center gap-3">
                                                          <Badge className="bg-primary/10 text-primary border-primary/20 text-[8px] font-black">{idx + 1}</Badge>
                                                          <span className="text-[10px] font-black uppercase text-white/60 group-hover/node:text-white">{group.groupName}</span>
                                                        </div>
                                                        <ChevronDown className="h-3 w-3 opacity-20" />
                                                      </div>
                                                    </CollapsibleTrigger>
                                                    <CollapsibleContent className="pt-3 border-t border-white/5">
                                                      <div className="flex flex-wrap gap-1.5">
                                                        {group.headerSet.map((h: string, i: number) => (
                                                          <Badge key={i} variant="secondary" className="bg-black border border-white/5 text-[7px] font-mono text-white/20">{h}</Badge>
                                                        ))}
                                                      </div>
                                                    </CollapsibleContent>
                                                  </div>
                                                </Collapsible>
                                              ))}
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="py-6 text-center opacity-20"><Info className="h-8 w-8 mx-auto mb-2" /><p className="text-[9px] font-black uppercase">No structural node pulses detected.</p></div>
                                        )}
                                      </div>
                                    </CollapsibleContent>
                                  </div>
                                </Collapsible>
                              );
                            })}
                          </div>
                        </div>

                        {isActive && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input type="file" ref={templateInputRef} onChange={handleTemplateDiscovery} className="hidden" accept=".xlsx,.xls" />
                            <Button variant="outline" onClick={() => templateInputRef.current?.click()} className="h-16 rounded-[1.5rem] bg-white/[0.02] border-white/10 font-black uppercase text-[10px] tracking-widest gap-3 hover:bg-white/5 text-white/60">
                              <FileCode className="h-5 w-5 text-primary" /> Import Template Pulse
                            </Button>
                            <Button variant="outline" onClick={() => setActiveView('IMPORT')} className="h-16 rounded-[1.5rem] bg-white/[0.02] border-white/10 font-black uppercase text-[10px] tracking-widest gap-3 hover:bg-white/5 text-white/60">
                              <DatabaseZap className="h-5 w-5 text-primary" /> Ingest Multi-Template Workbook
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="users" className="m-0">
          <h3 className="text-xl font-black uppercase text-white tracking-tight mb-6 px-1">User Governance</h3>
          <Card className="bg-[#050505] border-white/5 rounded-[2rem] p-8 shadow-xl">
            <UserManagement users={draftSettings.authorizedUsers} onUsersChange={newUsers => handleSettingChange('authorizedUsers', newUsers)} adminProfile={userProfile} />
          </Card>
        </TabsContent>
      </Tabs>

      <div className="fixed bottom-0 left-0 right-0 p-8 bg-black/80 backdrop-blur-3xl border-t border-white/5 flex items-center justify-between z-50">
        <Button variant="ghost" onClick={() => setActiveView('DASHBOARD')} className="h-14 px-12 rounded-2xl bg-white/[0.05] text-white font-black uppercase text-[11px] tracking-[0.25em] hover:bg-white/10">Cancel</Button>
        <Button onClick={handleCommitChanges} disabled={!hasChanges || isSaving} className="h-14 px-16 rounded-2xl bg-primary text-black font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 hover:bg-primary/90">
          {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-3" /> : <ShieldCheck className="h-5 w-5 mr-3" />} Commit Configuration
        </Button>
      </div>

      {selectedSheetDef && (
        <ColumnCustomizationSheet 
          isOpen={isColumnSheetOpen} 
          onOpenChange={setIsColumnSheetOpen} 
          sheetDefinition={selectedSheetDef} 
          originalSheetName={originalSheetName} 
          onSave={(orig, newDef, applyToAll) => {
            if (!draftSettings) return;
            const updatedGrants = draftSettings.grants.map(g => {
              if (g.id === activeGrantIdForSchema) {
                const next = { ...g.sheetDefinitions };
                if (applyToAll) Object.keys(next).forEach(k => { next[k] = { ...newDef, name: k }; });
                else { next[newDef.name] = newDef; if (orig && orig !== newDef.name) delete next[orig]; }
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

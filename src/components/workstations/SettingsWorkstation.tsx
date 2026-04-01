'use client';

/**
 * @fileOverview SettingsWorkstation - Master Settings Manager.
 * Phase 235: Resolved ReferenceErrors and synchronized import paths.
 * Phase 236: Implemented handleCommitChanges and strict RBAC visibility.
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
  Check
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
  
  // Password State
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
    } catch (e) {
      toast({ variant: "destructive", title: "Save Interrupted", description: "Connectivity pulse lost during commit." });
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
        {/* 2. Tab Bar */}
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

        {/* --- 3. GENERAL TAB --- */}
        <TabsContent value="general" className="space-y-12 m-0 animate-in fade-in slide-in-from-bottom-2">
          
          {/* Appearance Section */}
          <div className="space-y-6">
            <h3 className="text-xl font-black uppercase text-white tracking-tight px-1">Appearance</h3>
            <Card className="bg-[#050505] border-white/5 rounded-[1.5rem] p-8 shadow-xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-2 bg-white/5 rounded-lg"><Globe className="h-4 w-4 text-white/40" /></div>
                <span className="text-[11px] font-black uppercase tracking-widest text-white/60">Theme</span>
              </div>
              <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                <Button 
                  variant={theme === 'light' ? 'secondary' : 'outline'} 
                  onClick={() => setTheme('light')}
                  className="h-14 px-12 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-3 border-white/10"
                >
                  <Sun className="h-4 w-4" /> Light
                </Button>
                <Button 
                  variant={theme === 'dark' ? 'secondary' : 'outline'} 
                  onClick={() => setTheme('dark')}
                  className="h-14 px-12 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-3 border-white/10"
                >
                  <Moon className="h-4 w-4" /> Dark
                </Button>
                <Button 
                  variant={theme === 'system' ? 'secondary' : 'outline'} 
                  onClick={() => setTheme('system')}
                  className="h-14 px-12 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-3 border-white/10"
                >
                  <Database className="h-4 w-4" /> System
                </Button>
              </div>
            </Card>
          </div>

          {/* Security Section */}
          <div className="space-y-6">
            <h3 className="text-xl font-black uppercase text-white tracking-tight px-1">Security</h3>
            <Card className="bg-[#050505] border-white/5 rounded-[1.5rem] p-8 shadow-xl space-y-8">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-white/5 rounded-lg"><KeyRound className="h-4 w-4 text-white/40" /></div>
                <span className="text-[11px] font-black uppercase tracking-widest text-white/60">Change Your Password</span>
              </div>
              
              <div className="grid grid-cols-1 gap-6 max-w-2xl">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-white/40 pl-1">Current Password</Label>
                  <Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="h-14 bg-black border-white/10 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-white/40 pl-1">New Password</Label>
                  <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="h-14 bg-black border-white/10 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-white/40 pl-1">Confirm New Password</Label>
                  <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="h-14 bg-black border-white/10 rounded-xl" />
                </div>
                <Button className="w-fit h-12 px-10 rounded-xl bg-primary text-black font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20">
                  Stage Password Change
                </Button>
              </div>
            </Card>
          </div>

          {/* Global Admin Section */}
          {isAdmin && (
            <div className="space-y-6">
              <h3 className="text-xl font-black uppercase text-white tracking-tight px-1">Global Admin Settings</h3>
              <Card className="bg-[#050505] border-white/5 rounded-[1.5rem] overflow-hidden shadow-xl">
                <div className="p-8 space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-sm font-black uppercase text-white">Application Mode</Label>
                      <p className="text-[10px] font-medium text-white/40 italic">Management: Structural data is locked for non-admins.</p>
                    </div>
                    <Select value={draftSettings.appMode} onValueChange={v => handleSettingChange('appMode', v)}>
                      <SelectTrigger className="w-48 h-12 bg-black border-white/10 rounded-xl font-black uppercase text-[10px] tracking-widest">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0A0A0A] border-white/10">
                        <SelectItem value="management" className="text-[10px] font-black uppercase">Management</SelectItem>
                        <SelectItem value="verification" className="text-[10px] font-black uppercase">Verification</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Separator className="bg-white/5" />

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-sm font-black uppercase text-white">Lock Asset List</Label>
                      <p className="text-[10px] font-medium text-white/40 italic">Disable record creation and deletion for all users.</p>
                    </div>
                    <Switch checked={draftSettings.lockAssetList} onCheckedChange={v => handleSettingChange('lockAssetList', v)} className="data-[state=checked]:bg-primary" />
                  </div>
                </div>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* --- 4. PROJECTS & SHEETS TAB --- */}
        <TabsContent value="projects" className="space-y-10 m-0 animate-in fade-in slide-in-from-bottom-2">
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
                      <CardHeader className="p-8 pb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <ChevronsUpDown className="h-4 w-4 text-white/20" />
                            <span className="text-xl font-black uppercase text-white tracking-tight">{grant.name}</span>
                            {isActive && <Badge className="bg-primary text-black font-black uppercase text-[9px] h-6 px-3 rounded-full">Active</Badge>}
                          </div>
                          <div className="flex items-center gap-6">
                            {!isActive && (
                              <button onClick={() => handleSettingChange('activeGrantId', grant.id)} className="text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-80 transition-opacity">Set Active</button>
                            )}
                            <button className="text-[10px] font-black uppercase tracking-widest text-white/40">Rename</button>
                            <button onClick={() => handleDeleteProject(grant.id)} className="text-[10px] font-black uppercase tracking-widest text-red-600 hover:text-red-500">Delete</button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-8 pt-4 space-y-8">
                        <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-white/40">Sheet Definitions</h4>
                        <div className="space-y-2.5">
                          {Object.keys(grant.sheetDefinitions || {}).map(sheetName => (
                            <div key={sheetName} className="flex items-center justify-between p-5 bg-black border border-white/5 rounded-2xl group hover:border-white/20 transition-all shadow-inner">
                              <span className="text-xs font-black uppercase text-white/80">{sheetName}</span>
                              <div className="flex items-center gap-5 text-white/20">
                                <button className="hover:text-white transition-colors"><Eye className="h-4 w-4" /></button>
                                <button onClick={() => { setSelectedSheetDef(grant.sheetDefinitions[sheetName]); setActiveGrantIdForSchema(grant.id); setOriginalSheetName(sheetName); setIsColumnSheetOpen(true); }} className="hover:text-primary transition-colors"><Wrench className="h-4 w-4" /></button>
                                <button onClick={() => handleDeleteSheet(grant.id, sheetName)} className="hover:text-red-600 transition-colors"><Trash2 className="h-4 w-4" /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                        {isActive && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <Button variant="outline" className="h-14 rounded-2xl bg-white/[0.02] border-white/10 font-black uppercase text-[9px] tracking-widest gap-2.5 text-white/60 hover:text-white">
                              <PlusCircle className="h-4 w-4" /> Add Manually
                            </Button>
                            <input type="file" ref={templateInputRef} onChange={handleTemplateDiscovery} className="hidden" accept=".xlsx,.xls" />
                            <Button variant="outline" onClick={() => templateInputRef.current?.click()} className="h-14 rounded-2xl bg-white/[0.02] border-white/10 font-black uppercase text-[9px] tracking-widest gap-2.5 text-white/60 hover:text-white">
                              <FileUp className="h-4 w-4" /> Import Template
                            </Button>
                            <Button variant="outline" onClick={() => setIsImportScanOpen(true)} className="h-14 rounded-2xl bg-white/[0.02] border-white/10 font-black uppercase text-[9px] tracking-widest gap-2.5 text-white/60 hover:text-white">
                              <ScanSearch className="h-4 w-4" /> Scan & Import Data
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

        {/* --- 5. USERS TAB --- */}
        <TabsContent value="users" className="m-0 animate-in fade-in slide-in-from-bottom-2 px-1">
          {isAdmin && (
            <>
              <h3 className="text-xl font-black uppercase text-white tracking-tight mb-6">User Management</h3>
              <Card className="bg-[#050505] border-white/5 rounded-[2rem] p-8 shadow-xl">
                <UserManagement users={draftSettings.authorizedUsers} onUsersChange={newUsers => handleSettingChange('authorizedUsers', newUsers)} adminProfile={userProfile} />
              </Card>
            </>
          )}
        </TabsContent>

        {/* --- 6. HISTORY TAB --- */}
        <TabsContent value="history" className="space-y-10 m-0 animate-in fade-in slide-in-from-bottom-2 px-1">
          {isAdmin && (
            <>
              <h3 className="text-xl font-black uppercase text-white tracking-tight">System History & Health</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="bg-[#050505] border-white/5 rounded-[2rem] p-8 space-y-6 shadow-xl">
                  <h4 className="text-sm font-black uppercase text-white">Register Synchronization</h4>
                  <div className="space-y-3">
                    <Button variant="outline" onClick={refreshRegistry} className="w-full h-14 rounded-xl font-black uppercase text-[10px] tracking-widest gap-4 justify-start px-6 border-white/10">
                      <RefreshCw className="h-4 w-4 text-primary" /> Sync Local to Cloud Database
                    </Button>
                    <Button variant="outline" onClick={refreshRegistry} className="w-full h-14 rounded-xl font-black uppercase text-[10px] tracking-widest gap-4 justify-start px-6 border-white/10">
                      <Download className="h-4 w-4 text-primary" /> Pull Cloud State to Register
                    </Button>
                  </div>
                </Card>

                <Card className="bg-[#050505] border-white/5 rounded-[2rem] p-8 space-y-6 shadow-xl">
                  <h4 className="text-sm font-black uppercase text-white">Maintenance Pulses</h4>
                  <Button variant="outline" onClick={() => setIsNukeDialogOpen(true)} className="w-full h-14 rounded-xl font-black uppercase text-[10px] tracking-widest gap-4 justify-start px-6 border-destructive/20 text-destructive hover:bg-destructive/5 transition-all">
                    <Bomb className="h-4 w-4" /> Reset Global Asset Register
                  </Button>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* 4. Global Footer Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-8 bg-black/80 backdrop-blur-3xl border-t border-white/5 flex items-center justify-between z-50">
        <Button 
          variant="ghost" 
          onClick={() => setActiveView('DASHBOARD')}
          className="h-14 px-12 rounded-2xl bg-white/[0.05] text-white font-black uppercase text-[11px] tracking-[0.25em] hover:bg-white/10 transition-all active:scale-95"
        >
          Cancel
        </Button>
        <Button 
          onClick={handleCommitChanges}
          disabled={!hasChanges || isSaving}
          className="h-14 px-16 rounded-2xl bg-primary text-black font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
        >
          {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-3" /> : <Check className="h-5 w-5 mr-3" />}
          Apply Configuration
        </Button>
      </div>

      {/* Modals & Drawers */}
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
                if (applyToAll) {
                  Object.keys(next).forEach(k => { next[k] = { ...newDef, name: k }; });
                } else {
                  next[newDef.name] = newDef;
                  if (orig && orig !== newDef.name) delete next[orig];
                }
                return { ...g, sheetDefinitions: next };
              }
              return g;
            });
            handleSettingChange('grants', updatedGrants);
          }} 
        />
      )}
      <ImportScannerDialog isOpen={isImportScanOpen} onOpenChange={setIsImportScanOpen} />
      <AlertDialog open={isNukeDialogOpen} onOpenChange={setIsNukeDialogOpen}>
        <AlertDialogContent className="rounded-3xl p-10 bg-black border-destructive/20 shadow-3xl text-white">
          <AlertDialogHeader className="space-y-4">
            <Bomb className="h-12 w-12 text-destructive" />
            <AlertDialogTitle className="text-2xl font-black uppercase text-destructive">Wipe Global Register?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium italic leading-relaxed text-white/60">
              This action is immutable. You are about to purge all records from local, cloud, and mirror storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-12 px-8 rounded-2xl font-bold border-2 border-white/10 m-0 hover:bg-white/5 transition-all">Abort</AlertDialogCancel>
            <AlertDialogAction onClick={handleNukeRegistry} className="h-12 px-10 rounded-2xl bg-destructive text-white font-black uppercase m-0">Confirm Wipe</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

'use client';

/**
 * @fileOverview SettingsWorkstation - Executive Operational Control.
 * Phase 155: Achieved 100% parity with requested design for Projects, Sheets, and General preferences.
 * Phase 156: Integrated Database Workstation tab for Super Admins.
 */

import React, { useState, useMemo } from 'react';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from 'next-themes';
import { 
  Settings, 
  Palette, 
  Trash2, 
  Users, 
  PlusCircle,
  Database,
  ChevronDown,
  Wrench,
  X,
  Loader2,
  Zap,
  CheckCircle2,
  History,
  Lock,
  Smartphone,
  ShieldCheck,
  Eye,
  ShieldAlert,
  Sun,
  Moon,
  KeyRound,
  LayoutGrid,
  FileUp,
  ScanSearch,
  ChevronsUpDown,
  Layers,
  Search,
  HeartPulse,
  Terminal
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { UserManagement } from '@/components/admin/user-management';
import { FirestoreService } from '@/services/firebase/firestore';
import { storage } from '@/offline/storage';
import { cn } from '@/lib/utils';
import { ColumnCustomizationSheet } from '@/components/column-customization-sheet';
import { AuditLogWorkstation } from './AuditLogWorkstation';
import { ErrorAuditWorkstation } from './ErrorAuditWorkstation';
import { DatabaseWorkstation } from './DatabaseWorkstation';
import type { AppSettings, Grant, SheetDefinition, UXMode } from '@/types/domain';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export function SettingsWorkstation() {
  const { 
    appSettings, 
    setAppSettings, 
    refreshRegistry, 
    isOnline, 
    settingsLoaded,
    setActiveView,
    setActiveGrantId 
  } = useAppState();
  
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const { setTheme, theme } = useTheme();

  const [isSaving, setIsSaving] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');

  // Column Customization State
  const [isColumnSheetOpen, setIsColumnSheetOpen] = useState(false);
  const [selectedSheetDef, setSelectedSheetDef] = useState<SheetDefinition | null>(null);
  const [activeGrantForSchema, setActiveGrantIdForSchema] = useState<string | null>(null);

  // Security State
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });

  const isAdmin = userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPERADMIN';
  const isSuperAdmin = userProfile?.role === 'SUPERADMIN';

  const handleSettingChange = async (key: keyof AppSettings, value: any) => {
    if (!appSettings) return;
    setIsSaving(true);
    try {
      const updatedSettings = { ...appSettings, [key]: value };
      if (isOnline) await FirestoreService.updateSettings({ [key]: value });
      await storage.saveSettings(updatedSettings);
      setAppSettings(updatedSettings);
      toast({ title: "Preferences Updated" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddProject = async () => {
    if (!newProjectName.trim() || !appSettings) return;
    const newGrant: Grant = {
      id: crypto.randomUUID(),
      name: newProjectName.trim(),
      enabledSheets: [],
      sheetDefinitions: {}
    };
    const nextGrants = [...appSettings.grants, newGrant];
    await handleSettingChange('grants', nextGrants);
    setNewProjectName('');
    toast({ title: "Project Created", description: `Added ${newGrant.name} to the registry.` });
  };

  const handleDeleteProject = async (id: string) => {
    if (!appSettings || appSettings.grants.length <= 1) return;
    const updatedGrants = appSettings.grants.filter(g => g.id !== id);
    const updatedSettings = {
      ...appSettings,
      grants: updatedGrants,
      activeGrantId: appSettings.activeGrantId === id ? updatedGrants[0].id : appSettings.activeGrantId
    };
    setAppSettings(updatedSettings);
    await storage.saveSettings(updatedSettings);
    if (isOnline) await FirestoreService.updateSettings(updatedSettings);
    toast({ title: "Project Removed" });
  };

  if (!settingsLoaded || !appSettings) {
    return <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-700 pb-40">
      <div className="flex items-center justify-between px-1 mb-10">
        <div className="space-y-1">
          <h2 className="text-3xl font-black uppercase text-white tracking-tight">Settings</h2>
          <p className="text-[11px] font-bold uppercase text-white/40 tracking-widest">Manage application settings and preferences.</p>
        </div>
        <button 
          onClick={() => setActiveView('DASHBOARD')}
          className="h-12 w-12 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all"
        >
          <X className="h-6 w-6 text-white/40" />
        </button>
      </div>

      <Tabs defaultValue="general" className="space-y-12">
        <div className="bg-[#080808] p-1 rounded-2xl border border-white/5 shadow-inner overflow-x-auto no-scrollbar">
          <TabsList className="bg-transparent border-none p-0 h-auto gap-1 flex items-center w-full min-w-max">
            <TabsTrigger value="general" className="px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-white transition-all">
              <Settings className="h-3.5 w-3.5" /> General
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="groups" className="px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-white transition-all">
                <LayoutGrid className="h-3.5 w-3.5" /> Projects & Sheets
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="users" className="px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-white transition-all">
                <Users className="h-3.5 w-3.5" /> Users
              </TabsTrigger>
            )}
            {isSuperAdmin && (
              <TabsTrigger value="database" className="px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-white transition-all">
                <Terminal className="h-3.5 w-3.5" /> Database
              </TabsTrigger>
            )}
            {isSuperAdmin && (
              <TabsTrigger value="system" className="px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-white transition-all">
                <HeartPulse className="h-3.5 w-3.5" /> System Health
              </TabsTrigger>
            )}
            <TabsTrigger value="history" className="px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-white transition-all">
              <History className="h-3.5 w-3.5" /> History
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="general" className="space-y-12 m-0 outline-none">
          {/* Appearance Section */}
          <div className="space-y-6">
            <h3 className="text-xl font-black uppercase text-white tracking-tight px-1">Appearance</h3>
            <Card className="bg-[#050505] border-white/5 rounded-[2rem] p-8 shadow-3xl">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <Palette className="h-4 w-4 text-white/40" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Theme Selection</span>
                </div>
                <div className="flex flex-wrap gap-4">
                  <Button variant={theme === 'light' ? 'secondary' : 'outline'} onClick={() => setTheme('light')} className="flex-1 h-14 rounded-xl font-black uppercase text-[10px] border-2 gap-3"><Sun className="h-4 w-4" /> Light</Button>
                  <Button variant={theme === 'dark' ? 'secondary' : 'outline'} onClick={() => setTheme('dark')} className="flex-1 h-14 rounded-xl font-black uppercase text-[10px] border-2 gap-3"><Moon className="h-4 w-4" /> Dark</Button>
                  <Button variant={theme === 'system' ? 'secondary' : 'outline'} onClick={() => setTheme('system')} className="flex-1 h-14 rounded-xl font-black uppercase text-[10px] border-2 gap-3"><Database className="h-4 w-4" /> System</Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Security Section */}
          <div className="space-y-6">
            <h3 className="text-xl font-black uppercase text-white tracking-tight px-1">Security</h3>
            <Card className="bg-[#050505] border-white/5 rounded-[2rem] p-10 shadow-3xl">
              <div className="space-y-8">
                <div className="flex items-center gap-3">
                  <KeyRound className="h-4 w-4 text-white/40" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Change Passphrase</span>
                </div>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Current</Label>
                      <Input type="password" value={passwords.current} onChange={e => setPasswords({...passwords, current: e.target.value})} className="h-12 bg-black/40 border-white/5 rounded-xl font-bold" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">New</Label>
                      <Input type="password" value={passwords.next} onChange={e => setPasswords({...passwords, next: e.target.value})} className="h-12 bg-black/40 border-white/5 rounded-xl font-bold" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Confirm</Label>
                      <Input type="password" value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} className="h-12 bg-black/40 border-white/5 rounded-xl font-bold" />
                    </div>
                  </div>
                  <Button className="h-12 px-8 rounded-xl bg-primary text-black font-black uppercase text-[10px] tracking-widest shadow-xl">Stage Update</Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Admin Row */}
          {isAdmin && (
            <div className="space-y-6">
              <h3 className="text-xl font-black uppercase text-white tracking-tight px-1">Global Admin Settings</h3>
              <Card className="bg-black/40 border-2 border-white/5 rounded-[2.5rem] overflow-hidden">
                <div className="divide-y divide-white/5">
                  <div className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-1 flex-1">
                      <h4 className="text-sm font-black uppercase text-white">Application Mode</h4>
                      <p className="text-[10px] text-white/40 italic">{appSettings.appMode === 'management' ? 'Management: Structural locks active.' : 'Verification: Field status updates allowed.'}</p>
                    </div>
                    <Select value={appSettings.appMode} onValueChange={(v) => handleSettingChange('appMode', v)}>
                      <SelectTrigger className="w-[240px] h-12 bg-black border-2 border-white/10 rounded-xl font-black uppercase text-[10px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0A0A0A] border-white/10 text-white">
                        <SelectItem value="management" className="text-[10px] font-black uppercase py-3">Management</SelectItem>
                        <SelectItem value="verification" className="text-[10px] font-black uppercase py-3">Verification</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="p-8 flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="text-sm font-black uppercase text-white">Lock Asset List</h4>
                      <p className="text-[10px] text-white/40 italic">Restrict creation and deletion pulses.</p>
                    </div>
                    <Switch checked={appSettings.lockAssetList} onCheckedChange={(v) => handleSettingChange('lockAssetList', v)} className="data-[state=checked]:bg-primary" />
                  </div>
                </div>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="groups" className="m-0 outline-none space-y-10">
          <div className="space-y-6">
            <h3 className="text-xl font-black uppercase text-white tracking-tight px-1">Manage Projects</h3>
            <div className="flex gap-3 px-1">
              <Input 
                placeholder="New project name..." 
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="h-14 bg-white/[0.03] border-white/10 rounded-xl font-medium text-sm text-white"
              />
              <Button 
                onClick={handleAddProject}
                disabled={!newProjectName.trim()}
                className="h-14 px-8 rounded-xl bg-primary text-black font-black uppercase text-[11px] tracking-widest gap-2 shadow-xl"
              >
                <PlusCircle className="h-4 w-4" /> Add Project
              </Button>
            </div>
          </div>

          <div className="space-y-4 px-1">
            {appSettings.grants.map((grant) => {
              const isActive = appSettings.activeGrantId === grant.id;
              
              return (
                <Card key={grant.id} className={cn(
                  "border-2 transition-all duration-500 rounded-2xl overflow-hidden",
                  isActive ? "bg-white/[0.03] border-white/10 shadow-2xl" : "bg-transparent border-white/5"
                )}>
                  <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <ChevronsUpDown className="h-4 w-4 text-white/20 shrink-0" />
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-black uppercase text-white tracking-tight">{grant.name}</span>
                        {isActive && (
                          <Badge className="bg-primary text-black font-black uppercase text-[9px] h-6 px-3 rounded-full">Active</Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      {!isActive && (
                        <button onClick={() => setActiveGrantId(grant.id)} className="text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-80">Set Active</button>
                      )}
                      <button className="text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white">Rename</button>
                      <button onClick={() => handleDeleteProject(grant.id)} className="text-[10px] font-black uppercase tracking-widest text-red-600 hover:text-red-500">Delete</button>
                    </div>
                  </div>

                  {isActive && (
                    <div className="px-6 pb-8 pt-2 space-y-8 animate-in fade-in slide-in-from-top-2 duration-500 border-t border-white/5 bg-white/[0.01]">
                      <div className="space-y-4">
                        <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-white/40 px-1">Sheet Definitions</h4>
                        <div className="space-y-2.5">
                          {Object.keys(grant.sheetDefinitions || {}).length > 0 ? (
                            Object.keys(grant.sheetDefinitions).map(sheetName => (
                              <div key={sheetName} className="flex items-center justify-between p-5 bg-black border border-white/5 rounded-2xl group/sheet hover:border-white/20 transition-all shadow-inner">
                                <span className="text-xs font-black uppercase text-white/80">{sheetName}</span>
                                <div className="flex items-center gap-5 text-white/20">
                                  <button className="hover:text-white transition-colors"><Eye className="h-4 w-4" /></button>
                                  <button className="hover:text-white transition-colors"><Users className="h-4 w-4" /></button>
                                  <button 
                                    onClick={() => { setSelectedSheetDef(grant.sheetDefinitions[sheetName]); setActiveGrantIdForSchema(grant.id); setIsColumnSheetOpen(true); }}
                                    className="hover:text-white transition-colors"
                                  >
                                    <Wrench className="h-4 w-4" />
                                  </button>
                                  <button className="hover:text-red-600 transition-colors"><Trash2 className="h-4 w-4" /></button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-2xl opacity-20">
                              <p className="text-[10px] font-black uppercase tracking-widest">No definitions found in project pulse</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Button variant="outline" className="h-14 rounded-2xl bg-white/[0.02] border-white/10 font-black uppercase text-[10px] tracking-widest gap-2.5 hover:bg-white/5">
                          <PlusCircle className="h-4 w-4" /> Add Manually
                        </Button>
                        <Button variant="outline" className="h-14 rounded-2xl bg-white/[0.02] border-white/10 font-black uppercase text-[10px] tracking-widest gap-2.5 hover:bg-white/5">
                          <FileUp className="h-4 w-4" /> Import Template
                        </Button>
                        <Button onClick={() => setActiveView('IMPORT')} variant="outline" className="h-14 rounded-2xl bg-white/[0.02] border-white/10 font-black uppercase text-[10px] tracking-widest gap-2.5 hover:bg-white/5">
                          <ScanSearch className="h-4 w-4" /> Scan & Import Data
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="users" className="m-0 outline-none px-1">
          <Card className="bg-[#050505] border-white/5 rounded-[2.5rem] p-10 shadow-3xl">
            <UserManagement users={appSettings.authorizedUsers} onUsersChange={newUsers => handleSettingChange('authorizedUsers', newUsers)} adminProfile={userProfile} />
          </Card>
        </TabsContent>

        <TabsContent value="database" className="m-0 outline-none px-1">
          <DatabaseWorkstation />
        </TabsContent>

        <TabsContent value="system" className="m-0 outline-none px-1">
          <ErrorAuditWorkstation />
        </TabsContent>

        <TabsContent value="history" className="m-0 outline-none px-1">
          <div className="space-y-6">
            <h3 className="text-xl font-black uppercase text-white tracking-tight px-1">Modification History</h3>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="audit-log" className="border-2 border-white/5 rounded-[2rem] bg-black/40 overflow-hidden px-6">
                <AccordionTrigger className="hover:no-underline py-6">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                      <History className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-sm font-black uppercase text-white">Full Activity Ledger</h4>
                      <p className="text-[10px] text-white/40 italic">Review every registry mutation pulse.</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-8">
                  <AuditLogWorkstation isEmbedded={true} />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </TabsContent>
      </Tabs>

      {selectedSheetDef && (
        <ColumnCustomizationSheet 
          isOpen={isColumnSheetOpen}
          onOpenChange={setIsColumnSheetOpen}
          sheetDefinition={selectedSheetDef}
          originalSheetName={selectedSheetDef.name}
          onSave={(orig, newDef, all) => {
            const updatedGrants = appSettings.grants.map(grant => {
              if (grant.id === activeGrantId) {
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

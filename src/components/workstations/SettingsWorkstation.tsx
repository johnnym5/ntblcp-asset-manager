
'use client';

/**
 * @fileOverview Settings Workstation - System Preferences & Options.
 */

import React, { useState } from 'react';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from 'next-themes';
import { 
  Settings, 
  Palette, 
  Trash2, 
  Users, 
  PlusCircle,
  FileCode,
  DatabaseZap,
  LayoutGrid,
  ChevronDown,
  Wrench,
  X,
  Loader2,
  Zap,
  CheckCircle2,
  Terminal,
  History,
  Lock,
  Smartphone,
  ShieldCheck,
  Eye,
  ShieldAlert,
  Sun,
  Moon,
  GraduationCap
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { DatabaseWorkstation } from './DatabaseWorkstation';
import { AuditLogWorkstation } from './AuditLogWorkstation';
import type { AppSettings, Grant, UXMode } from '@/types/domain';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function SettingsWorkstation() {
  const { 
    appSettings, 
    setAppSettings, 
    refreshRegistry, 
    isOnline, 
    setIsOnline,
    settingsLoaded,
    setActiveView 
  } = useAppState();
  
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const { setTheme, theme } = useTheme();

  const [newProjectName, setNewProjectName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = userProfile?.isAdmin || false;

  const handleSettingChange = async (key: keyof AppSettings, value: any) => {
    if (!appSettings) return;
    setIsSaving(true);
    
    try {
      const updatedSettings = { ...appSettings, [key]: value };
      if (isOnline) await FirestoreService.updateSettings({ [key]: value });
      await storage.saveSettings(updatedSettings);
      setAppSettings(updatedSettings);
      toast({ title: "Settings Saved" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Save Failed" });
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
    await handleSettingChange('grants', [...appSettings.grants, newGrant]);
    setNewProjectName('');
  };

  if (!settingsLoaded || !appSettings) return (
    <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
  );

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-700 pb-40">
      <div className="flex items-center justify-between px-1 mb-10">
        <div className="space-y-1">
          <h2 className="text-3xl font-black uppercase text-white tracking-tight">Settings</h2>
          <p className="text-[11px] font-bold uppercase text-white/40 tracking-widest">Personal & Administrative Preferences</p>
        </div>
        <div className="flex items-center gap-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={() => setIsOnline(!isOnline)}
                  className={cn(
                    "h-10 px-6 border-2 font-black uppercase text-[10px] tracking-widest gap-2.5 rounded-2xl shadow-sm transition-all flex items-center group tactile-pulse",
                    isOnline ? "border-green-500/20 bg-green-500/5 text-green-500" : "border-red-500/20 bg-red-500/5 text-red-500"
                  )}
                >
                  <Zap className={cn("h-3.5 w-3.5 fill-current", isOnline && "animate-pulse")} /> 
                  {isOnline ? 'Online' : 'Offline'}
                </button>
              </TooltipTrigger>
              <TooltipContent>Switch between connecting to the cloud and working locally.</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <button 
            onClick={() => setActiveView('DASHBOARD')}
            className="h-12 w-12 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all"
          >
            <X className="h-6 w-6 text-white/40" />
          </button>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-10">
        <div className="bg-[#080808] p-1 rounded-2xl border border-white/5 shadow-inner overflow-x-auto no-scrollbar">
          <TabsList className="bg-transparent border-none p-0 h-auto gap-1 flex items-center w-full min-w-max">
            <TabsTrigger value="general" className="px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-white transition-all">General</TabsTrigger>
            {isAdmin && <TabsTrigger value="groups" className="px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-white transition-all">Projects</TabsTrigger>}
            {isAdmin && <TabsTrigger value="users" className="px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-white transition-all">Auditors</TabsTrigger>}
            {isAdmin && <TabsTrigger value="database" className="px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-white transition-all">Storage</TabsTrigger>}
            {isAdmin && <TabsTrigger value="history" className="px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-white transition-all">Activity</TabsTrigger>}
          </TabsList>
        </div>

        <TabsContent value="general" className="space-y-10 m-0 outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-1">
            {/* Appearance */}
            <Card className="bg-[#050505] border-white/5 rounded-[2.5rem] p-10 shadow-3xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-white/5 rounded-xl"><Palette className="h-5 w-5 text-white/40" /></div>
                <div className="flex flex-col">
                  <span className="text-sm font-black uppercase text-white tracking-tight leading-none">Appearance</span>
                  <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-1">Light or Dark Mode</span>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Button variant={theme === 'light' ? 'secondary' : 'outline'} onClick={() => setTheme('light')} className="h-14 rounded-xl font-black uppercase text-[10px] border-2 justify-between px-6">
                  Light Mode <Sun className="h-4 w-4" />
                </Button>
                <Button variant={theme === 'dark' ? 'secondary' : 'outline'} onClick={() => setTheme('dark')} className="h-14 rounded-xl font-black uppercase text-[10px] border-2 justify-between px-6">
                  Dark Mode <Moon className="h-4 w-4" />
                </Button>
              </div>
            </Card>

            {/* UX Settings */}
            <Card className="bg-[#050505] border-white/5 rounded-[2.5rem] p-10 shadow-3xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-primary/10 rounded-xl"><GraduationCap className="h-5 w-5 text-primary" /></div>
                <div className="flex flex-col">
                  <span className="text-sm font-black uppercase text-white tracking-tight leading-none">Operational Mode</span>
                  <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-1">Beginner vs Advanced</span>
                </div>
              </div>
              <div className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-xs font-black uppercase text-white">Show Tooltips</Label>
                    <p className="text-[9px] text-white/40 italic">Explain buttons when you hover over them.</p>
                  </div>
                  <Switch checked={appSettings.showHelpTooltips} onCheckedChange={(v) => handleSettingChange('showHelpTooltips', v)} className="data-[state=checked]:bg-primary" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-xs font-black uppercase text-white">Advanced Labels</Label>
                    <p className="text-[9px] text-white/40 italic">Use compact, technical names for faster navigation.</p>
                  </div>
                  <Switch checked={appSettings.uxMode === 'advanced'} onCheckedChange={(v) => handleSettingChange('uxMode', v ? 'advanced' : 'beginner')} className="data-[state=checked]:bg-primary" />
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="groups" className="space-y-10 m-0 outline-none">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-1">
              <h3 className="text-xl font-black uppercase text-white tracking-tight">Project Registry</h3>
              <div className="flex gap-3">
                <Input placeholder="Enter project name..." value={newProjectName} onChange={e => setNewProjectName(e.target.value)} className="h-14 bg-white/[0.03] border-white/10 rounded-xl font-medium text-sm text-white" />
                <Button onClick={handleAddProject} className="h-14 px-8 rounded-xl bg-primary text-black font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl shadow-primary/20">Add Project</Button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6">
              {appSettings.grants.map(grant => {
                const isActive = appSettings.activeGrantId === grant.id;
                return (
                  <Card key={grant.id} className={cn("bg-[#050505] border-2 rounded-[2.5rem] overflow-hidden transition-all shadow-3xl", isActive ? "border-primary/40" : "border-white/5")}>
                    <CardHeader className="p-8 border-b border-white/5 flex flex-row items-center justify-between bg-white/[0.01]">
                      <div className="flex items-center gap-4">
                        <span className="text-xl font-black uppercase text-white tracking-tight">{grant.name}</span>
                        {isActive && <Badge className="bg-primary text-black font-black uppercase text-[9px] px-3 rounded-full">ACTIVE</Badge>}
                      </div>
                      <div className="flex items-center gap-6">
                        {!isActive && <button onClick={() => handleSettingChange('activeGrantId', grant.id)} className="text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-80">Select</button>}
                        <button className="text-[10px] font-black uppercase tracking-widest text-red-600 hover:opacity-80">Delete</button>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
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

        <TabsContent value="history" className="m-0 outline-none px-1">
          <AuditLogWorkstation />
        </TabsContent>
      </Tabs>
    </div>
  );
}

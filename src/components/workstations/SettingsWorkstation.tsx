
'use client';

/**
 * @fileOverview Settings Workstation - System Preferences & Options.
 * Phase 700: Achieved 100% screenshot parity for General Settings.
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
  GraduationCap,
  KeyRound,
  Database,
  Search
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  const [isSaving, setIsSaving] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  // Password fields state
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });

  const isAdmin = userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPERADMIN';

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
                <Wrench className="h-3.5 w-3.5" /> Projects & Sheets
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="users" className="px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-white transition-all">
                <Users className="h-3.5 w-3.5" /> Users
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
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Theme</span>
                </div>
                <div className="flex flex-wrap gap-4">
                  <Button 
                    variant={theme === 'light' ? 'secondary' : 'outline'} 
                    onClick={() => setTheme('light')} 
                    className="flex-1 h-14 rounded-xl font-black uppercase text-[10px] border-2 gap-3"
                  >
                    <Sun className="h-4 w-4" /> Light
                  </Button>
                  <Button 
                    variant={theme === 'dark' ? 'secondary' : 'outline'} 
                    onClick={() => setTheme('dark')} 
                    className="flex-1 h-14 rounded-xl font-black uppercase text-[10px] border-2 gap-3"
                  >
                    <Moon className="h-4 w-4" /> Dark
                  </Button>
                  <Button 
                    variant={theme === 'system' ? 'secondary' : 'outline'} 
                    onClick={() => setTheme('system')} 
                    className="flex-1 h-14 rounded-xl font-black uppercase text-[10px] border-2 gap-3"
                  >
                    <Database className="h-4 w-4" /> System
                  </Button>
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
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Change Your Password</span>
                </div>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Current Password</Label>
                    <Input 
                      type="password"
                      className="h-14 bg-black/40 border-white/5 rounded-xl font-bold focus-visible:ring-primary/20"
                      value={passwords.current}
                      onChange={e => setPasswords({...passwords, current: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">New Password</Label>
                    <Input 
                      type="password"
                      className="h-14 bg-black/40 border-white/5 rounded-xl font-bold focus-visible:ring-primary/20"
                      value={passwords.next}
                      onChange={e => setPasswords({...passwords, next: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Confirm New Password</Label>
                    <Input 
                      type="password"
                      className="h-14 bg-black/40 border-white/5 rounded-xl font-bold focus-visible:ring-primary/20"
                      value={passwords.confirm}
                      onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                    />
                  </div>
                </div>

                <Button className="h-12 px-8 rounded-xl bg-primary text-black font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95">
                  Stage Password Change
                </Button>
              </div>
            </Card>
          </div>

          {/* Global Admin Section */}
          {isAdmin && (
            <div className="space-y-6">
              <h3 className="text-xl font-black uppercase text-white tracking-tight px-1">Global Admin Settings</h3>
              <Card className="bg-black/40 border-2 border-white/5 rounded-[2.5rem] p-1 shadow-3xl">
                <div className="divide-y divide-white/5">
                  {/* App Mode Row */}
                  <div className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-1 flex-1">
                      <h4 className="text-sm font-black uppercase text-white tracking-tight leading-none">Application Mode</h4>
                      <p className="text-[10px] font-medium text-white/40 italic">
                        {appSettings.appMode === 'management' 
                          ? 'Management: Structural data is locked for non-admins.' 
                          : 'Verification: Users can update status/remarks.'}
                      </p>
                    </div>
                    <Select value={appSettings.appMode} onValueChange={(v) => handleSettingChange('appMode', v)}>
                      <SelectTrigger className="w-full md:w-[240px] h-14 bg-black border-2 border-white/10 rounded-2xl font-black uppercase text-[11px] tracking-widest text-white shadow-xl focus:ring-primary/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0A0A0A] border-white/10 rounded-2xl">
                        <SelectItem value="management" className="text-white font-black uppercase text-[10px] tracking-widest py-3 cursor-pointer">Management</SelectItem>
                        <SelectItem value="verification" className="text-white font-black uppercase text-[10px] tracking-widest py-3 cursor-pointer">Verification</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Lock Row */}
                  <div className="p-8 flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="text-sm font-black uppercase text-white tracking-tight leading-none">Lock Asset List</h4>
                      <p className="text-[10px] font-medium text-white/40 italic">Disable record creation and deletion for all users.</p>
                    </div>
                    <Switch 
                      checked={appSettings.lockAssetList} 
                      onCheckedChange={(v) => handleSettingChange('lockAssetList', v)} 
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-10 border-t border-white/5 flex items-center justify-between px-1">
            <Button variant="ghost" onClick={() => setActiveView('DASHBOARD')} className="h-14 px-10 rounded-2xl font-black uppercase text-[11px] tracking-widest text-white/40 hover:text-white hover:bg-white/5 border-2 border-transparent hover:border-white/10 transition-all">
              Cancel
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="groups" className="m-0 outline-none">
          <div className="space-y-6 px-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
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

        <TabsContent value="history" className="m-0 outline-none px-1">
          <AuditLogWorkstation />
        </TabsContent>
      </Tabs>
    </div>
  );
}

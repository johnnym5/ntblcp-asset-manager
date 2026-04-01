'use client';

/**
 * @fileOverview SettingsWorkstation - High-Fidelity Master Control Center.
 * Overhauled to match requested UI design with unified Projects & Sheets management.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from 'next-themes';
import { 
  Settings, 
  UserCog, 
  Palette, 
  CheckCircle2, 
  Trash2, 
  Save, 
  Sun, 
  Moon, 
  Zap,
  RefreshCw,
  History,
  Lock,
  PlusCircle,
  FileUp,
  ScanSearch,
  ChevronDown,
  ChevronUp,
  Wrench,
  Users,
  Search,
  MoreHorizontal,
  X,
  Loader2,
  Database,
  ArrowRightLeft,
  AlertCircle,
  ShieldAlert,
  ChevronRight,
  Monitor,
  XCircle,
  FileJson
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
import { ArchiveService } from '@/lib/archive-service';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { AppSettings, UXMode, SheetDefinition, Grant, ErrorLogEntry } from '@/types/domain';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export function SettingsWorkstation() {
  const { appSettings, refreshRegistry, settingsLoaded, isOnline, setActiveGrantId } = useAppState();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const { setTheme, theme } = useTheme();

  const [draftSettings, setDraftSettings] = useState<AppSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  
  // History tab state
  const [errorLogs, setErrorLogs] = useState<ErrorLogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Schema Editor State
  const [isColumnSheetOpen, setIsColumnSheetOpen] = useState(false);
  const [selectedSheetDef, setSelectedSheetDef] = useState<SheetDefinition | null>(null);
  const [activeGrantIdForSchema, setActiveGrantIdForSchema] = useState<string | null>(null);

  useEffect(() => {
    if (appSettings) {
      setDraftSettings(JSON.parse(JSON.stringify(appSettings)));
    }
  }, [appSettings]);

  useEffect(() => {
    if (userProfile?.isAdmin) {
      loadHistory();
    }
  }, [userProfile]);

  const loadHistory = async () => {
    setLoadingLogs(true);
    try {
      const data = await FirestoreService.getErrorLogs();
      setErrorLogs(data);
    } finally {
      setLoadingLogs(false);
    }
  };

  const hasChanges = useMemo(() => {
    return JSON.stringify(appSettings) !== JSON.stringify(draftSettings);
  }, [appSettings, draftSettings]);

  const handleSettingChange = (key: keyof AppSettings, value: any) => {
    if (!draftSettings) return;
    setDraftSettings({ ...draftSettings, [key]: value });
  };

  const handleAddProject = () => {
    if (!draftSettings || !newProjectName.trim()) return;
    const newGrant: Grant = {
      id: crypto.randomUUID(),
      name: newProjectName.trim(),
      enabledSheets: [],
      sheetDefinitions: {}
    };
    handleSettingChange('grants', [...draftSettings.grants, newGrant]);
    setNewProjectName("");
    toast({ title: "Project Staged", description: `Added "${newGrant.name}" to the draft registry.` });
  };

  const handleDeleteProject = (id: string) => {
    if (!draftSettings) return;
    const updated = draftSettings.grants.filter(g => g.id !== id);
    handleSettingChange('grants', updated);
    if (draftSettings.activeGrantId === id) {
      handleSettingChange('activeGrantId', updated[0]?.id || null);
    }
  };

  const handleCommitChanges = async () => {
    if (!draftSettings) return;
    setIsSaving(true);
    try {
      await FirestoreService.updateSettings(draftSettings);
      await storage.saveSettings(draftSettings);
      await refreshRegistry();
      toast({ title: "Settings Saved", description: "Global configuration pulse broadcasted successfully." });
    } catch (e) {
      toast({ variant: "destructive", title: "Save Failed" });
    } finally {
      setIsSaving(false);
    }
  };

  if (!settingsLoaded || !draftSettings) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-700 pb-32">
      {/* Header Pulse */}
      <div className="space-y-1 px-2">
        <h2 className="text-2xl font-black tracking-tight text-foreground uppercase">Settings</h2>
        <p className="text-xs font-bold text-muted-foreground opacity-70">
          Manage application settings and preferences. Admin changes apply to all users.
        </p>
      </div>

      <Tabs defaultValue="projects" className="space-y-8">
        <div className="bg-muted/30 p-1 rounded-2xl border-2 border-border/40 inline-flex">
          <TabsList className="bg-transparent border-none p-0 h-auto gap-1">
            <TabsTrigger value="general" className="px-6 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-black data-[state=active]:text-white">
              <Settings className="h-3.5 w-3.5" /> General
            </TabsTrigger>
            <TabsTrigger value="projects" className="px-6 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-black data-[state=active]:text-white">
              <Wrench className="h-3.5 w-3.5" /> Projects & Sheets
            </TabsTrigger>
            <TabsTrigger value="users" className="px-6 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-black data-[state=active]:text-white">
              <Users className="h-3.5 w-3.5" /> Users
            </TabsTrigger>
            <TabsTrigger value="history" className="px-6 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-black data-[state=active]:text-white">
              <History className="h-3.5 w-3.5" /> History
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab: General */}
        <TabsContent value="general" className="space-y-6 outline-none px-2">
          <Card className="rounded-[2rem] border-2 border-border/40 bg-card/50 p-8 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Palette className="h-5 w-5 text-primary" />
                <Label className="text-sm font-black uppercase">Visual Identity</Label>
              </div>
              <div className="flex gap-3">
                <Button variant={theme === 'light' ? 'secondary' : 'outline'} onClick={() => setTheme('light')} className="h-12 flex-1 rounded-xl font-black uppercase text-[10px] gap-2 border-2"><Sun className="h-4 w-4" /> Light</Button>
                <Button variant={theme === 'dark' ? 'secondary' : 'outline'} onClick={() => setTheme('dark')} className="h-12 flex-1 rounded-xl font-black uppercase text-[10px] gap-2 border-2"><Moon className="h-4 w-4" /> Dark</Button>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-dashed">
              <div className="space-y-1">
                <Label className="text-sm font-black uppercase">Global Master Lock</Label>
                <p className="text-[10px] font-medium text-muted-foreground italic">Prevent unauthorized cloud mutations.</p>
              </div>
              <Switch checked={draftSettings.lockAssetList} onCheckedChange={(v) => handleSettingChange('lockAssetList', v)} />
            </div>
          </Card>
        </TabsContent>

        {/* Tab: Projects & Sheets */}
        <TabsContent value="projects" className="space-y-6 outline-none px-2">
          <div className="space-y-4">
            <h3 className="text-lg font-black uppercase tracking-tight">Manage Projects (Grants)</h3>
            
            <div className="flex gap-2">
              <Input 
                placeholder="New project name..." 
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="h-12 rounded-xl bg-card border-2 border-border/40 focus-visible:ring-primary/20 font-bold"
              />
              <Button onClick={handleAddProject} className="h-12 px-6 rounded-xl bg-primary text-black font-black uppercase text-[10px] tracking-widest gap-2 shadow-lg shadow-primary/20">
                <PlusCircle className="h-4 w-4" /> Add Project
              </Button>
            </div>

            <div className="space-y-3">
              {draftSettings.grants.map((grant) => {
                const isActive = draftSettings.activeGrantId === grant.id;
                return (
                  <Card key={grant.id} className={cn(
                    "rounded-2xl border-2 transition-all duration-300 bg-black text-white",
                    isActive ? "border-primary shadow-xl" : "border-border/40"
                  )}>
                    <div className="p-5 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <ArrowRightLeft className="h-4 w-4 text-white/40" />
                        <h4 className="font-black text-sm uppercase tracking-tight">{grant.name}</h4>
                        {isActive && <Badge className="bg-primary text-black font-black uppercase text-[8px] h-5 px-2">Active</Badge>}
                      </div>
                      <div className="flex items-center gap-4">
                        {!isActive && (
                          <Button variant="ghost" size="sm" onClick={() => handleSettingChange('activeGrantId', grant.id)} className="h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white font-black text-[9px] uppercase px-4 border border-white/10">Set Active</Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-8 font-black text-[10px] uppercase text-white hover:text-primary transition-colors">Rename</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteProject(grant.id)} className="h-8 font-black text-[10px] uppercase text-red-500 hover:text-red-400">Delete</Button>
                      </div>
                    </div>

                    {isActive && (
                      <div className="p-5 pt-0 animate-in slide-in-from-top-2 duration-300">
                        <div className="bg-[#111111] rounded-2xl border border-white/5 p-6 space-y-6">
                          <h5 className="text-[10px] font-black uppercase tracking-widest opacity-60">Sheet Definitions for this Project</h5>
                          
                          <div className="py-10 text-center border-2 border-dashed border-white/5 rounded-2xl bg-black/20">
                            {Object.keys(grant.sheetDefinitions || {}).length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-4">
                                {Object.keys(grant.sheetDefinitions).map(s => (
                                  <div key={s} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                                    <span className="text-[10px] font-black uppercase">{s}</span>
                                    <Button variant="ghost" size="icon" onClick={() => { setSelectedSheetDef(grant.sheetDefinitions[s]); setActiveGrantIdForSchema(grant.id); setIsColumnSheetOpen(true); }} className="h-7 w-7 text-primary hover:bg-primary/10"><Wrench className="h-3.5 w-3.5" /></Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">No sheets defined for this project.</p>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <Button variant="outline" className="h-11 rounded-xl bg-transparent border-white/10 text-white font-black uppercase text-[9px] tracking-widest gap-2 hover:bg-white/5"><PlusCircle className="h-3.5 w-3.5" /> Add Manually</Button>
                            <Button variant="outline" className="h-11 rounded-xl bg-transparent border-white/10 text-white font-black uppercase text-[9px] tracking-widest gap-2 hover:bg-white/5"><FileUp className="h-3.5 w-3.5" /> Import Template</Button>
                            <Button variant="outline" className="h-11 rounded-xl bg-transparent border-white/10 text-white font-black uppercase text-[9px] tracking-widest gap-2 hover:bg-white/5"><ScanSearch className="h-3.5 w-3.5" /> Scan & Import Data</Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* Tab: Users */}
        <TabsContent value="users" className="outline-none px-2">
          <Card className="rounded-[2.5rem] border-2 border-border/40 bg-card/50 overflow-hidden shadow-2xl">
            <CardContent className="p-8">
              <UserManagement 
                users={draftSettings.authorizedUsers}
                onUsersChange={(newUsers) => handleSettingChange('authorizedUsers', newUsers)}
                adminProfile={userProfile}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: History */}
        <TabsContent value="history" className="space-y-6 outline-none px-2">
          {loadingLogs ? <div className="py-20 flex justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div> : 
            errorLogs.length > 0 ? (
              <div className="space-y-4">
                {errorLogs.map(log => (
                  <Card key={log.id} className="rounded-2xl border-2 border-border/40 bg-card/50 p-6 flex items-center justify-between hover:border-primary/20 transition-all cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className={cn("p-3 rounded-xl shadow-inner", log.severity === 'CRITICAL' ? "bg-red-100 text-red-600" : "bg-primary/10 text-primary")}>
                        {log.severity === 'CRITICAL' ? <ShieldAlert className="h-5 w-5" /> : <Activity className="h-5 w-5" />}
                      </div>
                      <div>
                        <h4 className="font-black text-sm uppercase">{log.error.laymanExplanation}</h4>
                        <div className="flex items-center gap-3 text-[9px] font-bold text-muted-foreground uppercase mt-1 opacity-60">
                          <span className="flex items-center gap-1"><Monitor className="h-2.5 w-2.5" /> {log.context.module}</span>
                          <span className="flex items-center gap-1"><History className="h-2.5 w-2.5" /> {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="font-black text-[9px] uppercase border-primary/20">{log.status}</Badge>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="py-40 text-center opacity-20 border-4 border-dashed rounded-[3rem]">
                <History className="h-16 w-16 mx-auto mb-4" />
                <h3 className="text-xl font-black uppercase tracking-widest">History Silent</h3>
              </div>
            )
          }
        </TabsContent>
      </Tabs>

      {/* Footer Pulse */}
      <div className="pt-10 border-t-2 border-border/40 flex items-center justify-between px-2">
        <Button variant="ghost" onClick={() => window.location.reload()} className="h-12 px-10 rounded-xl bg-black text-white font-black uppercase text-[10px] tracking-widest hover:bg-black/80">
          Cancel
        </Button>
        <Button 
          onClick={handleCommitChanges}
          disabled={!hasChanges || isSaving}
          className="h-12 px-10 rounded-xl bg-primary text-black font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </Button>
      </div>

      {selectedSheetDef && (
        <ColumnCustomizationSheet 
          isOpen={isColumnSheetOpen}
          onOpenChange={setIsColumnSheetOpen}
          sheetDefinition={selectedSheetDef}
          originalSheetName={selectedSheetDef.name}
          onSave={(orig, newDef, all) => {
            if (!draftSettings) return;
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

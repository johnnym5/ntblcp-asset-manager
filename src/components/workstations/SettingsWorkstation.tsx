'use client';

/**
 * @fileOverview SettingsWorkstation - High-Fidelity Master Control Center.
 * Phase 108: Mobile-optimized Tab strip and Card layouts.
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
  History,
  Lock,
  PlusCircle,
  FileUp,
  ScanSearch,
  Wrench,
  Users,
  Search,
  Loader2,
  Database,
  ArrowRightLeft,
  ShieldAlert,
  Monitor,
  PlaneTakeoff,
  KeyRound,
  Globe,
  X,
  FileSpreadsheet
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
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { AppSettings, SheetDefinition, Grant, ErrorLogEntry } from '@/types/domain';
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
import { parseExcelForTemplate } from '@/lib/excel-parser';

export function SettingsWorkstation() {
  const { appSettings, refreshRegistry, settingsLoaded, isOnline } = useAppState();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const { setTheme, theme } = useTheme();

  const [draftSettings, setDraftSettings] = useState<AppSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [isTravelReportOpen, setIsTravelReportOpen] = useState(false);
  const [isImportScanOpen, setIsImportScanOpen] = useState(false);
  
  const [errorLogs, setErrorLogs] = useState<ErrorLogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [isColumnSheetOpen, setIsColumnSheetOpen] = useState(false);
  const [selectedSheetDef, setSelectedSheetDef] = useState<SheetDefinition | null>(null);
  const [activeGrantIdForSchema, setActiveGrantIdForSchema] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    toast({ title: "Project Staged" });
  };

  const handleDeleteProject = (id: string) => {
    if (!draftSettings) return;
    const updated = draftSettings.grants.filter(g => g.id !== id);
    handleSettingChange('grants', updated);
    if (draftSettings.activeGrantId === id) {
      handleSettingChange('activeGrantId', updated[0]?.id || null);
    }
  };

  const handleAddSheet = () => {
    if (!draftSettings || !draftSettings.activeGrantId) return;
    const newSheet: SheetDefinition = {
      name: 'New Asset Category',
      headers: ['S/N', 'Asset Description', 'Location', 'Serial Number'],
      displayFields: [
        { key: 'sn' as any, label: 'S/N', table: true, quickView: true },
        { key: 'description' as any, label: 'Asset Description', table: true, quickView: true },
        { key: 'location' as any, label: 'Location', table: true, quickView: true },
        { key: 'serialNumber' as any, label: 'Serial Number', table: true, quickView: true },
        { key: 'status' as any, label: 'Verification Status', table: true, quickView: true },
      ]
    };
    
    setSelectedSheetDef(newSheet);
    setActiveGrantIdForSchema(draftSettings.activeGrantId);
    setIsColumnSheetOpen(true);
  };

  const handleImportTemplateClick = () => fileInputRef.current?.click();

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !draftSettings || !draftSettings.activeGrantId) return;

    try {
      const templates = await parseExcelForTemplate(file);
      const activeId = draftSettings.activeGrantId;
      
      const updatedGrants = draftSettings.grants.map(g => {
        if (g.id === activeId) {
          const newDefs = { ...g.sheetDefinitions };
          const newEnabled = [...g.enabledSheets];
          templates.forEach(t => {
            newDefs[t.name] = t;
            if (!newEnabled.includes(t.name)) newEnabled.push(t.name);
          });
          return { ...g, sheetDefinitions: newDefs, enabledSheets: newEnabled };
        }
        return g;
      });

      handleSettingChange('grants', updatedGrants);
      toast({ title: "Templates Discovered", description: `Added ${templates.length} sheet structures to project.` });
    } catch (err) {
      toast({ variant: "destructive", title: "Discovery Failed" });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
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

  const activeGrant = useMemo(() => 
    draftSettings?.grants.find(g => g.id === draftSettings.activeGrantId), 
    [draftSettings]
  );

  if (!settingsLoaded || !draftSettings) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-700 pb-40">
      <div className="space-y-1 px-2">
        <h2 className="text-2xl font-black tracking-tight text-white uppercase">Settings</h2>
        <p className="text-[10px] font-bold text-muted-foreground opacity-70 uppercase tracking-widest">
          Manage application settings and preferences.
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-8">
        <div className="bg-muted/20 p-1 rounded-2xl border-2 border-border/40 flex w-full overflow-hidden">
          <ScrollArea className="w-full">
            <TabsList className="bg-transparent border-none p-0 h-auto gap-1 flex items-center min-w-[450px]">
              <TabsTrigger value="general" className="flex-1 px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-black data-[state=active]:text-white">
                <Settings className="h-3.5 w-3.5" /> General
              </TabsTrigger>
              <TabsTrigger value="projects" className="flex-1 px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-black data-[state=active]:text-white">
                <Wrench className="h-3.5 w-3.5" /> Projects
              </TabsTrigger>
              <TabsTrigger value="users" className="flex-1 px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-black data-[state=active]:text-white">
                <Users className="h-3.5 w-3.5" /> Users
              </TabsTrigger>
              <TabsTrigger value="history" className="flex-1 px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-black data-[state=active]:text-white">
                <History className="h-3.5 w-3.5" /> History
              </TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        <TabsContent value="general" className="space-y-10 outline-none px-2 m-0">
          <div className="space-y-4">
            <h3 className="text-base font-black uppercase tracking-tight text-white">Appearance</h3>
            <Card className="rounded-[1.5rem] border-2 border-border/40 bg-card/50 p-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  <Label className="text-[10px] font-black uppercase tracking-widest">Theme</Label>
                </div>
                <div className="flex flex-col xs:flex-row gap-3 bg-black/40 p-1.5 rounded-xl border border-white/5">
                  <Button variant={theme === 'light' ? 'secondary' : 'ghost'} onClick={() => setTheme('light')} className="flex-1 h-10 rounded-lg font-black uppercase text-[10px] gap-2"><Sun className="h-3.5 w-3.5" /> Light</Button>
                  <Button variant={theme === 'dark' ? 'secondary' : 'ghost'} onClick={() => setTheme('dark')} className="flex-1 h-10 rounded-lg font-black uppercase text-[10px] gap-2"><Moon className="h-3.5 w-3.5" /> Dark</Button>
                  <Button variant={theme === 'system' ? 'secondary' : 'ghost'} onClick={() => setTheme('system')} className="flex-1 h-10 rounded-lg font-black uppercase text-[10px] gap-2"><Monitor className="h-3.5 w-3.5" /> System</Button>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-black uppercase tracking-tight text-white">Reporting</h3>
            <Card className="rounded-[1.5rem] border-2 border-border/40 bg-card/50 p-6 space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-black uppercase text-white">Travel Report Generator</h4>
                <p className="text-[10px] font-medium text-muted-foreground italic">Compile field verification findings into a professional Word document.</p>
              </div>
              <Button variant="outline" onClick={() => setIsTravelReportOpen(true)} className="w-full h-12 rounded-xl bg-black border-white/10 hover:bg-white/5 text-white font-black uppercase text-[10px] tracking-widest gap-2 shadow-inner"><PlaneTakeoff className="h-4 w-4 text-primary" /> Create Travel Report</Button>
            </Card>
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-black uppercase tracking-tight text-white">Security</h3>
            <Card className="rounded-[1.5rem] border-2 border-border/40 bg-card/50 p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-3 text-muted-foreground"><KeyRound className="h-4 w-4" /><h4 className="text-sm font-black uppercase tracking-widest">Change Passphrase</h4></div>
              <div className="space-y-5">
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Current</Label><Input type="password" placeholder="•••••" className="h-12 rounded-xl bg-black/40 border-border/40 font-bold focus-visible:ring-primary/20" /></div>
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest opacity-60">New</Label><Input type="password" className="h-12 rounded-xl bg-black/40 border-border/40 font-bold focus-visible:ring-primary/20" /></div>
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Confirm</Label><Input type="password" className="h-12 rounded-xl bg-black/40 border-border/40 font-bold focus-visible:ring-primary/20" /></div>
                <Button className="w-full h-12 rounded-xl bg-primary text-black font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20">Stage Pulse Change</Button>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-black uppercase tracking-tight text-white">Global Admin</h3>
            <div className="space-y-6 px-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1"><h4 className="text-sm font-black uppercase text-white">Application Mode</h4><p className="text-[10px] text-muted-foreground italic">Verification: Users update status/remarks.</p></div>
                <Select value={draftSettings.appMode} onValueChange={(v) => handleSettingChange('appMode', v as any)}>
                  <SelectTrigger className="w-full sm:w-40 h-11 rounded-xl bg-black text-white font-black uppercase text-[10px] border-white/10 shadow-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl"><SelectItem value="management" className="text-[10px] font-black uppercase">Management</SelectItem><SelectItem value="verification" className="text-[10px] font-black uppercase">Verification</SelectItem></SelectContent>
                </Select>
              </div>
              <Separator className="bg-white/5" />
              <div className="flex items-center justify-between">
                <div className="space-y-1"><h4 className="text-sm font-black uppercase text-white">Lock Asset List</h4><p className="text-[10px] text-muted-foreground italic">Prevent creation from main list.</p></div>
                <Switch checked={draftSettings.lockAssetList} onCheckedChange={(v) => handleSettingChange('lockAssetList', v)} />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="projects" className="space-y-6 outline-none px-2 m-0">
          <div className="space-y-4">
            <h3 className="text-lg font-black uppercase tracking-tight text-white">Manage Projects</h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input placeholder="New project name..." value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} className="h-12 rounded-xl bg-card border-2 border-border/40 text-white font-bold" />
              <Button onClick={handleAddProject} className="h-12 px-6 rounded-xl bg-primary text-black font-black uppercase text-[10px] tracking-widest gap-2 shadow-lg w-full sm:w-auto"><PlusCircle className="h-4 w-4" /> Add Project</Button>
            </div>
            <div className="space-y-3">
              {draftSettings.grants.map((grant) => {
                const isActive = draftSettings.activeGrantId === grant.id;
                return (
                  <Card key={grant.id} className={cn("rounded-2xl border-2 transition-all duration-300 bg-black text-white", isActive ? "border-primary shadow-xl" : "border-border/40")}>
                    <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4"><ArrowRightLeft className="h-4 w-4 text-white/40" /><h4 className="font-black text-sm uppercase tracking-tight truncate max-w-[180px]">{grant.name}</h4>{isActive && <Badge className="bg-primary text-black font-black uppercase text-[8px] h-5 px-2">Active</Badge>}</div>
                      <div className="flex items-center justify-end gap-4">
                        {!isActive && <Button variant="ghost" size="sm" onClick={() => handleSettingChange('activeGrantId', grant.id)} className="h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white font-black text-[9px] uppercase px-4 border border-white/10">Set Active</Button>}
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteProject(grant.id)} className="h-8 font-black text-[10px] uppercase text-red-500 hover:text-red-400">Delete</Button>
                      </div>
                    </div>
                    {isActive && (
                      <div className="p-5 pt-0 animate-in slide-in-from-top-2 duration-300">
                        <div className="bg-[#111111] rounded-2xl border border-white/5 p-4 sm:p-6 space-y-6">
                          <h5 className="text-[10px] font-black uppercase tracking-widest opacity-60">Sheet Definitions</h5>
                          <div className="py-6 sm:py-10 text-center border-2 border-dashed border-white/5 rounded-2xl bg-black/20">
                            {Object.keys(grant.sheetDefinitions || {}).length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-2 sm:px-4">
                                {Object.keys(grant.sheetDefinitions).map(s => (
                                  <div key={s} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 group hover:border-primary/40 transition-colors">
                                    <span className="text-[9px] sm:text-[10px] font-black uppercase truncate max-w-[120px]">{s}</span>
                                    <Button variant="ghost" size="icon" onClick={() => { setSelectedSheetDef(grant.sheetDefinitions[s]); setActiveGrantIdForSchema(grant.id); setIsColumnSheetOpen(true); }} className="h-7 w-7 text-primary hover:bg-primary/10"><Wrench className="h-3.5 w-3.5" /></Button>
                                  </div>
                                ))}
                              </div>
                            ) : <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest px-4">No categories defined.</p>}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <Button variant="outline" onClick={handleAddSheet} className="h-11 rounded-xl bg-transparent border-white/10 text-white font-black uppercase text-[9px] gap-2"><PlusCircle className="h-3.5 w-3.5" /> Manual</Button>
                            <Button variant="outline" onClick={handleImportTemplateClick} className="h-11 rounded-xl bg-transparent border-white/10 text-white font-black uppercase text-[9px] gap-2"><FileUp className="h-3.5 w-3.5" /> Template</Button>
                            <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".xlsx,.xls" className="hidden" />
                            <Button variant="outline" onClick={() => setIsImportScanOpen(true)} className="h-11 rounded-xl bg-transparent border-white/10 text-white font-black uppercase text-[9px] gap-2"><ScanSearch className="h-3.5 w-3.5" /> Scan</Button>
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

        <TabsContent value="users" className="outline-none px-2 m-0 overflow-x-auto">
          <Card className="rounded-[2rem] border-2 border-border/40 bg-card/50 overflow-hidden shadow-2xl min-w-[600px] sm:min-w-0"><CardContent className="p-6 sm:p-8"><UserManagement users={draftSettings.authorizedUsers} onUsersChange={(newUsers) => handleSettingChange('authorizedUsers', newUsers)} adminProfile={userProfile} /></CardContent></Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6 outline-none px-2 m-0">
          {loadingLogs ? <div className="py-20 flex justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div> : 
            errorLogs.length > 0 ? (
              <div className="space-y-4">
                {errorLogs.map(log => (
                  <Card key={log.id} className="rounded-2xl border-2 border-border/40 bg-card/50 p-5 sm:p-6 flex items-center justify-between hover:border-primary/20 transition-all cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className={cn("p-3 rounded-xl shadow-inner", log.severity === 'CRITICAL' ? "bg-red-100 text-red-600" : "bg-primary/10 text-primary")}>
                        {log.severity === 'CRITICAL' ? <ShieldAlert className="h-5 w-5" /> : <Activity className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-black text-[13px] sm:text-sm uppercase text-white truncate max-w-[180px] sm:max-w-none">{log.error.laymanExplanation}</h4>
                        <div className="flex items-center gap-3 text-[8px] sm:text-[9px] font-bold text-muted-foreground uppercase mt-1 opacity-60">
                          <span className="flex items-center gap-1"><Monitor className="h-2.5 w-2.5" /> {log.context.module}</span>
                          <span className="flex items-center gap-1"><History className="h-2.5 w-2.5" /> {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="font-black text-[8px] sm:text-[9px] uppercase border-primary/20 text-primary shrink-0">{log.status}</Badge>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="py-40 text-center opacity-20 border-4 border-dashed rounded-[3rem]">
                <History className="h-16 w-16 mx-auto mb-4 text-white" />
                <h3 className="text-xl font-black uppercase tracking-widest text-white">No Logs Detected</h3>
              </div>
            )
          }
        </TabsContent>
      </Tabs>

      <div className="fixed bottom-20 left-0 right-0 p-4 sm:p-6 bg-black/80 backdrop-blur-xl border-t border-white/5 z-50 flex items-center justify-between max-w-4xl mx-auto rounded-t-3xl shadow-2xl">
        <Button variant="outline" onClick={() => window.location.reload()} className="h-11 sm:h-12 px-6 sm:px-10 rounded-xl bg-black text-white font-black uppercase text-[10px] border-white/10 hover:bg-white/5">Cancel</Button>
        <Button onClick={handleCommitChanges} disabled={!hasChanges || isSaving} className="h-11 sm:h-12 px-6 sm:px-10 rounded-xl bg-primary text-black font-black uppercase text-[10px] gap-2 shadow-xl shadow-primary/20">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Commit Changes
        </Button>
      </div>

      <TravelReportDialog isOpen={isTravelReportOpen} onOpenChange={setIsTravelReportOpen} />
      <ImportScannerDialog isOpen={isImportScanOpen} onOpenChange={setIsImportScanOpen} />

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

'use client';

/**
 * @fileOverview SettingsWorkstation - High-Fidelity Master Control Center.
 * Phase 115: Overhauled Project tab to match high-fidelity mockup.
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
  History,
  Lock,
  PlusCircle,
  FileUp,
  ScanSearch,
  Wrench,
  Users,
  Loader2,
  Database,
  ArrowRightLeft,
  Monitor,
  PlaneTakeoff,
  KeyRound,
  Globe,
  ChevronRight,
  Columns,
  Settings2,
  Eye,
  ChevronsUpDown
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import type { AppSettings, SheetDefinition, Grant } from '@/types/domain';
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

export function SettingsWorkstation() {
  const { appSettings, refreshRegistry, settingsLoaded, setActiveGrantId, setActiveView } = useAppState();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const { setTheme, theme } = useTheme();

  const [draftSettings, setDraftSettings] = useState<AppSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [isTravelReportOpen, setIsTravelReportOpen] = useState(false);
  const [isImportScanOpen, setIsImportScanOpen] = useState(false);
  
  const [isColumnSheetOpen, setIsColumnSheetOpen] = useState(false);
  const [selectedSheetDef, setSelectedSheetDef] = useState<SheetDefinition | null>(null);
  const [activeGrantIdForSchema, setActiveGrantIdForSchema] = useState<string | null>(null);
  
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

  const handleCommitChanges = async () => {
    if (!draftSettings) return;
    setIsSaving(true);
    try {
      await FirestoreService.updateSettings(draftSettings);
      await storage.saveSettings(draftSettings);
      await refreshRegistry();
      toast({ title: "Configuration Synchronized" });
    } finally {
      setIsSaving(false);
    }
  };

  if (!settingsLoaded || !draftSettings) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-40 animate-in fade-in duration-700">
      <div className="space-y-1 px-1">
        <h2 className="text-3xl font-black tracking-tight text-white uppercase leading-none">Control Center</h2>
        <p className="text-[10px] font-bold text-muted-foreground opacity-70 uppercase tracking-widest mt-2">
          Global Environment & Identity Orchestration
        </p>
      </div>

      <Tabs defaultValue="projects" className="space-y-8">
        <div className="bg-muted/20 p-1.5 rounded-2xl border-2 border-border/40 overflow-hidden shadow-sm">
          <ScrollArea className="w-full">
            <TabsList className="bg-transparent border-none p-0 h-auto gap-1.5 flex items-center min-w-[500px]">
              <TabsTrigger value="projects" className="flex-1 px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-black data-[state=active]:text-white transition-all">
                <Wrench className="h-3.5 w-3.5" /> Projects
              </TabsTrigger>
              <TabsTrigger value="users" className="flex-1 px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-black data-[state=active]:text-white transition-all">
                <Users className="h-3.5 w-3.5" /> Users
              </TabsTrigger>
              <TabsTrigger value="general" className="flex-1 px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-black data-[state=active]:text-white transition-all">
                <Settings className="h-3.5 w-3.5" /> General
              </TabsTrigger>
              <TabsTrigger value="data" className="flex-1 px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-black data-[state=active]:text-white transition-all">
                <Database className="h-3.5 w-3.5" /> Data
              </TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        {/* 1. Manage Projects Tab (MATCHES MOCKUP) */}
        <TabsContent value="projects" className="space-y-8 outline-none m-0 px-1">
          <div className="space-y-6">
            <h3 className="text-xl font-black uppercase tracking-tight text-white">Manage Projects (Grants)</h3>
            
            <div className="flex gap-3">
              <Input 
                placeholder="New project name..." 
                value={newProjectName} 
                onChange={(e) => setNewProjectName(e.target.value)} 
                className="h-12 rounded-xl bg-black border-2 border-white/5 text-white font-bold text-sm shadow-inner focus-visible:ring-primary/20" 
              />
              <Button 
                onClick={handleAddProject} 
                className="h-12 px-8 rounded-xl bg-primary text-black font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl shadow-primary/20 shrink-0"
              >
                <PlusCircle className="h-4 w-4" /> Add Project
              </Button>
            </div>

            <div className="space-y-4">
              {draftSettings.grants.map((grant) => {
                const isActive = draftSettings.activeGrantId === grant.id;
                return (
                  <div 
                    key={grant.id} 
                    className={cn(
                      "rounded-[1.5rem] border-2 transition-all duration-500 bg-black text-white shadow-2xl", 
                      isActive ? "border-primary/40" : "border-white/5"
                    )}
                  >
                    <div className="p-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <ChevronsUpDown className="h-5 w-5 text-white/40" />
                        <div className="flex items-center gap-3">
                          <h4 className="font-black text-lg uppercase tracking-tight text-white">{grant.name}</h4>
                          {isActive && (
                            <Badge className="bg-primary text-black font-black uppercase text-[8px] h-5 px-2 rounded-full">Active</Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        {!isActive && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleSettingChange('activeGrantId', grant.id)}
                            className="h-9 px-4 rounded-xl border-white/20 text-white font-black text-[10px] uppercase hover:bg-white/5 transition-all"
                          >
                            Set Active
                          </Button>
                        )}
                        <button className="text-[10px] font-black uppercase text-white/60 hover:text-white transition-colors">Rename</button>
                        <button 
                          onClick={() => handleDeleteProject(grant.id)}
                          className="text-[10px] font-black uppercase text-destructive hover:text-destructive/80 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Expanded Active Project View */}
                    {isActive && (
                      <div className="px-6 pb-6 space-y-6 animate-in slide-in-from-top-2 duration-300">
                        <Separator className="bg-white/5" />
                        
                        <div className="space-y-4">
                          <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Sheet Definitions for this Project</h5>
                          <div className="space-y-2">
                            {Object.keys(grant.sheetDefinitions || {}).map(sheetName => (
                              <div key={sheetName} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/5 group hover:border-white/10 transition-all">
                                <span className="text-sm font-black text-white uppercase truncate max-w-[200px]">{sheetName}</span>
                                <div className="flex items-center gap-4 text-white/40">
                                  <button className="hover:text-white transition-colors" title="Quick View"><Eye className="h-4 w-4" /></button>
                                  <button className="hover:text-white transition-colors" title="Permissions"><Users className="h-4 w-4" /></button>
                                  <button 
                                    onClick={() => {
                                      setSelectedSheetDef(grant.sheetDefinitions[sheetName]);
                                      setActiveGrantIdForSchema(grant.id);
                                      setIsColumnSheetOpen(true);
                                    }}
                                    className="hover:text-primary transition-colors" 
                                    title="Edit Schema"
                                  >
                                    <Wrench className="h-4 w-4" />
                                  </button>
                                  <button className="hover:text-destructive transition-colors" title="Delete Sheet"><Trash2 className="h-4 w-4" /></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Action Buttons for Active Project */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <Button variant="outline" className="h-12 rounded-xl border-white/10 text-white font-black uppercase text-[10px] gap-2 hover:bg-white/5 shadow-sm">
                            <PlusCircle className="h-4 w-4" /> Add Manually
                          </Button>
                          <Button variant="outline" className="h-12 rounded-xl border-white/10 text-white font-black uppercase text-[10px] gap-2 hover:bg-white/5 shadow-sm">
                            <FileUp className="h-4 w-4" /> Import Template
                          </Button>
                          <Button 
                            onClick={() => setIsImportScanOpen(true)}
                            className="h-12 rounded-xl bg-primary/20 border-2 border-primary/20 text-primary font-black uppercase text-[10px] gap-2 hover:bg-primary hover:text-black shadow-lg transition-all"
                          >
                            <ScanSearch className="h-4 w-4" /> Scan & Import Data
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="users" className="outline-none px-1 m-0">
          <Card className="rounded-[2.5rem] border-2 border-border/40 bg-card/50 overflow-hidden shadow-3xl">
            <CardContent className="p-6 sm:p-10">
              <UserManagement users={draftSettings.authorizedUsers} onUsersChange={(newUsers) => handleSettingChange('authorizedUsers', newUsers)} adminProfile={userProfile} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general" className="space-y-8 outline-none m-0 px-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-8">
              <h3 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-3">
                <Palette className="h-5 w-5 text-primary" /> Visual Identity
              </h3>
              <Card className="rounded-[2rem] border-2 border-border/40 bg-card/50 p-8 space-y-6 shadow-2xl">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Globe className="h-4 w-4" />
                    <Label className="text-[10px] font-black uppercase tracking-widest">Interface Theme</Label>
                  </div>
                  <div className="flex flex-col xs:flex-row gap-3 bg-black/40 p-2 rounded-xl border border-white/5 shadow-inner">
                    <Button variant={theme === 'light' ? 'secondary' : 'ghost'} onClick={() => setTheme('light')} className="flex-1 h-11 rounded-lg font-black uppercase text-[10px] gap-2 transition-all"><Sun className="h-4 w-4" /> Light</Button>
                    <Button variant={theme === 'dark' ? 'secondary' : 'ghost'} onClick={() => setTheme('dark')} className="flex-1 h-11 rounded-lg font-black uppercase text-[10px] gap-2 transition-all"><Moon className="h-4 w-4" /> Dark</Button>
                    <Button variant={theme === 'system' ? 'secondary' : 'ghost'} onClick={() => setTheme('system')} className="flex-1 h-11 rounded-lg font-black uppercase text-[10px] gap-2 transition-all"><Monitor className="h-4 w-4" /> System</Button>
                  </div>
                </div>
              </Card>
            </div>

            <div className="space-y-8">
              <h3 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-3">
                <Lock className="h-5 w-5 text-primary" /> Security Pulse
              </h3>
              <Card className="rounded-[2rem] border-2 border-border/40 bg-card/50 p-8 space-y-6 shadow-2xl">
                <div className="flex items-center justify-between group">
                  <div className="space-y-1">
                    <h4 className="text-sm font-black uppercase text-white group-hover:text-primary transition-colors">Global Master Lock</h4>
                    <p className="text-[10px] font-medium text-muted-foreground italic leading-relaxed">Prevent direct record modification for all auditors.</p>
                  </div>
                  <Switch checked={draftSettings.lockAssetList} onCheckedChange={(v) => handleSettingChange('lockAssetList', v)} />
                </div>
                <Separator className="bg-white/5" />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-black uppercase text-white">Application Mode</h4>
                    <p className="text-[10px] font-medium text-muted-foreground italic">Verification mode enables field remark pulses.</p>
                  </div>
                  <Select value={draftSettings.appMode} onValueChange={(v) => handleSettingChange('appMode', v as any)}>
                    <SelectTrigger className="w-full sm:w-44 h-11 rounded-xl bg-black text-white font-black uppercase text-[10px] border-white/10 shadow-lg"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl"><SelectItem value="management" className="text-[10px] font-black uppercase">MANAGEMENT</SelectItem><SelectItem value="verification" className="text-[10px] font-black uppercase">VERIFICATION</SelectItem></SelectContent>
                  </Select>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="data" className="space-y-8 outline-none m-0 px-1">
          <h3 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-3">
            <Database className="h-5 w-5 text-primary" /> Registry Operations
          </h3>
          <Card className="rounded-[2.5rem] border-2 border-border/40 bg-card/50 p-8 space-y-6 shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                onClick={() => setIsImportScanOpen(true)}
                className="h-20 rounded-3xl border-2 flex items-center justify-start px-8 gap-4 transition-all hover:border-primary/40 hover:bg-primary/5 text-white"
              >
                <div className="p-3 bg-primary/10 rounded-2xl"><ScanSearch className="h-6 w-6 text-primary" /></div>
                <div className="flex flex-col items-start">
                  <span className="text-xs font-black uppercase">Scan Workbook</span>
                  <span className="text-[9px] font-medium text-muted-foreground italic">Identify hierarchical categories.</span>
                </div>
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setActiveView('REGISTRY')}
                className="h-20 rounded-3xl border-2 flex items-center justify-start px-8 gap-4 transition-all hover:border-primary/40 hover:bg-primary/5 text-white"
              >
                <div className="p-3 bg-primary/10 rounded-2xl"><PlusCircle className="h-6 w-6 text-primary" /></div>
                <div className="flex flex-col items-start">
                  <span className="text-xs font-black uppercase">New Record</span>
                  <span className="text-[9px] font-medium text-muted-foreground italic">Manual asset registration pulse.</span>
                </div>
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsTravelReportOpen(true)}
                className="h-20 rounded-3xl border-2 flex items-center justify-start px-8 gap-4 transition-all hover:border-primary/40 hover:bg-primary/5 text-white"
              >
                <div className="p-3 bg-primary/10 rounded-2xl"><PlaneTakeoff className="h-6 w-6 text-primary" /></div>
                <div className="flex flex-col items-start">
                  <span className="text-xs font-black uppercase">Travel Report</span>
                  <span className="text-[9px] font-medium text-muted-foreground italic">Automated archival export.</span>
                </div>
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Adaptive Master Footer */}
      <div className="fixed bottom-24 sm:bottom-28 left-0 right-0 z-50 pointer-events-none">
        <div className="adaptive-container">
          <div className="p-4 sm:p-6 bg-black/90 backdrop-blur-2xl border-2 border-white/10 rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-3xl pointer-events-auto group hover:border-primary/40 transition-all">
            <Button variant="outline" onClick={() => window.location.reload()} className="h-14 px-10 rounded-2xl bg-transparent text-white font-black uppercase text-[10px] tracking-widest border-white/10 hover:bg-white/5 transition-all w-full sm:w-auto">Cancel</Button>
            <div className={cn("flex items-center gap-4 transition-all duration-500", hasChanges ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none")}>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary animate-pulse hidden md:inline">Uncommitted modifications staged</span>
              <Button onClick={handleCommitChanges} disabled={isSaving} className="h-14 px-12 rounded-2xl bg-primary text-black font-black uppercase text-xs tracking-[0.2em] gap-3 shadow-2xl shadow-primary/30 w-full sm:w-auto transition-transform hover:scale-105 active:scale-95">
                {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} Commit Settings
              </Button>
            </div>
          </div>
        </div>
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

'use client';

/**
 * @fileOverview SettingsWorkstation - Master Control & Schema Engineering.
 * Phase 120: Stage 1 Template Discovery (Groups & Headers only).
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
  ShieldAlert
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
import { discoverTemplatesFromWorkbook } from '@/lib/excel-parser';
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
  const { appSettings, refreshRegistry, settingsLoaded, setActiveGrantId, isOnline } = useAppState();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const { setTheme, theme } = useTheme();

  const [draftSettings, setDraftSettings] = useState<AppSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [isTravelReportOpen, setIsTravelReportOpen] = useState(false);
  const [isImportScanOpen, setIsImportScanOpen] = useState(false);
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
      toast({ title: "Configuration Synchronized" });
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
      if (!activeGrantId) throw new Error("Select an active project first.");

      const updatedGrants = draftSettings.grants.map(g => {
        if (g.id === activeGrantId) {
          const nextDefs = { ...g.sheetDefinitions };
          discovered.forEach(d => { nextDefs[d.name] = d; });
          return { ...g, sheetDefinitions: nextDefs, enabledSheets: Array.from(new Set([...g.enabledSheets, ...discovered.map(d => d.name)])) };
        }
        return g;
      });

      handleSettingChange('grants', updatedGrants);
      toast({ title: "Groups & Headers Discovered", description: `Captured ${discovered.length} categories. Registry ready for asset ingestion.` });
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
      toast({ title: "Registry Purged", description: "Local data and state resets complete." });
      setIsNukeDialogOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  if (!settingsLoaded || !draftSettings) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-40 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tight text-white uppercase">Control Center</h2>
          <p className="text-[10px] font-bold text-muted-foreground opacity-70 uppercase tracking-widest">Global Environment & Schema Orchestration</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setIsNukeDialogOpen(true)} className="h-12 px-6 rounded-xl border-destructive/20 text-destructive hover:bg-destructive/10">
            <Bomb className="h-4 w-4 mr-2" /> Wipe Registry
          </Button>
          <Button onClick={handleCommitChanges} disabled={!hasChanges || isSaving} className="h-12 px-10 rounded-xl bg-primary text-black font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />} Commit Pulse
          </Button>
        </div>
      </div>

      <Tabs defaultValue="projects" className="space-y-8">
        <div className="bg-muted/20 p-1.5 rounded-2xl border-2 border-border/40 overflow-hidden shadow-sm">
          <ScrollArea className="w-full">
            <TabsList className="bg-transparent border-none p-0 h-auto gap-1.5 flex items-center min-w-[500px]">
              <TabsTrigger value="projects" className="flex-1 px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-black data-[state=active]:text-white">
                <Wrench className="h-3.5 w-3.5" /> Projects
              </TabsTrigger>
              <TabsTrigger value="users" className="flex-1 px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-black data-[state=active]:text-white">
                <Users className="h-3.5 w-3.5" /> Users
              </TabsTrigger>
              <TabsTrigger value="general" className="flex-1 px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-black data-[state=active]:text-white">
                <Settings className="h-3.5 w-3.5" /> General
              </TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        <TabsContent value="projects" className="space-y-8 outline-none m-0 px-1">
          <div className="space-y-6">
            <h3 className="text-xl font-black uppercase text-white">Project Orchestration</h3>
            <div className="space-y-4">
              {draftSettings.grants.map((grant) => {
                const isActive = draftSettings.activeGrantId === grant.id;
                return (
                  <div key={grant.id} className={cn("rounded-[1.5rem] border-2 transition-all duration-500 bg-black text-white shadow-2xl", isActive ? "border-primary/40" : "border-white/5")}>
                    <div className="p-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <ChevronsUpDown className="h-5 w-5 text-white/40" />
                        <h4 className="font-black text-lg uppercase">{grant.name}</h4>
                        {isActive && <Badge className="bg-primary text-black font-black text-[8px] h-5 px-2 rounded-full">ACTIVE AUTHORITY</Badge>}
                      </div>
                      {!isActive && (
                        <Button variant="outline" size="sm" onClick={() => handleSettingChange('activeGrantId', grant.id)} className="h-9 px-4 rounded-xl border-white/20 text-white text-[10px] font-black">Set Active</Button>
                      )}
                    </div>

                    {isActive && (
                      <div className="px-6 pb-6 space-y-6 animate-in slide-in-from-top-2 duration-300">
                        <Separator className="bg-white/5" />
                        <div className="space-y-4">
                          <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Registry Groups & Schema Hub</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {Object.keys(grant.sheetDefinitions || {}).map(sn => (
                              <div key={sn} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/5 group hover:border-primary/20 transition-all">
                                <span className="text-sm font-black text-white uppercase truncate">{sn}</span>
                                <Button variant="ghost" size="icon" onClick={() => { setSelectedSheetDef(grant.sheetDefinitions[sn]); setActiveGrantIdForSchema(grant.id); setIsColumnSheetOpen(true); }} className="text-white/40 hover:text-primary"><Wrench className="h-4 w-4" /></Button>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                          <input type="file" ref={templateInputRef} onChange={handleTemplateDiscovery} className="hidden" accept=".xlsx,.xls" />
                          <Button variant="outline" onClick={() => templateInputRef.current?.click()} disabled={isDiscovering} className="h-14 rounded-2xl border-white/10 text-white font-black uppercase text-[10px] gap-3">
                            {isDiscovering ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4 text-primary" />}
                            Stage 1: Discover Groups & Headers
                          </Button>
                          <Button onClick={() => setIsImportScanOpen(true)} className="h-14 rounded-2xl bg-primary text-black font-black uppercase text-[10px] gap-3 shadow-xl">
                            <FileUp className="h-4 w-4" />
                            Stage 2: Import Asset Pulse
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
          <Card className="rounded-[2.5rem] border-2 border-white/5 bg-black/40 overflow-hidden shadow-3xl">
            <CardContent className="p-10">
              <UserManagement users={draftSettings.authorizedUsers} onUsersChange={(u) => handleSettingChange('authorizedUsers', u)} adminProfile={userProfile} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general" className="space-y-8 outline-none m-0 px-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="rounded-[2rem] border-2 border-white/5 bg-black/40 p-8 space-y-6">
              <h3 className="text-lg font-black uppercase text-white flex items-center gap-3"><Palette className="h-5 w-5 text-primary" /> Visual Identity</h3>
              <div className="flex gap-2 p-1 bg-black/60 rounded-xl border border-white/5">
                <Button variant={theme === 'light' ? 'secondary' : 'ghost'} onClick={() => setTheme('light')} className="flex-1 h-11 rounded-lg font-black uppercase text-[10px]"><Sun className="h-4 w-4 mr-2" /> Light</Button>
                <Button variant={theme === 'dark' ? 'secondary' : 'ghost'} onClick={() => setTheme('dark')} className="flex-1 h-11 rounded-lg font-black uppercase text-[10px]"><Moon className="h-4 w-4 mr-2" /> Dark</Button>
              </div>
            </Card>
            <Card className="rounded-[2rem] border-2 border-white/5 bg-black/40 p-8 space-y-6">
              <h3 className="text-lg font-black uppercase text-white flex items-center gap-3"><Lock className="h-5 w-5 text-primary" /> System Guard</h3>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-black text-white">Global Master Lock</p>
                  <p className="text-[10px] text-muted-foreground italic">Block auditors from direct mutations.</p>
                </div>
                <Switch checked={draftSettings.lockAssetList} onCheckedChange={(v) => handleSettingChange('lockAssetList', v)} />
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <TravelReportDialog isOpen={isTravelReportOpen} onOpenChange={setIsTravelReportOpen} />
      <ImportScannerDialog isOpen={isImportScanOpen} onOpenChange={setIsImportScanOpen} />
      
      <AlertDialog open={isNukeDialogOpen} onOpenChange={setIsNukeDialogOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-destructive/20 bg-black shadow-3xl text-white">
          <AlertDialogHeader className="space-y-4">
            <div className="p-4 bg-destructive/10 rounded-2xl w-fit"><Bomb className="h-10 w-10 text-destructive" /></div>
            <AlertDialogTitle className="text-2xl font-black uppercase text-destructive">NUKE REGISTRY PULSE?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-white/40">This will permanently delete all local asset records. This pulse is irreversible and intended for registry preparation before a fresh ingestion.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-12 px-8 rounded-2xl font-bold border-white/10 bg-transparent m-0">Abort</AlertDialogCancel>
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

"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from './ui/separator';
import { useAppState } from '@/contexts/app-state-context';
import { updateSettings } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from 'next-themes';
import { 
    Sun, 
    Moon, 
    Database, 
    Trash2, 
    FileUp, 
    PlusCircle, 
    Loader2, 
    UserCog, 
    Settings as SettingsIcon, 
    Save, 
    ScanSearch, 
    Palette, 
    FolderKanban, 
    CheckCircle2, 
    PlaneTakeoff,
    RefreshCw
} from 'lucide-react';
import { ColumnCustomizationSheet } from './column-customization-sheet';
import type { SheetDefinition, AppSettings, Grant } from '@/lib/types';
import { UserManagement } from './admin/user-management';
import { saveLocalSettings } from '@/lib/idb';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { cn } from '@/lib/utils';

interface SettingsSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function SettingsSheet({ isOpen, onOpenChange }: SettingsSheetProps) {
  const { userProfile } = useAuth();
  const { appSettings, setAppSettings, dataActions, setActiveGrantId } = useAppState();
  const { toast } = useToast();
  const { setTheme } = useTheme();

  const [draftSettings, setDraftSettings] = useState<AppSettings | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      setDraftSettings(JSON.parse(JSON.stringify(appSettings)));
    }
  }, [isOpen, appSettings]);

  const hasChanges = useMemo(() => {
    return JSON.stringify(appSettings) !== JSON.stringify(draftSettings);
  }, [appSettings, draftSettings]);

  const handleSettingChange = (key: keyof AppSettings, value: any) => {
    if (!draftSettings) return;
    setDraftSettings(prev => prev ? ({ ...prev, [key]: value }) : null);
  };

  const handleAddGrant = () => {
    if (!draftSettings) return;
    const newGrant: Grant = {
      id: crypto.randomUUID(),
      name: 'New Asset Project',
      sheetDefinitions: {},
      enabledSheets: [],
    };
    handleSettingChange('grants', [...draftSettings.grants, newGrant]);
  };

  const handleRenameGrant = (id: string, name: string) => {
    if (!draftSettings) return;
    handleSettingChange('grants', draftSettings.grants.map(g => g.id === id ? { ...g, name } : g));
  };

  const handleDeleteGrant = (id: string) => {
    if (!draftSettings) return;
    if (draftSettings.grants.length <= 1) {
      toast({ title: "Cannot Delete", description: "At least one project must remain in the system.", variant: "destructive" });
      return;
    }
    const filtered = draftSettings.grants.filter(g => g.id !== id);
    let activeId = draftSettings.activeGrantId;
    if (activeId === id) activeId = filtered[0].id;
    setDraftSettings({ ...draftSettings, grants: filtered, activeGrantId: activeId });
  };

  const handleConfirmSave = async () => {
    if (!draftSettings) return;
    try {
      await updateSettings(draftSettings);
      await saveLocalSettings(draftSettings);
      setAppSettings(draftSettings);
      toast({ title: "Master Settings Saved" });
    } catch (e) {
      toast({ title: "Save Failed", variant: "destructive" });
    } finally {
      setIsConfirmOpen(false);
      onOpenChange(false);
    }
  };

  const isAdmin = userProfile?.isAdmin || false;
  const isGuest = userProfile?.isGuest || false;
  if (!draftSettings) return null;

  const activeGrantInDraft = draftSettings.grants.find(g => g.id === draftSettings.activeGrantId);

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl flex flex-col p-0 overflow-hidden rounded-l-3xl border-primary/10">
          <SheetHeader className="p-6 border-b bg-muted/20">
            <SheetTitle className="flex items-center gap-2 text-2xl font-black tracking-tight"><SettingsIcon className="h-6 w-6 text-primary"/> System Configuration</SheetTitle>
            <SheetDescription className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground opacity-70">Global Environment Control Panel</SheetDescription>
          </SheetHeader>

          <Tabs defaultValue="projects" className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 py-2 bg-muted/10 border-b">
                <TabsList className="grid w-full grid-cols-4 bg-background p-1 rounded-xl">
                    <TabsTrigger value="projects" className="text-[10px] font-black uppercase tracking-wider rounded-lg"><FolderKanban className="mr-2 h-3.5 w-3.5" /> Projects</TabsTrigger>
                    <TabsTrigger value="users" disabled={isGuest || !isAdmin} className="text-[10px] font-black uppercase tracking-wider rounded-lg"><UserCog className="mr-2 h-3.5 w-3.5" /> Identity</TabsTrigger>
                    <TabsTrigger value="general" className="text-[10px] font-black uppercase tracking-wider rounded-lg"><Palette className="mr-2 h-3.5 w-3.5" /> UI/UX</TabsTrigger>
                    <TabsTrigger value="data" disabled={isGuest || !isAdmin} className="text-[10px] font-black uppercase tracking-wider rounded-lg"><Database className="mr-2 h-3.5 w-3.5" /> Actions</TabsTrigger>
                </TabsList>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-6">
                    <TabsContent value="projects" className="space-y-6 m-0 outline-none">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black uppercase tracking-widest text-primary">Multi-Registry Management</h3>
                            <Button size="sm" onClick={handleAddGrant} variant="outline" className="h-8 font-bold text-[10px] uppercase border-primary/20 text-primary hover:bg-primary/5">
                                <PlusCircle className="mr-2 h-3.5 w-3.5" /> Add Project
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {draftSettings.grants.map((grant) => (
                                <Card key={grant.id} className={cn("border-2 transition-all duration-300 rounded-2xl", draftSettings.activeGrantId === grant.id ? "border-primary bg-primary/5 shadow-lg shadow-primary/5" : "border-border/50")}>
                                    <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
                                        <div className="flex-1 flex items-center gap-3">
                                            {draftSettings.activeGrantId === grant.id ? (
                                                <div className="p-1 bg-primary rounded-full shadow-lg shadow-primary/20"><CheckCircle2 className="h-4 w-4 text-white" /></div>
                                            ) : (
                                                <div className="h-5 w-5 rounded-full border-2 border-muted" />
                                            )}
                                            <Input 
                                                value={grant.name} 
                                                onChange={(e) => handleRenameGrant(grant.id, e.target.value)}
                                                className="border-none bg-transparent font-black text-base focus-visible:ring-0 p-0 h-auto"
                                            />
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {draftSettings.activeGrantId !== grant.id && (
                                                <Button variant="ghost" size="sm" className="h-8 font-black text-[10px] uppercase text-primary hover:bg-primary/10" onClick={() => handleSettingChange('activeGrantId', grant.id)}>Activate</Button>
                                            )}
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-40 hover:opacity-100 transition-opacity" onClick={() => handleDeleteGrant(id)}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="px-4 pb-4 pt-0">
                                        <div className="flex gap-2">
                                            <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-tighter bg-background border">{Object.keys(grant.sheetDefinitions || {}).length} Asset Classes</Badge>
                                            <Badge variant="outline" className="text-[9px] font-mono text-muted-foreground opacity-50 border-none p-0">ID: {grant.id.split('-')[0]}</Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {activeGrantInDraft && (
                            <div className="space-y-4 pt-4 border-t">
                                <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                    <RefreshCw className="h-3 w-3" /> Enabled Registry Classes: {activeGrantInDraft.name}
                                </h3>
                                <div className="rounded-2xl border bg-muted/10 p-4 space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {Object.keys(activeGrantInDraft.sheetDefinitions || {}).map(sn => (
                                            <div key={sn} className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-border/50 shadow-sm">
                                                <span className="text-[11px] font-bold truncate max-w-[150px]">{sn}</span>
                                                <Switch 
                                                    checked={(activeGrantInDraft.enabledSheets || []).includes(sn)} 
                                                    onCheckedChange={(checked) => {
                                                        const currentEnabled = activeGrantInDraft.enabledSheets || [];
                                                        const newEnabled = checked 
                                                            ? [...currentEnabled, sn]
                                                            : currentEnabled.filter(s => s !== sn);
                                                        handleSettingChange('grants', draftSettings.grants.map(g => g.id === activeGrantInDraft.id ? { ...g, enabledSheets: newEnabled } : g));
                                                    }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <Button variant="outline" className="w-full h-10 font-bold border-dashed border-2 text-[11px] uppercase tracking-wider text-muted-foreground hover:border-primary hover:text-primary transition-all" onClick={dataActions.onScanAndImport}>
                                        <ScanSearch className="mr-2 h-4 w-4" /> Discover New Registry Templates
                                    </Button>
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="users" className="m-0 outline-none">
                        <UserManagement 
                            users={draftSettings.authorizedUsers}
                            onUsersChange={(newUsers) => handleSettingChange('authorizedUsers', newUsers)}
                            adminProfile={userProfile}
                        />
                    </TabsContent>

                    <TabsContent value="general" className="space-y-6 m-0 outline-none">
                        <div className="space-y-4">
                            <h3 className="text-xs font-black uppercase tracking-widest text-primary">Identity & Branding</h3>
                            <Card className="p-4 bg-muted/5 border-dashed border-2 rounded-2xl">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70">System Theme Preference</Label>
                                <div className="flex gap-2 mt-3">
                                    <Button variant="outline" size="sm" onClick={() => setTheme('light')} className="flex-1 h-10 font-bold rounded-xl"><Sun className="mr-2 h-4 w-4"/> Light</Button>
                                    <Button variant="outline" size="sm" onClick={() => setTheme('dark')} className="flex-1 h-10 font-bold rounded-xl"><Moon className="mr-2 h-4 w-4"/> Dark</Button>
                                </div>
                            </Card>

                            <Card className="p-4 bg-muted/5 border-dashed border-2 space-y-4 rounded-2xl">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-xs font-black uppercase tracking-widest">Application Mode</Label>
                                        <p className="text-[10px] text-muted-foreground font-medium">Verification mode enables field status updates.</p>
                                    </div>
                                    <Select value={draftSettings.appMode} onValueChange={(v) => handleSettingChange('appMode', v)}>
                                        <SelectTrigger className="w-32 h-9 text-xs font-black uppercase tracking-tighter rounded-xl"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="management" className="text-xs font-bold">MANAGEMENT</SelectItem>
                                            <SelectItem value="verification" className="text-xs font-bold">VERIFICATION</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Separator className="opacity-50" />
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-xs font-black uppercase tracking-widest">Global Master Lock</Label>
                                        <p className="text-[10px] text-muted-foreground font-medium">Block direct cloud record creation for all users.</p>
                                    </div>
                                    <Switch checked={draftSettings.lockAssetList} onCheckedChange={(v) => handleSettingChange('lockAssetList', v)} />
                                </div>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="data" className="space-y-4 m-0 outline-none">
                        <h3 className="text-xs font-black uppercase tracking-widest text-primary">High-Impact Registry Tools</h3>
                        <div className="grid grid-cols-1 gap-3">
                            <Button variant="outline" className="h-14 justify-start font-black text-xs tracking-widest uppercase rounded-2xl border-2 hover:bg-primary/5 hover:border-primary/30 group" onClick={dataActions.onAddAsset}>
                                <div className="p-2 bg-primary/10 rounded-lg mr-4 group-hover:bg-primary/20 transition-colors"><PlusCircle className="h-5 w-5 text-primary" /></div>
                                New Record Registration
                            </Button>
                            <Button variant="outline" className="h-14 justify-start font-black text-xs tracking-widest uppercase rounded-2xl border-2 hover:bg-primary/5 hover:border-primary/30 group" onClick={dataActions.onScanAndImport}>
                                <div className="p-2 bg-primary/10 rounded-lg mr-4 group-hover:bg-primary/20 transition-colors"><ScanSearch className="h-5 w-5 text-primary" /></div>
                                Registry Workbook Scan
                            </Button>
                            <Button variant="outline" className="h-14 justify-start font-black text-xs tracking-widest uppercase rounded-2xl border-2 hover:bg-primary/5 hover:border-primary/30 group" onClick={dataActions.onTravelReport}>
                                <div className="p-2 bg-primary/10 rounded-lg mr-4 group-hover:bg-primary/20 transition-colors"><PlaneTakeoff className="h-5 w-5 text-primary" /></div>
                                Automation: Travel Report
                            </Button>
                            <Separator className="my-2" />
                            <Button variant="destructive" className="h-14 justify-start font-black text-xs tracking-widest uppercase rounded-2xl border-2 opacity-80 hover:opacity-100 group" onClick={dataActions.onClearAll}>
                                <div className="p-2 bg-white/10 rounded-lg mr-4 group-hover:bg-white/20 transition-colors"><Trash2 className="h-5 w-5" /></div>
                                Clear Global Registry
                            </Button>
                        </div>
                    </TabsContent>
                </div>
            </ScrollArea>

            <SheetFooter className="p-6 border-t bg-muted/20 sm:justify-between items-center">
                <SheetClose asChild><Button variant="ghost" className="font-bold rounded-xl">Discard Draft</Button></SheetClose>
                <Button onClick={() => setIsConfirmOpen(true)} disabled={!hasChanges} className="h-12 font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 px-8 rounded-2xl">
                    <Save className="mr-2 h-4 w-4" /> Broadcast Config
                </Button>
            </SheetFooter>
          </Tabs>
        </SheetContent>
      </Sheet>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent className="rounded-3xl border-primary/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-primary text-2xl font-black tracking-tight">Deploy Configuration?</AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-sm leading-relaxed">
              These changes will be broadcast to all connected clients in real-time. This includes role updates, project activation, and system locks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="font-bold rounded-xl">Review Further</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSave} className="font-black uppercase tracking-widest text-xs h-11 rounded-xl shadow-lg shadow-primary/20 px-6">
                Apply & Broadcast
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

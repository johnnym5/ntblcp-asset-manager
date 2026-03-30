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
import { Sun, Moon, Database, Trash2, FileUp, PlusCircle, Loader2, UserCog, Settings as SettingsIcon, Wrench, Save, ScanSearch, Palette, FolderKanban, CheckCircle2, Pencil } from 'lucide-react';
import { ColumnCustomizationSheet } from './column-customization-sheet';
import type { SheetDefinition, AppSettings, Grant } from '@/lib/types';
import { parseExcelForTemplate } from '@/lib/excel-parser';
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
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
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
  const [isSheetFormOpen, setIsSheetFormOpen] = useState(false);
  const [sheetToEdit, setSheetToEdit] = useState<SheetDefinition | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
      toast({ title: "Cannot Delete", description: "At least one project must remain.", variant: "destructive" });
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
      toast({ title: "Settings Saved" });
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
        <SheetContent className="w-full sm:max-w-2xl flex flex-col p-0 overflow-hidden">
          <SheetHeader className="p-6 border-b bg-muted/20">
            <SheetTitle className="flex items-center gap-2"><SettingsIcon className="h-5 w-5 text-primary"/> System Configuration</SheetTitle>
            <SheetDescription>Control global operational parameters and project environments.</SheetDescription>
          </SheetHeader>

          <Tabs defaultValue="projects" className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 py-2 bg-muted/10 border-b">
                <TabsList className="grid w-full grid-cols-4 bg-background">
                    <TabsTrigger value="projects" className="text-xs font-bold uppercase"><FolderKanban className="mr-2 h-3.5 w-3.5" /> Projects</TabsTrigger>
                    <TabsTrigger value="users" disabled={isGuest || !isAdmin} className="text-xs font-bold uppercase"><UserCog className="mr-2 h-3.5 w-3.5" /> Identity</TabsTrigger>
                    <TabsTrigger value="general" className="text-xs font-bold uppercase"><Palette className="mr-2 h-3.5 w-3.5" /> UI/UX</TabsTrigger>
                    <TabsTrigger value="data" disabled={isGuest || !isAdmin} className="text-xs font-bold uppercase"><Database className="mr-2 h-3.5 w-3.5" /> Actions</TabsTrigger>
                </TabsList>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-6">
                    <TabsContent value="projects" className="space-y-6 m-0">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black uppercase tracking-widest text-primary">Project Environments</h3>
                            <Button size="sm" onClick={handleAddGrant} variant="outline" className="h-8 font-bold text-[10px] uppercase">
                                <PlusCircle className="mr-2 h-3.5 w-3.5" /> Add Project
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {draftSettings.grants.map((grant) => (
                                <Card key={grant.id} className={cn("border-2 transition-all", draftSettings.activeGrantId === grant.id ? "border-primary bg-primary/5" : "border-border/50")}>
                                    <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
                                        <div className="flex-1 flex items-center gap-3">
                                            {draftSettings.activeGrantId === grant.id ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <div className="h-5 w-5 rounded-full border-2 border-muted" />}
                                            <Input 
                                                value={grant.name} 
                                                onChange={(e) => handleRenameGrant(grant.id, e.target.value)}
                                                className="border-none bg-transparent font-bold text-base focus-visible:ring-0 p-0 h-auto"
                                            />
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {draftSettings.activeGrantId !== grant.id && (
                                                <Button variant="ghost" size="sm" className="h-8 font-black text-[10px] uppercase text-primary" onClick={() => handleSettingChange('activeGrantId', grant.id)}>Activate</Button>
                                            )}
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteGrant(grant.id)}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="px-4 pb-4 pt-0">
                                        <div className="flex gap-2">
                                            <Badge variant="secondary" className="text-[9px] font-bold uppercase">{Object.keys(grant.sheetDefinitions || {}).length} Asset Classes</Badge>
                                            <Badge variant="outline" className="text-[9px] font-bold uppercase">{grant.id.split('-')[0]}</Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {activeGrantInDraft && (
                            <div className="space-y-4 pt-4 border-t">
                                <h3 className="text-sm font-black uppercase tracking-widest text-primary">Active Registry: {activeGrantInDraft.name}</h3>
                                <div className="rounded-2xl border bg-muted/10 p-4 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-bold uppercase">Toggle Asset Classes</Label>
                                        <div className="flex gap-2">
                                            <Button size="xs" variant="link" className="h-auto p-0 text-[10px]" onClick={() => handleRenameGrant(activeGrantInDraft.id, activeGrantInDraft.name)}>Enable All</Button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {Object.keys(activeGrantInDraft.sheetDefinitions).map(sn => (
                                            <div key={sn} className="flex items-center justify-between p-2 rounded-lg bg-background border">
                                                <span className="text-xs font-medium truncate">{sn}</span>
                                                <Switch checked={activeGrantInDraft.enabledSheets.includes(sn)} />
                                            </div>
                                        ))}
                                    </div>
                                    <Button variant="outline" className="w-full h-10 font-bold border-dashed">
                                        <ScanSearch className="mr-2 h-4 w-4" /> Scan Workbook for New Templates
                                    </Button>
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="users" className="m-0">
                        <UserManagement 
                            users={draftSettings.authorizedUsers}
                            onUsersChange={(newUsers) => handleSettingChange('authorizedUsers', newUsers)}
                            adminProfile={userProfile}
                        />
                    </TabsContent>

                    <TabsContent value="general" className="space-y-6 m-0">
                        <div className="space-y-4">
                            <h3 className="text-sm font-black uppercase tracking-widest text-primary">Branding & Logic</h3>
                            <Card className="p-4 bg-muted/5 border-dashed">
                                <Label className="text-xs font-bold text-muted-foreground">App Theme</Label>
                                <div className="flex gap-2 mt-2">
                                    <Button variant="outline" size="sm" onClick={() => setTheme('light')} className="flex-1"><Sun className="mr-2 h-4 w-4"/> Light</Button>
                                    <Button variant="outline" size="sm" onClick={() => setTheme('dark')} className="flex-1"><Moon className="mr-2 h-4 w-4"/> Dark</Button>
                                </div>
                            </Card>

                            <Card className="p-4 bg-muted/5 border-dashed space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-xs font-bold uppercase">Application Mode</Label>
                                        <p className="text-[10px] text-muted-foreground">Verification mode allows status updates.</p>
                                    </div>
                                    <Select value={draftSettings.appMode} onValueChange={(v) => handleSettingChange('appMode', v)}>
                                        <SelectTrigger className="w-32 h-8 text-xs font-bold"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="management" className="text-xs font-bold">Management</SelectItem>
                                            <SelectItem value="verification" className="text-xs font-bold">Verification</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-xs font-bold uppercase">Lock Master List</Label>
                                        <p className="text-[10px] text-muted-foreground">Prevent direct record creation in cloud.</p>
                                    </div>
                                    <Switch checked={draftSettings.lockAssetList} onCheckedChange={(v) => handleSettingChange('lockAssetList', v)} />
                                </div>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="data" className="space-y-4 m-0">
                        <h3 className="text-sm font-black uppercase tracking-widest text-primary">Master Data Controls</h3>
                        <div className="grid grid-cols-1 gap-3">
                            <Button variant="outline" className="h-12 justify-start font-bold" onClick={dataActions.onAddAsset}><PlusCircle className="mr-3 h-5 w-5 text-primary" /> Add New Record</Button>
                            <Button variant="outline" className="h-12 justify-start font-bold" onClick={dataActions.onScanAndImport}><ScanSearch className="mr-3 h-5 w-5 text-primary" /> Scan Registry Workbook</Button>
                            <Button variant="outline" className="h-12 justify-start font-bold" onClick={dataActions.onTravelReport}><PlaneTakeoff className="mr-3 h-5 w-5 text-primary" /> Generate Travel Report</Button>
                            <Separator className="my-2" />
                            <Button variant="destructive" className="h-12 justify-start font-bold opacity-80" onClick={dataActions.onClearAll}><Trash2 className="mr-3 h-5 w-5" /> Clear All Records</Button>
                        </div>
                    </TabsContent>
                </div>
            </ScrollArea>

            <SheetFooter className="p-6 border-t bg-muted/20 sm:justify-between items-center">
                <SheetClose asChild><Button variant="ghost" className="font-bold">Cancel</Button></SheetClose>
                <Button onClick={() => setIsConfirmOpen(true)} disabled={!hasChanges} className="h-11 font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20 px-8">
                    <Save className="mr-2 h-4 w-4" /> Save Master Config
                </Button>
            </SheetFooter>
          </Tabs>
        </SheetContent>
      </Sheet>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-primary">Apply Master Configuration?</AlertDialogTitle>
            <AlertDialogDescription className="font-medium">
              These changes will be broadcast to all users instantly. This will re-scope the entire organization into the active project and update permissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-bold">Discard</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSave} className="font-bold shadow-lg shadow-primary/20">Execute Apply</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/tabs'; // Using custom tabs export if available or from ui
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
import { useAppState } from '@/contexts/app-state-context';
import { updateSettings as updateSettingsFS } from '@/lib/firestore';
import { updateSettings as updateSettingsRTDB } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from 'next-themes';
import { 
    Sun, Moon, Database, Trash2, FileUp, PlusCircle, Loader2, UserCog, 
    Settings as SettingsIcon, Wrench, Save, ScanSearch, Palette, 
    PlaneTakeoff, Download, Users, Eye, EyeOff, MapPin, KeyRound, 
    History, RotateCcw, ChevronsUpDown, Check, X, Layers, LayoutGrid
} from 'lucide-react';
import type { SheetDefinition, AppSettings, AuthorizedUser, HistoricalAppSettings, Grant } from '@/lib/types';
import { parseExcelForTemplate } from '@/lib/excel-parser';
import { UserManagement } from './admin/user-management';
import { getLocalAssets as getLocalAssetsFromDb, saveAssets, saveLocalSettings } from '@/lib/idb';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from './ui/separator';
import { addNotification } from '@/hooks/use-notifications';
import { Checkbox } from './ui/checkbox';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { formatDistanceToNow } from 'date-fns';
import { cn, sanitizeForFirestore } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// Standardizing Tabs import
import { Tabs as TabsRoot, TabsList as TabsListRoot, TabsTrigger as TabsTriggerRoot, TabsContent as TabsContentRoot } from "@/components/ui/tabs";

interface SettingsSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  initialTab?: string;
}

export function SettingsSheet({ isOpen, onOpenChange, initialTab }: SettingsSheetProps) {
  const { userProfile } = useAuth();
  const { appSettings, setAppSettings, setDataSource, activeGrantId, isOnline, activeDatabase, dataActions } = useAppState();
  const { toast } = useToast();
  const { setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState(initialTab || 'general');
  const [draftSettings, setDraftSettings] = useState<AppSettings | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  
  const [newGrantName, setNewGrantName] = useState('');
  const [editingGrantId, setEditingGrantId] = useState<string | null>(null);
  const [editingGrantName, setEditingGrantName] = useState('');
  const [grantToDelete, setGrantToDelete] = useState<Grant | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
        setDraftSettings(JSON.parse(JSON.stringify(appSettings)));
        setActiveTab(initialTab || 'general');
    }
  }, [isOpen, appSettings, initialTab]);
  
  const hasChanges = useMemo(() => JSON.stringify(appSettings) !== JSON.stringify(draftSettings), [appSettings, draftSettings]);

  const handleSettingChange = (key: keyof AppSettings, value: any) => {
    setDraftSettings(prev => prev ? ({ ...prev, [key]: value }) : null);
  };

  const handleConfirmSave = async () => {
    if (!draftSettings || !userProfile) return;
    setIsSaving(true);
    try {
      const settingsToSave: AppSettings = sanitizeForFirestore({
          ...draftSettings,
          lastModified: new Date().toISOString(),
          lastModifiedBy: { displayName: userProfile.displayName, loginName: userProfile.loginName },
      });
      await saveLocalSettings(settingsToSave);
      setAppSettings(settingsToSave);
      if (isOnline) {
          const update = activeDatabase === 'firestore' ? updateSettingsFS : updateSettingsRTDB;
          await update(settingsToSave);
          addNotification({ title: "Settings Broadcasted", description: "All users updated in real-time." });
      }
    } finally {
      setIsSaving(false);
      setIsConfirmOpen(false);
      onOpenChange(false);
    }
  };

  const handleAddNewGrant = () => {
    const name = newGrantName.trim();
    if (!draftSettings || !name) return;
    const g: Grant = { id: uuidv4(), name, sheetDefinitions: {} };
    handleSettingChange('grants', [...(draftSettings.grants || []), g]);
    setNewGrantName('');
  };

  const isAdmin = userProfile?.isAdmin || false;
  if (!draftSettings) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl flex flex-col h-[90vh] p-0 overflow-hidden rounded-3xl">
          <DialogHeader className="p-6 border-b bg-muted/20">
            <DialogTitle>System Configuration</DialogTitle>
            <DialogDescription>Broadcasting project isolation and regional governance rules.</DialogDescription>
          </DialogHeader>
          
          <TabsRoot value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsListRoot className="mx-6 mt-4">
                <TabsTriggerRoot value="general" className="rounded-xl">General</TabsTriggerRoot>
                {isAdmin && (
                    <>
                        <TabsTriggerRoot value="projects" className="rounded-xl">Projects</TabsTriggerRoot>
                        <TabsTriggerRoot value="users" className="rounded-xl">Users</TabsTriggerRoot>
                    </>
                )}
            </TabsListRoot>

            <ScrollArea className="flex-1 px-6 py-4">
                <TabsContentRoot value="general" className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-sm font-black uppercase tracking-widest text-primary">Identity & Security</h3>
                        <Card className="p-4 bg-muted/5 border-dashed">
                            <Label className="text-xs font-bold text-muted-foreground">App Theme</Label>
                            <div className="flex gap-2 mt-2">
                                <Button variant="outline" size="sm" onClick={() => setTheme('light')} className="flex-1"><Sun className="mr-2 h-4 w-4"/> Light</Button>
                                <Button variant="outline" size="sm" onClick={() => setTheme('dark')} className="flex-1"><Moon className="mr-2 h-4 w-4"/> Dark</Button>
                            </div>
                        </Card>
                    </div>
                    {isAdmin && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-black uppercase tracking-widest text-primary">Global Governance</h3>
                            <Card className="p-4 space-y-4 bg-muted/5 border-dashed">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5"><Label className="font-bold">System Mode</Label><p className="text-[10px] text-muted-foreground">Switch logic between verification and management.</p></div>
                                    <Select value={draftSettings.appMode} onValueChange={v => handleSettingChange('appMode', v)}>
                                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                                        <SelectContent><SelectItem value="management">Management</SelectItem><SelectItem value="verification">Verification</SelectItem></SelectContent>
                                    </Select>
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5"><Label className="font-bold">Lock Projects</Label><p className="text-[10px] text-muted-foreground">Restrict record modifications for all users.</p></div>
                                    <Switch checked={draftSettings.lockAssetList} onCheckedChange={v => handleSettingChange('lockAssetList', v)} />
                                </div>
                            </Card>
                        </div>
                    )}
                </TabsContentRoot>

                <TabsContentRoot value="projects" className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Input placeholder="Create new project..." value={newGrantName} onChange={e => setNewGrantName(e.target.value)} className="rounded-xl"/>
                            <Button onClick={handleAddNewGrant} disabled={!newGrantName.trim()} className="rounded-xl"><PlusCircle className="mr-2 h-4 w-4"/> Initialize</Button>
                        </div>
                        <Separator />
                        <div className="space-y-3">
                            {draftSettings.grants.map(grant => (
                                <Card key={grant.id} className={cn("transition-all border-2", draftSettings.activeGrantId === grant.id ? "border-primary bg-primary/5" : "border-border")}>
                                    <div className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Layers className={cn("h-5 w-5", draftSettings.activeGrantId === grant.id ? "text-primary" : "text-muted-foreground")} />
                                            <span className="font-bold">{grant.name}</span>
                                            {draftSettings.activeGrantId === grant.id && <Badge className="bg-primary text-[9px] uppercase font-black">Active</Badge>}
                                        </div>
                                        <div className="flex gap-1">
                                            {draftSettings.activeGrantId !== grant.id && (
                                                <Button size="sm" variant="outline" className="rounded-lg h-8 px-2 text-[10px] uppercase font-black" onClick={() => handleSettingChange('activeGrantId', grant.id)}>Activate</Button>
                                            )}
                                            <Button size="sm" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => { setEditingGrantId(grant.id); setEditingGrantName(grant.name); }}><Edit className="h-3.5 w-3.5"/></Button>
                                            <Button size="sm" variant="ghost" className="h-8 w-8 rounded-full text-destructive" onClick={() => setGrantToDelete(grant)} disabled={draftSettings.grants.length <= 1}><Trash2 className="h-3.5 w-3.5"/></Button>
                                        </div>
                                    </div>
                                    <Collapsible open={draftSettings.activeGrantId === grant.id}>
                                        <CollapsibleContent className="p-4 pt-0 space-y-3">
                                            <Separator className="bg-primary/10" />
                                            <div className="grid grid-cols-3 gap-2">
                                                <Button variant="ghost" size="sm" className="text-[9px] font-black uppercase tracking-widest bg-background border h-8" onClick={() => addNotification({title: 'Add Manually (Project Scope)'})}><PlusCircle className="mr-1.5 h-3 w-3"/> Manual</Button>
                                                <Button variant="ghost" size="sm" className="text-[9px] font-black uppercase tracking-widest bg-background border h-8" onClick={() => addNotification({title: 'Import Template (Project Scope)'})}><FileUp className="mr-1.5 h-3 w-3"/> Template</Button>
                                                <Button variant="ghost" size="sm" className="text-[9px] font-black uppercase tracking-widest bg-background border h-8" onClick={() => { onOpenChange(false); dataActions.onScanAndImport?.(); }}><ScanSearch className="mr-1.5 h-3 w-3"/> Scan</Button>
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>
                                </Card>
                            ))}
                        </div>
                    </div>
                </TabsContentRoot>

                <TabsContentRoot value="users" className="pt-2">
                    <UserManagement users={draftSettings.authorizedUsers || []} onUsersChange={handleUsersChange} adminProfile={userProfile} />
                </TabsContentRoot>
            </ScrollArea>

            <DialogFooter className="p-6 border-t bg-muted/20 sm:justify-between items-center">
                <DialogClose asChild><Button variant="ghost">Discard Draft</Button></DialogClose>
                {hasChanges && (
                    <Button onClick={() => setIsConfirmOpen(true)} className="rounded-xl shadow-xl shadow-primary/20 font-bold px-8">
                        {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Save className="mr-2 h-4 w-4"/>}
                        Broadcast Changes
                    </Button>
                )}
            </DialogFooter>
          </TabsRoot>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent className="rounded-3xl border-primary/20">
          <AlertDialogHeader><AlertDialogTitle>Apply Project Governance?</AlertDialogTitle><AlertDialogDescription>This will update the project logic and authorized scopes for all users connected to the cloud database.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="rounded-xl">Review More</AlertDialogCancel><AlertDialogAction onClick={handleConfirmSave} className="rounded-xl bg-primary font-bold">Apply Globally</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!grantToDelete} onOpenChange={() => setGrantToDelete(null)}>
        <AlertDialogContent className="rounded-3xl border-destructive/20">
          <AlertDialogHeader><AlertDialogTitle className="text-destructive">Purge Project: {grantToDelete?.name}?</AlertDialogTitle><AlertDialogDescription>All assets and configuration headers for this project will be permanently erased. Proceed with caution.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel><AlertDialogAction onClick={async () => {
              const updated = (draftSettings.grants || []).filter(g => g.id !== grantToDelete!.id);
              handleSettingChange('grants', updated);
              if (draftSettings.activeGrantId === grantToDelete!.id) handleSettingChange('activeGrantId', updated[0]?.id || null);
              setGrantToDelete(null);
          }} className="rounded-xl bg-destructive font-bold text-white">Execute Purge</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

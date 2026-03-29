"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
    Layers, LayoutGrid, Edit, CheckCircle2
} from 'lucide-react';
import type { SheetDefinition, AppSettings, AuthorizedUser, Grant } from '@/lib/types';
import { UserManagement } from './admin/user-management';
import { saveLocalSettings } from '@/lib/idb';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from './ui/separator';
import { addNotification } from '@/hooks/use-notifications';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { cn, sanitizeForFirestore } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card } from './ui/card';
import { Tabs as TabsRoot, TabsList as TabsListRoot, TabsTrigger as TabsTriggerRoot, TabsContent as TabsContentRoot } from "@/components/ui/tabs";

interface SettingsSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  initialTab?: string;
}

export function SettingsSheet({ isOpen, onOpenChange, initialTab }: SettingsSheetProps) {
  const { userProfile } = useAuth();
  const { 
    appSettings, setAppSettings, activeGrantId, setActiveGrantId, 
    isOnline, activeDatabase, dataActions 
  } = useAppState();
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
    if (isOpen && appSettings) {
        setDraftSettings(JSON.parse(JSON.stringify(appSettings)));
        setActiveTab(initialTab || 'general');
    }
  }, [isOpen, appSettings, initialTab]);
  
  const hasChanges = useMemo(() => JSON.stringify(appSettings) !== JSON.stringify(draftSettings), [appSettings, draftSettings]);

  const handleSettingChange = (key: keyof AppSettings, value: any) => {
    setDraftSettings(prev => prev ? ({ ...prev, [key]: value }) : null);
  };

  const handleUsersChange = async (newUsers: AuthorizedUser[]) => {
      handleSettingChange('authorizedUsers', newUsers);
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
          addNotification({ title: "Settings Broadcasted", description: "All active users will receive the updated configuration instantly." });
      }
      toast({ title: "Configuration Updated" });
    } catch (e) {
        toast({ title: "Sync Failed", variant: "destructive" });
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
    toast({ title: "Project Created", description: "Initialize asset templates to begin." });
  };

  const handleRenameGrant = () => {
      if (!draftSettings || !editingGrantId || !editingGrantName.trim()) return;
      const updatedGrants = draftSettings.grants.map(g => 
          g.id === editingGrantId ? { ...g, name: editingGrantName } : g
      );
      handleSettingChange('grants', updatedGrants);
      setEditingGrantId(null);
      setEditingGrantName('');
  };

  const isAdmin = userProfile?.isAdmin || false;
  if (!draftSettings) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl flex flex-col h-[90vh] p-0 overflow-hidden rounded-3xl border-primary/10 shadow-2xl">
          <DialogHeader className="p-6 border-b bg-muted/20">
            <div className='flex items-center gap-3'>
                <div className="p-2 bg-primary rounded-xl"><SettingsIcon className="h-5 w-5 text-primary-foreground"/></div>
                <div>
                    <DialogTitle className="text-xl font-black tracking-tight">System Configuration</DialogTitle>
                    <DialogDescription className="text-xs font-bold uppercase tracking-widest opacity-60">Global Governance & Project Registers</DialogDescription>
                </div>
            </div>
          </DialogHeader>
          
          <TabsRoot value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            <div className='px-6 pt-4 bg-background z-10'>
                <TabsListRoot className="grid grid-cols-3 w-full h-11 p-1 bg-muted/50 rounded-xl border">
                    <TabsTriggerRoot value="general" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold">General</TabsTriggerRoot>
                    <TabsTriggerRoot value="projects" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold" disabled={!isAdmin}>Projects</TabsTriggerRoot>
                    <TabsTriggerRoot value="users" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold" disabled={!isAdmin}>Users</TabsTriggerRoot>
                </TabsListRoot>
            </div>

            <ScrollArea className="flex-1 px-6 py-4">
                <TabsContentRoot value="general" className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                            <Palette className="h-3 w-3"/> Visual Branding
                        </h3>
                        <Card className="p-4 bg-muted/5 border-dashed rounded-2xl">
                            <Label className="text-xs font-bold text-muted-foreground">Interface Theme</Label>
                            <div className="flex gap-2 mt-3">
                                <Button variant="outline" size="sm" onClick={() => setTheme('light')} className="flex-1 rounded-xl h-10 font-bold border-primary/10">
                                    <Sun className="mr-2 h-4 w-4 text-orange-500"/> Light
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setTheme('dark')} className="flex-1 rounded-xl h-10 font-bold border-primary/10">
                                    <Moon className="mr-2 h-4 w-4 text-blue-500"/> Dark
                                </Button>
                            </div>
                        </Card>
                    </div>

                    {isAdmin && (
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <ShieldCheck className="h-3 w-3"/> Global Rules
                            </h3>
                            <Card className="p-5 space-y-6 bg-muted/5 border-dashed rounded-2xl">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <Label className="font-bold text-sm">Logic Engine Mode</Label>
                                        <p className="text-[10px] text-muted-foreground leading-tight max-w-[200px]">Switch between Verification (Field Focus) or Management (Data Engineering).</p>
                                    </div>
                                    <Select value={draftSettings.appMode} onValueChange={v => handleSettingChange('appMode', v)}>
                                        <SelectTrigger className="w-36 h-10 rounded-xl font-bold border-primary/20">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className='rounded-xl'>
                                            <SelectItem value="management" className='font-bold'>Management</SelectItem>
                                            <SelectItem value="verification" className='font-bold'>Verification</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Separator className='opacity-50' />
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <Label className="font-bold text-sm">Main List Lockdown</Label>
                                        <p className="text-[10px] text-muted-foreground leading-tight max-w-[200px]">Freeze all modifications across all projects for standard users.</p>
                                    </div>
                                    <Switch checked={draftSettings.lockAssetList} onCheckedChange={v => handleSettingChange('lockAssetList', v)} />
                                </div>
                            </Card>
                        </div>
                    )}
                </TabsContentRoot>

                <TabsContentRoot value="projects" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-2xl border border-dashed">
                            <Input 
                                placeholder="Initialize new project name..." 
                                value={newGrantName} 
                                onChange={e => setNewGrantName(e.target.value)} 
                                className="h-11 rounded-xl border-none bg-background shadow-inner font-bold"
                            />
                            <Button onClick={handleAddNewGrant} disabled={!newGrantName.trim()} className="h-11 rounded-xl px-6 font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20">
                                <PlusCircle className="mr-2 h-4 w-4"/> Initialize
                            </Button>
                        </div>
                        
                        <Separator className='opacity-50' />
                        
                        <div className="space-y-3">
                            {draftSettings.grants?.map(grant => (
                                <Card key={grant.id} className={cn(
                                    "transition-all border-2 overflow-hidden rounded-2xl",
                                    draftSettings.activeGrantId === grant.id ? "border-primary bg-primary/5 ring-4 ring-primary/5" : "border-border hover:border-primary/20"
                                )}>
                                    <div className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("p-2 rounded-lg", draftSettings.activeGrantId === grant.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                                                <Layers className="h-4 w-4" />
                                            </div>
                                            {editingGrantId === grant.id ? (
                                                <div className="flex items-center gap-2">
                                                    <Input 
                                                        value={editingGrantName} 
                                                        onChange={e => setEditingGrantName(e.target.value)} 
                                                        className="h-8 w-48 font-bold" 
                                                        autoFocus 
                                                    />
                                                    <Button size="sm" onClick={handleRenameGrant} className="h-8">Save</Button>
                                                    <Button size="sm" variant="ghost" onClick={() => setEditingGrantId(null)} className="h-8">Cancel</Button>
                                                </div>
                                            ) : (
                                                <div className='flex flex-col'>
                                                    <span className="font-bold text-sm">{grant.name}</span>
                                                    <span className='text-[10px] font-bold text-muted-foreground uppercase opacity-60'>{Object.keys(grant.sheetDefinitions || {}).length} Asset Classes</span>
                                                </div>
                                            )}
                                            {draftSettings.activeGrantId === grant.id && (
                                                <Badge className="bg-primary text-[9px] uppercase font-black tracking-tighter h-5 px-1.5 ring-2 ring-background">Active Scope</Badge>
                                            )}
                                        </div>
                                        <div className="flex gap-1">
                                            {draftSettings.activeGrantId !== grant.id && (
                                                <Button size="sm" variant="outline" className="h-8 rounded-lg text-[9px] font-black uppercase tracking-widest bg-background" onClick={() => handleSettingChange('activeGrantId', grant.id)}>
                                                    Activate
                                                </Button>
                                            )}
                                            <Button size="sm" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => { setEditingGrantId(grant.id); setEditingGrantName(grant.name); }}>
                                                <Edit className="h-3.5 w-3.5"/>
                                            </Button>
                                            <Button size="sm" variant="ghost" className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10" onClick={() => setGrantToDelete(grant)} disabled={draftSettings.grants.length <= 1}>
                                                <Trash2 className="h-3.5 w-3.5"/>
                                            </Button>
                                        </div>
                                    </div>
                                    <Collapsible open={draftSettings.activeGrantId === grant.id}>
                                        <CollapsibleContent className="p-4 pt-0 space-y-3 animate-in slide-in-from-top-2">
                                            <Separator className="bg-primary/10" />
                                            <div className="grid grid-cols-3 gap-2">
                                                <Button variant="ghost" size="sm" className="text-[9px] font-black uppercase bg-background border border-primary/10 h-9 rounded-xl hover:bg-primary/5" onClick={() => addNotification({title: 'Manual Registry Ready'})}>
                                                    <PlusCircle className="mr-1.5 h-3 w-3 text-primary"/> Manual
                                                </Button>
                                                <Button variant="ghost" size="sm" className="text-[9px] font-black uppercase bg-background border border-primary/10 h-9 rounded-xl hover:bg-primary/5" onClick={() => addNotification({title: 'Template Engine Loaded'})}>
                                                    <FileUp className="mr-1.5 h-3 w-3 text-blue-500"/> Template
                                                </Button>
                                                <Button variant="ghost" size="sm" className="text-[9px] font-black uppercase bg-background border border-primary/10 h-9 rounded-xl hover:bg-primary/5" onClick={() => { onOpenChange(false); dataActions.onScanAndImport?.(); }}>
                                                    <ScanSearch className="mr-1.5 h-3 w-3 text-purple-500"/> Scan Data
                                                </Button>
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>
                                </Card>
                            ))}
                        </div>
                    </div>
                </TabsContentRoot>

                <TabsContentRoot value="users" className="pt-2 animate-in fade-in slide-in-from-bottom-2">
                    <UserManagement users={draftSettings.authorizedUsers || []} onUsersChange={handleUsersChange} adminProfile={userProfile} />
                </TabsContentRoot>
            </ScrollArea>

            <DialogFooter className="p-6 border-t bg-muted/20 sm:justify-between items-center">
                <DialogClose asChild><Button variant="ghost" className="font-bold">Discard Draft</Button></DialogClose>
                {hasChanges && (
                    <Button onClick={() => setIsConfirmOpen(true)} className="rounded-xl shadow-lg shadow-primary/20 font-black uppercase text-xs tracking-widest px-10 h-12">
                        {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Save className="mr-2 h-4 w-4"/>}
                        Deploy Configuration
                    </Button>
                )}
            </DialogFooter>
          </TabsRoot>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent className='rounded-3xl'>
          <AlertDialogHeader>
            <AlertDialogTitle className='flex items-center gap-2'>
                <ShieldCheck className='text-primary h-5 w-5'/> Deploy Global Governance?
            </AlertDialogTitle>
            <AlertDialogDescription className='font-medium'>
                This will instantly update project logic, user roles, and regional scopes for all active users across the network.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='rounded-xl font-bold'>Cancel Review</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSave} className="bg-primary font-black uppercase text-xs tracking-widest rounded-xl h-11 px-8">
                Confirm & Broadcast
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!grantToDelete} onOpenChange={() => setGrantToDelete(null)}>
        <AlertDialogContent className='rounded-3xl'>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle className='h-5 w-5'/> Permanent Purge: {grantToDelete?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-medium">
                Warning: All asset records, verification history, and templates associated with this project will be permanently erased from the cloud and all devices. This action is final.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='rounded-xl font-bold'>Abort Deletion</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
                const updated = (draftSettings.grants || []).filter(g => g.id !== grantToDelete!.id);
                handleSettingChange('grants', updated);
                if (draftSettings.activeGrantId === grantToDelete!.id) {
                    handleSettingChange('activeGrantId', updated[0]?.id || null);
                }
                setGrantToDelete(null);
                toast({ title: "Project Slated for Purge" });
            }} className="bg-destructive font-black uppercase text-xs tracking-widest rounded-xl h-11 px-8 text-white hover:bg-destructive/90">
                Execute Purge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


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
import { useAppState } from '@/contexts/app-state-context';
import { updateSettings as updateSettingsFS, batchDeleteAssets as batchDeleteAssetsFS } from '@/lib/firestore';
import { updateSettingsRTDB, batchDeleteAssets as batchDeleteAssetsRTDB } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from 'next-themes';
import { Sun, Moon, Database, Trash2, FileUp, PlusCircle, Loader2, UserCog, Settings as SettingsIcon, Wrench, Save, ScanSearch, Palette, PlaneTakeoff, Download, Users, Eye, EyeOff, MapPin, KeyRound, History, RotateCcw, ChevronsUpDown, Check, X } from 'lucide-react';
import { ColumnCustomizationSheet } from './column-customization-sheet';
import type { SheetDefinition, AppSettings, AuthorizedUser, HistoricalAppSettings, Grant } from '@/lib/types';
import { parseExcelForTemplate, parseExcelFile } from '@/lib/excel-parser';
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
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"


interface SettingsSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  initialTab?: string;
}

export function SettingsSheet({ isOpen, onOpenChange, initialTab }: SettingsSheetProps) {
  const { userProfile } = useAuth();
  const { appSettings, setAppSettings, setDataSource, assets, setAssets, isOnline, activeDatabase } = useAppState();
  const { toast } = useToast();
  const { setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState(initialTab || 'general');
  const [draftSettings, setDraftSettings] = useState<AppSettings | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSheetFormOpen, setIsSheetFormOpen] = useState(false);
  const [sheetToEdit, setSheetToEdit] = useState<SheetDefinition | null>(null);
  const [originalSheetName, setOriginalSheetName] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [permissionSheetName, setPermissionSheetName] = useState<string | null>(null);
  const [tempDisabledList, setTempDisabledList] = useState<string[]>([]);
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  
  // Grant/Project management state
  const [newGrantName, setNewGrantName] = useState('');
  const [editingGrantId, setEditingGrantId] = useState<string | null>(null);
  const [editingGrantName, setEditingGrantName] = useState('');
  const [grantToDelete, setGrantToDelete] = useState<Grant | null>(null);


  useEffect(() => {
    if (isOpen) {
        setDraftSettings(JSON.parse(JSON.stringify(appSettings)));
        setActiveTab(initialTab || 'projects');
    } else {
        setDraftSettings(null);
        setPasswordError('');
        setPasswordSuccess('');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
    }
  }, [isOpen, appSettings, initialTab]);
  
  const hasChanges = useMemo(() => {
    if (!draftSettings) return false;
    return JSON.stringify(appSettings) !== JSON.stringify(draftSettings);
  }, [appSettings, draftSettings]);
  
  const calculatedChanges = useMemo(() => {
    if (!draftSettings || !appSettings) return [];
    const changes: string[] = [];
    if (JSON.stringify(draftSettings.authorizedUsers) !== JSON.stringify(appSettings.authorizedUsers)) {
      changes.push('User list or passwords will be updated.');
    }
    if (JSON.stringify(draftSettings.grants) !== JSON.stringify(appSettings.grants)) {
      changes.push(`Project list, names, or sheet definitions will be updated.`);
    }
    if (draftSettings.appMode !== appSettings.appMode) {
      changes.push(`App mode will be set to: ${draftSettings.appMode}.`);
    }
    if (draftSettings.lockAssetList !== appSettings.lockAssetList) {
        changes.push(`Asset list lock will be set to: ${draftSettings.lockAssetList}.`);
    }
    return changes;
  }, [draftSettings, appSettings]);

  const handleSettingChange = (key: keyof AppSettings, value: any) => {
    if (!draftSettings) return;
    setDraftSettings(prev => prev ? ({ ...prev, [key]: value }) : null);
  };
  
  const handleUsersChange = (newUsers: AuthorizedUser[]) => {
    if (!draftSettings || !draftSettings.authorizedUsers) return;
    handleSettingChange('authorizedUsers', newUsers);
  };

  const handleAddSheet = (grantId: string) => {
    const newSheet: SheetDefinition = {
      name: 'New Sheet',
      headers: ['S/N', 'Description', 'Location'],
      displayFields: [
        { key: 'sn', label: 'S/N', table: true, quickView: true },
        { key: 'description', label: 'Description', table: true, quickView: true },
        { key: 'location', label: 'Location', table: true, quickView: true },
        { key: 'verifiedStatus', label: 'Verified Status', table: true, quickView: true },
      ],
      disabledFor: [],
    };
    setSheetToEdit(newSheet);
    setOriginalSheetName(null);
    setIsSheetFormOpen(true);
  };

  const handleEditSheet = (sheetName: string, grant: Grant) => {
    if (!draftSettings || !grant.sheetDefinitions) return;
    setSheetToEdit(grant.sheetDefinitions[sheetName]);
    setOriginalSheetName(sheetName);
    setIsSheetFormOpen(true);
  };
  
  const handleDeleteSheet = (sheetNameToDelete: string, grantId: string) => {
    if (!draftSettings) return;

    const newGrants = draftSettings.grants.map(g => {
        if (g.id === grantId) {
            const newSheetDefinitions = { ...g.sheetDefinitions };
            delete newSheetDefinitions[sheetNameToDelete];
            return { ...g, sheetDefinitions: newSheetDefinitions };
        }
        return g;
    });

    setDraftSettings(prev => prev ? ({ ...prev, grants: newGrants }) : null);
  };
  
  const handleImportTemplate = (grantId: string) => {
    fileInputRef.current?.setAttribute('data-grant-id', grantId);
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!draftSettings) return;
    const file = event.target.files?.[0];
    const grantId = event.target.getAttribute('data-grant-id');
    if (!file || !grantId) return;

    try {
      const templates = await parseExcelForTemplate(file);
      let sanitizedCount = 0;
      
      const newGrants = draftSettings.grants.map(g => {
          if (g.id === grantId) {
            let currentDefs = { ...(g.sheetDefinitions || {}) };

            templates.forEach(template => {
              const sanitizedName = template.name.replace(/[.$#\[\]/]/g, '_');
              if (sanitizedName !== template.name) {
                  sanitizedCount++;
              }
              if (sanitizedName !== template.name && currentDefs[template.name]) {
                  delete currentDefs[template.name];
              }
              template.name = sanitizedName;
              currentDefs[sanitizedName] = template;
            });
            return { ...g, sheetDefinitions: currentDefs };
          }
          return g;
      });

      handleSettingChange('grants', newGrants);

      toast({ title: 'Templates Imported', description: `${templates.length} sheet definitions were added/updated in your draft for this project.` });
      if (sanitizedCount > 0) {
        toast({
            title: "Sheet Names Sanitized",
            description: `${sanitizedCount} sheet name(s) were modified to remove invalid characters.`,
        })
      }
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes('bad compressed size')) {
        toast({ title: 'Import Failed', description: "The selected file appears to be corrupt or is not a valid Excel (.xlsx) file.", variant: 'destructive' });
      } else {
        toast({ title: 'Import Failed', description: (error as Error).message, variant: 'destructive' });
      }
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleConfirmSave = async () => {
    if (!draftSettings || !userProfile || !appSettings) return;
    setIsSaving(true);
    
    // Handle asset deletion for deleted grants
    const originalGrantIds = new Set(appSettings.grants.map(g => g.id));
    const newGrantIds = new Set(draftSettings.grants.map(g => g.id));
    const deletedGrantIds = [...originalGrantIds].filter(id => !newGrantIds.has(id));

    if (deletedGrantIds.length > 0) {
        const assetsToDelete = assets.filter(a => a.grantId && deletedGrantIds.includes(a.grantId));
        const assetIdsToDelete = assetsToDelete.map(a => a.id);
        
        if (assetIdsToDelete.length > 0) {
            addNotification({
                title: `Deleting Assets...`,
                description: `Removing ${assetIdsToDelete.length} assets from deleted project(s).`
            });
            try {
                const currentAssets = await getLocalAssetsFromDb();
                const remainingAssets = currentAssets.filter(a => !assetIdsToDelete.includes(a.id));
                await saveAssets(remainingAssets);
                setAssets(remainingAssets);

                if (isOnline) {
                    const batchDeleteCloudAssets = activeDatabase === 'firestore' ? batchDeleteAssetsFS : batchDeleteAssetsRTDB;
                    await batchDeleteCloudAssets(assetIdsToDelete);
                }
            } catch (e) {
                addNotification({ title: 'Asset Deletion Failed', description: (e as Error).message, variant: 'destructive' });
            }
        }
    }
    
    // Save settings
    try {
      const historyEntry: HistoricalAppSettings = { ...appSettings, grants: appSettings.grants.map(g => ({ id: g.id, name: g.name })) };
      delete historyEntry.settingsHistory;
          
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const recentHistory = (appSettings.settingsHistory || []).filter(h => {
          return h.lastModified && new Date(h.lastModified) > oneWeekAgo;
      });

      const newHistory = [historyEntry, ...recentHistory];
      
      const settingsToSave: AppSettings = {
          ...draftSettings,
          lastModified: new Date().toISOString(),
          lastModifiedBy: {
              displayName: userProfile.displayName,
              loginName: userProfile.loginName,
          },
          settingsHistory: newHistory.slice(0, 10),
      };

      const rtdbPromise = updateSettingsRTDB(settingsToSave);
      const firestorePromise = updateSettingsFS(settingsToSave);

      const results = await Promise.allSettled([rtdbPromise, firestorePromise]);

      const rtdbSuccess = results[0].status === 'fulfilled';
      const firestoreSuccess = results[1].status === 'fulfilled';

      if (rtdbSuccess && firestoreSuccess) {
        toast({ title: "Settings Saved", description: "Your changes have been applied to both cloud databases." });
      } else {
        toast({ title: "Cloud Save Incomplete", description: "Could not save settings to one or both cloud databases. Your changes are saved locally.", variant: "destructive" });
      }
      
      if (rtdbSuccess || firestoreSuccess) {
        await saveLocalSettings(settingsToSave);
        setAppSettings(settingsToSave);
      }
    } catch(e) {
      toast({ title: "Save Failed", description: (e as Error).message || "Could not save settings.", variant: "destructive" });
    } finally {
      setIsSaving(false);
      setIsConfirmOpen(false);
      onOpenChange(false);
    }
  };

  const handleSheetDefinitionSave = (originalName: string | null, newDefinition: SheetDefinition, applyToAll: boolean, grantId: string) => {
    if (!draftSettings) return;

    let newGrants = [...(draftSettings.grants || [])];

    if (applyToAll) {
      newGrants = newGrants.map(grant => {
          let newSheetDefs = { ...grant.sheetDefinitions };
          for (const sheetName in newSheetDefs) {
            newSheetDefs[sheetName] = {
              ...newSheetDefs[sheetName],
              displayFields: newDefinition.displayFields.map(f => ({...f})),
              headers: newDefinition.headers,
            };
          }
          return { ...grant, sheetDefinitions: newSheetDefs };
      });
      toast({ title: "Layout Applied to All", description: "The new column layout has been staged for all sheets in all projects. Click 'Save Changes' to confirm." });
    } else {
       newGrants = newGrants.map(grant => {
        if (grant.id === grantId) {
          let newSheetDefs = { ...grant.sheetDefinitions };
          if (originalName && originalName !== newDefinition.name) {
              delete newSheetDefs[originalName];
          }
          newSheetDefs[newDefinition.name] = newDefinition;
          return { ...grant, sheetDefinitions: newSheetDefs };
        }
        return grant;
      });
      
      toast({ title: "Sheet Layout Staged", description: `Changes for '${newDefinition.name}' are ready to be saved.` });
    }
    
    setDraftSettings(prev => prev ? ({ ...prev, grants: newGrants }) : null);
  };
  
  const openPermissionsDialog = (sheetName: string, grant: Grant) => {
    if (!draftSettings || !grant.sheetDefinitions) return;
    const sheet = grant.sheetDefinitions[sheetName];
    setTempDisabledList(sheet?.disabledFor || []);
    setPermissionSheetName(sheetName);
  };
  
  const handlePermissionSelection = (loginName: string, checked: boolean) => {
    setTempDisabledList(prev => {
        const isCurrentlyAll = prev.includes('all');
        const allNonAdminLogins = (draftSettings?.authorizedUsers || []).filter(u => !u.isAdmin).map(u => u.loginName);
        const user = draftSettings?.authorizedUsers.find(u => u.loginName === loginName);
        const loginNameIsAdmin = user?.isAdmin || user?.loginName === 'admin';

        if (loginName === 'all') {
            if (checked) {
                const admins = prev.filter(name => allNonAdminLogins.includes(name) === false && name !== 'all');
                return [...new Set(['all', ...admins])];
            } else {
                return prev.filter(name => name !== 'all');
            }
        }

        let currentSelections = isCurrentlyAll && !loginNameIsAdmin
            ? [...allNonAdminLogins, ...prev.filter(name => !allNonAdminLogins.includes(name) && name !== 'all')] 
            : [...prev];

        if (checked) {
            currentSelections = [...currentSelections, loginName];
        } else {
            currentSelections = currentSelections.filter(name => name !== loginName);
        }
        
        const selectedNonAdmins = currentSelections.filter(name => allNonAdminLogins.includes(name));
        const adminSelections = currentSelections.filter(name => !allNonAdminLogins.includes(name));

        if (allNonAdminLogins.length > 0 && selectedNonAdmins.length === allNonAdminLogins.length) {
            return [...new Set(['all', ...adminSelections])];
        }

        return [...new Set(currentSelections.filter(name => name !== 'all'))];
    });
  };

  const handleSavePermissions = (grantId: string) => {
    if (!draftSettings || !permissionSheetName) return;

    const newGrants = draftSettings.grants.map(g => {
        if (g.id === grantId) {
            const newSheetDefinitions = { ...g.sheetDefinitions };
            if (newSheetDefinitions[permissionSheetName]) {
                newSheetDefinitions[permissionSheetName].disabledFor = tempDisabledList;
            }
            return { ...g, sheetDefinitions: newSheetDefinitions };
        }
        return g;
    });

    handleSettingChange('grants', newGrants);
    setPermissionSheetName(null);
  }

  const handleToggleSheetVisibility = (sheetName: string, grantId: string) => {
    if (!draftSettings) return;

    const newGrants = draftSettings.grants.map(g => {
        if (g.id === grantId) {
            const newSheetDefinitions = { ...g.sheetDefinitions };
            if (newSheetDefinitions[sheetName]) {
                newSheetDefinitions[sheetName].isHidden = !newSheetDefinitions[sheetName].isHidden;
            }
            return { ...g, sheetDefinitions: newSheetDefinitions };
        }
        return g;
    });
    handleSettingChange('grants', newGrants);
  };
  
  const handleChangePassword = () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (!userProfile || !draftSettings) return;
    if (newPassword.length < 6) {
        setPasswordError("New password must be at least 6 characters.");
        return;
    }
    if (newPassword !== confirmNewPassword) {
        setPasswordError("New passwords do not match.");
        return;
    }

    const allUsers = [...(draftSettings.authorizedUsers || []), { loginName: 'admin', displayName: 'Super Admin', password: 'setup', states: ['All'], isAdmin: true }];
    const userIndex = allUsers.findIndex(u => u.loginName === userProfile.loginName);
    
    if (userIndex === -1) {
        setPasswordError("Could not find your user profile to update.");
        return;
    }

    const user = allUsers[userIndex];
    if (user.password !== currentPassword) {
        setPasswordError("Your current password is not correct.");
        return;
    }
    
    const updatedUsers = [...(draftSettings.authorizedUsers || [])];
    const userToUpdateIndex = updatedUsers.findIndex(u => u.loginName === userProfile.loginName);
    if(userToUpdateIndex > -1) {
      updatedUsers[userToUpdateIndex].password = newPassword;
      handleSettingChange('authorizedUsers', updatedUsers);
      setPasswordSuccess("Password changed successfully! Click 'Save Changes' below to confirm.");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } else {
        setPasswordError("An unexpected error occurred. Could not stage password change.");
    }
  };
  
  const handleRollback = (historicalSettings: HistoricalAppSettings) => {
    if (!appSettings) return;
    const settingsToRestore: AppSettings = {
        ...appSettings,
        ...historicalSettings,
        grants: historicalSettings.grants.map(hg => {
            const fullGrant = appSettings.grants.find(g => g.id === hg.id);
            return fullGrant || { ...hg, sheetDefinitions: {} };
        }),
        settingsHistory: draftSettings?.settingsHistory,
    };
    setDraftSettings(settingsToRestore);
    toast({ title: 'Rollback Staged', description: 'The selected historical settings have been loaded. Review and save changes to apply.' });
  };
  
  const handleAddNewGrant = () => {
    if (!draftSettings || !newGrantName.trim()) return;
    const newGrant: Grant = {
      id: uuidv4(),
      name: newGrantName.trim(),
      sheetDefinitions: {},
    };
    const updatedGrants = [...draftSettings.grants, newGrant];
    handleSettingChange('grants', updatedGrants);
    setNewGrantName('');
  };

  const handleStartRenameGrant = (grant: Grant) => {
    setEditingGrantId(grant.id);
    setEditingGrantName(grant.name);
  };

  const handleCancelRename = () => {
    setEditingGrantId(null);
    setEditingGrantName('');
  };

  const handleConfirmRename = () => {
    if (!draftSettings || !editingGrantId || !editingGrantName.trim()) {
      handleCancelRename();
      return;
    }
    const updatedGrants = draftSettings.grants.map(g =>
      g.id === editingGrantId ? { ...g, name: editingGrantName.trim() } : g
    );
    handleSettingChange('grants', updatedGrants);
    handleCancelRename();
  };

  const handleDeleteGrant = () => {
    if (!draftSettings || !grantToDelete) return;
    const updatedGrants = draftSettings.grants.filter(g => g.id !== grantToDelete.id);
    let newActiveGrantId = draftSettings.activeGrantId;
    if (draftSettings.activeGrantId === grantToDelete.id) {
      newActiveGrantId = updatedGrants[0]?.id || null;
    }
    setDraftSettings(prev => prev ? ({ ...prev, grants: updatedGrants, activeGrantId: newActiveGrantId }) : null);
    setGrantToDelete(null);
  };

  const isAdmin = userProfile?.isAdmin || false;
  
  if (!draftSettings) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="w-full sm:max-w-3xl flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Manage application settings and preferences. {isAdmin ? 'Admin changes apply to all users.' : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <Tabs defaultValue={initialTab} value={activeTab} onValueChange={setActiveTab} className="p-1">
              <TabsList className={cn("grid w-full", isAdmin ? "grid-cols-4" : "grid-cols-1")}>
                  <TabsTrigger value="general"><SettingsIcon className="mr-2 h-4 w-4" />General</TabsTrigger>
                  {isAdmin && (
                    <>
                      <TabsTrigger value="projects"><Wrench className="mr-2 h-4 w-4" />Projects & Sheets</TabsTrigger>
                      <TabsTrigger value="users"><UserCog className="mr-2 h-4 w-4" />Users</TabsTrigger>
                      <TabsTrigger value="history"><History className="mr-2 h-4 w-4" />History</TabsTrigger>
                    </>
                  )}
              </TabsList>
               <TabsContent value="general" className="pt-4 space-y-6">
                  <div>
                      <h3 className="text-lg font-medium mb-4">Appearance</h3>
                      <div className="rounded-lg border p-4 space-y-3">
                          <Label className="flex items-center gap-2 text-sm font-medium"><Palette className="h-4 w-4" /> Theme</Label>
                          <div className="flex justify-around">
                              <Button variant="outline" size="sm" onClick={() => setTheme('light')}><Sun className="mr-2"/>Light</Button>
                              <Button variant="outline" size="sm" onClick={() => setTheme('dark')}><Moon className="mr-2"/>Dark</Button>
                              <Button variant="outline" size="sm" onClick={() => setTheme('system')}><Database className="mr-2"/>System</Button>
                          </div>
                      </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Security</h3>
                    <div className="rounded-lg border p-4 space-y-4">
                      <Label className="flex items-center gap-2 text-sm font-medium"><KeyRound className="h-4 w-4" /> Change Your Password</Label>
                        <div className="space-y-2">
                          <Label htmlFor="current-password">Current Password</Label>
                          <Input id="current-password" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new-password">New Password</Label>
                          <Input id="new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                          <Input id="confirm-new-password" type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} />
                        </div>
                        {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
                        {passwordSuccess && <p className="text-sm text-green-600">{passwordSuccess}</p>}
                        <Button size="sm" onClick={handleChangePassword} disabled={isSaving}>Stage Password Change</Button>
                        <p className="text-xs text-muted-foreground">Your password change will be saved when you click "Save Changes" at the bottom of the panel.</p>
                    </div>
                  </div>

                  {isAdmin && (
                    <div>
                      <h3 className="text-lg font-medium mb-4">Global Admin Settings</h3>
                      <div className="rounded-lg border p-4 space-y-4 divide-y">
                          <div className="flex items-center justify-between pt-1">
                              <div className="space-y-1">
                                  <Label htmlFor="app-mode" className="text-sm font-medium">Application Mode</Label>
                                  <p className="text-xs text-muted-foreground">
                                  {draftSettings.appMode === 'management'
                                      ? 'Management: Data is locked for non-admins.'
                                      : 'Verification: Users can update status/remarks.'
                                  }
                                  </p>
                              </div>
                              <Select value={draftSettings.appMode} onValueChange={(value) => handleSettingChange('appMode', value)}>
                                  <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                  <SelectItem value="management">Management</SelectItem>
                                  <SelectItem value="verification">Verification</SelectItem>
                                  </SelectContent>
                              </Select>
                          </div>
                          <div className="flex items-center justify-between pt-4">
                              <div className="space-y-1">
                                  <Label htmlFor="lock-assets" className="text-sm">Lock Asset List</Label>
                                  <p className="text-xs text-muted-foreground">Prevent adding/deleting from main list.</p>
                              </div>
                              <Switch id="lock-assets" checked={draftSettings.lockAssetList} onCheckedChange={(checked) => handleSettingChange('lockAssetList', checked)}/>
                          </div>
                      </div>
                    </div>
                  )}
              </TabsContent>
              {isAdmin && (
                <>
                <TabsContent value="projects" className="pt-4 space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium">Manage Projects (Grants)</h3>
                      <div className="flex items-center gap-2">
                          <Input
                            placeholder="New project name..."
                            value={newGrantName}
                            onChange={(e) => setNewGrantName(e.target.value)}
                          />
                          <Button onClick={handleAddNewGrant} disabled={!newGrantName.trim()}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Project
                          </Button>
                      </div>
                    </div>
                    <Separator />
                    <ScrollArea className="h-[400px] pr-2">
                        <div className="space-y-4">
                        {draftSettings.grants?.map(grant => (
                            <Collapsible key={grant.id} className="border rounded-lg bg-background" defaultOpen={grant.id === draftSettings.activeGrantId}>
                            <div className="flex items-center p-2 border-b">
                                <CollapsibleTrigger asChild>
                                    <div className="flex-1 flex items-center gap-2 cursor-pointer p-2">
                                        <ChevronsUpDown className="h-4 w-4" />
                                        {editingGrantId === grant.id ? (
                                             <div className="flex items-center gap-2 flex-1">
                                                <Input
                                                    value={editingGrantName}
                                                    onChange={(e) => setEditingGrantName(e.target.value)}
                                                    className="h-8 text-base font-semibold"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                      if (e.key === 'Enter') handleConfirmRename();
                                                      if (e.key === 'Escape') handleCancelRename();
                                                    }}
                                                />
                                                <Button size="icon" className="h-8 w-8" onClick={handleConfirmRename}><Check className="h-4 w-4" /></Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancelRename}><X className="h-4 w-4" /></Button>
                                            </div>
                                        ) : (
                                            <span className="font-semibold text-lg">{grant.name}</span>
                                        )}
                                        {grant.id === draftSettings.activeGrantId && <Badge variant="default">Active</Badge>}
                                    </div>
                                </CollapsibleTrigger>
                                <div className="flex items-center gap-1">
                                    {editingGrantId !== grant.id && (
                                      <>
                                        {grant.id !== draftSettings.activeGrantId && (
                                            <Button size="sm" variant="outline" onClick={() => handleSettingChange('activeGrantId', grant.id)}>Set Active</Button>
                                        )}
                                        <Button size="sm" variant="ghost" onClick={() => handleStartRenameGrant(grant)}>Rename</Button>
                                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setGrantToDelete(grant)} disabled={draftSettings.grants.length <= 1}>Delete</Button>
                                      </>
                                    )}
                                </div>
                            </div>
                            <CollapsibleContent className="p-4 bg-muted/50">
                                <div className="space-y-4">
                                  <p className="text-sm font-medium">Sheet Definitions for this Project</p>
                                   <div className="rounded-lg border bg-background p-2 mt-2">
                                      <div className="space-y-1">
                                        {(grant.sheetDefinitions && Object.keys(grant.sheetDefinitions).length > 0) ? Object.keys(grant.sheetDefinitions).map(sheetName => (
                                          <div key={sheetName} className="flex items-center justify-between pr-2 hover:bg-muted/50 rounded-md">
                                            <Label className="text-sm pl-2 flex-1">{sheetName}</Label>
                                            <div className="flex items-center gap-1">
                                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggleSheetVisibility(sheetName, grant.id)}>
                                                {grant.sheetDefinitions[sheetName].isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                              </Button>
                                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openPermissionsDialog(sheetName, grant)}><Users className="h-4 w-4" /></Button>
                                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditSheet(sheetName, grant)}><Wrench className="h-4 w-4" /></Button>
                                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteSheet(sheetName, grant.id)}><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                          </div>
                                        )) : <p className="text-xs text-center text-muted-foreground p-4">No sheets defined for this project.</p>}
                                      </div>
                                    </div>
                                    <div className="mt-2 flex flex-col sm:flex-row gap-2">
                                        <Button variant="outline" size="sm" className="w-full" onClick={() => handleAddSheet(grant.id)}><PlusCircle className="mr-2" /> Add Manually</Button>
                                        <Button variant="outline" size="sm" className="w-full" onClick={() => handleImportTemplate(grant.id)}><FileUp className="mr-2" /> Import from File</Button>
                                    </div>
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                        ))}
                        </div>
                    </ScrollArea>
                </TabsContent>
                  <TabsContent value="users" className="pt-4">
                      <UserManagement 
                      users={draftSettings.authorizedUsers || []}
                      onUsersChange={handleUsersChange}
                      adminProfile={userProfile}
                      />
                  </TabsContent>
                  <TabsContent value="history" className="pt-4">
                     <div>
                        <h3 className="text-lg font-medium mb-4 flex items-center gap-2"><History className="h-5 w-5" /> Settings History</h3>
                        <p className="text-sm text-muted-foreground mb-4">You can roll back to a previous version of your settings from the last 7 days. Rolling back will stage the changes; you still need to save them.</p>
                        <div className="rounded-lg border p-3">
                            <ScrollArea className="h-[400px]">
                                {(draftSettings.settingsHistory && draftSettings.settingsHistory.length > 0) ? (
                                    <div className="space-y-2">
                                        {draftSettings.settingsHistory.map((historyItem, index) => (
                                            <div key={index} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md">
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        Saved by: {historyItem.lastModifiedBy?.displayName || 'Unknown'}
                                                    </p>
                                                    {historyItem.lastModified && (
                                                      <p className="text-xs text-muted-foreground">
                                                          {formatDistanceToNow(new Date(historyItem.lastModified), { addSuffix: true })}
                                                      </p>
                                                    )}
                                                </div>
                                                <Button size="sm" variant="ghost" onClick={() => handleRollback(historyItem)}>
                                                   <RotateCcw className="mr-2 h-4 w-4" />
                                                    Rollback
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-8">No settings history available within the last week.</p>
                                )}
                            </ScrollArea>
                        </div>
                      </div>
                  </TabsContent>
                </>
              )}
            </Tabs>
          </div>

          <DialogFooter className="mt-auto pt-4 border-t sm:justify-between">
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            {hasChanges && (
              <Button onClick={() => setIsConfirmOpen(true)} disabled={!hasChanges || isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Changes
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".xlsx, .xls" className="hidden" />

      {sheetToEdit && draftSettings?.activeGrantId && (
        <ColumnCustomizationSheet
          isOpen={isSheetFormOpen}
          onOpenChange={setIsSheetFormOpen}
          sheetDefinition={sheetToEdit}
          originalSheetName={originalSheetName}
          onSave={(...args) => handleSheetDefinitionSave(...args, draftSettings.activeGrantId!)}
        />
      )}
      
      {permissionSheetName && draftSettings?.activeGrantId && draftSettings?.authorizedUsers && (
         <AlertDialog open={!!permissionSheetName} onOpenChange={() => setPermissionSheetName(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sheet Permissions for '{permissionSheetName}'</AlertDialogTitle>
                <AlertDialogDescription>
                    Select which users should be **denied** access to this sheet. The super-admin user always has access.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <ScrollArea className="h-[250px] rounded-md border">
                  <div className="p-4 space-y-2">
                       <div className="flex items-center space-x-2">
                            <Checkbox 
                                id="disable-for-all" 
                                checked={tempDisabledList.includes('all')}
                                onCheckedChange={(checked) => handlePermissionSelection('all', !!checked)}
                            />
                            <Label htmlFor="disable-for-all" className="font-bold">Disable for all non-admin users</Label>
                       </div>
                       <Separator />
                       {draftSettings.authorizedUsers.filter(u => u.loginName !== 'admin').map(user => (
                           <div key={user.loginName} className="flex items-center space-x-2">
                                <Checkbox 
                                    id={`disable-${user.loginName}`} 
                                    checked={!user.isAdmin && tempDisabledList.includes('all') ? true : tempDisabledList.includes(user.loginName)}
                                    onCheckedChange={(checked) => handlePermissionSelection(user.loginName, !!checked)}
                                    disabled={!user.isAdmin && tempDisabledList.includes('all')}
                                />
                                <Label htmlFor={`disable-${user.loginName}`} className="flex items-center">
                                  {user.displayName}
                                  {user.isAdmin && <Badge variant="secondary" className="ml-2">Admin</Badge>}
                                </Label>
                           </div>
                       ))}
                  </div>
              </ScrollArea>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleSavePermissions(draftSettings.activeGrantId!)}>Save Permissions</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
         </AlertDialog>
      )}

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Changes</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to save these changes to the database? This will affect all users.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {calculatedChanges.length > 0 && (
             <div className="py-4 text-sm text-foreground">
                <p className="font-semibold mb-2">Summary of changes:</p>
                <ul className="list-disc pl-5 space-y-1">
                    {calculatedChanges.map((change, i) => <li key={i}>{change}</li>)}
                </ul>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirm & Save'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!grantToDelete} onOpenChange={() => setGrantToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project: {grantToDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this project and all of its associated assets and sheets. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGrant} className="bg-destructive hover:bg-destructive/90">
                Yes, Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

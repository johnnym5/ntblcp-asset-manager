
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { useAppState } from '@/contexts/app-state-context';
import { updateSettings as updateSettingsFS } from '@/lib/firestore';
import { updateSettings as updateSettingsRTDB } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from 'next-themes';
import { Sun, Moon, Database, Trash2, FileUp, PlusCircle, Loader2, UserCog, Settings as SettingsIcon, Wrench, Save, ScanSearch, Palette, PlaneTakeoff, Download, Users, Eye, EyeOff, MapPin, KeyRound, History, RotateCcw } from 'lucide-react';
import { ColumnCustomizationSheet } from './column-customization-sheet';
import type { SheetDefinition, AppSettings, AuthorizedUser, HistoricalAppSettings } from '@/lib/types';
import { parseExcelForTemplate, parseExcelFile } from '@/lib/excel-parser';
import { UserManagement } from './admin/user-management';
import { saveLocalSettings, getLockedOfflineAssets, saveLockedOfflineAssets } from '@/lib/idb';
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
import { TravelReportDialog } from './travel-report-dialog';


interface SettingsSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  initialTab?: string;
}

export function SettingsSheet({ isOpen, onOpenChange, initialTab }: SettingsSheetProps) {
  const { userProfile } = useAuth();
  const { appSettings, setAppSettings, setDataSource } = useAppState();
  const { toast } = useToast();
  const { setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState(initialTab || 'general');
  const [draftSettings, setDraftSettings] = useState<AppSettings | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSheetFormOpen, setIsSheetFormOpen] = useState(false);
  const [sheetToEdit, setSheetToEdit] = useState<SheetDefinition | null>(null);
  const [originalSheetName, setOriginalSheetName] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const [permissionSheetName, setPermissionSheetName] = useState<string | null>(null);
  const [tempDisabledList, setTempDisabledList] = useState<string[]>([]);
  const [newLocation, setNewLocation] = useState('');
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isTravelReportOpen, setIsTravelReportOpen] = useState(false);


  useEffect(() => {
    if (isOpen) {
        setDraftSettings(JSON.parse(JSON.stringify(appSettings)));
        setActiveTab(initialTab || 'general');
    } else {
        setDraftSettings(null);
        setPasswordError('');
        setPasswordSuccess('');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (JSON.stringify(draftSettings.sheetDefinitions) !== JSON.stringify(appSettings.sheetDefinitions)) {
      changes.push(`Sheet definitions (columns/permissions) will be updated.`);
    }
    if (JSON.stringify(draftSettings.locations) !== JSON.stringify(appSettings.locations)) {
      changes.push('Location list will be updated.');
    }
    return changes;
  }, [draftSettings, appSettings]);


  const handleSettingChange = (key: keyof AppSettings, value: any) => {
    if (!draftSettings) return;
    setDraftSettings(prev => prev ? ({ ...prev, [key]: value }) : null);
  };
  
  const handleUsersChange = (newUsers: AuthorizedUser[]) => {
    if (!draftSettings) return;
    handleSettingChange('authorizedUsers', newUsers);
  };

  const handleAddSheet = () => {
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

  const handleEditSheet = (sheetName: string) => {
    if (!draftSettings) return;
    setSheetToEdit(draftSettings.sheetDefinitions[sheetName]);
    setOriginalSheetName(sheetName);
    setIsSheetFormOpen(true);
  };
  
  const handleDeleteSheet = (sheetNameToDelete: string) => {
    if (!draftSettings) return;
    const newSheetDefinitions = { ...draftSettings.sheetDefinitions };
    delete newSheetDefinitions[sheetNameToDelete];
    setDraftSettings(prev => prev ? ({ ...prev, sheetDefinitions: newSheetDefinitions }) : null);
  };
  
  const handleImportTemplate = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!draftSettings) return;
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const templates = await parseExcelForTemplate(file);
      let currentDefs = { ...draftSettings.sheetDefinitions };
      let sanitizedCount = 0;
      
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
      
      handleSettingChange('sheetDefinitions', currentDefs);

      toast({ title: 'Templates Imported', description: `${templates.length} sheet definitions were added/updated in your draft.` });
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
    if (!draftSettings || !userProfile) return;
    
    const settingsToSave: AppSettings = {
        ...draftSettings,
        lastModified: new Date().toISOString(),
        lastModifiedBy: {
            displayName: userProfile.displayName,
            loginName: userProfile.loginName,
        }
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
    
    setIsConfirmOpen(false);
    onOpenChange(false);
  };

  const handleSheetDefinitionSave = (originalName: string | null, newDefinition: SheetDefinition, applyToAll: boolean) => {
    if (!draftSettings) return;

    let newSheetDefinitions = { ...draftSettings.sheetDefinitions };

    if (applyToAll) {
      for (const sheetName in newSheetDefinitions) {
        newSheetDefinitions[sheetName] = {
          ...newSheetDefinitions[sheetName],
          displayFields: newDefinition.displayFields.map(f => ({...f})),
          headers: newDefinition.headers,
        };
      }
      toast({ title: "Layout Applied to All", description: "The new column layout has been staged for all sheets. Click 'Save Changes' to confirm." });
    } else {
      if (originalName && originalName !== newDefinition.name) {
          delete newSheetDefinitions[originalName];
      }
      newSheetDefinitions[newDefinition.name] = newDefinition;
      
      toast({ title: "Sheet Layout Staged", description: `Changes for '${newDefinition.name}' are ready to be saved.` });
    }
    
    setDraftSettings(prev => prev ? ({
      ...prev,
      sheetDefinitions: newSheetDefinitions,
    }) : null);
  };
  
  const openPermissionsDialog = (sheetName: string) => {
    if (!draftSettings) return;
    const sheet = draftSettings.sheetDefinitions[sheetName];
    setTempDisabledList(sheet?.disabledFor || []);
    setPermissionSheetName(sheetName);
  };
  
  const handlePermissionSelection = (loginName: string, checked: boolean) => {
    setTempDisabledList(prev => {
        const isCurrentlyAll = prev.includes('all');
        const allNonAdminLogins = draftSettings?.authorizedUsers.filter(u => !u.isAdmin).map(u => u.loginName) || [];
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

  const handleSavePermissions = () => {
    if (!draftSettings || !permissionSheetName) return;

    const newSheetDefinitions = { ...draftSettings.sheetDefinitions };
    newSheetDefinitions[permissionSheetName].disabledFor = tempDisabledList;

    handleSettingChange('sheetDefinitions', newSheetDefinitions);
    setPermissionSheetName(null);
  }

  const handleToggleSheetVisibility = (sheetName: string) => {
    if (!draftSettings) return;
    const newSheetDefinitions = { ...draftSettings.sheetDefinitions };
    newSheetDefinitions[sheetName].isHidden = !newSheetDefinitions[sheetName].isHidden;
    handleSettingChange('sheetDefinitions', newSheetDefinitions);
  };
  
  const handleAddNewLocation = () => {
    if (!draftSettings || !newLocation.trim()) return;
    const updatedLocations = [...(draftSettings.locations || []), newLocation.trim()];
    handleSettingChange('locations', updatedLocations);
    setNewLocation('');
  };

  const handleDeleteLocation = (locationToDelete: string) => {
    if (!draftSettings) return;
    const updatedLocations = (draftSettings.locations || []).filter(loc => loc !== locationToDelete);
    handleSettingChange('locations', updatedLocations);
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

    const allUsers = [...draftSettings.authorizedUsers, { loginName: 'admin', displayName: 'Super Admin', password: 'setup', states: ['All'], isAdmin: true }];
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
    
    // Create a new array and update the user
    const updatedUsers = [...draftSettings.authorizedUsers];
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
    const settingsToRestore: AppSettings = {
        ...historicalSettings,
        settingsHistory: draftSettings?.settingsHistory, // Keep the current history intact
    };
    setDraftSettings(settingsToRestore);
    toast({ title: 'Rollback Staged', description: 'The selected historical settings have been loaded. Review and save changes to apply.' });
  };
  
  const isAdmin = userProfile?.isAdmin || false;
  
  if (!draftSettings) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </SheetContent>
      </Sheet>
    );
  }

  const allSheetNames = Object.keys(draftSettings.sheetDefinitions);

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl flex flex-col h-full">
          <SheetHeader>
            <SheetTitle>Settings</SheetTitle>
            <SheetDescription>
              Manage application settings and preferences. {isAdmin ? 'Admin changes apply to all users.' : ''}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            <Tabs defaultValue={initialTab} value={activeTab} onValueChange={setActiveTab} className="p-1">
              <TabsList className={cn("grid w-full", isAdmin ? "grid-cols-3" : "grid-cols-1")}>
                  <TabsTrigger value="general"><SettingsIcon className="mr-2 h-4 w-4" />General</TabsTrigger>
                  {isAdmin && (
                    <>
                      <TabsTrigger value="users"><UserCog className="mr-2 h-4 w-4" />Users</TabsTrigger>
                      <TabsTrigger value="sheets"><Wrench className="mr-2 h-4 w-4" />Sheets</TabsTrigger>
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
                        <Button size="sm" onClick={handleChangePassword}>Stage Password Change</Button>
                        <p className="text-xs text-muted-foreground">Your password change will be saved when you click "Save Changes" at the bottom of the panel.</p>
                    </div>
                  </div>

                  {appSettings.appMode === 'verification' && (
                    <div>
                        <h3 className="text-lg font-medium mb-4">Reports</h3>
                        <div className="rounded-lg border p-4 space-y-3">
                            <Label className="flex items-center gap-2 text-sm font-medium"><PlaneTakeoff className="h-4 w-4" /> Travel Report</Label>
                            <p className="text-sm text-muted-foreground">Generate a Word document summary of asset verification activities for a specific location.</p>
                            <Button variant="outline" className="w-full justify-start" onClick={() => setIsTravelReportOpen(true)}>
                                <PlaneTakeoff className="mr-2 h-4 w-4" /> Generate Travel Report
                            </Button>
                        </div>
                    </div>
                  )}

                  {isAdmin && (
                    <>
                      <div>
                        <h3 className="text-lg font-medium my-4 flex items-center gap-2"><History className="h-5 w-5" /> Settings History</h3>
                        <div className="rounded-lg border p-3">
                            <ScrollArea className="h-[200px]">
                                {(draftSettings.settingsHistory && draftSettings.settingsHistory.length > 0) ? (
                                    <div className="space-y-2">
                                        {draftSettings.settingsHistory.map((historyItem, index) => (
                                            <div key={index} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md">
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        Saved by: {historyItem.lastModifiedBy?.displayName || 'Unknown'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatDistanceToNow(new Date(historyItem.lastModified!), { addSuffix: true })}
                                                    </p>
                                                </div>
                                                <Button size="sm" variant="ghost" onClick={() => handleRollback(historyItem)}>
                                                   <RotateCcw className="mr-2 h-4 w-4" />
                                                    Rollback
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-8">No settings history available.</p>
                                )}
                            </ScrollArea>
                        </div>
                      </div>
                    </>
                  )}
              </TabsContent>
              {isAdmin && (
                <>
                  <TabsContent value="users" className="pt-4">
                      <UserManagement 
                      users={draftSettings.authorizedUsers}
                      onUsersChange={handleUsersChange}
                      adminProfile={userProfile}
                      />
                  </TabsContent>
                  <TabsContent value="sheets" className="pt-4 space-y-6">
                      <div>
                        <h3 className="text-lg font-medium mb-4">Sheet Definitions &amp; Access</h3>
                        <div className="rounded-lg border p-3">
                            <div className="space-y-1">
                              {allSheetNames.map(sheetName => (
                                <div key={sheetName} className="flex items-center justify-between pr-2 hover:bg-muted/50 rounded-md">
                                    <Label className="text-sm pl-2 cursor-pointer flex-1">{sheetName}</Label>
                                  <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggleSheetVisibility(sheetName)}>
                                      {draftSettings.sheetDefinitions[sheetName].isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openPermissionsDialog(sheetName)}><Users className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditSheet(sheetName)}><Wrench className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteSheet(sheetName)}><Trash2 className="h-4 w-4" /></Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                        </div>
                        <div className="mt-4 flex flex-col sm:flex-row gap-2">
                            <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".xlsx, .xls" className="hidden" />
                            <Button variant="outline" className="w-full" onClick={handleAddSheet}><PlusCircle className="mr-2" /> Add Manually</Button>
                            <Button variant="outline" className="w-full" onClick={handleImportTemplate}><FileUp className="mr-2" /> Import from File</Button>
                        </div>
                      </div>
                  </TabsContent>
                </>
              )}
            </Tabs>
          </div>

          <SheetFooter className="mt-auto pt-4 border-t sm:justify-between">
            <SheetClose asChild><Button variant="outline">Cancel</Button></SheetClose>
            {isAdmin && (
              <Button onClick={() => setIsConfirmOpen(true)} disabled={!hasChanges}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
      
      <TravelReportDialog isOpen={isTravelReportOpen} onOpenChange={setIsTravelReportOpen} />

      {sheetToEdit && (
        <ColumnCustomizationSheet
          isOpen={isSheetFormOpen}
          onOpenChange={setIsSheetFormOpen}
          sheetDefinition={sheetToEdit}
          originalSheetName={originalSheetName}
          onSave={handleSheetDefinitionSave}
        />
      )}
      
      {permissionSheetName && (
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
                       {draftSettings?.authorizedUsers.filter(u => u.loginName !== 'admin').map(user => (
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
                <AlertDialogAction onClick={handleSavePermissions}>Save Permissions</AlertDialogAction>
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
            <AlertDialogAction onClick={handleConfirmSave}>Confirm &amp; Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

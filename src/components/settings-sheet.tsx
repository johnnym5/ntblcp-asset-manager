

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
import { updateSettings } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from 'next-themes';
import { Sun, Moon, Database, Trash2, FileUp, PlusCircle, Loader2, UserCog, Settings as SettingsIcon, Wrench, Save, ScanSearch, Palette, PlaneTakeoff, Download, Users } from 'lucide-react';
import { ColumnCustomizationSheet } from './column-customization-sheet';
import type { SheetDefinition, AppSettings, AuthorizedUser } from '@/lib/types';
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

interface SettingsSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function SettingsSheet({ isOpen, onOpenChange }: SettingsSheetProps) {
  const { userProfile } = useAuth();
  const { appSettings, setAppSettings, dataActions, setOfflineAssets, setDataSource } = useAppState();
  const { toast } = useToast();
  const { setTheme } = useTheme();

  const [draftSettings, setDraftSettings] = useState<AppSettings | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSheetFormOpen, setIsSheetFormOpen] = useState(false);
  const [sheetToEdit, setSheetToEdit] = useState<SheetDefinition | null>(null);
  const [originalSheetName, setOriginalSheetName] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const [permissionSheetName, setPermissionSheetName] = useState<string | null>(null);
  const [tempDisabledList, setTempDisabledList] = useState<string[]>([]);


  useEffect(() => {
    const savedDraft = localStorage.getItem('ntblcp-settings-draft');
    if (isOpen) {
        if (savedDraft) {
            setDraftSettings(JSON.parse(savedDraft));
        } else {
            setDraftSettings(JSON.parse(JSON.stringify(appSettings)));
        }
    } else {
        setDraftSettings(null);
        localStorage.removeItem('ntblcp-settings-draft');
    }
  }, [isOpen, appSettings]);
  
  useEffect(() => {
    if (draftSettings) {
      localStorage.setItem('ntblcp-settings-draft', JSON.stringify(draftSettings));
    }
  }, [draftSettings]);

  const hasChanges = useMemo(() => {
    if (!draftSettings) return false;
    return JSON.stringify(appSettings) !== JSON.stringify(draftSettings);
  }, [appSettings, draftSettings]);
  
  const calculatedChanges = useMemo(() => {
    if (!draftSettings || !appSettings) return [];
    const changes: string[] = [];
    if (draftSettings.appMode !== appSettings.appMode) {
      changes.push(`App mode will be set to: ${draftSettings.appMode}.`);
    }
    if (draftSettings.lockAssetList !== appSettings.lockAssetList) {
        changes.push(`Asset list lock will be set to: ${draftSettings.lockAssetList}.`);
    }
    if (JSON.stringify(draftSettings.authorizedUsers) !== JSON.stringify(appSettings.authorizedUsers)) {
      changes.push('User list will be updated.');
    }
    if (JSON.stringify(draftSettings.sheetDefinitions) !== JSON.stringify(appSettings.sheetDefinitions)) {
      changes.push(`Sheet definitions (columns/permissions) will be updated.`);
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
      ]
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
      
      templates.forEach(template => {
        currentDefs[template.name] = template;
      });
      
      handleSettingChange('sheetDefinitions', currentDefs);

      toast({ title: 'Templates Imported', description: `${templates.length} sheet definitions were added/updated in your draft.` });
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
    if (!draftSettings) return;
    
    const settingsToSave: AppSettings = { ...draftSettings, lastModified: new Date().toISOString() };

    try {
      await updateSettings(settingsToSave);
      await saveLocalSettings(settingsToSave);
      setAppSettings(settingsToSave); // Update global state
      toast({ title: "Settings Saved", description: "Your changes have been applied to the database." });
    } catch (e) {
      toast({ title: "Save Failed", description: "Could not save settings to the database.", variant: "destructive" });
    } finally {
      setIsConfirmOpen(false);
      onOpenChange(false);
    }
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
        if (loginName === 'all') {
            return checked ? ['all'] : [];
        }
        // If 'all' is selected, and a user is unchecked, remove 'all' and just have that user.
        if (prev.includes('all') && !checked) {
            return draftSettings?.authorizedUsers.filter(u => u.loginName !== loginName).map(u => u.loginName) || [];
        }
        
        const newList = checked 
            ? [...prev, loginName]
            : prev.filter(name => name !== loginName);

        // If all users are checked, consolidate to 'all'
        const allUserLogins = draftSettings?.authorizedUsers.filter(u => !u.isAdmin).map(u => u.loginName) || [];
        if (allUserLogins.length > 0 && newList.length === allUserLogins.length) {
            return ['all'];
        }
        return newList;
    });
  };

  const handleSavePermissions = () => {
    if (!draftSettings || !permissionSheetName) return;

    const newSheetDefinitions = { ...draftSettings.sheetDefinitions };
    newSheetDefinitions[permissionSheetName].disabledFor = tempDisabledList;

    handleSettingChange('sheetDefinitions', newSheetDefinitions);
    setPermissionSheetName(null);
  }
  
  const isAdmin = userProfile?.isAdmin || false;
  const isGuest = userProfile?.isGuest || false;
  
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
        <SheetContent className="w-full sm:max-w-xl flex flex-col">
          <SheetHeader>
            <SheetTitle>Settings</SheetTitle>
            <SheetDescription>
              Manage application settings and preferences. Admin changes apply to all users.
            </SheetDescription>
          </SheetHeader>
          <Tabs defaultValue="general" className="flex-1 flex flex-col overflow-y-hidden">
            <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="general"><SettingsIcon className="mr-2 h-4 w-4" />General</TabsTrigger>
                <TabsTrigger value="users" disabled={isGuest || !isAdmin}><UserCog className="mr-2 h-4 w-4" />Users</TabsTrigger>
                <TabsTrigger value="sheets" disabled={isGuest || !isAdmin}><Wrench className="mr-2 h-4 w-4" />Sheets</TabsTrigger>
                <TabsTrigger value="data" disabled={isGuest || !isAdmin}><Database className="mr-2 h-4 w-4" />Data</TabsTrigger>
            </TabsList>
            <TabsContent value="general" className="flex-1 overflow-y-auto pt-4 space-y-6 pr-2">
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

                {isAdmin && (
                  <div>
                    <h3 className="text-lg font-medium mb-4">Global Admin Settings</h3>
                    <div className="rounded-lg border p-3 space-y-4 divide-y">
                      <div className="flex items-center justify-between pt-1">
                        <div className="space-y-1">
                          <Label htmlFor="app-mode" className="text-sm font-medium">Application Mode</Label>
                          <p className="text-xs text-muted-foreground">
                            {draftSettings.appMode === 'management'
                              ? 'Management: Full data editing rights.'
                              : 'Verification: Limited to status &amp; remarks updates.'
                            }
                          </p>
                        </div>
                         <Select value={draftSettings.appMode} onValueChange={(value) => handleSettingChange('appMode', value)}>
                          <SelectTrigger className="w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
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
            <TabsContent value="users" className="flex-1 overflow-y-auto pt-4 pr-2">
                <div className="p-1">
                    <UserManagement 
                    users={draftSettings.authorizedUsers}
                    onUsersChange={handleUsersChange}
                    adminProfile={userProfile}
                    />
                </div>
            </TabsContent>
            <TabsContent value="sheets" className="flex-1 overflow-y-auto pt-4 space-y-6 pr-2">
                 <div>
                    <h3 className="text-lg font-medium mb-4">Sheet Definitions &amp; Access</h3>
                    <div className="rounded-lg border p-3">
                        <div className="space-y-1">
                          {allSheetNames.map(sheetName => (
                            <div key={sheetName} className="flex items-center justify-between pr-2 hover:bg-muted/50 rounded-md">
                               <Label className="text-sm pl-2 cursor-pointer flex-1">{sheetName}</Label>
                              <div className="flex items-center gap-1">
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
            <TabsContent value="data" className="flex-1 overflow-y-auto pt-4 space-y-6 pr-2">
                <div>
                    <h3 className="text-lg font-medium mb-4">Data &amp; Category Management</h3>
                    <div className="rounded-lg border p-4 space-y-3">
                        <p className="text-sm text-muted-foreground">Perform global data operations. These actions may affect the entire dataset.</p>
                        <Separator />
                        <div className="space-y-2">

                            {dataActions.onAddAsset && (
                                <Button variant="outline" className="w-full justify-start" onClick={dataActions.onAddAsset}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Single Asset
                                </Button>
                            )}
                            
                            <Separator />
                            
                            <Label className="text-xs font-semibold uppercase text-muted-foreground px-1">Manage Categories (Sheets)</Label>
                            <Button variant="outline" className="w-full justify-start" onClick={handleAddSheet}><PlusCircle className="mr-2 h-4 w-4" /> Add New Sheet Manually</Button>
                            
                            <Separator />
                            
                            <Label className="text-xs font-semibold uppercase text-muted-foreground px-1">Bulk Data Operations</Label>
                            
                            {dataActions.onScanAndImport && (
                                <Button variant="outline" className="w-full justify-start" onClick={dataActions.onScanAndImport}>
                                    <ScanSearch className="mr-2 h-4 w-4" /> Scan &amp; Import Workbook
                                </Button>
                            )}
                             {dataActions.onTravelReport && (
                                <Button variant="outline" className="w-full justify-start" onClick={dataActions.onTravelReport}>
                                    <PlaneTakeoff className="mr-2 h-4 w-4" /> Create Travel Report
                                </Button>
                            )}
                             {dataActions.onExport && (
                                <Button variant="outline" className="w-full justify-start" onClick={dataActions.onExport}>
                                    <Download className="mr-2 h-4 w-4" /> Export All Data to Excel
                                </Button>
                            )}

                            <Separator />

                            <Label className="text-xs font-semibold uppercase text-destructive px-1">Danger Zone</Label>
                            {dataActions.onClearAll && (
                                <Button variant="destructive" className="w-full justify-start" onClick={dataActions.onClearAll}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Clear All Assets
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </TabsContent>
          </Tabs>

          <SheetFooter className="mt-auto pt-4 border-t sm:justify-between">
            <SheetClose asChild><Button variant="outline">Cancel</Button></SheetClose>
            <Button onClick={() => setIsConfirmOpen(true)} disabled={!hasChanges}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      
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
                    Select which users should be **denied** access to this sheet. Admins always have access.
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
                       {draftSettings?.authorizedUsers.filter(u => !u.isAdmin).map(user => (
                           <div key={user.loginName} className="flex items-center space-x-2">
                                <Checkbox 
                                    id={`disable-${user.loginName}`} 
                                    checked={tempDisabledList.includes('all') || tempDisabledList.includes(user.loginName)}
                                    onCheckedChange={(checked) => handlePermissionSelection(user.loginName, !!checked)}
                                    disabled={tempDisabledList.includes('all')}
                                />
                                <Label htmlFor={`disable-${user.loginName}`}>{user.displayName}</Label>
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

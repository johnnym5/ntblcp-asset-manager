
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
import { useAppState } from '@/contexts/app-state-context';
import { updateSettings } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from 'next-themes';
import { Sun, Moon, Database, Trash2, FileUp, PlusCircle, Loader2, UserCog, Settings as SettingsIcon, Wrench, Save, ScanSearch, Palette, PlaneTakeoff, Download } from 'lucide-react';
import { ColumnCustomizationSheet } from './column-customization-sheet';
import type { SheetDefinition, AppSettings } from '@/lib/types';
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
import { Separator } from './ui/separator';

interface SettingsSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function SettingsSheet({ isOpen, onOpenChange }: SettingsSheetProps) {
  const { userProfile } = useAuth();
  const { appSettings, setAppSettings, dataActions } = useAppState();
  const { toast } = useToast();
  const { setTheme } = useTheme();

  const [draftSettings, setDraftSettings] = useState<AppSettings | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSheetFormOpen, setIsSheetFormOpen] = useState(false);
  const [sheetToEdit, setSheetToEdit] = useState<SheetDefinition | null>(null);
  const [originalSheetName, setOriginalSheetName] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setDraftSettings(JSON.parse(JSON.stringify(appSettings)));
    } else {
      setDraftSettings(null);
    }
  }, [isOpen, appSettings]);

  const hasChanges = useMemo(() => {
    return JSON.stringify(appSettings) !== JSON.stringify(draftSettings);
  }, [appSettings, draftSettings]);
  
  const calculatedChanges = useMemo(() => {
    if (!draftSettings || !appSettings) return [];
    const changes: string[] = [];
    if (draftSettings.appMode !== appSettings.appMode) {
      changes.push(`App mode will be set to: ${draftSettings.appMode}.`);
    }
    if (JSON.stringify(draftSettings.enabledSheets.sort()) !== JSON.stringify(appSettings.enabledSheets.sort())) {
        changes.push(`Enabled sheets will be updated.`);
    }
    if (draftSettings.lockAssetList !== appSettings.lockAssetList) {
        changes.push(`Asset list lock will be set to: ${draftSettings.lockAssetList}.`);
    }
    if (JSON.stringify(draftSettings.authorizedUsers) !== JSON.stringify(appSettings.authorizedUsers)) {
        const originalUsers = new Set(appSettings.authorizedUsers.map(u => u.loginName));
        const newUsers = new Set(draftSettings.authorizedUsers.map(u => u.loginName));
        const added = draftSettings.authorizedUsers.filter(u => !originalUsers.has(u.loginName));
        const removed = appSettings.authorizedUsers.filter(u => !newUsers.has(u.loginName));
        if(added.length > 0) changes.push(`${added.length} user(s) will be added.`);
        if(removed.length > 0) changes.push(`${removed.length} user(s) will be removed.`);
        if (added.length === 0 && removed.length === 0) changes.push('User details will be updated.');
    }
    if (JSON.stringify(draftSettings.sheetDefinitions) !== JSON.stringify(appSettings.sheetDefinitions)) {
      changes.push(`Sheet definitions (headers/columns) will be updated.`);
    }
    return changes;
  }, [draftSettings, appSettings]);


  const handleSettingChange = (key: keyof AppSettings, value: any) => {
    if (!draftSettings) return;
    setDraftSettings(prev => prev ? ({ ...prev, [key]: value }) : null);
  };

  const handleToggleSheet = (sheetName: string, checked: boolean) => {
    if (!draftSettings) return;
    let newEnabledSheets;
    if (checked) {
      newEnabledSheets = [...draftSettings.enabledSheets, sheetName];
    } else {
      newEnabledSheets = draftSettings.enabledSheets.filter(name => name !== sheetName);
    }
    handleSettingChange('enabledSheets', newEnabledSheets);
  };
  
  const handleToggleAll = (enable: boolean) => {
    if (!draftSettings) return;
    const allSheetNames = Object.keys(draftSettings.sheetDefinitions);
    handleSettingChange('enabledSheets', enable ? allSheetNames : []);
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
    const newEnabledSheets = draftSettings.enabledSheets.filter(name => name !== sheetNameToDelete);
    setDraftSettings(prev => prev ? ({ ...prev, sheetDefinitions: newSheetDefinitions, enabledSheets: newEnabledSheets }) : null);
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
      let currentDefs = draftSettings.sheetDefinitions;
      let currentEnabled = draftSettings.enabledSheets;
      
      templates.forEach(template => {
        currentDefs[template.name] = template;
        if (!currentEnabled.includes(template.name)) {
          currentEnabled.push(template.name);
        }
      });
      
      handleSettingChange('sheetDefinitions', currentDefs);
      handleSettingChange('enabledSheets', currentEnabled);

      toast({ title: 'Templates Imported', description: `${templates.length} sheet definitions were added/updated in your draft.` });
    } catch (error) {
      toast({ title: 'Import Failed', description: (error as Error).message, variant: 'destructive' });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleConfirmSave = async () => {
    if (!draftSettings) return;
    try {
      await updateSettings(draftSettings);
      await saveLocalSettings(draftSettings);
      setAppSettings(draftSettings); // Update global state
      toast({ title: "Settings Saved", description: "Your changes have been applied to the database." });
    } catch (e) {
      toast({ title: "Save Failed", description: "Could not save settings to the database.", variant: "destructive" });
    } finally {
      setIsConfirmOpen(false);
      onOpenChange(false);
    }
  };
  
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
  const allEnabled = allSheetNames.length > 0 && draftSettings.enabledSheets.length === allSheetNames.length;
  const noneEnabled = draftSettings.enabledSheets.length === 0;

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
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general"><SettingsIcon className="mr-2 h-4 w-4" />General</TabsTrigger>
                <TabsTrigger value="users" disabled={isGuest || !isAdmin}><UserCog className="mr-2 h-4 w-4" />Users</TabsTrigger>
                <TabsTrigger value="sheets" disabled={isGuest || !isAdmin}><Wrench className="mr-2 h-4 w-4" />Sheets</TabsTrigger>
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
                              : 'Verification: Limited to status & remarks updates.'
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
                
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Data Management</h3>
                    <div className="rounded-lg border p-4 space-y-3">
                        <p className="text-sm text-muted-foreground">Import, export, or manage the asset database.</p>
                        <Separator />
                        <div className="space-y-2">
                           {dataActions.onAddAsset && (
                                <Button variant="outline" className="w-full justify-start" onClick={dataActions.onAddAsset}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Asset
                                </Button>
                            )}
                             {dataActions.onImport && (
                                <Button variant="outline" className="w-full justify-start" onClick={dataActions.onImport} disabled={dataActions.isImporting}>
                                    <FileUp className="mr-2 h-4 w-4" /> Import from Excel
                                </Button>
                            )}
                             {dataActions.onExport && (
                                <Button variant="outline" className="w-full justify-start" onClick={dataActions.onExport}>
                                    <Download className="mr-2 h-4 w-4" /> Export to Excel
                                </Button>
                            )}
                             {dataActions.onTravelReport && (
                                <Button variant="outline" className="w-full justify-start" onClick={dataActions.onTravelReport}>
                                    <PlaneTakeoff className="mr-2 h-4 w-4" /> Create Travel Report
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </TabsContent>
            <TabsContent value="users" className="flex-1 overflow-y-auto pt-4 pr-2">
                <div className="p-1">
                    <UserManagement 
                    users={draftSettings.authorizedUsers}
                    onUsersChange={(newUsers) => handleSettingChange('authorizedUsers', newUsers)}
                    adminProfile={userProfile}
                    />
                </div>
            </TabsContent>
            <TabsContent value="sheets" className="flex-1 overflow-y-auto pt-4 space-y-6 pr-2">
                 <div>
                    <h3 className="text-lg font-medium mb-4">Sheet Definitions</h3>
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-medium">Toggle all sheets</p>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleToggleAll(true)} disabled={allEnabled}>Enable All</Button>
                            <Button size="sm" variant="outline" onClick={() => handleToggleAll(false)} disabled={noneEnabled}>Disable All</Button>
                        </div>
                    </div>
                    <div className="rounded-lg border p-3">
                        <div className="space-y-1">
                          {allSheetNames.map(sheetName => (
                            <div key={sheetName} className="flex items-center justify-between pr-2 hover:bg-muted/50 rounded-md">
                              <div className="flex items-center">
                                <Switch id={`switch-${sheetName}`} checked={draftSettings.enabledSheets.includes(sheetName)} onCheckedChange={(checked) => handleToggleSheet(sheetName, checked)}/>
                                <Label htmlFor={`switch-${sheetName}`} className="text-sm pl-2 cursor-pointer">{sheetName}</Label>
                              </div>
                              <div className="flex items-center gap-1">
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
          onSave={(newDef) => {
            if (!draftSettings) return;
             handleSettingChange('sheetDefinitions', {
                ...draftSettings.sheetDefinitions,
                [newDef.name]: newDef,
             });
          }}
        />
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
            <AlertDialogAction onClick={handleConfirmSave}>Confirm & Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

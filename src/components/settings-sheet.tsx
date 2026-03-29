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
import { Sun, Moon, Database, Trash2, FileUp, PlusCircle, Loader2, UserCog, Settings as SettingsIcon, Wrench, Save, ScanSearch, Palette, PlaneTakeoff } from 'lucide-react';
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
        changes.push('User details will be updated.');
    }
    if (JSON.stringify(draftSettings.sheetDefinitions) !== JSON.stringify(appSettings.sheetDefinitions)) {
      changes.push(`Sheet definitions will be updated.`);
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

  const handleEditSheet = (sheetName: string) => {
    if (!draftSettings) return;
    setSheetToEdit(draftSettings.sheetDefinitions[sheetName]);
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

      toast({ title: 'Templates Imported', description: `${templates.length} sheet definitions were added/updated.` });
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
      setAppSettings(draftSettings);
      toast({ title: "Settings Saved", description: "Changes have been applied to the database." });
    } catch (e) {
      toast({ title: "Save Failed", description: "Could not save settings.", variant: "destructive" });
    } finally {
      setIsConfirmOpen(false);
      onOpenChange(false);
    }
  };
  
  const isAdmin = userProfile?.isAdmin || false;
  const isGuest = userProfile?.isGuest || false;
  
  if (!draftSettings) return null;

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
                              ? 'Management: Data is locked for non-admins.'
                              : 'Verification: Users can update status/remarks.'
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
                        <Button variant="outline" className="w-full" onClick={handleImportTemplate}><FileUp className="mr-2" /> Import Templates from File</Button>
                    </div>
                  </div>
            </TabsContent>
             <TabsContent value="data" className="flex-1 overflow-y-auto pt-4 space-y-6 pr-2">
                <div>
                    <h3 className="text-lg font-medium mb-4">Data Management</h3>
                    <div className="rounded-lg border p-4 space-y-3">
                        <p className="text-sm text-muted-foreground">Perform global data operations.</p>
                        <Separator />
                        <div className="space-y-2">
                            {dataActions.onAddAsset && (
                                <Button variant="outline" className="w-full justify-start" onClick={dataActions.onAddAsset}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Asset
                                </Button>
                            )}
                            {dataActions.onImport && (
                                <Button variant="outline" className="w-full justify-start" onClick={dataActions.onImport} disabled={dataActions.isImporting}>
                                    <FileUp className="mr-2 h-4 w-4" /> Import Full FAR
                                </Button>
                            )}
                            {dataActions.onScanAndImport && (
                                <Button variant="outline" className="w-full justify-start" onClick={dataActions.onScanAndImport} disabled={dataActions.isImporting}>
                                    <ScanSearch className="mr-2 h-4 w-4" /> Scan and Import Workbook
                                </Button>
                            )}
                            {dataActions.onTravelReport && (
                                <Button variant="outline" className="w-full justify-start" onClick={dataActions.onTravelReport}>
                                    <PlaneTakeoff className="mr-2 h-4 w-4" /> Create Travel Report
                                </Button>
                            )}
                            <Separator />
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
          onSave={(newDef) => {
            const newDefs = { ...draftSettings!.sheetDefinitions, [newDef.name]: newDef };
            handleSettingChange('sheetDefinitions', newDefs);
          }}
        />
      )}

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Changes</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to save these changes?
            </AlertDialogDescription>
          </AlertDialogHeader>
          {calculatedChanges.length > 0 && (
             <div className="py-4 text-sm text-foreground">
                <p className="font-semibold mb-2">Summary:</p>
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

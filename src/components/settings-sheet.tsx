
"use client";

import React, { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { useAppState } from '@/contexts/app-state-context';
import { updateSettings } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from 'next-themes';
import { Sun, Moon, Database, Trash2, FileUp, FileDown, PlusCircle, Edit, Loader2, KeyRound, UserCog, Settings as SettingsIcon, SheetIcon } from 'lucide-react';
import { SheetDefinitionForm } from './sheet-definition-form';
import type { SheetDefinition } from '@/lib/types';
import { parseExcelForTemplate } from '@/lib/excel-parser';
import { UserManagement } from './admin/user-management';
import { SingleSheetImportDialog } from './single-sheet-import-dialog';

interface SettingsSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  openChangePassword: () => void;
}

export function SettingsSheet({ isOpen, onOpenChange, openChangePassword }: SettingsSheetProps) {
  const { userProfile } = useAuth();
  const { 
    isOnline,
    dataActions,
    appSettings,
    setAppSettings,
  } = useAppState();

  const { toast } = useToast();
  const { setTheme } = useTheme();

  const [isSaving, setIsSaving] = useState(false);
  const [isSheetFormOpen, setIsSheetFormOpen] = useState(false);
  const [isSingleSheetImportOpen, setIsSingleSheetImportOpen] = useState(false);
  const [sheetToEdit, setSheetToEdit] = useState<SheetDefinition | null>(null);
  const [originalSheetName, setOriginalSheetName] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleSettingChange = (key: keyof AppSettings, value: any) => {
    setAppSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleToggleSheet = (sheetName: string, checked: boolean) => {
    let newEnabledSheets;
    if (checked) {
      newEnabledSheets = [...appSettings.enabledSheets, sheetName];
    } else {
      newEnabledSheets = appSettings.enabledSheets.filter(name => name !== sheetName);
    }
    handleSettingChange('enabledSheets', newEnabledSheets);
  };
  
  const handleToggleAll = (enable: boolean) => {
    const allSheetNames = Object.keys(appSettings.sheetDefinitions);
    handleSettingChange('enabledSheets', enable ? allSheetNames : []);
  };

  const handleSaveChanges = async () => {
    if (!isOnline) {
      toast({ title: 'Offline', description: 'Settings can only be changed while online.', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      // The app state is already updated, so we just need to push to Firestore
      await updateSettings(appSettings);
      toast({ title: 'Settings Updated', description: 'Your changes have been saved and applied.' });
      onOpenChange(false);
    } catch (error) {
      toast({ title: 'Error', description: 'Could not save settings to the database.', variant: 'destructive' });
    } finally {
        setIsSaving(false);
    }
  }

  const handleAddSheet = () => {
    setSheetToEdit(null);
    setOriginalSheetName(null);
    setIsSheetFormOpen(true);
  };

  const handleEditSheet = (sheetName: string) => {
    setSheetToEdit(appSettings.sheetDefinitions[sheetName]);
    setOriginalSheetName(sheetName);
    setIsSheetFormOpen(true);
  };
  
  const handleDeleteSheet = (sheetNameToDelete: string) => {
    const newSheetDefinitions = { ...appSettings.sheetDefinitions };
    delete newSheetDefinitions[sheetNameToDelete];
    
    const newEnabledSheets = appSettings.enabledSheets.filter(name => name !== sheetNameToDelete);

    setAppSettings(prev => ({
      ...prev,
      sheetDefinitions: newSheetDefinitions,
      enabledSheets: newEnabledSheets,
    }));
  };

  const handleSaveSheet = (sheet: SheetDefinition) => {
    const newSheetDefinitions = { ...appSettings.sheetDefinitions };
    let newEnabledSheets = [...appSettings.enabledSheets];
    
    if (originalSheetName && originalSheetName !== sheet.name) {
      delete newSheetDefinitions[originalSheetName];
      newEnabledSheets = newEnabledSheets.map(s => s === originalSheetName ? sheet.name : s);
    }
    
    if (!originalSheetName && !newEnabledSheets.includes(sheet.name)) {
      newEnabledSheets.push(sheet.name);
    }

    setAppSettings(prev => ({
      ...prev,
      sheetDefinitions: {
        ...newSheetDefinitions,
        [sheet.name]: sheet,
      },
      enabledSheets: newEnabledSheets
    }));
  };

  const handleImportTemplate = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const templates = await parseExcelForTemplate(file);
      let currentDefs = appSettings.sheetDefinitions;
      let currentEnabled = appSettings.enabledSheets;
      
      templates.forEach(template => {
        currentDefs[template.name] = template;
        if (!currentEnabled.includes(template.name)) {
          currentEnabled.push(template.name);
        }
      });

      setAppSettings(prev => ({
        ...prev,
        sheetDefinitions: currentDefs,
        enabledSheets: currentEnabled,
      }));

      toast({ title: 'Templates Imported', description: `${templates.length} sheet definitions were added or updated.` });
    } catch (error) {
      toast({ title: 'Import Failed', description: (error as Error).message, variant: 'destructive' });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };
  
  const isAdmin = userProfile?.isAdmin || false;
  const isGuest = userProfile?.isGuest || false;
  const canModifyData = !isGuest;
  
  if (!appSettings?.sheetDefinitions) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </SheetContent>
      </Sheet>
    );
  }

  const allSheetNames = Object.keys(appSettings.sheetDefinitions);
  const allEnabled = allSheetNames.length > 0 && appSettings.enabledSheets.length === allSheetNames.length;
  const noneEnabled = appSettings.enabledSheets.length === 0;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl flex flex-col">
          <SheetHeader>
            <SheetTitle>Settings</SheetTitle>
            <SheetDescription>
              Manage application settings and preferences. Admin changes apply to all users.
            </SheetDescription>
          </SheetHeader>
          <Tabs defaultValue={isAdmin ? "general" : "account"} className="flex-1 flex flex-col overflow-y-hidden">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="general"><SettingsIcon className="mr-2 h-4 w-4" />General</TabsTrigger>
                <TabsTrigger value="account"><UserCog className="mr-2 h-4 w-4" />Account</TabsTrigger>
            </TabsList>
            <TabsContent value="general" className="flex-1 overflow-y-auto pt-4 space-y-6 pr-2">
                <div>
                  <h3 className="text-lg font-medium mb-4">Data Management</h3>
                  <div className="rounded-lg border p-3 space-y-2">
                    <Button variant="outline" className="w-full justify-start" onClick={dataActions?.onImport} disabled={dataActions?.isImporting || !canModifyData}>
                      <FileUp className="mr-2 h-4 w-4" /> Import from Full Workbook
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={() => setIsSingleSheetImportOpen(true)} disabled={dataActions?.isImporting || !canModifyData}>
                      <SheetIcon className="mr-2 h-4 w-4" /> Import from Single Sheet
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={dataActions?.onExport} disabled={!dataActions?.hasAssets || !canModifyData}>
                      <FileDown className="mr-2 h-4 w-4" /> Export to Excel
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={dataActions?.onAddAsset} disabled={!canModifyData}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add New Asset
                    </Button>
                    <Separator className="my-2"/>
                    <Button variant="destructive" className="w-full justify-start" onClick={dataActions?.onClearAll} disabled={!dataActions?.hasAssets || !canModifyData}>
                      <Trash2 className="mr-2 h-4 w-4" /> Clear All Local Assets
                    </Button>
                  </div>
                </div>
              
                <div>
                    <h3 className="text-lg font-medium mb-4">Appearance</h3>
                    <div className="rounded-lg border p-3 flex justify-around">
                        <Button variant="outline" size="icon" onClick={() => setTheme('light')}><Sun /></Button>
                        <Button variant="outline" size="icon" onClick={() => setTheme('dark')}><Moon /></Button>
                        <Button variant="outline" size="icon" onClick={() => setTheme('system')}><Database /></Button>
                    </div>
                </div>

                {isAdmin && (
                <>
                  <Separator/>
                  <div>
                    <h3 className="text-lg font-medium mb-4">Global Admin Settings</h3>
                    <div className="rounded-lg border p-3 space-y-4 divide-y">
                      <div className="flex items-center justify-between pt-1">
                        <div className="space-y-1">
                          <Label htmlFor="lock-assets" className="text-sm">Lock Asset List</Label>
                          <p className="text-xs text-muted-foreground">Prevent adding/deleting from main list.</p>
                        </div>
                        <Switch id="lock-assets" checked={appSettings.lockAssetList} onCheckedChange={(checked) => handleSettingChange('lockAssetList', checked)} disabled={!isOnline}/>
                      </div>
                      <div className="flex items-center justify-between pt-4">
                        <div className="space-y-1">
                          <Label htmlFor="autosync-assets" className="text-sm">Enable Automatic Sync</Label>
                          <p className="text-xs text-muted-foreground">Automatically sync with the cloud when online.</p>
                        </div>
                        <Switch id="autosync-assets" checked={appSettings.autoSyncEnabled} onCheckedChange={(checked) => handleSettingChange('autoSyncEnabled', checked)} disabled={!isOnline}/>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-4">Sheet Definitions</h3>
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-medium">Toggle all sheets</p>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleToggleAll(true)} disabled={allEnabled || !isOnline}>Enable All</Button>
                            <Button size="sm" variant="outline" onClick={() => handleToggleAll(false)} disabled={noneEnabled || !isOnline}>Disable All</Button>
                        </div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <ScrollArea className="h-full max-h-60">
                        <div className="space-y-1">
                          {allSheetNames.map(sheetName => (
                            <div key={sheetName} className="flex items-center justify-between pr-2 hover:bg-muted/50 rounded-md">
                              <div className="flex items-center">
                                <Switch id={`switch-${sheetName}`} checked={appSettings.enabledSheets.includes(sheetName)} onCheckedChange={(checked) => handleToggleSheet(sheetName, checked)} disabled={!isOnline}/>
                                <Label htmlFor={`switch-${sheetName}`} className="text-sm pl-2 cursor-pointer">{sheetName}</Label>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditSheet(sheetName)} disabled={!isOnline}><Edit className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteSheet(sheetName)} disabled={!isOnline}><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                    <div className="mt-4 flex flex-col sm:flex-row gap-2">
                        <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".xlsx, .xls" className="hidden" />
                        <Button variant="outline" className="w-full" onClick={handleAddSheet} disabled={!isOnline}><PlusCircle className="mr-2" /> Add Manually</Button>
                        <Button variant="outline" className="w-full" onClick={handleImportTemplate} disabled={!isOnline}><FileUp className="mr-2" /> Import from File</Button>
                    </div>
                  </div>
                </>
              )}

            </TabsContent>
            <TabsContent value="account" className="flex-1 overflow-y-auto pt-4 space-y-6 pr-2">
                <div className="pt-4">
                  <h3 className="text-lg font-medium mb-4">My Account</h3>
                  <div className="rounded-lg border p-3 space-y-2">
                    <Button variant="outline" className="w-full justify-start" onClick={() => { onOpenChange(false); openChangePassword(); }} disabled={isGuest}><KeyRound className="mr-2 h-4 w-4"/>Change Password</Button>
                  </div>
                </div>
                {isAdmin && (
                  <div>
                    <h3 className="text-lg font-medium mb-4">User Management</h3>
                    <div className="p-1">
                      <UserManagement />
                    </div>
                  </div>
                )}
            </TabsContent>
          </Tabs>

          <SheetFooter className="mt-auto pt-4 border-t">
            <SheetClose asChild><Button variant="outline">Cancel</Button></SheetClose>
            {isAdmin && <Button onClick={handleSaveChanges} disabled={isSaving || !isOnline}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Admin Changes
            </Button>}
          </SheetFooter>
        </SheetContent>
      </Sheet>
      
      <SheetDefinitionForm
        isOpen={isSheetFormOpen}
        onOpenChange={setIsSheetFormOpen}
        onSave={handleSaveSheet}
        sheet={sheetToEdit}
      />

      <SingleSheetImportDialog
        isOpen={isSingleSheetImportOpen}
        onOpenChange={setIsSingleSheetImportOpen}
      />
    </>
  );
}

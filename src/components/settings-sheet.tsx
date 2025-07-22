
"use client";

import React, { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { TARGET_SHEETS } from '@/lib/constants';
import { useAppState } from '@/contexts/app-state-context';
import { updateSettings } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from 'next-themes';
import { Sun, Moon, Database, Trash2, FileUp, FileDown, PlusCircle } from 'lucide-react';

interface SettingsSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  openChangePassword: () => void;
}

export function SettingsSheet({ isOpen, onOpenChange, openChangePassword }: SettingsSheetProps) {
  const { userProfile } = useAuth();
  const { 
    lockAssetList,
    autoSyncEnabled,
    enabledSheets,
    isOnline,
    dataActions,
    appSettings,
    setAppSettings,
  } = useAppState();

  const { toast } = useToast();
  const { setTheme } = useTheme();

  const [localSettings, setLocalSettings] = useState(appSettings);

  useEffect(() => {
    if (isOpen) {
      setLocalSettings(appSettings);
    }
  }, [appSettings, isOpen]);

  const handleSettingChange = (key: keyof typeof localSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleToggleSheet = (sheetName: string, checked: boolean) => {
    let newEnabledSheets;
    if (checked) {
      newEnabledSheets = [...localSettings.enabledSheets, sheetName];
    } else {
      newEnabledSheets = localSettings.enabledSheets.filter(name => name !== sheetName);
    }
    handleSettingChange('enabledSheets', newEnabledSheets);
  };

  const handleToggleAll = (enable: boolean) => {
    const newEnabledSheets = enable ? [...TARGET_SHEETS] : [];
    handleSettingChange('enabledSheets', newEnabledSheets);
  };
  
  const handleSaveChanges = async () => {
    if (!isOnline) {
      toast({ title: 'Offline', description: 'Settings can only be changed while online.', variant: 'destructive' });
      return;
    }
    try {
      await updateSettings(localSettings);
      toast({ title: 'Settings Updated', description: 'Your changes have been saved.' });
      onOpenChange(false);
    } catch (error) {
      toast({ title: 'Error', description: 'Could not save settings to the database.', variant: 'destructive' });
    }
  }
  
  const isAdmin = userProfile?.isAdmin || false;
  const isGuest = userProfile?.isGuest || false;
  const canModifyData = !isGuest;
  const canImport = !isGuest;
  
  if (!localSettings) {
    return null; // Or a loading spinner
  }

  const allEnabled = localSettings.enabledSheets.length === TARGET_SHEETS.length;
  const noneEnabled = localSettings.enabledSheets.length === 0;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription>
            Manage application settings and preferences.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 -mx-6 px-6 py-4">
          <div className="space-y-6">

            {canModifyData && (
              <div>
                <h3 className="text-lg font-medium mb-4">Data Management</h3>
                <div className="rounded-lg border p-3 space-y-2">
                  {canImport && (
                    <Button variant="outline" className="w-full justify-start" onClick={dataActions.onImport} disabled={dataActions.isImporting}>
                      <FileUp className="mr-2 h-4 w-4" />
                      Import from Excel
                    </Button>
                  )}
                  <Button variant="outline" className="w-full justify-start" onClick={dataActions.onExport}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Export to Excel
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={dataActions.onAddAsset}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add New Asset
                  </Button>
                  <Separator className="my-2"/>
                  <Button
                    variant="destructive"
                    className="w-full justify-start"
                    onClick={dataActions.onClearAll}
                    disabled={!dataActions.hasAssets}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear All Local Assets
                  </Button>
                </div>
              </div>
            )}
            
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
                        <Label htmlFor="lock-assets" className="text-sm">
                          Lock Asset List
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Prevent adding or deleting assets. Only updates are allowed.
                        </p>
                      </div>
                      <Switch
                        id="lock-assets"
                        checked={localSettings.lockAssetList}
                        onCheckedChange={(checked) => handleSettingChange('lockAssetList', checked)}
                        disabled={!isOnline}
                      />
                    </div>
                    <div className="flex items-center justify-between pt-4">
                      <div className="space-y-1">
                        <Label htmlFor="autosync-assets" className="text-sm">
                          Enable Automatic Sync
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Automatically sync with the cloud when online.
                        </p>
                      </div>
                      <Switch
                        id="autosync-assets"
                        checked={localSettings.autoSyncEnabled}
                        onCheckedChange={(checked) => handleSettingChange('autoSyncEnabled', checked)}
                        disabled={!isOnline}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Enabled Excel Sheets</h3>
                  <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-medium">Toggle all sheets</p>
                      <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleToggleAll(true)} disabled={allEnabled || !isOnline}>
                              Enable All
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleToggleAll(false)} disabled={noneEnabled || !isOnline}>
                              Disable All
                          </Button>
                      </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <ScrollArea className="h-full max-h-60">
                      <div className="space-y-4">
                        {TARGET_SHEETS.map(sheet => (
                          <div key={sheet} className="flex items-center justify-between">
                            <Label htmlFor={`switch-${sheet}`} className="text-sm">
                              {sheet}
                            </Label>
                            <Switch
                              id={`switch-${sheet}`}
                              checked={localSettings.enabledSheets.includes(sheet)}
                              onCheckedChange={(checked) => handleToggleSheet(sheet, checked)}
                              disabled={!isOnline}
                            />
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </>
            )}

             {!isGuest && (
              <div className="pt-4">
                <h3 className="text-lg font-medium mb-4">Account</h3>
                <div className="rounded-lg border p-3">
                  <Button variant="outline" className="w-full justify-start" onClick={() => { onOpenChange(false); openChangePassword(); }}>
                    Reset Password
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <SheetFooter className="mt-auto pt-4 border-t">
          <SheetClose asChild>
            <Button variant="outline">Cancel</Button>
          </SheetClose>
          {isAdmin && (
            <Button onClick={handleSaveChanges} disabled={!isOnline}>
              Save Admin Changes
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

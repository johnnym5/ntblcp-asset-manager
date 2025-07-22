
"use client";

import React from 'react';
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

interface SettingsSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function SettingsSheet({ isOpen, onOpenChange }: SettingsSheetProps) {
  const { 
    lockAssetList,
    autoSyncEnabled,
    enabledSheets,
    isOnline,
  } = useAppState();

  const { toast } = useToast();

  const handleSettingChange = async (key: 'lockAssetList' | 'autoSyncEnabled', value: boolean) => {
    if (!isOnline) {
      toast({ title: 'Offline', description: 'Settings can only be changed while online.', variant: 'destructive' });
      return;
    }
    try {
      await updateSettings({ [key]: value });
      toast({ title: 'Setting Updated', description: 'The change has been saved for all users.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Could not save setting to the database.', variant: 'destructive' });
    }
  };

  const handleToggleSheet = async (sheetName: string, checked: boolean) => {
    if (!isOnline) {
      toast({ title: 'Offline', description: 'Settings can only be changed while online.', variant: 'destructive' });
      return;
    }
    let newEnabledSheets;
    if (checked) {
      newEnabledSheets = [...enabledSheets, sheetName];
    } else {
      newEnabledSheets = enabledSheets.filter(name => name !== sheetName);
    }
    try {
      await updateSettings({ enabledSheets: newEnabledSheets });
      toast({ title: 'Sheet Setting Updated' });
    } catch (error) {
      toast({ title: 'Error', description: 'Could not save setting to the database.', variant: 'destructive' });
    }
  };

  const handleToggleAll = async (enable: boolean) => {
    if (!isOnline) {
      toast({ title: 'Offline', description: 'Settings can only be changed while online.', variant: 'destructive' });
      return;
    }
    const newEnabledSheets = enable ? [...TARGET_SHEETS] : [];
    try {
      await updateSettings({ enabledSheets: newEnabledSheets });
      toast({ title: 'Sheet Settings Updated' });
    } catch (error) {
       toast({ title: 'Error', description: 'Could not save setting to the database.', variant: 'destructive' });
    }
  };

  const allEnabled = enabledSheets.length === TARGET_SHEETS.length;
  const noneEnabled = enabledSheets.length === 0;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Global Settings (Admin)</SheetTitle>
          <SheetDescription>
            These settings affect all users of the application in real-time.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto pr-2 py-4">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Data Management</h3>
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
                    checked={lockAssetList}
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
                    checked={autoSyncEnabled}
                    onCheckedChange={(checked) => handleSettingChange('autoSyncEnabled', checked)}
                    disabled={!isOnline}
                  />
                </div>
              </div>
            </div>
            <Separator/>
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
                <ScrollArea className="h-full">
                  <div className="space-y-4">
                    {TARGET_SHEETS.map(sheet => (
                      <div key={sheet} className="flex items-center justify-between">
                        <Label htmlFor={`switch-${sheet}`} className="text-sm">
                          {sheet}
                        </Label>
                        <Switch
                          id={`switch-${sheet}`}
                          checked={enabledSheets.includes(sheet)}
                          onCheckedChange={(checked) => handleToggleSheet(sheet, checked)}
                          disabled={!isOnline}
                        />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        </div>
        <SheetFooter className="mt-auto pt-4 border-t">
          <SheetClose asChild>
            <Button>Done</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

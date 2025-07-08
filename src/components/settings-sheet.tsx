
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

interface SettingsSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function SettingsSheet({ isOpen, onOpenChange }: SettingsSheetProps) {
  const { enabledSheets, setEnabledSheets } = useAppState();

  const handleToggleSheet = (sheetName: string, checked: boolean) => {
    setEnabledSheets(prev => {
      if (checked) {
        return [...prev, sheetName];
      } else {
        return prev.filter(name => name !== sheetName);
      }
    });
  };

  const handleToggleAll = (enable: boolean) => {
    if (enable) {
      setEnabledSheets([...TARGET_SHEETS]);
    } else {
      setEnabledSheets([]);
    }
  };

  const allEnabled = enabledSheets.length === TARGET_SHEETS.length;
  const noneEnabled = enabledSheets.length === 0;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Sheet Configuration</SheetTitle>
          <SheetDescription>
            Enable or disable specific sheets for Excel file imports.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto pr-2 py-4">
            <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium">Toggle all sheets</p>
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleToggleAll(true)} disabled={allEnabled}>
                        Enable All
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleToggleAll(false)} disabled={noneEnabled}>
                        Disable All
                    </Button>
                </div>
            </div>
          <Separator className="mb-4" />
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
                  />
                </div>
              ))}
            </div>
          </ScrollArea>
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

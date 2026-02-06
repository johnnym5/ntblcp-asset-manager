
"use client";

import React, { useState, useEffect } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from './ui/scroll-area';
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react';
import type { SheetDefinition, DisplayField } from '@/lib/types';
import { useAppState } from '@/contexts/app-state-context';
import { updateSettings } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';
import { Input } from './ui/input';

interface ColumnCustomizationSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  sheetDefinition: SheetDefinition;
  onSave: (newDefinition: SheetDefinition) => void;
}

export function ColumnCustomizationSheet({
  isOpen,
  onOpenChange,
  sheetDefinition,
  onSave,
}: ColumnCustomizationSheetProps) {
  const [editedName, setEditedName] = useState('');
  const [editedFields, setEditedFields] = useState<DisplayField[]>([]);
  const { appSettings, setAppSettings } = useAppState();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && sheetDefinition) {
      setEditedName(sheetDefinition.name);
      setEditedFields(JSON.parse(JSON.stringify(sheetDefinition.displayFields || [])));
    }
  }, [isOpen, sheetDefinition]);

  const handleLabelChange = (index: number, newLabel: string) => {
    setEditedFields(currentFields => {
      const newFields = [...currentFields];
      newFields[index] = { ...newFields[index], label: newLabel };
      return newFields;
    });
  };

  const handleToggle = (index: number, view: 'table' | 'quickView') => {
    setEditedFields(currentFields => {
      const newFields = [...currentFields];
      newFields[index] = { ...newFields[index], [view]: !newFields[index][view] };
      return newFields;
    });
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newFields = [...editedFields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex >= 0 && targetIndex < newFields.length) {
      [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
      setEditedFields(newFields);
    }
  };
  
  const handleApplyToOne = () => {
    const newDefinition: SheetDefinition = {
      ...sheetDefinition,
      name: editedName,
      headers: editedFields.map(f => f.label),
      displayFields: editedFields,
    };
    onSave(newDefinition);
    onOpenChange(false);
  }

  const handleApplyToAll = () => {
    if (typeof window !== 'undefined' && !navigator.onLine) {
      toast({ title: 'Offline', description: 'This action requires an internet connection.', variant: 'destructive' });
      return;
    }
    const newSheetDefinitions = { ...appSettings.sheetDefinitions };
    const templateFields = editedFields;

    for (const sheetName in newSheetDefinitions) {
        newSheetDefinitions[sheetName] = {
            ...newSheetDefinitions[sheetName],
            displayFields: templateFields,
            headers: templateFields.map(f => f.label),
        };
    }
    
    try {
        updateSettings({ sheetDefinitions: newSheetDefinitions });
        setAppSettings(prev => ({...prev, sheetDefinitions: newSheetDefinitions}));
        toast({ title: "Layout Applied", description: "Column settings have been applied to all sheets for all users."});
        onOpenChange(false);
    } catch (e) {
        toast({ title: "Error", description: "Could not save settings to the database.", variant: "destructive" });
    }
  };


  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col">
        <SheetHeader>
          <SheetTitle>Customize Sheet Layout</SheetTitle>
          <SheetDescription>
            Rename the sheet, reorder fields, and edit labels. Changes here affect the asset form layout.
          </SheetDescription>
        </SheetHeader>
        <div className="px-1 py-4">
            <Label htmlFor="sheet-name" className="text-sm font-medium">Sheet Name</Label>
            <Input id="sheet-name" value={editedName} onChange={(e) => setEditedName(e.target.value)} className="mt-1" />
        </div>
        <div className="flex-grow overflow-hidden flex flex-col">
          <div className="flex items-center px-4 py-2 border-y font-medium text-sm bg-muted/50">
            <div className="w-16"></div>
            <div className="flex-1">Field Label (Header Name)</div>
            <div className="w-24 text-center">In Table</div>
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-1 p-2">
              {editedFields.map((field, index) => (
                <div key={field.key} className="flex items-center p-2 rounded-md hover:bg-muted/50">
                  <div className="flex flex-col items-center w-16 text-muted-foreground">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleMove(index, 'up')} disabled={index === 0}>
                        <ArrowUp className="h-4 w-4" />
                    </Button>
                    <GripVertical className="h-4 w-4 my-1 cursor-grab" />
                     <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleMove(index, 'down')} disabled={index === editedFields.length - 1}>
                        <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex-1">
                    <Input 
                        value={field.label}
                        onChange={(e) => handleLabelChange(index, e.target.value)}
                        className="h-9"
                    />
                  </div>
                  <div className="w-24 flex justify-center">
                    <Switch
                      checked={field.table}
                      onCheckedChange={() => handleToggle(index, 'table')}
                      aria-label={`Show ${field.label} in table`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
        <SheetFooter className="sm:justify-between items-center pt-4 border-t">
          <SheetClose asChild>
            <Button variant="outline">Cancel</Button>
          </SheetClose>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleApplyToAll}>Apply Layout to All Sheets</Button>
            <Button onClick={handleApplyToOne}>Apply to This Sheet</Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}


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
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from './ui/scroll-area';
import { ArrowDown, ArrowUp, GripVertical, PlusCircle } from 'lucide-react';
import type { SheetDefinition, DisplayField, Asset } from '@/lib/types';
import { useAppState } from '@/contexts/app-state-context';
import { updateSettings } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { HEADER_ALIASES } from '@/lib/constants';

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
  const [fieldToAdd, setFieldToAdd] = useState('');

  useEffect(() => {
    if (isOpen && sheetDefinition) {
      setEditedName(sheetDefinition.name);
      setEditedFields(JSON.parse(JSON.stringify(sheetDefinition.displayFields || [])));
    }
  }, [isOpen, sheetDefinition]);

  const allPossibleFieldKeys = useMemo(() => Object.keys(HEADER_ALIASES) as (keyof Asset)[], []);

  const availableFields = useMemo(() => {
      const currentKeys = new Set(editedFields.map(f => f.key));
      return allPossibleFieldKeys.filter(key => !currentKeys.has(key));
  }, [editedFields, allPossibleFieldKeys]);

  const handleAddField = () => {
      if (!fieldToAdd) return;
      const key = fieldToAdd as keyof Asset;
      const label = HEADER_ALIASES[key as keyof typeof HEADER_ALIASES]?.[0] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      
      const newField: DisplayField = {
          key: key,
          label: label,
          table: false,
          quickView: false,
      };
      setEditedFields(current => [...current, newField]);
      setFieldToAdd('');
  };

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
            displayFields: templateFields.map(f => ({...f})), // Create copies
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
            Reorder fields, edit labels, and control visibility on desktop vs. mobile. Renaming a sheet is disabled to prevent data loss.
          </SheetDescription>
        </SheetHeader>
        <div className="px-1 py-4">
            <Label htmlFor="sheet-name" className="text-sm font-medium">Sheet Name</Label>
            <Input id="sheet-name" value={editedName} onChange={(e) => setEditedName(e.target.value)} className="mt-1" disabled />
        </div>
        <div className="flex-grow overflow-hidden flex flex-col">
          <div className="flex items-center px-4 py-2 border-y font-medium text-sm bg-muted/50">
            <div className="w-16"></div>
            <div className="flex-1">Field Label (Header Name)</div>
            <div className="w-24 text-center">In Table</div>
            <div className="w-24 text-center">Quick View</div>
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
                  <div className="w-24 flex justify-center">
                    <Switch
                      checked={field.quickView}
                      onCheckedChange={() => handleToggle(index, 'quickView')}
                      aria-label={`Show ${field.label} in quick view`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
        <div className="px-4 py-4 border-t">
          <Label className="text-sm font-medium">Add New Field</Label>
          <div className="flex items-center gap-2 mt-2">
              <Select value={fieldToAdd} onValueChange={setFieldToAdd}>
                  <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a field to add..." />
                  </SelectTrigger>
                  <SelectContent>
                      {availableFields.map(key => (
                          <SelectItem key={key} value={key}>
                              {HEADER_ALIASES[key as keyof typeof HEADER_ALIASES]?.[0] || key}
                          </SelectItem>
                      ))}
                  </SelectContent>
              </Select>
              <Button onClick={handleAddField} disabled={!fieldToAdd}><PlusCircle className="mr-2 h-4 w-4" /> Add</Button>
          </div>
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

    
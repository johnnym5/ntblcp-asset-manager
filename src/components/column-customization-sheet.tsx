
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
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { HEADER_ALIASES } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';

interface ColumnCustomizationSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  sheetDefinition: SheetDefinition;
  originalSheetName: string | null;
  onSave: (originalName: string | null, newDefinition: SheetDefinition, applyToAll: boolean) => void;
}

export function ColumnCustomizationSheet({
  isOpen,
  onOpenChange,
  sheetDefinition,
  originalSheetName,
  onSave,
}: ColumnCustomizationSheetProps) {
  const [editedName, setEditedName] = useState('');
  const [editedFields, setEditedFields] = useState<DisplayField[]>([]);
  const [customLabel, setCustomLabel] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && sheetDefinition) {
      setEditedName(sheetDefinition.name);
      setEditedFields(JSON.parse(JSON.stringify(sheetDefinition.displayFields || [])));
    }
  }, [isOpen, sheetDefinition]);
  
  const handleAddField = () => {
    if (!customLabel.trim()) {
        toast({
            title: 'Invalid Label',
            description: 'Custom field label cannot be empty.',
            variant: 'destructive',
        });
        return;
    }

    const customFieldKeys: (keyof Asset)[] = ['customField1', 'customField2', 'customField3', 'customField4', 'customField5'];
    const usedCustomKeys = new Set(editedFields.map(f => f.key).filter(k => customFieldKeys.includes(k as keyof Asset)));
    
    const availableCustomField = customFieldKeys.find(k => !usedCustomKeys.has(k));

    if (!availableCustomField) {
        toast({
            title: 'No Custom Fields Available',
            description: 'You have used all 5 available custom fields for this sheet.',
            variant: 'destructive',
        });
        return;
    }
    
    const newField: DisplayField = {
        key: availableCustomField,
        label: customLabel.trim(),
        table: true,
        quickView: true,
    };

    setEditedFields(current => [...current, newField]);
    setCustomLabel('');
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
  
  const handleSaveChanges = (applyToAll: boolean) => {
    const sanitizedName = editedName.replace(/[.$#\[\]/]/g, '_');
    if (sanitizedName !== editedName) {
      toast({
        title: "Sheet Name Sanitized",
        description: `The sheet name was changed to "${sanitizedName}" to remove invalid characters.`,
      });
    }

    const newDefinition: SheetDefinition = {
      ...sheetDefinition,
      name: sanitizedName,
      headers: editedFields.map(f => f.label),
      displayFields: editedFields,
    };
    onSave(originalSheetName, newDefinition, applyToAll);
    onOpenChange(false);
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
            <Input id="sheet-name" value={editedName} onChange={(e) => setEditedName(e.target.value)} className="mt-1" disabled={!!originalSheetName} />
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
          <Label className="text-sm font-medium">Add Custom Field</Label>
          <div className="flex items-center gap-2 mt-2">
            <Input
              placeholder="Enter new header label..."
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
            />
            <Button onClick={handleAddField}><PlusCircle className="mr-2 h-4 w-4" /> Add</Button>
          </div>
        </div>
        <SheetFooter className="sm:justify-between items-center pt-4 border-t">
          <SheetClose asChild>
            <Button variant="outline">Cancel</Button>
          </SheetClose>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => handleSaveChanges(true)}>Apply Layout to All Sheets</Button>
            <Button onClick={() => handleSaveChanges(false)}>Apply to This Sheet</Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

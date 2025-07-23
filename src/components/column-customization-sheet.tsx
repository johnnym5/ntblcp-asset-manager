
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
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { SheetDefinition, DisplayField, Asset, AppSettings } from '@/lib/types';
import { useAppState } from '@/contexts/app-state-context';
import { updateSettings } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';

// A comprehensive list of all possible fields that can be displayed.
const ALL_POSSIBLE_FIELDS: { key: keyof Asset; label: string }[] = [
    { key: 'sn', label: 'S/N' },
    { key: 'description', label: 'Description' },
    { key: 'category', label: 'Category' },
    { key: 'serialNumber', label: 'Serial Number' },
    { key: 'assetIdCode', label: 'Asset ID Code' },
    { key: 'location', label: 'Location' },
    { key: 'lga', label: 'LGA' },
    { key: 'assignee', label: 'Assignee' },
    { key: 'condition', label: 'Condition' },
    { key: 'remarks', label: 'Remarks' },
    { key: 'verifiedStatus', label: 'Verified Status' },
    { key: 'verifiedDate', label: 'Verified Date' },
    { key: 'assetClass', label: 'Asset Class' },
    { key: 'manufacturer', label: 'Manufacturer' },
    { key: 'modelNumber', label: 'Model Number' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'dateReceived', label: 'Date Received' },
    { key: 'grant', label: 'Grant' },
    { key: 'chasisNo', label: 'Chasis No' },
    { key: 'engineNo', label: 'Engine No' },
    { key: 'lastModified', label: 'Last Modified Date' },
    { key: 'lastModifiedBy', label: 'Last Modified By' },
];


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
  const [fields, setFields] = useState<DisplayField[]>([]);
  const { appSettings, setAppSettings, isOnline } = useAppState();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && sheetDefinition) {
      // Create a full list of fields, ensuring order is preserved and new fields are added at the end.
      const definedFields = sheetDefinition.displayFields || [];
      const definedFieldKeys = new Set(definedFields.map(f => f.key));
      
      const newFieldsToAdd = ALL_POSSIBLE_FIELDS
        .filter(p => !definedFieldKeys.has(p.key))
        .map(p => ({ key: p.key, label: p.label, table: false, quickView: false }));
      
      const fullFieldList = [...definedFields, ...newFieldsToAdd];
      setFields(fullFieldList);
    }
  }, [isOpen, sheetDefinition]);

  const handleToggle = (index: number, view: 'table' | 'quickView') => {
    setFields(currentFields => {
      const newFields = [...currentFields];
      newFields[index] = { ...newFields[index], [view]: !newFields[index][view] };
      return newFields;
    });
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newFields = [...fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex >= 0 && targetIndex < newFields.length) {
      [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
      setFields(newFields);
    }
  };
  
  const handleApplyToOne = async () => {
    const newDefinition: SheetDefinition = {
      ...sheetDefinition,
      displayFields: fields,
    };
    onSave(newDefinition);
    onOpenChange(false);
  }

  const handleApplyToAll = async () => {
    if (!isOnline) {
      toast({ title: 'Offline', description: 'This action requires an internet connection.', variant: 'destructive' });
      return;
    }
    const newSheetDefinitions = { ...appSettings.sheetDefinitions };
    const templateFields = fields; // The currently configured fields become the template

    for (const sheetName in newSheetDefinitions) {
        newSheetDefinitions[sheetName] = {
            ...newSheetDefinitions[sheetName],
            displayFields: templateFields,
        };
    }
    
    const newSettings: AppSettings = {
        ...appSettings,
        sheetDefinitions: newSheetDefinitions,
    };
    
    try {
        await updateSettings({ sheetDefinitions: newSettings.sheetDefinitions });
        setAppSettings(newSettings);
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
          <SheetTitle>Customize Columns for '{sheetDefinition?.name}'</SheetTitle>
          <SheetDescription>
            Drag to reorder, or use switches to control visibility. Changes will affect all users.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-grow overflow-hidden flex flex-col">
          <div className="flex items-center px-4 py-2 border-b font-medium text-sm">
            <div className="w-16"></div>
            <div className="flex-1">Field</div>
            <div className="w-24 text-center">Table</div>
            <div className="w-24 text-center">Quick View</div>
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-1 p-2">
              {fields.map((field, index) => (
                <div key={field.key} className="flex items-center p-2 rounded-md hover:bg-muted/50">
                  <div className="flex flex-col items-center w-16">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleMove(index, 'up')} disabled={index === 0}>
                        <ArrowUp className="h-4 w-4" />
                    </Button>
                     <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleMove(index, 'down')} disabled={index === fields.length - 1}>
                        <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex-1 text-sm font-medium">{field.label}</div>
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
        <SheetFooter className="sm:justify-between items-center pt-4 border-t">
          <SheetClose asChild>
            <Button variant="outline">Cancel</Button>
          </SheetClose>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleApplyToAll}>Apply to All Sheets</Button>
            <Button onClick={handleApplyToOne}>Apply to This Sheet</Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

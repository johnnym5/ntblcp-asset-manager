
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
import type { SheetDefinition, DisplayField, Asset } from '@/lib/types';

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

  useEffect(() => {
    if (isOpen && sheetDefinition) {
      // Create a full list of fields, including any that might be missing from the definition
      const existingFieldKeys = new Set(sheetDefinition.displayFields.map(f => f.key));
      const newFieldsToAdd = ALL_POSSIBLE_FIELDS
        .filter(p => !existingFieldKeys.has(p.key))
        .map(p => ({ key: p.key, label: p.label, table: false, quickView: false }));
      
      const fullFieldList = [...sheetDefinition.displayFields, ...newFieldsToAdd];
      setFields(fullFieldList);
    }
  }, [isOpen, sheetDefinition]);

  const handleToggle = (index: number, view: 'table' | 'quickView') => {
    const newFields = [...fields];
    newFields[index][view] = !newFields[index][view];
    setFields(newFields);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newFields = [...fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex >= 0 && targetIndex < newFields.length) {
      [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
      setFields(newFields);
    }
  };

  const handleSaveChanges = () => {
    onSave({
      ...sheetDefinition,
      displayFields: fields,
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col">
        <SheetHeader>
          <SheetTitle>Customize Columns for '{sheetDefinition?.name}'</SheetTitle>
          <SheetDescription>
            Drag to reorder columns, or use switches to control visibility in the main table and quick view panel.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-grow overflow-hidden flex flex-col">
          <div className="flex items-center px-4 py-2 border-b font-medium text-sm">
            <div className="w-10"></div>
            <div className="flex-1">Field</div>
            <div className="w-24 text-center">Table</div>
            <div className="w-24 text-center">Quick View</div>
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-1 p-2">
              {fields.map((field, index) => (
                <div key={field.key} className="flex items-center p-2 rounded-md hover:bg-muted/50">
                  <div className="flex flex-col items-center w-10">
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
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">Cancel</Button>
          </SheetClose>
          <Button onClick={handleSaveChanges}>Save Changes</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

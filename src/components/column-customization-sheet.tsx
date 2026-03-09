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
import { ArrowDown, ArrowUp, GripVertical, PlusCircle, Trash2 } from 'lucide-react';
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
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';

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
        inChecklist: false,
        checklistSection: 'important'
    };

    setEditedFields(current => [...current, newField]);
    setCustomLabel('');
  };

  const handleRemoveField = (index: number) => {
      setEditedFields(current => current.filter((_, i) => i !== index));
  };

  const handleLabelChange = (index: number, newLabel: string) => {
    setEditedFields(currentFields => {
      const newFields = [...currentFields];
      newFields[index] = { ...newFields[index], label: newLabel };
      return newFields;
    });
  };

  const handleToggle = (index: number, prop: 'table' | 'quickView' | 'inChecklist') => {
    setEditedFields(currentFields => {
      const newFields = [...currentFields];
      newFields[index] = { ...newFields[index], [prop]: !newFields[index][prop] };
      return newFields;
    });
  };

  const handleSectionChange = (index: number, section: 'required' | 'important') => {
    setEditedFields(currentFields => {
        const newFields = [...currentFields];
        newFields[index] = { ...newFields[index], checklistSection: section };
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
      <SheetContent className="w-full sm:max-w-4xl flex flex-col p-0 overflow-hidden">
        <SheetHeader className="px-6 py-4 border-b bg-muted/20">
          <SheetTitle>Configure Sheet Layout & Checklist</SheetTitle>
          <SheetDescription>
            Manage columns, visibility, and checklist requirements for the "{editedName}" category.
          </SheetDescription>
        </SheetHeader>
        
        <div className="px-6 py-4 flex items-center justify-between bg-background border-b">
            <div className="flex-1 max-w-sm">
                <Label htmlFor="sheet-name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Internal Sheet Name</Label>
                <Input id="sheet-name" value={editedName} onChange={(e) => setEditedName(e.target.value)} className="mt-1 h-9 font-bold" disabled={!!originalSheetName} />
            </div>
            <div className="flex gap-2">
                <Badge variant="outline" className="h-6">Total Fields: {editedFields.length}</Badge>
                <Badge variant="outline" className="h-6 text-primary border-primary/20">Checklist: {editedFields.filter(f => f.inChecklist).length}</Badge>
            </div>
        </div>

        <div className="flex-grow overflow-hidden flex flex-col">
          <div className="grid grid-cols-12 gap-2 px-6 py-2 border-b font-black text-[9px] uppercase tracking-widest bg-muted/30 text-muted-foreground">
            <div className="col-span-1 text-center">Move</div>
            <div className="col-span-4">Field Label</div>
            <div className="col-span-1 text-center">Table</div>
            <div className="col-span-1 text-center">Quick</div>
            <div className="col-span-1 text-center">Check</div>
            <div className="col-span-3">Checklist Section</div>
            <div className="col-span-1"></div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {editedFields.map((field, index) => (
                <div key={field.key} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg hover:bg-muted/50 border border-transparent transition-colors group">
                  <div className="col-span-1 flex flex-col items-center">
                    <button className="text-muted-foreground hover:text-primary disabled:opacity-20" onClick={() => handleMove(index, 'up')} disabled={index === 0}>
                        <ArrowUp className="h-3 w-3" />
                    </button>
                    <GripVertical className="h-4 w-4 my-0.5 text-muted-foreground/30 cursor-grab" />
                     <button className="text-muted-foreground hover:text-primary disabled:opacity-20" onClick={() => handleMove(index, 'down')} disabled={index === editedFields.length - 1}>
                        <ArrowDown className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="col-span-4">
                    <Input 
                        value={field.label}
                        onChange={(e) => handleLabelChange(index, e.target.value)}
                        className="h-8 text-xs font-semibold bg-background"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <Switch
                      className="scale-75"
                      checked={field.table}
                      onCheckedChange={() => handleToggle(index, 'table')}
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <Switch
                      className="scale-75"
                      checked={field.quickView}
                      onCheckedChange={() => handleToggle(index, 'quickView')}
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <Switch
                      className="scale-75"
                      checked={field.inChecklist}
                      onCheckedChange={() => handleToggle(index, 'inChecklist')}
                    />
                  </div>
                  <div className="col-span-3">
                    <Select 
                        value={field.checklistSection || 'important'} 
                        onValueChange={(v: any) => handleSectionChange(index, v)}
                        disabled={!field.inChecklist}
                    >
                        <SelectTrigger className="h-8 text-[10px] font-bold uppercase">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="required" className="text-[10px] font-bold">REQUIRED</SelectItem>
                            <SelectItem value="important" className="text-[10px] font-bold">IMPORTANT</SelectItem>
                        </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1 flex justify-end">
                      {String(field.key).startsWith('customField') && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleRemoveField(index)}>
                              <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <div className="px-6 py-4 border-t bg-muted/5 flex items-center gap-4">
          <div className="flex-1">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5">Add Custom Field</Label>
            <div className="flex items-center gap-2">
                <Input
                placeholder="Enter field label (e.g. Warranty Expiry)..."
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                className="h-9 text-xs"
                />
                <Button variant="outline" size="sm" onClick={handleAddField} className="h-9 font-bold px-4">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add
                </Button>
            </div>
          </div>
        </div>

        <SheetFooter className="p-6 border-t bg-muted/20 sm:justify-between items-center">
          <SheetClose asChild>
            <Button variant="outline" className="font-bold">Cancel</Button>
          </SheetClose>
          <div className="flex gap-2">
            <Button variant="secondary" className="font-bold" onClick={() => handleSaveChanges(true)}>Update All Categories</Button>
            <Button className="font-bold shadow-lg shadow-primary/20" onClick={() => handleSaveChanges(false)}>Update This Category</Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

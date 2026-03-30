
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
import { Label } from '@/components/ui/label';
import { ScrollArea } from './ui/scroll-area';
import { ArrowDown, ArrowUp, GripVertical, PlusCircle, Trash2, ArrowLeft, Type, DollarSign, Binary, CalendarDays } from 'lucide-react';
import type { SheetDefinition, DisplayField, Asset } from '@/lib/types';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { cn } from '@/lib/utils';

interface ColumnCustomizationSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  sheetDefinition: SheetDefinition;
  originalSheetName: string | null;
  onSave: (originalName: string | null, newDefinition: SheetDefinition, applyToAll: boolean) => void;
}

const FormatIcon = () => (
    <div className="flex flex-col items-center justify-center opacity-60">
        <span className="text-[10px] font-black leading-none uppercase">abc</span>
        <span className="text-[10px] font-black leading-none uppercase">123</span>
    </div>
);

export function ColumnCustomizationSheet({
  isOpen,
  onOpenChange,
  sheetDefinition,
  originalSheetName,
  onSave,
}: ColumnCustomizationSheetProps) {
  const [editedName, setEditedName] = useState('');
  const [editedFields, setEditedFields] = useState<DisplayField[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && sheetDefinition) {
      setEditedName(sheetDefinition.name);
      setEditedFields(JSON.parse(JSON.stringify(sheetDefinition.displayFields || [])));
    }
  }, [isOpen, sheetDefinition]);
  
  const handleAddField = (type: string) => {
    const customFieldKeys: (keyof Asset)[] = ['customField1', 'customField2', 'customField3', 'customField4', 'customField5'];
    const usedCustomKeys = new Set(editedFields.map(f => f.key).filter(k => customFieldKeys.includes(k as keyof Asset)));
    
    const availableCustomField = customFieldKeys.find(k => !usedCustomKeys.has(k));

    if (!availableCustomField) {
        toast({
            title: 'Registry Limit Reached',
            description: 'You have reached the maximum of 5 custom fields for this category.',
            variant: 'destructive',
        });
        return;
    }
    
    const newField: DisplayField = {
        key: availableCustomField,
        label: `New ${type} Field`,
        table: true,
        quickView: true,
        inChecklist: false,
        checklistSection: 'important'
    };

    setEditedFields(current => [...current, newField]);
    toast({ title: "Custom field added", description: "Rename the label to finalize." });
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
      <SheetContent className="w-full sm:max-w-xl flex flex-col p-0 overflow-hidden bg-background">
        {/* Header matching image structure */}
        <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full">
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <div className="flex flex-col">
                    <h2 className="text-xl font-black uppercase tracking-tight">Configure Layout</h2>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{editedName}</span>
                </div>
            </div>
            <Button variant="ghost" size="icon" className="text-destructive opacity-40 hover:opacity-100 transition-opacity">
                <Trash2 className="h-6 w-6" />
            </Button>
        </div>

        <div className="px-8 py-4 bg-muted/20 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <span>Field label</span>
            <span>Format</span>
        </div>

        <ScrollArea className="flex-1 px-6">
            <div className="space-y-3 py-4">
                {editedFields.map((field, index) => (
                    <div key={`${field.key}-${index}`} className="group relative">
                        <div className="absolute -left-4 top-1/2 -translate-y-1/2 flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleMove(index, 'up')} disabled={index === 0} className="hover:text-primary"><ArrowUp className="h-3 w-3" /></button>
                            <button onClick={() => handleMove(index, 'down')} disabled={index === editedFields.length - 1} className="hover:text-primary"><ArrowDown className="h-3 w-3" /></button>
                        </div>
                        
                        <div className="bg-card border-2 border-border/40 rounded-3xl p-5 flex items-center justify-between shadow-sm transition-all hover:border-primary/20 hover:shadow-md">
                            <div className="flex-1 mr-4">
                                <Input 
                                    value={field.label}
                                    onChange={(e) => handleLabelChange(index, e.target.value)}
                                    className="border-none bg-transparent p-0 h-auto font-black text-base focus-visible:ring-0 shadow-none text-foreground placeholder:opacity-20"
                                />
                            </div>
                            <div className="flex items-center gap-4">
                                <FormatIcon />
                                {String(field.key).startsWith('customField') && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/40 hover:text-destructive" onClick={() => handleRemoveField(index)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </ScrollArea>

        {/* Bottom bar for "Add field" matching image */}
        <div className="p-6 border-t bg-muted/10">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-1 bg-muted-foreground/20 rounded-full" />
                <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Add field</span>
                <div className="flex items-center justify-center gap-8 w-full">
                    <button onClick={() => handleAddField('Text')} className="flex flex-col items-center gap-1 group">
                        <div className="p-2 rounded-xl group-hover:bg-primary/10 transition-colors"><Type className="h-6 w-6 text-foreground" /></div>
                    </button>
                    <button onClick={() => handleAddField('Currency')} className="flex flex-col items-center gap-1 group">
                        <div className="p-2 rounded-xl group-hover:bg-primary/10 transition-colors"><DollarSign className="h-6 w-6 text-foreground" /></div>
                    </button>
                    <button onClick={() => handleAddField('Number')} className="flex flex-col items-center gap-1 group">
                        <div className="p-2 rounded-xl group-hover:bg-primary/10 transition-colors"><Binary className="h-6 w-6 text-foreground" /></div>
                    </button>
                    <button onClick={() => handleAddField('Date')} className="flex flex-col items-center gap-1 group">
                        <div className="p-2 rounded-xl group-hover:bg-primary/10 transition-colors"><CalendarDays className="h-6 w-6 text-foreground" /></div>
                    </button>
                </div>
            </div>
        </div>

        <SheetFooter className="p-6 border-t bg-muted/20 flex flex-row items-center gap-2">
            <Button variant="outline" className="flex-1 font-black uppercase text-[10px] tracking-widest h-12 rounded-2xl" onClick={() => handleSaveChanges(true)}>Update All</Button>
            <Button className="flex-1 font-black uppercase text-[10px] tracking-widest h-12 rounded-2xl shadow-xl shadow-primary/20" onClick={() => handleSaveChanges(false)}>Commit Changes</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

"use client";

/**
 * @fileOverview ColumnCustomizationSheet - Professional Schema Editor.
 * Orchestrates reordering, mapping, and structural visibility.
 */

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
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowDown, 
  ArrowUp, 
  PlusCircle, 
  Trash2, 
  ArrowLeft, 
  Type, 
  DollarSign, 
  Binary, 
  CalendarDays,
  Columns,
  Hash,
  Eye,
  LayoutGrid
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SheetDefinition, DisplayField, Asset } from '@/types/domain';

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
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && sheetDefinition) {
      setEditedName(sheetDefinition.name);
      setEditedFields(JSON.parse(JSON.stringify(sheetDefinition.displayFields || [])));
    }
  }, [isOpen, sheetDefinition]);
  
  const handleAddField = (type: string) => {
    const customFieldKeys: (keyof Asset)[] = ['metadata']; 
    
    const newField: DisplayField = {
        key: `custom_${Date.now()}` as any,
        label: `New ${type} Field`,
        table: true,
        quickView: true,
        inChecklist: false,
        checklistSection: 'important'
    };

    setEditedFields(current => [...current, newField]);
    toast({ title: "Custom field added", description: "Rename the label to finalize schema mapping." });
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

  const FieldPulse = ({ field, index }: { field: DisplayField, index: number }) => (
    <div className="group relative">
        <div className="absolute -left-6 top-1/2 -translate-y-1/2 flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => handleMove(index, 'up')} disabled={index === 0} className="hover:text-primary disabled:opacity-20"><ArrowUp className="h-3 w-3" /></button>
            <button onClick={() => handleMove(index, 'down')} disabled={index === editedFields.length - 1} className="hover:text-primary disabled:opacity-20"><ArrowDown className="h-3 w-3" /></button>
        </div>
        
        <div className="bg-card border-2 border-border/40 rounded-3xl p-5 flex items-center justify-between shadow-sm transition-all hover:border-primary/20 group-hover:shadow-md">
            <div className="flex-1 mr-4">
                <Input 
                    value={field.label}
                    onChange={(e) => handleLabelChange(index, e.target.value)}
                    className="border-none bg-transparent p-0 h-auto font-black text-sm uppercase tracking-tight focus-visible:ring-0 shadow-none text-foreground placeholder:opacity-20"
                />
                <div className="flex items-center gap-2 mt-1 opacity-40">
                  <Hash className="h-2.5 w-2.5" />
                  <span className="text-[8px] font-black uppercase tracking-widest">{field.key}</span>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => {
                    const next = [...editedFields];
                    next[index].table = !next[index].table;
                    setEditedFields(next);
                  }}
                  className={cn("h-9 w-9 rounded-xl transition-colors", field.table ? "text-primary bg-primary/10" : "opacity-20")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => {
                    const next = [...editedFields];
                    next[index].quickView = !next[index].quickView;
                    setEditedFields(next);
                  }}
                  className={cn("h-9 w-9 rounded-xl transition-colors", field.quickView ? "text-primary bg-primary/10" : "opacity-20")}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {String(field.key).startsWith('custom') && (
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-destructive/40 hover:text-destructive hover:bg-destructive/10" onClick={() => handleRemoveField(index)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    </div>
  );

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col p-0 overflow-hidden bg-background rounded-l-[2.5rem] border-primary/10 shadow-2xl">
        <div className="p-8 pb-4 bg-muted/20 border-b">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-3 text-3xl font-black tracking-tight uppercase">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Columns className="text-primary h-6 w-6" />
                </div>
                Layout Orchestrator
              </SheetTitle>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-xl">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </div>
            <DialogDescription className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground opacity-70">
              Defining technical field mapping for category: <span className="text-primary">{editedName}</span>
            </DialogDescription>
          </SheetHeader>
        </div>

        <div className="px-8 py-4 bg-muted/10 border-b flex items-center justify-between text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">
            <span>Mapping Logic / Label</span>
            <div className="flex gap-8 mr-12">
              <span>Table</span>
              <span>Grid</span>
            </div>
        </div>

        <ScrollArea className="flex-1 px-8 bg-background">
            <div className="space-y-3 py-6">
                {editedFields.map((field, index) => (
                    <FieldPulse key={`${field.key}-${index}`} field={field} index={index} />
                ))}
            </div>
        </ScrollArea>

        <div className="p-8 border-t bg-muted/10">
            <div className="flex flex-col items-center gap-4">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40">Inject New Schema Field</span>
                <div className="flex items-center justify-center gap-6 w-full">
                    <button onClick={() => handleAddField('Text')} className="p-4 rounded-2xl bg-card border-2 hover:border-primary/20 hover:bg-primary/5 transition-all tactile-pulse shadow-sm">
                        <Type className="h-6 w-6 text-primary" />
                    </button>
                    <button onClick={() => handleAddField('Currency')} className="p-4 rounded-2xl bg-card border-2 hover:border-primary/20 hover:bg-primary/5 transition-all tactile-pulse shadow-sm">
                        <DollarSign className="h-6 w-6 text-primary" />
                    </button>
                    <button onClick={() => handleAddField('Number')} className="p-4 rounded-2xl bg-card border-2 hover:border-primary/20 hover:bg-primary/5 transition-all tactile-pulse shadow-sm">
                        <Binary className="h-6 w-6 text-primary" />
                    </button>
                    <button onClick={() => handleAddField('Date')} className="p-4 rounded-2xl bg-card border-2 hover:border-primary/20 hover:bg-primary/5 transition-all tactile-pulse shadow-sm">
                        <CalendarDays className="h-6 w-6 text-primary" />
                    </button>
                </div>
            </div>
        </div>

        <SheetFooter className="p-8 border-t bg-muted/20 flex flex-row items-center gap-3">
            <Button variant="ghost" className="flex-1 font-black uppercase text-[10px] tracking-widest h-14 rounded-2xl" onClick={() => handleSaveChanges(true)}>Apply Global</Button>
            <Button className="flex-1 font-black uppercase text-[10px] tracking-widest h-14 rounded-2xl shadow-xl shadow-primary/20 bg-primary text-primary-foreground" onClick={() => handleSaveChanges(false)}>Commit Schema</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
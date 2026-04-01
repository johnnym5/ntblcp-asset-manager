"use client";

/**
 * @fileOverview ColumnCustomizationSheet - High-Fidelity Schema Editor.
 * Phase 125: Strictly matched to provided mockup with reordering and visibility toggles.
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
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowDown, 
  ArrowUp, 
  GripVertical, 
  PlusCircle, 
  Trash2, 
  ArrowLeft,
  Columns,
  Hash
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { SheetDefinition, DisplayField } from '@/types/domain';

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

  const handleLabelChange = (index: number, newLabel: string) => {
    setEditedFields(current => {
      const next = [...current];
      next[index] = { ...next[index], label: newLabel };
      return next;
    });
  };

  const handleToggle = (index: number, key: 'table' | 'quickView') => {
    setEditedFields(current => {
      const next = [...current];
      next[index] = { ...next[index], [key]: !next[index][key] };
      return next;
    });
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= editedFields.length) return;

    setEditedFields(current => {
      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const handleSaveChanges = (applyToAll: boolean) => {
    const newDefinition: SheetDefinition = {
      ...sheetDefinition,
      name: editedName,
      headers: editedFields.map(f => f.label),
      displayFields: editedFields,
    };
    onSave(originalSheetName, newDefinition, applyToAll);
    onOpenChange(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0 overflow-hidden bg-background rounded-l-[2.5rem] border-primary/10 shadow-2xl">
        <div className="p-8 pb-4 bg-muted/20 border-b">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle className="text-3xl font-black uppercase tracking-tight">Customize Sheet Layout</SheetTitle>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-xl h-10 w-10">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </div>
            <SheetDescription className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground opacity-70">
              Reorder fields, edit labels, and control visibility pulses for desktop and mobile workstations.
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex items-center px-8 py-3 bg-muted/10 border-b text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          <div className="w-16">Reorder</div>
          <div className="flex-1">Field Label (Header Name)</div>
          <div className="w-20 text-center">In Table</div>
          <div className="w-24 text-center">Quick View</div>
        </div>

        <ScrollArea className="flex-1 px-8 bg-background">
          <div className="divide-y divide-border/40">
            {editedFields.map((field, idx) => (
              <div key={`${field.key}-${idx}`} className="flex items-center py-4 group transition-all hover:bg-primary/[0.02]">
                <div className="w-16 flex flex-col items-center gap-1">
                  <button onClick={() => handleMove(idx, 'up')} disabled={idx === 0} className="text-muted-foreground/40 hover:text-primary disabled:opacity-10">
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <GripVertical className="h-4 w-4 text-muted-foreground/20 group-hover:text-primary/40 transition-colors" />
                  <button onClick={() => handleMove(idx, 'down')} disabled={idx === editedFields.length - 1} className="text-muted-foreground/40 hover:text-primary disabled:opacity-10">
                    <ArrowDown className="h-3 w-3" />
                  </button>
                </div>

                <div className="flex-1 px-2">
                  <Input 
                    value={field.label} 
                    onChange={(e) => handleLabelChange(idx, e.target.value)}
                    className="h-10 rounded-xl border-none bg-transparent font-black uppercase text-xs tracking-tight focus-visible:ring-0 shadow-none" 
                  />
                  <div className="flex items-center gap-1.5 pl-3 opacity-20 group-hover:opacity-40 transition-opacity">
                    <Hash className="h-2 w-2" />
                    <span className="text-[7px] font-mono font-bold uppercase">{field.key}</span>
                  </div>
                </div>

                <div className="w-20 flex justify-center">
                  <Switch checked={field.table} onCheckedChange={() => handleToggle(idx, 'table')} />
                </div>

                <div className="w-24 flex justify-center">
                  <Switch checked={field.quickView} onCheckedChange={() => handleToggle(idx, 'quickView')} />
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <SheetFooter className="p-8 bg-muted/20 border-t flex flex-row items-center gap-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 h-14 font-black uppercase text-[10px] tracking-widest rounded-2xl">Discard</Button>
          <div className="flex-[2] flex gap-3">
            <Button variant="outline" onClick={() => handleSaveChanges(true)} className="flex-1 h-14 font-black uppercase text-[10px] tracking-widest rounded-2xl border-2">Apply All</Button>
            <Button onClick={() => handleSaveChanges(false)} className="flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 bg-primary text-primary-foreground">Commit Schema</Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

"use client";

/**
 * @fileOverview ColumnCustomizationSheet - High-Fidelity Asset Group Schema Editor.
 * Phase 350: Overhauled to focus on Asset Groups rather than physical sheets.
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
  Hash,
  X,
  Layers,
  Database
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SheetDefinition, DisplayField } from '@/types/domain';

interface ColumnCustomizationSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
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
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0 overflow-hidden bg-black text-white rounded-l-[2.5rem] border-white/5 shadow-2xl">
        <div className="p-10 pb-6 bg-white/5 border-b border-white/5">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-primary/10 rounded-xl">
                  <Layers className="h-6 w-6 text-primary" />
                </div>
                <div className="flex flex-col">
                  <SheetTitle className="text-3xl font-black uppercase tracking-tight text-white leading-none">Group Layout</SheetTitle>
                  <SheetDescription className="font-bold uppercase text-[9px] tracking-[0.3em] text-primary mt-1.5">STRUCTURAL SCHEMA ORCHESTRATION</SheetDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-xl h-12 w-12 bg-white/5 hover:bg-white/10 text-white">
                <X className="h-6 w-6" />
              </Button>
            </div>
          </SheetHeader>
        </div>

        <div className="px-10 py-6 border-b border-white/5 bg-black flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Asset Group Name</Label>
            <p className="text-base font-black uppercase text-white tracking-tight">{editedName}</p>
          </div>
          <Badge variant="outline" className="h-8 px-4 border-primary/20 bg-primary/5 text-primary font-black uppercase text-[10px]">
            <Database className="h-3.5 w-3.5 mr-2" /> Padded Registry
          </Badge>
        </div>

        <div className="flex items-center px-10 py-4 bg-white/5 border-b border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
          <div className="flex-1">Field Label (Header Map)</div>
          <div className="w-20 text-center">In Table</div>
          <div className="w-24 text-center">Quick View</div>
        </div>

        <ScrollArea className="flex-1 px-10 bg-black">
          <div className="divide-y divide-white/5 pb-20">
            {editedFields.map((field, idx) => (
              <div key={`${field.key}-${idx}`} className="flex items-center py-6 group transition-all hover:bg-white/[0.02]">
                <div className="flex flex-col items-center gap-1.5 mr-6 shrink-0">
                  <button onClick={() => handleMove(idx, 'up')} disabled={idx === 0} className="text-white/20 hover:text-primary disabled:opacity-5 transition-colors">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <div className="p-2 bg-white/5 rounded-lg group-hover:bg-primary/10 group-hover:text-primary transition-all shadow-sm">
                    <GripVertical className="h-5 w-5 opacity-40" />
                  </div>
                  <button onClick={() => handleMove(idx, 'down')} disabled={idx === editedFields.length - 1} className="text-white/20 hover:text-primary disabled:opacity-5 transition-colors">
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1 pr-6">
                  <Input value={field.label} onChange={(e) => handleLabelChange(idx, e.target.value)} className="h-12 rounded-xl border-2 border-transparent bg-transparent hover:border-white/10 focus:border-primary/40 font-black uppercase text-sm tracking-tight text-white transition-all px-0 hover:px-4 focus:px-4 shadow-none" />
                  <div className="flex items-center gap-1.5 mt-1 opacity-20 group-hover:opacity-40 transition-opacity pl-0 group-hover:pl-4">
                    <Hash className="h-2.5 w-2.5" /><span className="text-[8px] font-mono font-bold uppercase">{field.key}</span>
                  </div>
                </div>

                <div className="w-20 flex justify-center">
                  <Switch 
                    checked={field.table} 
                    onCheckedChange={() => handleToggle(idx, 'table')} 
                    className="data-[state=checked]:bg-primary" 
                  />
                </div>
                <div className="w-24 flex justify-center">
                  <Switch 
                    checked={field.quickView} 
                    onCheckedChange={() => handleToggle(idx, 'quickView')} 
                    className="data-[state=checked]:bg-primary" 
                  />
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <SheetFooter className="p-10 bg-black border-t border-white/5 flex flex-row items-center gap-4">
          <SheetClose asChild>
            <Button variant="ghost" className="flex-1 h-16 font-black uppercase text-xs tracking-widest rounded-[1.5rem] bg-white/5 hover:bg-white/10 text-white">Cancel</Button>
          </SheetClose>
          <div className="flex-[3] flex gap-4">
            <Button variant="outline" onClick={() => handleSaveChanges(true)} className="flex-1 h-16 font-black uppercase text-[10px] tracking-[0.2em] rounded-[1.5rem] border-2 border-white/10 text-white hover:bg-white/5">Apply to All Groups</Button>
            <Button onClick={() => handleSaveChanges(false)} className="flex-1 h-16 rounded-[1.5rem] font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl shadow-primary/30 bg-primary text-black hover:bg-primary/90">Apply to This Group</Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

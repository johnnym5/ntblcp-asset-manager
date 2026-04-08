"use client";

/**
 * @fileOverview ColumnCustomizationSheet - High-Fidelity Asset Group Schema Editor.
 * Phase 400: Added In-Checklist visibility control for folder-specific fidelity pulses.
 * Phase 401: Converted to centered Dialog pop-up window.
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
  Database,
  ClipboardCheck,
  LayoutGrid,
  Eye
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

  const handleToggle = (index: number, key: 'table' | 'quickView' | 'inChecklist') => {
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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0 overflow-hidden bg-background text-foreground rounded-[2.5rem] border-border shadow-2xl">
        <div className="p-10 pb-6 bg-muted/20 border-b border-border">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-primary/10 rounded-xl">
                  <Layers className="h-6 w-6 text-primary" />
                </div>
                <div className="flex flex-col">
                  <DialogTitle className="text-3xl font-black uppercase tracking-tight leading-none">Field Setup</DialogTitle>
                  <DialogDescription className="font-bold uppercase text-[9px] tracking-[0.3em] text-primary mt-1.5">FOLDER SCHEMA ORCHESTRATION</DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="px-10 py-6 border-b border-border bg-background flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Asset Folder</Label>
            <p className="text-base font-black uppercase tracking-tight">{editedName}</p>
          </div>
          <Badge variant="outline" className="h-8 px-4 border-primary/20 bg-primary/5 text-primary font-black uppercase text-[10px]">
            <Database className="h-3.5 w-3.5 mr-2" /> Local Schema active
          </Badge>
        </div>

        <div className="flex items-center px-10 py-4 bg-muted/10 border-b border-border text-[9px] font-black uppercase tracking-[0.2em] opacity-60">
          <div className="flex-1">Field Label (Header Map)</div>
          <div className="w-20 text-center flex flex-col items-center gap-1"><LayoutGrid className="h-3 w-3" /> Table</div>
          <div className="w-20 text-center flex flex-col items-center gap-1"><Eye className="h-3 w-3" /> Quick</div>
          <div className="w-20 text-center flex flex-col items-center gap-1"><ClipboardCheck className="h-3 w-3" /> Check</div>
        </div>

        <ScrollArea className="flex-1 px-10 bg-background custom-scrollbar">
          <div className="divide-y divide-border/40 pb-20">
            {editedFields.map((field, idx) => (
              <div key={`${field.key}-${idx}`} className="flex items-center py-6 group transition-all hover:bg-muted/5">
                <div className="flex flex-col items-center gap-1.5 mr-6 shrink-0">
                  <button onClick={() => handleMove(idx, 'up')} disabled={idx === 0} className="text-muted-foreground/20 hover:text-primary disabled:opacity-5 transition-colors">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <div className="p-2 bg-muted rounded-lg group-hover:bg-primary/10 group-hover:text-primary transition-all shadow-sm">
                    <GripVertical className="h-5 w-5 opacity-40" />
                  </div>
                  <button onClick={() => handleMove(idx, 'down')} disabled={idx === editedFields.length - 1} className="text-muted-foreground/20 hover:text-primary disabled:opacity-5 transition-colors">
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1 pr-6">
                  <Input value={field.label} onChange={(e) => handleLabelChange(idx, e.target.value)} className="h-12 rounded-xl border-2 border-transparent bg-transparent hover:border-border/40 focus:border-primary/40 font-black uppercase text-sm tracking-tight transition-all px-0 hover:px-4 focus:px-4 shadow-none" />
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
                <div className="w-20 flex justify-center">
                  <Switch 
                    checked={field.quickView} 
                    onCheckedChange={() => handleToggle(idx, 'quickView')} 
                    className="data-[state=checked]:bg-primary" 
                  />
                </div>
                <div className="w-20 flex justify-center">
                  <Switch 
                    checked={!!field.inChecklist} 
                    onCheckedChange={() => handleToggle(idx, 'inChecklist')} 
                    className="data-[state=checked]:bg-primary" 
                  />
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="p-10 bg-muted/10 border-t border-border flex flex-row items-center gap-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 h-16 font-black uppercase text-xs tracking-widest rounded-[1.5rem] hover:bg-muted">Cancel</Button>
          <div className="flex-[3] flex gap-4">
            <Button variant="outline" onClick={() => handleSaveChanges(true)} className="flex-1 h-16 font-black uppercase text-[10px] tracking-[0.2em] rounded-[1.5rem] border-2">Apply to All Folders</Button>
            <Button onClick={() => handleSaveChanges(false)} className="flex-1 h-16 rounded-[1.5rem] font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl shadow-primary/30 bg-primary text-primary-foreground">Save Folder Layout</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
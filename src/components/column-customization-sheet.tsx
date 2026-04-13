"use client";

/**
 * @fileOverview ColumnCustomizationSheet - High-Fidelity Asset Group Schema Editor.
 * Overhauled to match the structural grid pulse of the Import Preview.
 * Phase 500: Replaced vertical list with a grid of high-density Column Cards.
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  ArrowRight, 
  Hash,
  X,
  Layers,
  Database,
  ClipboardCheck,
  LayoutGrid,
  Eye,
  CheckCircle2,
  Trash2,
  Columns,
  Info
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SheetDefinition, DisplayField } from '@/types/domain';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from 'framer-motion';

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

  const handleMove = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
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

  const FlagToggle = ({ active, icon: Icon, onClick, label }: { active: boolean, icon: any, onClick: () => void, label: string }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button 
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={cn(
              "p-2 rounded-lg transition-all border shadow-sm",
              active 
                ? "bg-primary text-black border-primary" 
                : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="text-[8px] font-black uppercase">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1200px] w-[95vw] h-[85vh] flex flex-col p-0 overflow-hidden bg-background text-foreground rounded-[2.5rem] border-border shadow-3xl">
        {/* 1. High-Fidelity Header (Matching Image) */}
        <div className="p-8 pb-6 bg-[#050505] border-b border-border">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="p-4 bg-primary rounded-2xl shadow-2xl shadow-primary/20">
                  <CheckCircle2 className="h-10 w-10 text-black stroke-[2.5]" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <DialogTitle className="text-3xl font-black uppercase tracking-tighter leading-none">{editedName}</DialogTitle>
                    <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-[8px] font-black uppercase tracking-widest px-2 h-5">Template Active</Badge>
                  </div>
                  <DialogDescription className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground opacity-60 mt-1">
                    Row 1 Title & Row 2 Headers • {editedFields.length} Logical Columns
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="h-8 px-4 border-primary/20 bg-primary/5 text-primary font-black uppercase text-[10px] tracking-widest">
                  <Database className="h-3.5 w-3.5 mr-2" /> Global Registry Setup
                </Badge>
                <button onClick={() => onOpenChange(false)} className="h-10 w-10 flex items-center justify-center bg-white/5 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* 2. Grid Instruction */}
        <div className="px-10 py-4 bg-muted/10 border-b border-border text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground opacity-40">
          Structural Column Map: Arrangement and Logic Toggles
        </div>

        {/* 3. The Grid Workstation */}
        <ScrollArea className="flex-1 bg-background custom-scrollbar">
          <div className="p-10">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-20">
              {editedFields.map((field, idx) => (
                <motion.div 
                  key={`${field.key}-${idx}`}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn(
                    "p-5 rounded-3xl border-2 transition-all flex flex-col justify-between h-[180px] relative group",
                    "bg-[#0A0A0A] border-border/40 hover:border-primary/40 shadow-xl"
                  )}
                >
                  {/* Card Header: Col Number + Move Arrows */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40">
                      COL {idx + 1}
                    </span>
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => handleMove(idx, 'left')} 
                        disabled={idx === 0}
                        className="p-1 rounded-md bg-white/5 hover:bg-primary/10 text-primary disabled:opacity-5 transition-all"
                      >
                        <ArrowLeft className="h-3 w-3" />
                      </button>
                      <button 
                        onClick={() => handleMove(idx, 'right')} 
                        disabled={idx === editedFields.length - 1}
                        className="p-1 rounded-md bg-white/5 hover:bg-primary/10 text-primary disabled:opacity-5 transition-all"
                      >
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Card Identity: Label Input */}
                  <div className="flex-1 flex flex-col justify-center text-center px-1">
                    <Input 
                      value={field.label} 
                      onChange={(e) => handleLabelChange(idx, e.target.value)}
                      className="border-none bg-transparent p-0 h-auto font-black text-xs uppercase text-center focus-visible:ring-0 shadow-none tracking-tight leading-tight placeholder:opacity-20"
                      placeholder="HEADER NAME"
                    />
                    <div className="flex items-center justify-center gap-1 mt-1 opacity-20 group-hover:opacity-40 transition-opacity">
                      <Hash className="h-2 w-2" /><span className="text-[7px] font-mono font-bold uppercase truncate max-w-[100px]">{field.key}</span>
                    </div>
                  </div>

                  {/* Card Footer: Logic Toggles */}
                  <div className="flex items-center justify-around pt-4 mt-2 border-t border-dashed border-border/20">
                    <FlagToggle 
                      active={field.table} 
                      icon={LayoutGrid} 
                      label="Show in List" 
                      onClick={() => handleToggle(idx, 'table')} 
                    />
                    <FlagToggle 
                      active={field.quickView} 
                      icon={Eye} 
                      label="Show in Card" 
                      onClick={() => handleToggle(idx, 'quickView')} 
                    />
                    <FlagToggle 
                      active={!!field.inChecklist} 
                      icon={ClipboardCheck} 
                      label="Add to Checklist" 
                      onClick={() => handleToggle(idx, 'inChecklist')} 
                    />
                  </div>
                </motion.div>
              ))}

              {/* Add Column Pulse Placeholder */}
              <button 
                className="p-5 rounded-3xl border-2 border-dashed border-border/20 bg-muted/5 flex flex-col items-center justify-center gap-3 opacity-20 hover:opacity-100 hover:border-primary/40 transition-all h-[180px] group"
              >
                <div className="p-3 bg-white/5 rounded-xl group-hover:bg-primary/10 transition-colors"><Columns className="h-6 w-6" /></div>
                <span className="text-[10px] font-black uppercase tracking-widest">New Column</span>
              </button>
            </div>
          </div>
        </ScrollArea>

        {/* 4. Action Footer */}
        <div className="p-8 bg-[#050505] border-t border-border flex flex-row items-center justify-between gap-4 shrink-0 pb-safe">
          <div className="flex items-start gap-4 max-w-md">
            <div className="p-2.5 bg-blue-500/10 rounded-xl shrink-0"><Info className="h-5 w-5 text-blue-600" /></div>
            <p className="text-[10px] font-medium text-muted-foreground italic leading-relaxed">
              These settings redefine how <strong>{editedName}</strong> records are presented. You can propagate this layout to all existing folders if needed.
            </p>
          </div>
          <div className="flex gap-4">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-14 font-black uppercase text-[10px] tracking-widest px-8 rounded-2xl hover:bg-muted">Cancel</Button>
            <Button variant="outline" onClick={() => handleSaveChanges(true)} className="h-14 font-black uppercase text-[10px] tracking-widest rounded-2xl border-2 px-8">Propagate Layout All</Button>
            <Button 
              onClick={() => handleSaveChanges(false)} 
              className="h-14 px-12 rounded-[1.5rem] font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl shadow-primary/30 bg-primary text-black transition-all hover:scale-105 active:scale-95 min-w-[220px]"
            >
              Commit Folder Schema
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
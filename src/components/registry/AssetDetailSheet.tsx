'use client';

/**
 * @fileOverview AssetDetailSheet - High-Fidelity "Full View" Workstation.
 * Optimized for high-density, no-scroll responsive layout.
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ChevronLeft, 
  ChevronRight, 
  Edit3, 
  Database,
  Tag,
  X,
  ShieldCheck,
  ClipboardCheck,
  History
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssetRecord } from '@/types/registry';
import { AssetChecklist } from '@/components/asset-checklist';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AssetDetailSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  record?: AssetRecord;
  onEdit: (id: string) => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

const FullViewField = ({ label, value, isLast }: { label: string, value: string, isLast?: boolean }) => (
  <div className={cn(
    "p-4 md:p-5 flex flex-col gap-1 relative transition-colors hover:bg-white/[0.02]",
    !isLast && "border-b border-white/5"
  )}>
    <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.25em] text-white/30 leading-none">
      {label}
    </span>
    <p className="text-xs md:text-sm font-black uppercase tracking-tight text-white/80 leading-tight">
      {value || '---'}
    </p>
  </div>
);

export function AssetDetailSheet({ isOpen, onOpenChange, record, onEdit, onNext, onPrevious }: AssetDetailSheetProps) {
  if (!record) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1200px] w-[100vw] h-[100vh] sm:w-[98vw] sm:h-[90vh] p-0 overflow-hidden bg-black text-white border-none sm:border-white/10 rounded-none sm:rounded-[2.5rem] shadow-[0_0_60px_rgba(0,0,0,0.9)]">
        <motion.div 
          className="flex flex-col h-full"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={(_, info) => {
            if (info.offset.x > 100 && onPrevious) onPrevious();
            if (info.offset.x < -100 && onNext) onNext();
          }}
        >
          {/* Header */}
          <div className="p-6 md:p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02] shrink-0">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-primary/10 rounded-2xl shadow-inner hidden sm:block">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <div className="flex flex-col">
                <DialogTitle className="text-lg md:text-2xl font-black uppercase tracking-tight text-white leading-none">
                  Registry Profile
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1.5">
                  <DialogDescription className="text-[8px] md:text-[9px] font-bold uppercase text-primary tracking-[0.3em]">
                    Fidelity Analysis
                  </DialogDescription>
                  <div className="h-1 w-1 rounded-full bg-white/10" />
                  <span className="text-[8px] md:text-[9px] font-mono font-bold text-white/20 uppercase truncate max-w-[80px]">#{record.id.split('-')[0]}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center bg-white/5 rounded-2xl p-1 border border-white/5 shadow-xl">
                <Button variant="ghost" size="icon" onClick={onPrevious} disabled={!onPrevious} className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl hover:bg-white/10 text-white/40"><ChevronLeft className="h-5 w-5" /></Button>
                <div className="w-px h-6 bg-white/10 mx-1" />
                <Button variant="ghost" size="icon" onClick={onNext} disabled={!onNext} className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl hover:bg-white/10 text-white/40"><ChevronRight className="h-5 w-5" /></Button>
              </div>
              <button onClick={() => onOpenChange(false)} className="h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center bg-white/5 rounded-2xl text-white/40 hover:text-white border border-white/5"><X className="h-5 w-5 sm:h-6 sm:w-6" /></button>
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
            {/* Technical Grid */}
            <div className="flex-1 flex flex-col bg-black border-r border-white/5 min-h-0 overflow-hidden">
              <div className="px-6 md:px-8 py-4 md:pt-6 md:pb-2 shrink-0">
                <Badge variant="outline" className="h-7 px-4 text-[8px] md:text-[9px] font-black uppercase tracking-widest rounded-full border-2 bg-white/5" style={{ color: record.accentColor, borderColor: `${record.accentColor}40` }}>
                  <Database className="h-3 w-3 mr-2" /> {record.sourceSheet || 'REGISTRY'}
                </Badge>
              </div>

              <ScrollArea className="flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 pb-20">
                  {record.fields.map((field) => {
                    const header = record.headers.find(h => h.id === field.headerId);
                    return (
                      <FullViewField 
                        key={field.headerId} 
                        label={header?.displayName || 'Parameter'} 
                        value={field.displayValue} 
                      />
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Sidebar Stacking on Mobile */}
            <div className="w-full md:w-[320px] lg:w-[380px] bg-[#050505] flex flex-col shrink-0 border-t md:border-t-0 border-white/5 min-h-0 overflow-hidden">
              <ScrollArea className="flex-1">
                <div className="p-6 md:p-8 space-y-10 pb-32">
                  <div className="flex items-center gap-4 text-primary">
                    <ClipboardCheck className="h-5 w-5" />
                    <h4 className="text-xs font-black uppercase tracking-widest">Integrity Pulse</h4>
                  </div>
                  
                  <AssetChecklist values={record.rawRow as any} />
                  
                  <div className="p-6 rounded-[1.5rem] bg-white/[0.02] border-2 border-dashed border-white/10 space-y-4">
                    <div className="flex items-center gap-2 opacity-40">
                      <History className="h-3.5 w-3.5" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Metadata</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-[8px] uppercase">
                        <span className="text-white/20">Source</span>
                        <span className="text-white/60 font-bold truncate max-w-[140px]">{record.sourceSheet || 'MANUAL'}</span>
                      </div>
                      <div className="flex justify-between items-center text-[8px] uppercase">
                        <span className="text-white/20">Row</span>
                        <span className="text-white/60 font-bold">#{record.sourceRow || 'MAN'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Mobile Footer Terminal */}
          <div className="p-6 md:p-8 bg-black/80 backdrop-blur-3xl border-t border-white/5 flex flex-row items-center gap-4 shrink-0 pb-safe">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 h-12 md:h-14 font-black uppercase text-[10px] tracking-widest rounded-2xl bg-white/5 text-white/40">
              Close
            </Button>
            <Button onClick={() => onEdit(record.id)} className="flex-[2] h-12 md:h-14 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl bg-primary text-black gap-3">
              <Edit3 className="h-4 w-4" /> <span className="hidden xs:inline">Edit Record</span>
            </Button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
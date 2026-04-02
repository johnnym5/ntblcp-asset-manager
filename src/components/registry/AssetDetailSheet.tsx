'use client';

/**
 * @fileOverview AssetDetailSheet - High-Fidelity "Full View" Pop-up.
 * Phase 130: Converted to Dialog (Pop-up) for centered dual-pane auditing.
 * Phase 131: Integrated ScrollArea and Data Fidelity Checklist.
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  ClipboardCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssetRecord } from '@/types/registry';
import { AssetChecklist } from '@/components/asset-checklist';

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
    "p-6 flex flex-col gap-1 relative transition-colors hover:bg-muted/5",
    !isLast && "border-b border-border/40"
  )}>
    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground opacity-60 leading-none">
      {label}
    </span>
    <p className="text-base font-black uppercase tracking-tight text-foreground leading-tight">
      {value || '---'}
    </p>
  </div>
);

export function AssetDetailSheet({ isOpen, onOpenChange, record, onEdit, onNext, onPrevious }: AssetDetailSheetProps) {
  if (!record) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1100px] w-[95vw] h-[85vh] p-0 overflow-hidden bg-black text-white border-white/10 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.8)]">
        <div className="flex flex-col h-full">
          {/* Header Pulse */}
          <div className="p-8 pb-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02] shrink-0">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <div className="flex flex-col">
                <DialogTitle className="text-2xl font-black uppercase tracking-tight text-white leading-none">
                  Registry Profile Pulse
                </DialogTitle>
                <DialogDescription className="text-[10px] font-bold uppercase text-primary tracking-[0.3em] mt-1.5">
                  Fidelity Analysis & Forensic Record
                </DialogDescription>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-white/5 rounded-2xl p-1 border border-white/5">
                <Button variant="ghost" size="icon" onClick={onPrevious} disabled={!onPrevious} className="h-10 w-10 rounded-xl hover:bg-white/10 text-white/40 hover:text-white"><ChevronLeft className="h-5 w-5" /></Button>
                <div className="w-px h-6 bg-white/10 mx-1" />
                <Button variant="ghost" size="icon" onClick={onNext} disabled={!onNext} className="h-10 w-10 rounded-xl hover:bg-white/10 text-white/40 hover:text-white"><ChevronRight className="h-5 w-5" /></Button>
              </div>
              <button onClick={() => onOpenChange(false)} className="h-12 w-12 flex items-center justify-center bg-white/5 rounded-2xl text-white/40 hover:text-white hover:bg-white/10 transition-all"><X className="h-6 w-6" /></button>
            </div>
          </div>

          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
            {/* Left Pane: Technical Data Register */}
            <ScrollArea className="lg:col-span-7 bg-black border-r border-white/5">
              <div className="pb-32">
                <div className="px-8 pt-8 pb-4">
                  <Badge 
                    variant="outline" 
                    className="h-8 px-4 text-[10px] font-black uppercase tracking-widest rounded-full border-2 bg-white/5"
                    style={{ borderColor: `${record.accentColor}40`, color: record.accentColor }}
                  >
                    <Database className="h-3.5 w-3.5 mr-2" /> {record.sourceSheet || 'REGISTRY AUTHORITY'}
                  </Badge>
                </div>

                <div className="bg-white/[0.01]">
                  {record.fields.map((field, idx) => {
                    const header = record.headers.find(h => h.id === field.headerId);
                    return (
                      <FullViewField 
                        key={field.headerId} 
                        label={header?.displayName || 'Technical Parameter'} 
                        value={field.displayValue} 
                        isLast={idx === record.fields.length - 1}
                      />
                    );
                  })}
                </div>

                <div className="p-8 border-t border-dashed border-white/10 mt-10 space-y-6 bg-white/[0.02]">
                  <div className="flex items-center gap-3 opacity-20">
                    <Tag className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">System Traceability Pulse</span>
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-1">
                      <span className="text-[8px] font-black uppercase text-white/40 tracking-widest">Internal UUID</span>
                      <p className="font-mono text-[10px] font-bold text-white/60">{record.id}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[8px] font-black uppercase text-white/40 tracking-widest">Registry Row</span>
                      <p className="font-mono text-[10px] font-bold text-white/60"># {record.sourceRow || 'Manual'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Right Pane: Fidelity Checklist */}
            <ScrollArea className="lg:col-span-5 bg-[#050505] p-10">
              <div className="space-y-10">
                <div className="flex items-center gap-4 text-primary">
                  <ClipboardCheck className="h-6 w-6" />
                  <h4 className="text-sm font-black uppercase tracking-widest">Fidelity Audit Pulse</h4>
                </div>
                <AssetChecklist values={record.rawRow as any} />
                
                <div className="p-8 rounded-[2rem] bg-primary/5 border-2 border-dashed border-primary/20 space-y-4">
                  <p className="text-[10px] font-black uppercase text-primary tracking-widest">Auditor Hint</p>
                  <p className="text-xs font-medium text-white/60 italic leading-relaxed">
                    Ensure all required fields are populated before committing the physical verification pulse. High-fidelity records improve regional reporting accuracy.
                  </p>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Footer Controls */}
          <div className="p-8 bg-black/80 backdrop-blur-3xl border-t border-white/5 flex flex-row items-center gap-4 shrink-0">
            <Button 
              variant="ghost" 
              onClick={() => onOpenChange(false)}
              className="flex-1 h-16 font-black uppercase text-xs tracking-widest rounded-[1.5rem] bg-white/5 hover:bg-white/10 text-white"
            >
              Close Profile
            </Button>
            <Button 
              onClick={() => onEdit(record.id)}
              className="flex-1 h-16 rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/30 bg-primary text-black transition-transform hover:scale-105 active:scale-95 gap-3"
            >
              <Edit3 className="h-5 w-5" /> Audit Record Pulse
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
'use client';

/**
 * @fileOverview TagPrintDialog - Professional Asset Label Generator.
 * Phase 54: High-fidelity bulk tag printing with QR identity pulses.
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Printer, 
  Tag, 
  X,
  ShieldCheck,
  Info
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AssetRecord } from '@/types/registry';

interface TagPrintDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  records: AssetRecord[];
}

export function TagPrintDialog({ isOpen, onOpenChange, records }: TagPrintDialogProps) {
  const [tagSize, setTagSize] = useState<'sm' | 'md' | 'lg'>('md');

  const handlePrintPulse = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 border-primary/10 rounded-3xl overflow-hidden shadow-2xl bg-background print:bg-white print:h-auto print:max-w-none print:shadow-none print:border-none print:static">
        {/* Header - Hidden during print */}
        <div className="p-8 pb-4 bg-muted/20 border-b print:hidden">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Printer className="text-primary h-8 w-8" />
                </div>
                <DialogTitle className="text-3xl font-black tracking-tight uppercase">Tag Print Station</DialogTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className={cn("h-9 px-4 rounded-xl font-black text-[9px] uppercase tracking-widest border-2", tagSize === 'sm' && "bg-primary text-white border-primary")} onClick={() => setTagSize('sm')}>Small</Button>
                <Button variant="outline" size="sm" className={cn("h-9 px-4 rounded-xl font-black text-[9px] uppercase tracking-widest border-2", tagSize === 'md' && "bg-primary text-white border-primary")} onClick={() => setTagSize('md')}>Standard</Button>
                <Button variant="outline" size="sm" className={cn("h-9 px-4 rounded-xl font-black text-[9px] uppercase tracking-widest border-2", tagSize === 'lg' && "bg-primary text-white border-primary")} onClick={() => setTagSize('lg')}>Large</Button>
              </div>
            </div>
            <DialogDescription className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground opacity-70 mt-2">
              Generating {records.length} high-fidelity physical asset identity pulses.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Tag Canvas */}
        <ScrollArea className="flex-1 bg-muted/5 p-8 print:p-0 print:bg-white">
          <div className={cn(
            "grid gap-6 print:gap-4 print:grid-cols-2",
            tagSize === 'sm' ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4" : 
            tagSize === 'md' ? "grid-cols-1 sm:grid-cols-2" : 
            "grid-cols-1"
          )}>
            {records.map((record) => (
              <div 
                key={record.id} 
                className={cn(
                  "bg-white border-2 border-border/60 rounded-2xl p-6 shadow-sm flex gap-6 relative overflow-hidden transition-all hover:border-primary/40 group print:shadow-none print:border-2 print:border-black print:rounded-none print:m-0",
                  tagSize === 'sm' && "p-4 flex-col gap-3",
                  tagSize === 'lg' && "p-8"
                )}
              >
                {/* Brand Pulse on Tag */}
                <div className="absolute top-0 right-0 p-2 opacity-5 print:opacity-10">
                  <ShieldCheck className="h-12 w-12 text-primary" />
                </div>

                {/* QR Pulse - Zero Dependency API */}
                <div className="shrink-0 flex items-center justify-center bg-muted/10 rounded-xl p-2 print:p-0 border-2 border-dashed border-border/40 print:border-none">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${record.id}`} 
                    alt="Asset QR Pulse"
                    className={cn(
                      "mix-blend-multiply transition-transform group-hover:scale-105",
                      tagSize === 'sm' ? "h-16 w-16" : "h-24 w-24"
                    )}
                  />
                </div>

                <div className="flex-1 space-y-3 min-w-0">
                  <div className="space-y-1">
                    <Badge variant="outline" className="h-5 px-2 text-[7px] font-black uppercase border-primary/20 bg-primary/5 text-primary print:border-black print:text-black">
                      {record.sourceSheet || 'REGISTRY PULSE'}
                    </Badge>
                    <h4 className={cn(
                      "font-black uppercase tracking-tight text-foreground line-clamp-2 leading-none",
                      tagSize === 'sm' ? "text-[10px]" : "text-sm"
                    )}>
                      {String(record.rawRow.description || 'Untitled Asset')}
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 border-t border-dashed">
                    <div className="space-y-0.5">
                      <span className="text-[7px] font-black uppercase text-muted-foreground opacity-60">Tag ID</span>
                      <p className="text-[9px] font-black text-primary truncate print:text-black">{record.sn || String(record.id).split('-')[0]}</p>
                    </div>
                    <div className="space-y-0.5 text-right">
                      <span className="text-[7px] font-black uppercase text-muted-foreground opacity-60">Status</span>
                      <p className="text-[9px] font-black uppercase text-green-600 print:text-black">Verified</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Footer - Hidden during print */}
        <div className="p-8 bg-muted/20 border-t flex items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase italic max-w-sm">
            <Info className="h-4 w-4 text-primary shrink-0" />
            <p>Ensure your printer is set to &quot;Background Graphics&quot; and &quot;High Resolution&quot; for deterministic tag pulses.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="font-bold rounded-xl px-8">
              Discard Pulse
            </Button>
            <Button 
              onClick={handlePrintPulse}
              className="h-14 px-10 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 gap-3 transition-transform hover:scale-105 active:scale-95 bg-primary text-primary-foreground"
            >
              <Printer className="h-4 w-4" /> Execute Print Pulse
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

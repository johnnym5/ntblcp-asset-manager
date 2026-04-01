/**
 * @fileOverview AssetDetailSheet - High-Fidelity "Full View" Workstation.
 * Phase 125: Overhauled to match the professional stacked field aesthetic.
 */

import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ChevronLeft, 
  ChevronRight, 
  Edit3, 
  Share2, 
  Database,
  Tag,
  MapPin,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssetRecord } from '@/types/registry';

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
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0 border-none rounded-l-[2.5rem] shadow-2xl bg-background overflow-hidden">
        {/* Command Strip */}
        <SheetHeader className="p-0 space-y-0">
          <div className="flex items-center justify-between p-6 border-b bg-background/80 backdrop-blur-md z-30">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-xl h-12 w-12 bg-muted/20">
                <X className="h-6 w-6" />
              </Button>
              <div className="flex flex-col">
                <SheetTitle className="text-xl font-black tracking-tighter uppercase leading-none truncate max-w-[240px]">
                  Full Asset Pulse
                </SheetTitle>
                <SheetDescription className="text-[9px] font-black uppercase text-primary tracking-[0.3em] mt-1.5">
                  Fidelity Analysis & Forensic Record
                </SheetDescription>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-muted/50 rounded-2xl p-1.5 border border-border/40">
                <Button variant="ghost" size="icon" onClick={onPrevious} disabled={!onPrevious} className="h-10 w-10 rounded-xl"><ChevronLeft className="h-5 w-5" /></Button>
                <div className="w-px h-6 bg-border/40 mx-1" />
                <Button variant="ghost" size="icon" onClick={onNext} disabled={!onNext} className="h-10 w-10 rounded-xl"><ChevronRight className="h-5 w-5" /></Button>
              </div>
              <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl border-2"><Share2 className="h-5 w-5" /></Button>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 bg-background custom-scrollbar">
          <div className="pb-40">
            {/* Source Identity Badge */}
            <div className="px-6 pt-8 pb-4">
              <Badge 
                variant="outline" 
                className="h-8 px-4 text-[10px] font-black uppercase tracking-widest rounded-full border-2"
                style={{ borderColor: `${record.accentColor}40`, backgroundColor: `${record.accentColor}10`, color: record.accentColor }}
              >
                <Database className="h-3.5 w-3.5 mr-2" /> {record.sourceSheet || 'REGISTRY AUTHORITY'}
              </Badge>
            </div>

            {/* Structured "Full View" Field Stack */}
            <div className="bg-card/30">
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

            {/* Audit Metadata Pulse */}
            <div className="p-8 border-t border-dashed mt-10 space-y-6 bg-muted/5">
              <div className="flex items-center gap-3 opacity-40">
                <Tag className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">System Traceability Pulse</span>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <span className="text-[8px] font-black uppercase text-muted-foreground">Internal UUID</span>
                  <p className="font-mono text-[10px] font-bold">{record.id}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] font-black uppercase text-muted-foreground">Registry Row</span>
                  <p className="font-mono text-[10px] font-bold"># {record.sourceRow || 'Manual'}</p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="p-8 bg-background/80 backdrop-blur-xl border-t flex flex-row items-center gap-4 absolute bottom-0 left-0 right-0 z-40">
          <SheetClose asChild>
            <Button variant="ghost" className="flex-1 h-16 font-black uppercase text-xs tracking-widest rounded-[1.5rem]">Close Profile</Button>
          </SheetClose>
          <Button 
            onClick={() => onEdit(record.id)}
            className="flex-1 h-16 rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/30 bg-primary text-primary-foreground gap-3 transition-transform hover:scale-105 active:scale-95"
          >
            <Edit3 className="h-5 w-5" /> Audit Record Pulse
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

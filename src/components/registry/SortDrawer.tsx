
"use client";

/**
 * @fileOverview SortDrawer - Registry Ordering Workstation.
 */

import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowUpDown, ArrowUp, ArrowDown, X, Layers } from 'lucide-react';
import type { RegistryHeader } from '@/types/registry';
import { cn } from '@/lib/utils';

interface SortDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  headers: RegistryHeader[];
  sortBy?: string;
  sortDirection: 'asc' | 'desc';
  onUpdateSort: (headerId: string, direction: 'asc' | 'desc') => void;
}

export function SortDrawer({ isOpen, onOpenChange, headers, sortBy, sortDirection, onUpdateSort }: SortDrawerProps) {
  const activeHeaders = headers.filter(h => h.sortEnabled);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-sm flex flex-col p-0 border-primary/10 rounded-l-[2rem] shadow-2xl bg-background overflow-hidden">
        <div className="p-8 pb-4 bg-muted/20 border-b">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-3 text-3xl font-black tracking-tight uppercase">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <ArrowUpDown className="text-primary h-6 w-6" />
                </div>
                Sort Pulse
              </SheetTitle>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-xl">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <SheetDescription className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground opacity-70">
              Define the sequence of the registry pulse.
            </SheetDescription>
          </SheetHeader>
        </div>

        <ScrollArea className="flex-1 bg-background">
          <div className="p-6 space-y-2">
            {activeHeaders.map((header) => (
              <div 
                key={`sort-${header.id}`}
                className={cn(
                  "p-4 rounded-2xl border-2 transition-all flex items-center justify-between group cursor-pointer",
                  sortBy === header.id ? "bg-primary/5 border-primary shadow-sm" : "border-border/40 hover:border-primary/20"
                )}
                onClick={() => onUpdateSort(header.id, sortBy === header.id && sortDirection === 'asc' ? 'desc' : 'asc')}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-black uppercase tracking-tight">{header.displayName}</span>
                  <span className="text-[8px] font-bold text-muted-foreground uppercase opacity-40">Field Order</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {sortBy === header.id && (
                    <div className="p-2 bg-primary rounded-xl text-white">
                      {sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <SheetFooter className="p-8 bg-muted/20 border-t">
          <SheetClose asChild>
            <Button className="w-full h-12 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 bg-primary text-primary-foreground">
              Close Order Pulse
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

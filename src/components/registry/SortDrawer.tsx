"use client";

/**
 * @fileOverview High-Fidelity Sort Sequence Engine.
 * Phase 102: Redesigned to match the dark high-fidelity workstation theme.
 * Phase 103: Converted to centered Dialog pop-up window.
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react';
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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md h-[70vh] flex flex-col p-0 border-none bg-black text-white shadow-3xl overflow-hidden rounded-[2.5rem]">
        <div className="p-10 pb-6 border-b border-white/5 space-y-4">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-black uppercase tracking-tight text-white">Sort Sequence</DialogTitle>
            </div>
            <DialogDescription className="text-sm font-medium text-white/40 leading-relaxed italic">
              Define the primary sequence pulse for the current project registry.
            </DialogDescription>
          </DialogHeader>
        </div>

        <ScrollArea className="flex-1 bg-black">
          <div className="p-8 space-y-3">
            {activeHeaders.map((header) => {
              const isActive = sortBy === header.id;
              return (
                <button 
                  key={`sort-${header.id}`}
                  onClick={() => onUpdateSort(header.id, isActive && sortDirection === 'asc' ? 'desc' : 'asc')}
                  className={cn(
                    "w-full p-6 rounded-[1.5rem] border-2 transition-all flex items-center justify-between group",
                    isActive ? "bg-primary border-primary text-black" : "bg-[#0A0A0A] border-white/5 hover:border-white/20"
                  )}
                >
                  <div className="flex flex-col text-left">
                    <span className={cn(
                      "text-[11px] font-black uppercase tracking-widest",
                      isActive ? "text-black" : "text-white"
                    )}>
                      {header.displayName}
                    </span>
                    <span className={cn(
                      "text-[8px] font-bold uppercase opacity-40",
                      isActive ? "text-black/60" : "text-white/40"
                    )}>
                      {isActive ? `Ordering: ${sortDirection.toUpperCase()}` : 'Sortable Field'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {isActive ? (
                      <div className="p-2 bg-black/20 rounded-xl">
                        {sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                      </div>
                    ) : (
                      <div className="p-2 bg-white/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowUpDown className="h-4 w-4 text-white/40" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="p-10 bg-[#050505] border-t border-white/5">
          <Button 
            onClick={() => onOpenChange(false)}
            className="w-full h-14 rounded-2xl bg-primary text-black font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl shadow-primary/20 transition-transform hover:scale-105 active:scale-95"
          >
            Confirm Sort Pulse
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

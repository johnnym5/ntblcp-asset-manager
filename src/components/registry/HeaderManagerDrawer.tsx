"use client";

/**
 * @fileOverview HeaderManagerDrawer - Schema Orchestration UI.
 * Allows users to reorder, rename, and toggle registry headers.
 */

import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Columns, GripVertical, Eye, EyeOff, Edit3, RotateCcw, X, Search } from 'lucide-react';
import type { RegistryHeader } from '@/types/registry';
import { cn } from '@/lib/utils';

interface HeaderManagerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  headers: RegistryHeader[];
  onUpdateHeaders: (headers: RegistryHeader[]) => void;
  onReset: () => void;
}

export function HeaderManagerDrawer({ isOpen, onOpenChange, headers, onUpdateHeaders, onReset }: HeaderManagerProps) {
  const [search, setSearch] = useState("");

  const filteredHeaders = headers.filter(h => 
    h.displayName.toLowerCase().includes(search.toLowerCase()) || 
    h.rawName.toLowerCase().includes(search.toLowerCase())
  );

  const toggleVisibility = (id: string) => {
    onUpdateHeaders(headers.map(h => h.id === id ? { ...h, visible: !h.visible } : h));
  };

  const renameHeader = (id: string, newName: string) => {
    onUpdateHeaders(headers.map(h => h.id === id ? { ...h, displayName: newName } : h));
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 border-primary/10 rounded-l-[2rem] shadow-2xl bg-background overflow-hidden">
        <div className="p-8 pb-4 bg-muted/20 border-b">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-3 text-3xl font-black tracking-tight uppercase">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Columns className="text-primary h-6 w-6" />
                </div>
                Field Orchestrator
              </SheetTitle>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-xl">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <SheetDescription className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground opacity-70">
              Configure visibility and display labels for the registry workstation.
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="px-8 py-4 bg-muted/10 border-b">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground opacity-40 group-focus-within:text-primary transition-all" />
            <Input 
              placeholder="Search fields..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-xl bg-background border-none shadow-inner text-xs font-bold"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 bg-background">
          <div className="p-6 space-y-2">
            {filteredHeaders.map((header) => (
              <div 
                key={header.id}
                className={cn(
                  "p-4 rounded-2xl border-2 transition-all flex items-center justify-between group",
                  header.visible ? "bg-card border-border/40 hover:border-primary/20" : "bg-muted/30 border-transparent opacity-60"
                )}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="cursor-grab opacity-20 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <Input 
                      value={header.displayName}
                      onChange={(e) => renameHeader(header.id, e.target.value)}
                      className="border-none bg-transparent p-0 h-auto font-black text-sm uppercase tracking-tight focus-visible:ring-0 shadow-none"
                      disabled={!header.editable}
                    />
                    <div className="text-[8px] font-mono font-bold text-muted-foreground uppercase opacity-40">Source: {header.rawName}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={header.visible} 
                    onCheckedChange={() => toggleVisibility(header.id)}
                    disabled={header.locked}
                  />
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <SheetFooter className="p-8 bg-muted/20 border-t flex flex-row items-center gap-3">
          <Button 
            variant="ghost" 
            onClick={onReset}
            className="flex-1 h-12 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-destructive/10 hover:text-destructive transition-all"
          >
            <RotateCcw className="mr-2 h-3.5 w-3.5" /> Reset Template
          </Button>
          <SheetClose asChild>
            <Button className="flex-1 h-12 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 bg-primary text-primary-foreground">
              Apply Layout
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

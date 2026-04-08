'use client';

/**
 * @fileOverview FilterDrawer - High-Fidelity Logic Engine.
 * Phase 155: Enhanced with Empty State and Value Discovery logging.
 * Phase 156: Converted to centered Dialog pop-up window.
 */

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ListFilter, Search, X, Check, Database } from 'lucide-react';
import type { RegistryHeader, HeaderFilter } from '@/types/registry';
import { cn } from '@/lib/utils';
import { Checkbox } from '../ui/checkbox';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FilterDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  headers: RegistryHeader[];
  activeFilters: HeaderFilter[];
  onUpdateFilters: (filters: HeaderFilter[]) => void;
  optionsMap: Record<string, string[]>;
}

export function FilterDrawer({ isOpen, onOpenChange, headers, activeFilters, onUpdateFilters, optionsMap }: FilterDrawerProps) {
  const [localFilters, setLocalFilters] = useState<HeaderFilter[]>(activeFilters);
  const [headerSearch, setHeaderSearch] = useState("");

  const sortableHeaders = useMemo(() => 
    headers.filter(h => h.sortEnabled && h.displayName.toLowerCase().includes(headerSearch.toLowerCase())),
    [headers, headerSearch]
  );

  const handleToggleValue = (headerId: string, value: string) => {
    const existing = localFilters.find(f => f.headerId === headerId);
    const currentValues = (existing?.value as string[]) || [];
    const nextValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];

    if (nextValues.length === 0) {
      setLocalFilters(localFilters.filter(f => f.headerId !== headerId));
    } else {
      if (existing) {
        setLocalFilters(localFilters.map(f => f.headerId === headerId ? { ...f, value: nextValues, operator: 'in' } : f));
      } else {
        setLocalFilters([...localFilters, { headerId, operator: 'in', value: nextValues }]);
      }
    }
  };

  const clearFilter = (headerId: string) => {
    setLocalFilters(localFilters.filter(f => f.headerId !== headerId));
  };

  const applyFilters = () => {
    onUpdateFilters(localFilters);
    onOpenChange(false);
  };

  const hasAnyOptions = useMemo(() => 
    Object.values(optionsMap).some(opts => opts.length > 0), 
    [optionsMap]
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (open) setLocalFilters(activeFilters); onOpenChange(open); }}>
      <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0 border-none rounded-[2.5rem] shadow-3xl bg-background overflow-hidden">
        <div className="p-8 pb-4 bg-muted/20 border-b">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-3 text-3xl font-black tracking-tight uppercase text-white">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <ListFilter className="text-primary h-6 w-6" />
                </div>
                Logic Engine
              </DialogTitle>
            </div>
            <DialogDescription className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground opacity-70 mt-2">
              Multi-select criteria for all registry dimensions.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-8 py-6 bg-muted/5 border-b">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40 group-focus-within:text-primary transition-all" />
            <Input 
              placeholder="Find filter category..." 
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              className="pl-10 h-12 rounded-2xl bg-background border-none shadow-inner text-sm font-medium focus-visible:ring-primary/20 text-white"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 bg-background custom-scrollbar">
          <div className="p-8 pt-4 pb-32">
            {!hasAnyOptions ? (
              <div className="py-24 text-center opacity-20 flex flex-col items-center gap-6 border-4 border-dashed border-white/5 rounded-[3rem]">
                <Database className="h-16 w-16 text-white" />
                <div className="space-y-1">
                  <h4 className="text-xl font-black uppercase text-white">Registry Pulse Silent</h4>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Import data to discover filter pulses.</p>
                </div>
              </div>
            ) : (
              <Accordion type="multiple" className="space-y-4">
                {sortableHeaders.map((header) => {
                  const filter = localFilters.find(f => f.headerId === header.id);
                  const selected = (filter?.value as string[]) || [];
                  const options = optionsMap[header.id] || [];
                  
                  if (options.length === 0) return null;

                  return (
                    <AccordionItem 
                      key={header.id} 
                      value={header.id} 
                      className="border-2 border-border/40 rounded-[2rem] bg-card/50 overflow-hidden px-6 transition-all data-[state=open]:border-primary/20 data-[state=open]:shadow-lg"
                    >
                      <AccordionTrigger className="hover:no-underline py-6">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex flex-col items-start gap-1">
                            <span className="text-xs font-black uppercase tracking-widest text-white">{header.displayName}</span>
                            {selected.length > 0 && (
                              <span className="text-[9px] font-black text-primary uppercase tracking-tighter">
                                {selected.length} values selected
                              </span>
                            )}
                          </div>
                          {selected.length > 0 && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={(e) => { e.stopPropagation(); clearFilter(header.id); }}
                              className="h-7 px-2 text-[8px] font-black uppercase hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-6 pt-2">
                        <div className="space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                          {options.map(opt => (
                            <div 
                              key={opt}
                              onClick={() => handleToggleValue(header.id, opt)}
                              className="flex items-center justify-between p-3 rounded-xl cursor-pointer hover:bg-primary/5 transition-all group"
                            >
                              <div className="flex items-center gap-3">
                                <Checkbox 
                                  checked={selected.includes(opt)}
                                  onCheckedChange={() => handleToggleValue(header.id, opt)}
                                  className="h-4 w-4 rounded border-2 border-white/10"
                                />
                                <span className={cn(
                                  "text-[10px] font-bold uppercase truncate max-w-[220px]",
                                  selected.includes(opt) ? "text-primary" : "text-white/40 group-hover:text-white/80"
                                )}>
                                  {opt}
                                </span>
                              </div>
                              {selected.includes(opt) && <Check className="h-3.5 w-3.5 text-primary" />}
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-8 bg-muted/20 border-t flex flex-row items-center gap-3">
          <Button 
            variant="ghost" 
            onClick={() => setLocalFilters([])}
            className="flex-1 h-14 font-black uppercase text-[10px] tracking-widest rounded-2xl text-white/40 hover:bg-destructive/10 hover:text-destructive transition-all"
          >
            <X className="mr-2 h-3.5 w-3.5" /> Purge Logic
          </Button>
          <Button 
            onClick={applyFilters}
            className="flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 bg-primary text-black"
          >
            Apply Filter Pulse
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

'use client';

/**
 * @fileOverview Semantic Filter Engine.
 * Supports hierarchical provenance filtering (Section, Subsection).
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Filter, X, Layers, LayoutGrid, MapPin, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Label } from './ui/label';
import { Badge } from './ui/badge';

export interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

interface AssetFilterDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  
  // Scoped Data for Options
  sections: FilterOption[];
  subsections: FilterOption[];
  locations: FilterOption[];
  statuses: FilterOption[];

  // State Management
  filters: {
    sections: string[];
    subsections: string[];
    locations: string[];
    statuses: string[];
  };
  setFilters: (filters: any) => void;
  onReset: () => void;
}

const FilterSection = ({ 
  title, 
  options, 
  selected, 
  onToggle, 
  icon 
}: { 
  title: string; 
  options: FilterOption[]; 
  selected: string[]; 
  onToggle: (val: string) => void;
  icon?: React.ReactNode;
}) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between px-1">
      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
        {icon} {title}
      </Label>
      {selected.length > 0 && <Badge className="bg-primary h-4 px-1.5 text-[8px] font-black uppercase">{selected.length}</Badge>}
    </div>
    <div className="rounded-2xl border-2 border-border/40 overflow-hidden bg-muted/5">
      <ScrollArea className="h-[140px]">
        <div className="p-2 space-y-0.5">
          {options.length > 0 ? (
            options.map((opt) => (
              <div
                key={opt.value}
                onClick={() => onToggle(opt.value)}
                className={cn(
                  "relative flex cursor-pointer select-none items-center rounded-xl px-3 py-2 text-xs font-bold transition-all",
                  selected.includes(opt.value) ? "bg-primary/10 text-primary" : "hover:bg-primary/5 text-muted-foreground"
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-md border-2",
                      selected.includes(opt.value) ? "bg-primary border-primary text-white" : "border-muted-foreground/30"
                    )}>
                      {selected.includes(opt.value) && <Check className="h-3 w-3" />}
                    </div>
                    <span className="truncate max-w-[180px]">{opt.label}</span>
                  </div>
                  {opt.count !== undefined && <span className="text-[10px] font-mono opacity-40">{opt.count}</span>}
                </div>
              </div>
            ))
          ) : (
            <div className="py-10 text-center text-[10px] font-bold uppercase tracking-widest opacity-20 italic">No Data</div>
          )}
        </div>
      </ScrollArea>
    </div>
  </div>
);

export function AssetFilterDialog({
  isOpen,
  onOpenChange,
  sections,
  subsections,
  locations,
  statuses,
  filters,
  setFilters,
  onReset
}: AssetFilterDialogProps) {
  
  const toggleFilter = (key: keyof typeof filters, value: string) => {
    const current = filters[key];
    const next = current.includes(value) 
      ? current.filter(v => v !== value)
      : [...current, value];
    setFilters({ ...filters, [key]: next });
  };

  const activeCount = Object.values(filters).flat().length;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl flex flex-col h-[90vh] p-0 border-primary/10 rounded-3xl overflow-hidden shadow-2xl bg-background/95 backdrop-blur-xl">
        <div className="p-8 pb-4 bg-muted/20 border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-3xl font-black tracking-tight">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Filter className="text-primary h-6 w-6" />
              </div>
              Semantic Filter Engine
            </DialogTitle>
            <DialogDescription className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground opacity-70">
              Precision query refinement across project hierarchical metadata.
            </DialogDescription>
          </DialogHeader>
        </div>

        <ScrollArea className="flex-1 bg-background">
          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FilterSection
                title="Provenances (Sections)"
                options={sections}
                selected={filters.sections}
                onToggle={(v) => toggleFilter('sections', v)}
                icon={<LayoutGrid className="h-3.5 w-3.5" />}
              />
              <FilterSection
                title="Temporal Batches (Subsections)"
                options={subsections}
                selected={filters.subsections}
                onToggle={(v) => toggleFilter('subsections', v)}
                icon={<Layers className="h-3.5 w-3.5" />}
              />
            </div>

            <Separator className="opacity-50" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FilterSection
                title="Regional Scope"
                options={locations}
                selected={filters.locations}
                onToggle={(v) => toggleFilter('locations', v)}
                icon={<MapPin className="h-3.5 w-3.5" />}
              />
              <FilterSection
                title="Registry Status"
                options={statuses}
                selected={filters.statuses}
                onToggle={(v) => toggleFilter('statuses', v)}
                icon={<Activity className="h-3.5 w-3.5" />}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-8 bg-muted/20 border-t sm:justify-between items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={onReset} 
            disabled={activeCount === 0} 
            className="font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="mr-2 h-3.5 w-3.5" /> Reset Engine
          </Button>
          <div className="flex items-center gap-3">
            <DialogClose asChild>
              <Button variant="ghost" className="font-bold text-xs rounded-xl">Discard</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button className="h-12 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20">
                Apply Logic Pulse
              </Button>
            </DialogClose>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
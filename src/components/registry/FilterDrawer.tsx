
"use client";

/**
 * @fileOverview FilterDrawer - Multi-Operator Registry Filter Engine.
 * Supports text, numeric range, and date range filtering based on header data types.
 */

import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Filter, Plus, Trash2, X, Calendar, Hash, Type } from 'lucide-react';
import type { RegistryHeader, HeaderFilter } from '@/types/registry';
import { cn } from '@/lib/utils';

interface FilterDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  headers: RegistryHeader[];
  activeFilters: HeaderFilter[];
  onUpdateFilters: (filters: HeaderFilter[]) => void;
}

export function FilterDrawer({ isOpen, onOpenChange, headers, activeFilters, onUpdateFilters }: FilterDrawerProps) {
  const [localFilters, setLocalFilters] = useState<HeaderFilter[]>(activeFilters);

  const addFilter = () => {
    const firstHeader = headers.find(h => h.filterable) || headers[0];
    const newFilter: HeaderFilter = {
      headerId: firstHeader.id,
      operator: 'contains',
      value: ''
    };
    setLocalFilters([...localFilters, newFilter]);
  };

  const removeFilter = (index: number) => {
    setLocalFilters(localFilters.filter((_, i) => i !== index));
  };

  const updateFilter = (index: number, updates: Partial<HeaderFilter>) => {
    const next = [...localFilters];
    next[index] = { ...next[index], ...updates };
    setLocalFilters(next);
  };

  const applyFilters = () => {
    onUpdateFilters(localFilters);
    onOpenChange(false);
  };

  const getOperatorsForType = (dataType: string) => {
    switch (dataType) {
      case 'number':
      case 'currency':
        return [
          { label: 'Equals', value: 'equals' },
          { label: 'In Range', value: 'range' },
          { label: 'Exists', value: 'exists' }
        ];
      case 'date':
        return [
          { label: 'On Date', value: 'equals' },
          { label: 'Date Range', value: 'dateRange' },
          { label: 'Exists', value: 'exists' }
        ];
      default:
        return [
          { label: 'Contains', value: 'contains' },
          { label: 'Exactly', value: 'equals' },
          { label: 'Starts With', value: 'startsWith' },
          { label: 'Ends With', value: 'endsWith' },
          { label: 'Exists', value: 'exists' }
        ];
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (open) setLocalFilters(activeFilters); onOpenChange(open); }}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0 border-primary/10 rounded-l-[2rem] shadow-2xl bg-background overflow-hidden">
        <div className="p-8 pb-4 bg-muted/20 border-b">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-3 text-3xl font-black tracking-tight uppercase">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Filter className="text-primary h-6 w-6" />
                </div>
                Filter Engine
              </SheetTitle>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-xl">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <SheetDescription className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground opacity-70">
              Apply granular logic pulses to isolate specific registry records.
            </SheetDescription>
          </SheetHeader>
        </div>

        <ScrollArea className="flex-1 bg-background">
          <div className="p-6 space-y-4">
            {localFilters.length > 0 ? (
              localFilters.map((filter, idx) => {
                const header = headers.find(h => h.id === filter.headerId);
                const operators = getOperatorsForType(header?.dataType || 'text');

                return (
                  <div key={`filter-${idx}`} className="p-5 rounded-3xl border-2 border-border/40 bg-card/50 space-y-4 relative group">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeFilter(idx)}
                      className="absolute top-2 right-2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase tracking-widest opacity-40">Field</Label>
                        <Select value={filter.headerId} onValueChange={(v) => updateFilter(idx, { headerId: v })}>
                          <SelectTrigger className="h-10 rounded-xl border-2 bg-background font-bold text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {headers.filter(h => h.filterable).map(h => (
                              <SelectItem key={h.id} value={h.id} className="text-xs font-bold">{h.displayName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase tracking-widest opacity-40">Logic</Label>
                        <Select value={filter.operator} onValueChange={(v) => updateFilter(idx, { operator: v as any })}>
                          <SelectTrigger className="h-10 rounded-xl border-2 bg-background font-bold text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {operators.map(op => (
                              <SelectItem key={op.value} value={op.value} className="text-xs font-bold">{op.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {filter.operator !== 'exists' && (
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase tracking-widest opacity-40">Value Pulse</Label>
                        {filter.operator === 'range' ? (
                          <div className="flex items-center gap-2">
                            <Input 
                              type="number" 
                              placeholder="Min" 
                              value={filter.min || ''} 
                              onChange={(e) => updateFilter(idx, { min: parseFloat(e.target.value) })}
                              className="h-10 rounded-xl border-2 bg-background font-bold text-xs" 
                            />
                            <span className="text-muted-foreground opacity-40">to</span>
                            <Input 
                              type="number" 
                              placeholder="Max" 
                              value={filter.max || ''} 
                              onChange={(e) => updateFilter(idx, { max: parseFloat(e.target.value) })}
                              className="h-10 rounded-xl border-2 bg-background font-bold text-xs" 
                            />
                          </div>
                        ) : filter.operator === 'dateRange' ? (
                          <div className="flex items-center gap-2">
                            <Input 
                              type="date" 
                              value={filter.startDate || ''} 
                              onChange={(e) => updateFilter(idx, { startDate: e.target.value })}
                              className="h-10 rounded-xl border-2 bg-background font-bold text-xs" 
                            />
                            <Input 
                              type="date" 
                              value={filter.endDate || ''} 
                              onChange={(e) => updateFilter(idx, { endDate: e.target.value })}
                              className="h-10 rounded-xl border-2 bg-background font-bold text-xs" 
                            />
                          </div>
                        ) : (
                          <Input 
                            value={String(filter.value || '')} 
                            onChange={(e) => updateFilter(idx, { value: e.target.value })}
                            placeholder="Enter matching text..."
                            className="h-10 rounded-xl border-2 bg-background font-bold text-xs" 
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="py-20 flex flex-col items-center justify-center text-center opacity-20 border-4 border-dashed rounded-[2.5rem] space-y-4">
                <Filter className="h-16 w-16" />
                <div className="space-y-1">
                  <h4 className="text-sm font-black uppercase tracking-[0.2em]">Zero Active Logic</h4>
                  <p className="text-[10px] font-bold uppercase tracking-widest">Click below to inject a filter pulse.</p>
                </div>
              </div>
            )}

            <Button 
              variant="outline" 
              onClick={addFilter}
              className="w-full h-14 rounded-2xl border-2 border-dashed border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all font-black uppercase text-[10px] tracking-widest gap-2"
            >
              <Plus className="h-4 w-4" /> Add Logic Filter
            </Button>
          </div>
        </ScrollArea>

        <SheetFooter className="p-8 bg-muted/20 border-t flex flex-row items-center gap-3">
          <Button 
            variant="ghost" 
            onClick={() => setLocalFilters([])}
            className="flex-1 h-12 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-destructive/10 hover:text-destructive transition-all"
          >
            Clear All
          </Button>
          <Button 
            onClick={applyFilters}
            className="flex-1 h-12 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 bg-primary text-primary-foreground"
          >
            Apply Engine Pulse
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

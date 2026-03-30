/**
 * @fileOverview FilterDrawer - Decentralized Hierarchical Filter Engine.
 * Phase 22: Promotes Sheet, Section, and Subsection filters to primary status.
 */

import React, { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Filter, Plus, Trash2, X, Database, Layers, LayoutGrid } from 'lucide-react';
import type { RegistryHeader, HeaderFilter } from '@/types/registry';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';

interface FilterDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  headers: RegistryHeader[];
  activeFilters: HeaderFilter[];
  onUpdateFilters: (filters: HeaderFilter[]) => void;
}

export function FilterDrawer({ isOpen, onOpenChange, headers, activeFilters, onUpdateFilters }: FilterDrawerProps) {
  const [localFilters, setLocalFilters] = useState<HeaderFilter[]>(activeFilters);

  // Hierarchy aware headers for promotion
  const hierarchyHeaders = headers.filter(h => ['source_sheet', 'section_name', 'subsection_name'].includes(h.normalizedName));
  const dataHeaders = headers.filter(h => !['source_sheet', 'section_name', 'subsection_name'].includes(h.normalizedName));

  const addFilter = (headerId?: string) => {
    const targetHeader = headerId ? headers.find(h => h.id === headerId) : headers.find(h => h.filterable);
    if (!targetHeader) return;

    const newFilter: HeaderFilter = {
      headerId: targetHeader.id,
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
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0 border-none rounded-l-[2.5rem] shadow-2xl bg-background overflow-hidden">
        <div className="p-8 pb-4 bg-muted/20 border-b">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-3 text-3xl font-black tracking-tight uppercase">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Filter className="text-primary h-6 w-6" />
                </div>
                Logic Engine
              </SheetTitle>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-xl">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <SheetDescription className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground opacity-70">
              Query records across hierarchical source boundaries and technical metadata.
            </SheetDescription>
          </SheetHeader>
        </div>

        <ScrollArea className="flex-1 bg-background custom-scrollbar">
          <div className="p-8 space-y-8">
            {/* Quick Promotion Hierarchy Filters */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground px-1">Hierarchical Context</h4>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest gap-2 bg-blue-50 border-blue-200 text-blue-600" onClick={() => addFilter(hierarchyHeaders.find(h => h.normalizedName === 'source_sheet')?.id)}>
                  <Database className="h-3 w-3" /> Filter by Sheet
                </Button>
                <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest gap-2 bg-purple-50 border-purple-200 text-purple-600" onClick={() => addFilter(hierarchyHeaders.find(h => h.normalizedName === 'section_name')?.id)}>
                  <LayoutGrid className="h-3 w-3" /> Filter by Section
                </Button>
                <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest gap-2 bg-green-50 border-green-200 text-green-600" onClick={() => addFilter(hierarchyHeaders.find(h => h.normalizedName === 'subsection_name')?.id)}>
                  <Layers className="h-3 w-3" /> Subsection Pulse
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground px-1">Active Logic Stack</h4>
              {localFilters.length > 0 ? (
                localFilters.map((filter, idx) => {
                  const header = headers.find(h => h.id === filter.headerId);
                  const operators = getOperatorsForType(header?.dataType || 'text');

                  return (
                    <div key={`filter-${idx}`} className="p-6 rounded-[2rem] border-2 border-border/40 bg-card/50 space-y-5 relative group transition-all hover:border-primary/20">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeFilter(idx)}
                        className="absolute top-3 right-3 h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[9px] font-black uppercase tracking-widest opacity-40 pl-1">Registry Field</Label>
                          <Select value={filter.headerId} onValueChange={(v) => updateFilter(idx, { headerId: v })}>
                            <SelectTrigger className="h-11 rounded-xl border-2 bg-background font-black text-[10px] uppercase tracking-tighter">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectGroup>
                                <SelectLabel className="text-[8px] font-black uppercase tracking-widest opacity-40">Hierarchy</SelectLabel>
                                {hierarchyHeaders.map(h => (
                                  <SelectItem key={h.id} value={h.id} className="text-xs font-bold">{h.displayName}</SelectItem>
                                ))}
                              </SelectGroup>
                              <SelectGroup>
                                <SelectLabel className="text-[8px] font-black uppercase tracking-widest opacity-40">Data Fields</SelectLabel>
                                {dataHeaders.filter(h => h.filterable).map(h => (
                                  <SelectItem key={h.id} value={h.id} className="text-xs font-bold">{h.displayName}</SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[9px] font-black uppercase tracking-widest opacity-40 pl-1">Logic Operation</Label>
                          <Select value={filter.operator} onValueChange={(v) => updateFilter(idx, { operator: v as any })}>
                            <SelectTrigger className="h-11 rounded-xl border-2 bg-background font-black text-[10px] uppercase tracking-tighter">
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
                          <Label className="text-[9px] font-black uppercase tracking-widest opacity-40 pl-1">Target Value Pulse</Label>
                          {filter.operator === 'range' ? (
                            <div className="flex items-center gap-3">
                              <Input 
                                type="number" 
                                placeholder="Min" 
                                value={filter.min || ''} 
                                onChange={(e) => updateFilter(idx, { min: parseFloat(e.target.value) })}
                                className="h-11 rounded-xl border-2 bg-background font-bold text-xs shadow-inner" 
                              />
                              <span className="text-muted-foreground opacity-40 font-black text-[10px]">TO</span>
                              <Input 
                                type="number" 
                                placeholder="Max" 
                                value={filter.max || ''} 
                                onChange={(e) => updateFilter(idx, { max: parseFloat(e.target.value) })}
                                className="h-11 rounded-xl border-2 bg-background font-bold text-xs shadow-inner" 
                              />
                            </div>
                          ) : filter.operator === 'dateRange' ? (
                            <div className="flex items-center gap-3">
                              <Input 
                                type="date" 
                                value={filter.startDate || ''} 
                                onChange={(e) => updateFilter(idx, { startDate: e.target.value })}
                                className="h-11 rounded-xl border-2 bg-background font-bold text-xs shadow-inner" 
                              />
                              <Input 
                                type="date" 
                                value={filter.endDate || ''} 
                                onChange={(e) => updateFilter(idx, { endDate: e.target.value })}
                                className="h-11 rounded-xl border-2 bg-background font-bold text-xs shadow-inner" 
                              />
                            </div>
                          ) : (
                            <Input 
                              value={String(filter.value || '')} 
                              onChange={(e) => updateFilter(idx, { value: e.target.value })}
                              placeholder="Enter matching pulse value..."
                              className="h-11 rounded-xl border-2 bg-background font-bold text-xs shadow-inner" 
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-24 flex flex-col items-center justify-center text-center opacity-20 border-4 border-dashed rounded-[3rem] space-y-4">
                  <Filter className="h-20 w-20" />
                  <div className="space-y-1">
                    <h4 className="text-xl font-black uppercase tracking-[0.2em]">Logic Silent</h4>
                    <p className="text-[10px] font-bold uppercase tracking-widest">Inject a filter pulse to segment the registry.</p>
                  </div>
                </div>
              )}

              <Button 
                variant="outline" 
                onClick={() => addFilter()}
                className="w-full h-16 rounded-3xl border-2 border-dashed border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all font-black uppercase text-[10px] tracking-[0.2em] gap-3"
              >
                <Plus className="h-5 w-5" /> Add Registry Filter
              </Button>
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="p-8 bg-muted/20 border-t flex flex-row items-center gap-3">
          <Button 
            variant="ghost" 
            onClick={() => setLocalFilters([])}
            className="flex-1 h-14 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-destructive/10 hover:text-destructive transition-all"
          >
            Purge Engine
          </Button>
          <Button 
            onClick={applyFilters}
            className="flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 bg-primary text-primary-foreground"
          >
            Execute Filter Pulse
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

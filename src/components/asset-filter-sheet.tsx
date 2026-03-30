"use client";

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
import { Check, Hash, Calendar as CalendarIcon, Layout, Filter, X, ShieldAlert } from 'lucide-react';
import { cn } from "@/lib/utils";
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import type { Asset } from '@/lib/types';
import { useAppState } from '@/contexts/app-state-context';
import { Badge } from './ui/badge';

export interface OptionType {
  label: string;
  value: string;
  count?: number;
}

interface AssetFilterDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  
  locationOptions: OptionType[];
  selectedLocations: string[];
  setSelectedLocations: React.Dispatch<React.SetStateAction<string[]>>;

  assigneeOptions: OptionType[];
  selectedAssignees: string[];
  setSelectedAssignees: React.Dispatch<React.SetStateAction<string[]>>;
  
  statusOptions: OptionType[];
  selectedStatuses: string[];
  setSelectedStatuses: React.Dispatch<React.SetStateAction<string[]>>;

  conditionOptions: OptionType[];
  selectedConditions: string[];
  setSelectedConditions: React.Dispatch<React.SetStateAction<string[]>>;

  missingFieldFilter: string;
  setMissingFieldFilter: React.Dispatch<React.SetStateAction<string>>;
}

const fieldsToFilter: { label: string, value: keyof Asset }[] = [
    { label: 'Serial Number', value: 'serialNumber' },
    { label: 'Asset ID Code', value: 'assetIdCode' },
    { label: 'Assignee', value: 'assignee' },
    { label: 'Condition', value: 'condition' },
    { label: 'Manufacturer', value: 'manufacturer' },
    { label: 'Model Number', value: 'modelNumber' },
    { label: 'Major Section', value: 'majorSection' },
];

const FilterSection = ({ title, options, selected, onChange, icon }: {
  title: string;
  options: OptionType[];
  selected: string[];
  onChange: (value: string[]) => void;
  icon?: React.ReactNode;
}) => {
  const handleSelect = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            {icon} {title}
        </Label>
        {selected.length > 0 && <Badge className="bg-primary h-4 px-1.5 text-[8px] font-black uppercase">{selected.length}</Badge>}
      </div>
      <div className="rounded-2xl border-2 border-border/40 overflow-hidden bg-muted/5 transition-all focus-within:border-primary/20">
        <ScrollArea className="h-[140px]">
          <div className="p-2 space-y-0.5">
            {options.length > 0 ? (
              options.map((option) => {
                const isSelected = selected.includes(option.value);
                return (
                  <div
                    key={option.value}
                    onClick={() => handleSelect(option.value)}
                    className={cn(
                        "relative flex cursor-pointer select-none items-center rounded-xl px-3 py-2 text-xs font-bold transition-all",
                        isSelected ? "bg-primary/10 text-primary" : "hover:bg-primary/5 text-muted-foreground"
                    )}
                  >
                    <div className="flex w-full items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'flex h-4 w-4 items-center justify-center rounded-md border-2 transition-all',
                            isSelected
                              ? 'bg-primary border-primary text-white'
                              : 'border-muted-foreground/30'
                          )}
                        >
                          <Check className={cn('h-3 w-3', isSelected ? 'opacity-100' : 'opacity-0')} />
                        </div>
                        <span className="truncate max-w-[180px]">{option.label}</span>
                      </div>
                      {option.count !== undefined && (
                        <span className="text-[10px] font-mono opacity-40">
                          {option.count}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-10 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 italic">
                No indexed entries.
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export function AssetFilterDialog({
  isOpen,
  onOpenChange,
  locationOptions,
  selectedLocations,
  setSelectedLocations,
  assigneeOptions,
  selectedAssignees,
  setSelectedAssignees,
  statusOptions,
  selectedStatuses,
  setSelectedStatuses,
  conditionOptions,
  selectedConditions,
  setSelectedConditions,
  missingFieldFilter,
  setMissingFieldFilter,
}: AssetFilterDialogProps) {
  
  const { appSettings, setDateFilter, assets, offlineAssets, dataSource } = useAppState();

  const hierarchicalOptions = React.useMemo(() => {
      const source = dataSource === 'cloud' ? assets : offlineAssets;
      const majorSections = new Map<string, number>();
      const years = new Map<string, number>();

      source.forEach(a => {
          if (a.majorSection) majorSections.set(a.majorSection, (majorSections.get(a.majorSection) || 0) + 1);
          if (a.yearBucket) years.set(String(a.yearBucket), (years.get(String(a.yearBucket)) || 0) + 1);
      });

      return {
          sections: Array.from(majorSections.entries()).map(([label, count]) => ({ label, value: label, count })),
          years: Array.from(years.entries()).map(([label, count]) => ({ label, value: label, count })).sort((a,b) => b.label.localeCompare(a.label))
      };
  }, [assets, offlineAssets, dataSource]);

  const handleClearAll = () => {
    setSelectedLocations([]);
    setSelectedAssignees([]);
    setSelectedStatuses([]);
    setSelectedConditions([]);
    setMissingFieldFilter('');
    if (setDateFilter) setDateFilter(null);
  };

  const activeFilterCount = selectedLocations.length + selectedAssignees.length + selectedStatuses.length + selectedConditions.length + (missingFieldFilter ? 1 : 0);

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
                        title="Document Section"
                        options={hierarchicalOptions.sections}
                        selected={[]}
                        onChange={() => {}}
                        icon={<Layout className="h-3.5 w-3.5" />}
                    />
                    <FilterSection
                        title="Addition Period"
                        options={hierarchicalOptions.years}
                        selected={[]}
                        onChange={() => {}}
                        icon={<CalendarIcon className="h-3.5 w-3.5" />}
                    />
                </div>

                <Separator className="opacity-50" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FilterSection
                        title="Physical Jurisdiction"
                        options={locationOptions}
                        selected={selectedLocations}
                        onChange={setSelectedLocations}
                    />
                    <FilterSection
                        title="Officer / Assignee"
                        options={assigneeOptions}
                        selected={selectedAssignees}
                        onChange={setSelectedAssignees}
                    />
                </div>

                <Separator className="opacity-50" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FilterSection
                        title="Registry Status"
                        options={statusOptions}
                        selected={selectedStatuses}
                        onChange={setSelectedStatuses}
                    />
                    <FilterSection
                        title="Asset Health"
                        options={conditionOptions}
                        selected={selectedConditions}
                        onChange={setSelectedConditions}
                    />
                </div>

                <Separator className="opacity-50" />

                <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <ShieldAlert className="h-3.5 w-3.5" /> Registry Integrity Exceptions
                    </Label>
                    <div className="p-5 rounded-2xl bg-muted/10 border-2 border-dashed border-border/60">
                        <RadioGroup value={missingFieldFilter} onValueChange={(v) => { setMissingFieldFilter(v); if(setDateFilter) setDateFilter(null); }}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="flex items-center space-x-3 p-3 rounded-xl hover:bg-primary/5 transition-colors cursor-pointer group" onClick={() => setMissingFieldFilter('')}>
                                    <RadioGroupItem value="" id="missing-none" className="border-2" />
                                    <Label htmlFor="missing-none" className="text-xs font-bold cursor-pointer group-hover:text-primary transition-colors">NO INTEGRITY FILTER</Label>
                                </div>
                                {fieldsToFilter.map((field) => (
                                    <div key={field.value} className="flex items-center space-x-3 p-3 rounded-xl hover:bg-primary/5 transition-colors cursor-pointer group" onClick={() => setMissingFieldFilter(field.value)}>
                                        <RadioGroupItem value={field.value} id={`missing-${field.value}`} className="border-2" />
                                        <Label htmlFor={`missing-${field.value}`} className="text-xs font-bold cursor-pointer group-hover:text-primary transition-colors truncate">MISSING: {field.label.toUpperCase()}</Label>
                                    </div>
                                ))}
                            </div>
                        </RadioGroup>
                    </div>
                </div>
            </div>
        </ScrollArea>

        <DialogFooter className="p-8 bg-muted/20 border-t sm:justify-between items-center gap-4">
           <Button variant="ghost" onClick={handleClearAll} disabled={activeFilterCount === 0} className="font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-destructive/10 hover:text-destructive">
                <X className="mr-2 h-3.5 w-3.5" /> Reset Engine
           </Button>
           <div className="flex items-center gap-3">
                <DialogClose asChild>
                    <Button variant="ghost" className="font-bold text-xs rounded-xl">Discard</Button>
                </DialogClose>
                <DialogClose asChild>
                    <Button className="h-12 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20">Apply Logic Pulse</Button>
                </DialogClose>
           </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

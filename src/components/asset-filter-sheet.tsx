"use client";

/**
 * @fileOverview High-Fidelity Filter Engine - Advanced Dark UI.
 * Phase 102: Redesigned to strictly match the requested dark-themed filter image.
 * Implements multi-select logic, dynamic counts, and missing-field heuristics.
 */

import React, { useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Check, X, Search, Info, AlertCircle } from 'lucide-react';
import { cn } from "@/lib/utils";
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import type { Asset } from '@/lib/types';
import { useAppState } from '@/contexts/app-state-context';

export interface OptionType {
  label: string;
  value: string;
  count?: number;
}

interface AssetFilterSheetProps {
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

const missingFieldOptions = [
    { label: 'S/N', value: 'sn' },
    { label: 'Serial Number', value: 'serialNumber' },
    { label: 'Asset ID Code', value: 'assetIdCode' },
    { label: 'Description', value: 'description' },
];

const FilterSection = ({ title, options, selected, onChange }: {
  title: string;
  options: OptionType[];
  selected: string[];
  onChange: (value: string[]) => void;
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
      <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40 pl-1">{title}</Label>
      <div className="rounded-[1.5rem] border border-white/5 bg-[#0A0A0A] overflow-hidden">
        <ScrollArea className="max-h-[180px]">
          <div className="p-2 space-y-1">
            {options.length > 0 ? (
              options.map((option) => {
                const isSelected = selected.includes(option.value);
                return (
                  <div
                    key={option.value}
                    onClick={() => handleSelect(option.value)}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all group",
                      isSelected ? "bg-white/5" : "hover:bg-white/[0.02]"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all",
                        isSelected ? "bg-primary border-primary" : "border-white/10 group-hover:border-white/20"
                      )}>
                        {isSelected && <Check className="h-3 w-3 text-black font-black" />}
                      </div>
                      <span className={cn(
                        "text-[11px] font-black uppercase tracking-tight",
                        isSelected ? "text-white" : "text-white/40 group-hover:text-white/60"
                      )}>
                        {option.label}
                      </span>
                    </div>
                    {option.count !== undefined && (
                      <div className="bg-black/40 px-2 py-0.5 rounded-lg border border-white/5">
                        <span className="text-[9px] font-mono font-bold text-white/20">{option.count}</span>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="py-10 text-center flex flex-col items-center gap-2 opacity-20">
                <Search className="h-5 w-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">No options available.</span>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export function AssetFilterSheet({
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
}: AssetFilterSheetProps) {
  
  const handleClearAll = () => {
    setSelectedLocations([]);
    setSelectedAssignees([]);
    setSelectedStatuses([]);
    setSelectedConditions([]);
    setMissingFieldFilter('');
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 border-none bg-black text-white shadow-3xl overflow-hidden rounded-l-[2.5rem]">
        <div className="p-10 pb-6 border-b border-white/5 space-y-4">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle className="text-2xl font-black uppercase tracking-tight text-white">Filter Assets</SheetTitle>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-xl text-white/40 hover:text-white hover:bg-white/5 h-10 w-10">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <SheetDescription className="text-sm font-medium text-white/40 leading-relaxed italic pr-10">
              Refine the asset list by selecting criteria below. Logic pulses are applied in real-time to the current project scope.
            </SheetDescription>
          </SheetHeader>
        </div>

        <ScrollArea className="flex-1 bg-black">
          <div className="p-10 space-y-10">
            <FilterSection title="Location" options={locationOptions} selected={selectedLocations} onChange={setSelectedLocations} />
            <FilterSection title="Assignee" options={assigneeOptions} selected={selectedAssignees} onChange={setSelectedAssignees} />
            <FilterSection title="Condition" options={conditionOptions} selected={selectedConditions} onChange={setSelectedConditions} />
            <FilterSection title="Status" options={statusOptions} selected={selectedStatuses} onChange={setSelectedStatuses} />

            <div className="space-y-4">
              <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40 pl-1">Find Assets with Missing Fields</Label>
              <div className="rounded-[1.5rem] border border-white/5 bg-[#0A0A0A] p-2">
                <RadioGroup value={missingFieldFilter} onValueChange={setMissingFieldFilter} className="gap-1">
                  <div 
                    onClick={() => setMissingFieldFilter('')}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all group",
                      missingFieldFilter === '' ? "bg-white/5" : "hover:bg-white/[0.02]"
                    )}
                  >
                    <div className={cn(
                      "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all",
                      missingFieldFilter === '' ? "bg-primary border-primary" : "border-white/10 group-hover:border-white/20"
                    )}>
                      {missingFieldFilter === '' && <div className="h-2 w-2 rounded-full bg-black" />}
                    </div>
                    <span className={cn("text-[11px] font-black uppercase", missingFieldFilter === '' ? "text-white" : "text-white/20")}>None</span>
                  </div>
                  {missingFieldOptions.map((opt) => (
                    <div 
                      key={opt.value}
                      onClick={() => setMissingFieldFilter(opt.value)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all group",
                        missingFieldFilter === opt.value ? "bg-white/5" : "hover:bg-white/[0.02]"
                      )}
                    >
                      <div className={cn(
                        "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all",
                        missingFieldFilter === opt.value ? "bg-primary border-primary" : "border-white/10 group-hover:border-white/20"
                      )}>
                        {missingFieldFilter === opt.value && <div className="h-2 w-2 rounded-full bg-black" />}
                      </div>
                      <span className={cn("text-[11px] font-black uppercase", missingFieldFilter === opt.value ? "text-white" : "text-white/20")}>{opt.label}</span>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="p-10 bg-[#050505] border-t border-white/5 flex flex-row items-center justify-between gap-4">
          <Button 
            variant="ghost" 
            onClick={handleClearAll}
            className="h-14 px-10 rounded-2xl text-white font-black uppercase text-[10px] tracking-[0.2em] hover:bg-white/5"
          >
            Clear All Filters
          </Button>
          <Button 
            onClick={() => onOpenChange(false)}
            className="h-14 px-12 rounded-2xl bg-primary text-black font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl shadow-primary/20 transition-transform hover:scale-105 active:scale-95"
          >
            Done
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

"use client";

/**
 * @fileOverview High-Fidelity Filter Engine - Advanced AMOLED UI.
 * Phase 230: Synchronized with professional screenshot parity.
 * Features circular checkboxes, real-time counts, and missing-field radio logic.
 * Phase 231: Added Condition scope and refined gold-on-black visual language.
 */

import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { cn } from "@/lib/utils";
import { ScrollArea } from './ui/scroll-area';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import type { OptionType } from '@/contexts/app-state-context';

interface AssetFilterSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
  
  locationOptions: OptionType[];
  selectedLocations: string[];
  setSelectedLocations: (val: string[]) => void;

  assigneeOptions: OptionType[];
  selectedAssignees: string[];
  setSelectedAssignees: (val: string[]) => void;
  
  conditionOptions: OptionType[];
  selectedConditions: string[];
  setSelectedConditions: (val: string[]) => void;

  statusOptions: OptionType[];
  selectedStatuses: string[];
  setSelectedStatuses: (val: string[]) => void;

  missingFieldFilter: string;
  setMissingFieldFilter: (val: string) => void;
}

const MISSING_FIELD_OPTS = [
  { label: 'None', value: '' },
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
        <ScrollArea className="max-h-[200px]">
          <div className="p-2 space-y-1">
            {options.length > 0 ? (
              options.map((option) => {
                const isSelected = selected.includes(option.value);
                return (
                  <div
                    key={option.value}
                    onClick={() => handleSelect(option.value)}
                    className={cn(
                      "flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all group",
                      isSelected ? "bg-primary text-black" : "hover:bg-white/[0.02]"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      {/* Circular Checkbox */}
                      <div className={cn(
                        "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all",
                        isSelected ? "bg-black border-black" : "border-white/10 group-hover:border-white/20"
                      )}>
                        {isSelected && <Check className="h-3.5 w-3.5 text-primary font-black" />}
                      </div>
                      <span className={cn(
                        "text-[11px] font-black uppercase tracking-tight",
                        isSelected ? "text-black" : "text-white/40 group-hover:text-white/60"
                      )}>
                        {option.label}
                      </span>
                    </div>
                    {option.count !== undefined && (
                      <div className={cn(
                        "px-2 py-0.5 rounded-lg border",
                        isSelected ? "bg-black/20 border-black/10" : "bg-black/40 border-white/5"
                      )}>
                        <span className={cn(
                          "text-[9px] font-mono font-bold",
                          isSelected ? "text-black/60" : "text-white/20"
                        )}>{option.count}</span>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center flex flex-col items-center gap-2 opacity-20">
                <span className="text-[10px] font-black uppercase tracking-widest text-white">No options available.</span>
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
  isAdmin,
  locationOptions,
  selectedLocations,
  setSelectedLocations,
  assigneeOptions,
  selectedAssignees,
  setSelectedAssignees,
  conditionOptions,
  selectedConditions,
  setSelectedConditions,
  statusOptions,
  selectedStatuses,
  setSelectedStatuses,
  missingFieldFilter,
  setMissingFieldFilter,
}: AssetFilterSheetProps) {
  
  const handleClearAll = () => {
    setSelectedLocations([]);
    setSelectedAssignees([]);
    setSelectedConditions([]);
    setSelectedStatuses([]);
    setMissingFieldFilter('');
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 border-none bg-black text-white shadow-3xl overflow-hidden rounded-l-[2.5rem]">
        {/* Header Section */}
        <div className="p-10 pb-6 border-b border-white/5 space-y-4">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle className="text-2xl font-black uppercase tracking-tight text-white">Filter Assets</SheetTitle>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-xl text-white/40 hover:text-white hover:bg-white/5 h-10 w-10">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <SheetDescription className="text-sm font-medium text-white/40 leading-relaxed italic pr-10">
              Refine the asset list by selecting criteria below.
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Scrollable Pulse Surface */}
        <ScrollArea className="flex-1 bg-black">
          <div className="p-10 space-y-10">
            {isAdmin && (
              <FilterSection title="Location" options={locationOptions} selected={selectedLocations} onChange={setSelectedLocations} />
            )}
            
            <FilterSection title="Assignee" options={assigneeOptions} selected={selectedAssignees} onChange={setSelectedAssignees} />
            <FilterSection title="Condition" options={conditionOptions} selected={selectedConditions} onChange={setSelectedConditions} />
            <FilterSection title="Status" options={statusOptions} selected={selectedStatuses} onChange={setSelectedStatuses} />

            {/* Missing Fields Logic Section */}
            <div className="space-y-4">
              <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40 pl-1">Find Assets with Missing Fields</Label>
              <div className="rounded-[1.5rem] border border-white/5 bg-[#0A0A0A] p-2">
                {MISSING_FIELD_OPTS.map((opt) => {
                  const isSelected = missingFieldFilter === opt.value;
                  return (
                    <div 
                      key={`missing-${opt.label}`}
                      onClick={() => setMissingFieldFilter(opt.value)}
                      className={cn(
                        "flex items-center gap-4 p-3.5 rounded-xl cursor-pointer transition-all group",
                        isSelected ? "bg-white/5" : "hover:bg-white/[0.02]"
                      )}
                    >
                      <div className={cn(
                        "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all",
                        isSelected ? "bg-primary border-primary shadow-[0_0_10px_rgba(var(--primary),0.3)]" : "border-white/10 group-hover:border-white/20"
                      )}>
                        {isSelected && <div className="h-2 w-2 rounded-full bg-black" />}
                      </div>
                      <span className={cn(
                        "text-[11px] font-black uppercase tracking-tight",
                        isSelected ? "text-white" : "text-white/40 group-hover:text-white/60"
                      )}>
                        {opt.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="p-10 bg-[#050505] border-t border-white/5 flex flex-row items-center justify-between gap-4">
          <Button 
            variant="ghost" 
            onClick={handleClearAll}
            className="h-14 px-8 rounded-2xl text-white font-black uppercase text-[10px] tracking-[0.2em] border-2 border-white/5 hover:bg-white/5"
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
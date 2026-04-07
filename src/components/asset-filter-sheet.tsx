"use client";

/**
 * @fileOverview High-Fidelity Filter Engine - Centered Pop-up UI.
 * Converted from Sheet to Dialog for focused workstation parity.
 * Phase 231: Added Condition scope and refined gold-on-black visual language.
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
                      isSelected ? "bg-primary text-black" : "hover:bg-white/[0.02]"
                    )}
                  >
                    <div className="flex items-center gap-4">
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
              <div className="py-8 text-center opacity-20">
                <span className="text-[10px] font-black uppercase tracking-widest text-white">Empty</span>
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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl flex flex-col p-0 border-none bg-black text-white shadow-3xl overflow-hidden rounded-[2.5rem]">
        <div className="p-10 pb-6 border-b border-white/5 bg-white/[0.02]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-white">Filter Engine</DialogTitle>
            <DialogDescription className="text-[10px] font-black uppercase text-white/40 tracking-widest mt-1">
              Deterministic asset selection pulse
            </DialogDescription>
          </DialogHeader>
        </div>

        <ScrollArea className="flex-1 bg-black max-h-[70vh]">
          <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-10">
              {isAdmin && (
                <FilterSection title="Regional Scope" options={locationOptions} selected={selectedLocations} onChange={setSelectedLocations} />
              )}
              <FilterSection title="Assignee" options={assigneeOptions} selected={selectedAssignees} onChange={setSelectedAssignees} />
            </div>
            
            <div className="space-y-10">
              <FilterSection title="Asset Condition" options={conditionOptions} selected={selectedConditions} onChange={setSelectedConditions} />
              <FilterSection title="Pulse Status" options={statusOptions} selected={selectedStatuses} onChange={setSelectedStatuses} />

              <div className="space-y-4">
                <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40 pl-1">Identify Gaps</Label>
                <div className="rounded-[1.5rem] border border-white/5 bg-[#0A0A0A] p-2 flex flex-wrap gap-2">
                  {MISSING_FIELD_OPTS.map((opt) => {
                    const isSelected = missingFieldFilter === opt.value;
                    return (
                      <button 
                        key={`missing-${opt.label}`}
                        onClick={() => setMissingFieldFilter(opt.value)}
                        className={cn(
                          "flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 transition-all",
                          isSelected ? "bg-primary border-primary text-black" : "bg-white/5 border-transparent text-white/40 hover:border-white/10"
                        )}
                      >
                        <span className="text-[10px] font-black uppercase tracking-tight">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="p-8 bg-[#050505] border-t border-white/5 flex flex-row items-center justify-between gap-4">
          <Button 
            variant="ghost" 
            onClick={handleClearAll}
            className="h-14 px-8 rounded-2xl text-white/40 font-black uppercase text-[10px] tracking-[0.2em] hover:text-white"
          >
            Purge Filters
          </Button>
          <Button 
            onClick={() => onOpenChange(false)}
            className="h-14 px-12 rounded-2xl bg-primary text-black font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl shadow-primary/20"
          >
            Apply Logic Pulse
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
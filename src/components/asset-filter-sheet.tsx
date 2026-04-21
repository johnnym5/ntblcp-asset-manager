"use client";

/**
 * @fileOverview Registry Filter Engine.
 * Phase 2011: Fixed OptionType import to point to domain types.
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
import { Input } from '@/components/ui/input';
import { Check, Search, Filter, LayoutGrid, FileText } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Label } from './ui/label';
import type { OptionType } from '@/types/domain';

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
  
  categoryOptions: OptionType[];
  selectedCategories: string[];
  setSelectedCategories: (val: string[]) => void;

  conditionOptions: OptionType[];
  selectedConditions: string[];
  setSelectedConditions: (val: string[]) => void;

  statusOptions: OptionType[];
  selectedStatuses: string[];
  setSelectedStatuses: (val: string[]) => void;

  missingFieldFilter: string;
  setMissingFieldFilter: (val: string) => void;

  searchTerm: string;
  setSearchTerm: (val: string) => void;
}

const MISSING_FIELD_OPTS = [
  { label: 'None', value: '' },
  { label: 'Description', value: 'description' },
  { label: 'Category', value: 'category' },
  { label: 'S/N', value: 'sn' },
  { label: 'Serial Number', value: 'serialNumber' },
  { label: 'Asset Tag', value: 'assetIdCode' },
];

const FilterSection = ({ title, options, selected, onChange, icon: Icon }: {
  title: string;
  options: OptionType[];
  selected: string[];
  onChange: (value: string[]) => void;
  icon?: any;
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
      <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40 pl-1 flex items-center gap-2">
        {Icon && <Icon className="h-3 w-3" />} {title}
      </Label>
      <div className="rounded-[1.5rem] border border-white/5 bg-[#0A0A0A] overflow-hidden">
        <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
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
        </div>
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
  categoryOptions,
  selectedCategories,
  setSelectedCategories,
  conditionOptions,
  selectedConditions,
  setSelectedConditions,
  statusOptions,
  selectedStatuses,
  setSelectedStatuses,
  missingFieldFilter,
  setMissingFieldFilter,
  searchTerm,
  setSearchTerm,
}: AssetFilterSheetProps) {
  
  const handleClearAll = () => {
    setSelectedLocations([]);
    setSelectedAssignees([]);
    setSelectedCategories([]);
    setSelectedConditions([]);
    setSelectedStatuses([]);
    setMissingFieldFilter('');
    setSearchTerm('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl flex flex-col p-0 border-none bg-black text-white shadow-3xl overflow-hidden rounded-[2.5rem]">
        <div className="p-10 pb-6 border-b border-white/5 bg-white/[0.02] shrink-0">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-3">
              <Filter className="text-primary h-6 w-6" /> Filter Registry
            </DialogTitle>
            <DialogDescription className="text-[10px] font-black uppercase text-white/40 tracking-widest mt-1">
              Refine your asset list by selecting criteria.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 bg-black max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="p-10 space-y-10">
            {/* Unified Description Search */}
            <div className="space-y-3">
              <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40 pl-1 flex items-center gap-2">
                <FileText className="h-3 w-3" /> Asset Description Search
              </Label>
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Filter by description keywords..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-14 pl-12 rounded-2xl bg-[#0A0A0A] border-2 border-white/5 focus-visible:border-primary/40 focus-visible:ring-0 text-white font-medium shadow-inner"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-10">
                <FilterSection title="Asset Category" icon={LayoutGrid} options={categoryOptions} selected={selectedCategories} onChange={setSelectedCategories} />
                {isAdmin && (
                  <FilterSection title="Region" options={locationOptions} selected={selectedLocations} onChange={setSelectedLocations} />
                )}
                <FilterSection title="Assignee" options={assigneeOptions} selected={selectedAssignees} onChange={setSelectedAssignees} />
              </div>
              
              <div className="space-y-10">
                <FilterSection title="Condition" options={conditionOptions} selected={selectedConditions} onChange={setSelectedConditions} />
                <FilterSection title="Status" options={statusOptions} selected={selectedStatuses} onChange={setSelectedStatuses} />

                <div className="space-y-4">
                  <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40 pl-1">Identify Missing Data</Label>
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
          </div>
        </div>

        <div className="p-8 bg-[#050505] border-t border-white/5 flex flex-row items-center justify-between gap-4 shrink-0 pb-safe">
          <Button 
            variant="ghost" 
            onClick={handleClearAll}
            className="h-14 px-8 rounded-2xl text-white/40 font-black uppercase text-[10px] tracking-[0.2em] hover:text-white"
          >
            Clear All
          </Button>
          <Button 
            onClick={() => onOpenChange(false)}
            className="h-14 px-12 rounded-2xl bg-primary text-black font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl shadow-primary/20 transition-transform active:scale-95"
          >
            Update Registry
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


"use client";

import React from 'react';
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
import { Check } from 'lucide-react';
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

  missingFieldFilter: string;
  setMissingFieldFilter: React.Dispatch<React.SetStateAction<string>>;
}

const fieldsToFilter: { label: string, value: keyof Asset }[] = [
    { label: 'S/N', value: 'sn' },
    { label: 'Serial Number', value: 'serialNumber' },
    { label: 'Asset ID Code', value: 'assetIdCode' },
    { label: 'Description', value: 'description' },
    { label: 'Category', value: 'category' },
    { label: 'Location', value: 'location' },
    { label: 'LGA', value: 'lga' },
    { label: 'Assignee', value: 'assignee' },
    { label: 'Condition', value: 'condition' },
    { label: 'Manufacturer', value: 'manufacturer' },
    { label: 'Model Number', value: 'modelNumber' },
    { label: 'Asset Class', value: 'assetClass' },
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
    <div className="space-y-2">
      <Label className="font-semibold">{title}</Label>
      <div className="rounded-md border">
        <ScrollArea className="h-[150px]">
          <div className="p-1">
            {options.length > 0 ? (
              options.map((option) => {
                const isSelected = selected.includes(option.value);
                return (
                  <div
                    key={option.value}
                    onClick={() => handleSelect(option.value)}
                    className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent"
                  >
                    <div className="flex w-full items-center justify-between">
                      <div className="flex items-center">
                        <div
                          className={cn(
                            'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                            isSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'opacity-50 [&_svg]:invisible'
                          )}
                        >
                          <Check className={cn('h-4 w-4')} />
                        </div>
                        <span>{option.label}</span>
                      </div>
                      {option.count !== undefined && (
                        <span className="ml-2 rounded-sm bg-muted/50 px-1.5 py-0.5 text-xs font-mono text-muted-foreground">
                          {option.count}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No options available.
              </p>
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
  missingFieldFilter,
  setMissingFieldFilter,
}: AssetFilterSheetProps) {
  
  const { appSettings, setDateFilter } = useAppState();
  const handleClearAll = () => {
    setSelectedLocations([]);
    setSelectedAssignees([]);
    setSelectedStatuses([]);
    setMissingFieldFilter('');
    setDateFilter(null);
  };

  const activeFilterCount = selectedLocations.length + selectedAssignees.length + selectedStatuses.length + (missingFieldFilter ? 1 : 0);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Filter Assets</SheetTitle>
          <SheetDescription>
            Refine the asset list by selecting criteria below.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-6 overflow-y-auto pr-2 py-4">
          <FilterSection
            title="Location"
            options={locationOptions}
            selected={selectedLocations}
            onChange={setSelectedLocations}
          />
          <Separator />
          <FilterSection
            title="Assignee"
            options={assigneeOptions}
            selected={selectedAssignees}
            onChange={setSelectedAssignees}
          />
          {appSettings.appMode === 'verification' && (
            <>
              <Separator />
              <FilterSection
                title="Status"
                options={statusOptions}
                selected={selectedStatuses}
                onChange={setSelectedStatuses}
              />
            </>
          )}
          <Separator />
           <div className="space-y-3">
            <Label className="font-semibold">Find Assets with Missing Fields</Label>
            <RadioGroup value={missingFieldFilter} onValueChange={(value) => { setMissingFieldFilter(value); setDateFilter(null);}}>
              <ScrollArea className="h-[150px] rounded-md border p-2">
                <div className="space-y-1">
                 <div className="flex items-center space-x-2 p-1">
                    <RadioGroupItem value="" id="missing-none" />
                    <Label htmlFor="missing-none" className="font-normal cursor-pointer">None</Label>
                  </div>
                {fieldsToFilter.map((field) => (
                  <div key={field.value} className="flex items-center space-x-2 p-1">
                    <RadioGroupItem value={field.value} id={`missing-${field.value}`} />
                    <Label htmlFor={`missing-${field.value}`} className="font-normal cursor-pointer">{field.label}</Label>
                  </div>
                ))}
                </div>
              </ScrollArea>
            </RadioGroup>
          </div>
        </div>
        <SheetFooter className="mt-auto pt-4 border-t">
           <Button variant="outline" onClick={handleClearAll} disabled={activeFilterCount === 0}>
            Clear All Filters
          </Button>
          <SheetClose asChild>
            <Button>Done</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

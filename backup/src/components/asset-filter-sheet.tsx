
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Check, Dot } from 'lucide-react';
import { cn } from "@/lib/utils";
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import type { Asset } from '@/lib/types';

export interface OptionType {
  label: string;
  value: string;
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
    { label: 'Location', value: 'location' },
    { label: 'Assignee', value: 'assignee' },
    { label: 'Condition', value: 'condition' },
    { label: 'Asset ID Code', value: 'assetIdCode' },
    { label: 'Manufacturer', value: 'manufacturer' },
    { label: 'LGA', value: 'lga' },
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
        <Command>
          <CommandInput placeholder={`Filter ${title.toLowerCase()}...`} />
          <CommandList>
            <ScrollArea className="h-[150px]">
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => {
                  const isSelected = selected.includes(option.value);
                  return (
                    <CommandItem
                      key={option.value}
                      onSelect={() => handleSelect(option.value)}
                      className="cursor-pointer"
                    >
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50 [&_svg]:invisible"
                        )}
                      >
                        <Check className={cn("h-4 w-4")} />
                      </div>
                      <span>{option.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
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
  
  const handleClearAll = () => {
    setSelectedLocations([]);
    setSelectedAssignees([]);
    setSelectedStatuses([]);
    setMissingFieldFilter('');
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
          <Separator />
          <FilterSection
            title="Status"
            options={statusOptions}
            selected={selectedStatuses}
            onChange={setSelectedStatuses}
          />
          <Separator />
           <div className="space-y-3">
            <Label className="font-semibold">Find Assets with Missing Fields</Label>
            <RadioGroup value={missingFieldFilter} onValueChange={setMissingFieldFilter}>
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

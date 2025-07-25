
'use client';

import React, { useState } from 'react';
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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NIGERIAN_STATES } from '@/lib/constants';
import type { Asset } from '@/lib/types';
import { useAppState } from '@/contexts/app-state-context';

interface TravelReportDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  allAssets: Asset[];
}

export function TravelReportDialog({ isOpen, onOpenChange, allAssets }: TravelReportDialogProps) {
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const generateReport = () => {
    const reportWindow = window.open('', '_blank');
    if (!reportWindow) {
      alert('Please allow popups to view the report.');
      return;
    }

    const assetsToReport = allAssets.filter(asset => 
        selectedStates.some(state => (asset.location || '').toLowerCase().includes(state.toLowerCase()))
    );

    const reportHtml = `
      <html>
        <head>
          <title>Travel Verification Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #333; }
            @media print {
              body { -webkit-print-color-adjust: exact; }
              .no-print { display: none; }
            }
            .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
            h1 { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            h2 { border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .print-btn { display: block; width: 100px; margin: 20px auto; padding: 10px; text-align: center; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <button class="no-print print-btn" onclick="window.print()">Print</button>
            <h1>Asset Verification Travel Report</h1>
            <p><strong>States Covered:</strong> ${selectedStates.join(', ')}</p>
            <p><strong>Date Generated:</strong> ${new Date().toLocaleDateString()}</p>
            
            ${selectedStates.map(state => {
              const stateAssets = assetsToReport.filter(a => (a.location || '').toLowerCase().includes(state.toLowerCase()));
              if (stateAssets.length === 0) return `<h2>${state}</h2><p>No assets found for this state.</p>`;

              return `
                <h2>${state}</h2>
                <table>
                  <thead>
                    <tr>
                      <th>S/N</th>
                      <th>Description</th>
                      <th>Serial Number</th>
                      <th>Location</th>
                      <th>Assignee</th>
                      <th>Signature</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${stateAssets.map((asset, index) => `
                      <tr>
                        <td>${index + 1}</td>
                        <td>${asset.description || ''}</td>
                        <td>${asset.serialNumber || ''}</td>
                        <td>${asset.location || ''}</td>
                        <td>${asset.assignee || ''}</td>
                        <td style="height: 40px;"></td>
                        <td></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              `;
            }).join('')}
          </div>
        </body>
      </html>
    `;

    reportWindow.document.write(reportHtml);
    reportWindow.document.close();
    onOpenChange(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedStates([]);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Travel Report</DialogTitle>
          <DialogDescription>
            Select the state(s) you want to include in the printable verification report.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={isPopoverOpen}
                        className="w-full justify-between"
                    >
                        {selectedStates.length > 0 ? `${selectedStates.length} state(s) selected` : "Select states..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                        <CommandInput placeholder="Search state..." />
                        <CommandList>
                        <CommandEmpty>No state found.</CommandEmpty>
                        <CommandGroup>
                            {NIGERIAN_STATES.map((state) => (
                            <CommandItem
                                key={state}
                                value={state}
                                onSelect={(currentValue) => {
                                    const isSelected = selectedStates.includes(state);
                                    if (isSelected) {
                                        setSelectedStates(selectedStates.filter(s => s !== state));
                                    } else {
                                        setSelectedStates([...selectedStates, state]);
                                    }
                                }}
                            >
                                <Check
                                className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedStates.includes(state) ? "opacity-100" : "opacity-0"
                                )}
                                />
                                {state}
                            </CommandItem>
                            ))}
                        </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={generateReport} disabled={selectedStates.length === 0}>
            Generate Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

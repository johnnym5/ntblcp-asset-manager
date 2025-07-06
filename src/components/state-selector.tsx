
'use client';

import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from './ui/button';
import { NIGERIAN_STATES } from '@/lib/constants';

interface StateSelectorProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onStateSelect: (state: string) => void;
}

export default function StateSelector({ isOpen, onOpenChange, onStateSelect }: StateSelectorProps) {
  const [selectedState, setSelectedState] = useState<string>('');

  const handleConfirm = () => {
    if (selectedState) {
      onStateSelect(selectedState);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Select Your Assigned State</AlertDialogTitle>
          <AlertDialogDescription>
            To continue, please select the state you are assigned to. This will filter the assets you can view and manage.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <Select onValueChange={setSelectedState} value={selectedState}>
            <SelectTrigger>
              <SelectValue placeholder="Select a state..." />
            </SelectTrigger>
            <SelectContent>
              {NIGERIAN_STATES.map((state) => (
                <SelectItem key={state} value={state}>
                  {state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <AlertDialogFooter>
          <Button onClick={handleConfirm} disabled={!selectedState}>
            Confirm Selection
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

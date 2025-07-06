
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
import { Input } from './ui/input';
import { Label } from './ui/label';
import { NIGERIAN_STATES } from '@/lib/constants';
import { Loader2 } from 'lucide-react';

interface UserProfileSetupProps {
  isOpen: boolean;
  onSubmit: (data: { displayName: string; state: string }) => Promise<void>;
  defaultDisplayName?: string | null;
}

export default function UserProfileSetup({ isOpen, onSubmit, defaultDisplayName }: UserProfileSetupProps) {
  const [displayName, setDisplayName] = useState(defaultDisplayName || '');
  const [selectedState, setSelectedState] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const handleConfirm = async () => {
    if (displayName && selectedState) {
      setIsSaving(true);
      await onSubmit({ displayName, state: selectedState });
      // The parent component will handle closing the dialog on success
      setIsSaving(false);
    }
  };

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Complete Your Profile</AlertDialogTitle>
          <AlertDialogDescription>
            Please provide your name and assigned state to continue. This will tailor the app experience for you.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Full Name</Label>
            <Input 
              id="displayName" 
              value={displayName} 
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="John Doe"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">Assigned State</Label>
            <Select onValueChange={setSelectedState} value={selectedState}>
              <SelectTrigger id="state">
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
        </div>
        <AlertDialogFooter>
          <Button onClick={handleConfirm} disabled={!selectedState || !displayName || isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm and Continue
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

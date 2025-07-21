
'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useDebounce } from '@/hooks/use-debounce';

interface UserData {
  displayName: string;
  states: string[];
  isAdmin: boolean;
}

interface UserProfileSetupProps {
  isOpen: boolean;
  onSubmit: (data: { displayName: string; state: string; }) => Promise<void>;
  defaultDisplayName?: string | null;
}

export default function UserProfileSetup({ isOpen, onSubmit }: UserProfileSetupProps) {
  const [displayName, setDisplayName] = useState('');
  const [selectedState, setSelectedState] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [foundUser, setFoundUser] = useState<UserData | null>(null);
  const debouncedDisplayName = useDebounce(displayName, 500);

  const checkUser = useCallback(async (name: string) => {
    if (!name) {
      setFoundUser(null);
      setSelectedState('');
      return;
    }
    setIsLoadingUser(true);
    setError(null);
    const loginName = name.trim().toLowerCase();
    
    try {
      const userDocRef = doc(db, 'users', loginName);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserData;
        setFoundUser(userData);
        if (userData.states.length === 1 && userData.states[0] !== 'All') {
          setSelectedState(userData.states[0]);
        } else if (userData.isAdmin) {
          setSelectedState('All');
        } else {
          setSelectedState('');
        }
      } else {
        setFoundUser(null);
        setSelectedState('');
        setError("User not found. You can continue as a guest with read-only access.");
      }
    } catch (e) {
      console.error("Error checking user:", e);
      setError("Could not connect to the server to verify user. Please check your connection.");
      setFoundUser(null);
    } finally {
      setIsLoadingUser(false);
    }
  }, []);

  useEffect(() => {
    checkUser(debouncedDisplayName);
  }, [debouncedDisplayName, checkUser]);


  const handleConfirm = async () => {
    if (foundUser && selectedState) {
        setError(null);
        setIsSaving(true);
        await onSubmit({ displayName: displayName.trim(), state: selectedState });
        setIsSaving(false);
    } else {
       setError("Please enter a valid name and select a location, or proceed as a guest.");
    }
  };

  const handleGuestContinue = async () => {
      setError(null);
      setIsSaving(true);
      await onSubmit({ displayName: 'guest', state: 'All' });
      setIsSaving(false);
  }
  
  const isConfirmDisabled = isSaving || isLoadingUser || !foundUser || !selectedState;

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Welcome</AlertDialogTitle>
          <AlertDialogDescription>
            Please enter your name to continue. If your name is not on the authorized list, you can proceed as a guest with read-only access.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Full Name</Label>
            <div className="relative">
              <Input 
                id="displayName" 
                placeholder="E.g., John Doe"
                value={displayName} 
                onChange={(e) => setDisplayName(e.target.value)}
              />
              {isLoadingUser && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
            </div>
          </div>
          {foundUser && (
            <div className="space-y-2">
              <Label htmlFor="state">Assigned Location</Label>
              <Select onValueChange={setSelectedState} value={selectedState} disabled={foundUser.states.length === 1}>
                <SelectTrigger id="state">
                  <SelectValue placeholder="Select a location..." />
                </SelectTrigger>
                <SelectContent>
                    {foundUser.states.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {error && (
             <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Notice</AlertTitle>
                <AlertDescription>
                    {error}
                </AlertDescription>
            </Alert>
          )}
        </div>
        <AlertDialogFooter>
           <Button variant="outline" onClick={handleGuestContinue} disabled={isSaving}>
            {isSaving && displayName.trim().toLowerCase() === 'guest' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Continue as Guest
          </Button>
          <Button onClick={handleConfirm} disabled={isConfirmDisabled}>
            {isSaving && displayName.trim().toLowerCase() !== 'guest' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Confirm and Continue
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

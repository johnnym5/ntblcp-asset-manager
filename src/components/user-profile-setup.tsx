'use client';

import React, { useState, useEffect } from 'react';
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
import { AUTHORIZED_USERS, type AuthorizedUser } from '@/lib/authorized-users';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export default function UserProfileSetup() {
  const [displayName, setDisplayName] = useState('');
  const [selectedState, setSelectedState] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [foundUser, setFoundUser] = useState<AuthorizedUser | null>(null);
  const { updateProfile } = useAuth();

  useEffect(() => {
    setError(null);
    const user = AUTHORIZED_USERS.find(u => u.loginName === displayName.trim().toLowerCase());
    if (user) {
      setFoundUser(user);
      if (user.states.length === 1 && user.states[0] !== 'All') {
        setSelectedState(user.states[0]);
      } else if (user.loginName === 'admin') {
        setSelectedState('All');
      } else {
        setSelectedState(''); // Reset if user has multiple states to choose from
      }
    } else {
      setFoundUser(null);
      setSelectedState('');
    }
  }, [displayName]);


  const handleConfirm = async () => {
    if (!foundUser || !selectedState) {
        setError("Please provide a valid name and select a location.");
        return;
    }
    
    setError(null);
    setIsSaving(true);
    await updateProfile({ displayName: foundUser.loginName, state: selectedState });
    setIsSaving(false);
  };
  
  const isConfirmDisabled = isSaving || !foundUser || !selectedState;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <div className="w-full max-w-md">
            <AlertDialog open={true}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>User Login</AlertDialogTitle>
                <AlertDialogDescription>
                    Please enter your name to access your assigned assets.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4 space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="displayName">Full Name</Label>
                    <Input 
                    id="displayName" 
                    placeholder="E.g., John Doe or 'admin'"
                    value={displayName} 
                    onChange={(e) => setDisplayName(e.target.value)}
                    />
                </div>
                {foundUser && (
                    <div className="space-y-2">
                    <Label htmlFor="state">Assigned Location</Label>
                    <Select onValueChange={setSelectedState} value={selectedState} disabled={foundUser.states[0] === 'All'}>
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
                        <AlertTitle>Login Error</AlertTitle>
                        <AlertDescription>
                            {error}
                        </AlertDescription>
                    </Alert>
                )}
                </div>
                <AlertDialogFooter>
                <Button onClick={handleConfirm} disabled={isConfirmDisabled}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirm and Continue
                </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
            </AlertDialog>
        </div>
    </div>
  );
}


'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
import type { AuthorizedUser } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle, Boxes } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useAppState } from '@/contexts/app-state-context';
import { Separator } from './ui/separator';

const superAdmin: AuthorizedUser = {
  loginName: 'admin',
  displayName: 'Super Admin',
  password: 'setup',
  states: ['All'],
  isAdmin: true,
  isGuest: false,
  canAddAssets: true,
  canEditAssets: true,
  canVerifyAssets: true,
};

export default function UserProfileSetup() {
  const [loginName, setLoginName] = useState('');
  const [password, setPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [foundUser, setFoundUser] = useState<AuthorizedUser | null>(null);
  const [selectedState, setSelectedState] = useState<string>('');
  
  const { login } = useAuth();
  const { appSettings } = useAppState();

  const handleLogin = () => {
    setError(null);
    if (!loginName) {
      setError("Please enter your login name.");
      return;
    }
    
    // appSettings could be null if the initial sync fails.
    if (!appSettings) {
        setError("Application settings are not available. Cannot log in.");
        return;
    }

    const allUsers = [...appSettings.authorizedUsers, superAdmin];
    const user = allUsers.find(
      u => u.loginName.toLowerCase() === loginName.toLowerCase().trim()
    );

    if (!user) {
      setError("Invalid login name or password.");
      return;
    }

    // Handle guest login (no password needed)
    if (user.isGuest) {
      setFoundUser(user);
      if (user.states.length === 1 && user.states[0] !== 'All') {
        setSelectedState(user.states[0]);
        handleConfirm(user, user.states[0]);
      } else if (user.isAdmin) {
        setSelectedState('All');
        handleConfirm(user, 'All');
      }
      return; 
    }
    
    // Handle normal user login (password is required)
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    if (user.password === password) {
      setFoundUser(user);
      if (user.states.length === 1 && user.states[0] !== 'All') {
        setSelectedState(user.states[0]);
        handleConfirm(user, user.states[0]);
      } else if (user.isAdmin) {
        setSelectedState('All');
        handleConfirm(user, 'All');
      }
    } else {
      setError("Invalid login name or password.");
      setFoundUser(null);
    }
  };

  const handleConfirm = async (userToLogin: AuthorizedUser, stateToSet: string) => {
    if (!userToLogin || !stateToSet) {
        setError("An error occurred. Please try again.");
        return;
    }
    
    setIsSaving(true);
    await login(userToLogin, stateToSet);
    setIsSaving(false);
  };
  
  const isMultiStateUser = foundUser && foundUser.states.length > 1 && !foundUser.isAdmin;
  
  if (!appSettings) {
     return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm">
            <AlertDialog open={true}>
            <AlertDialogContent>
                <AlertDialogHeader className="text-center items-center">
                    <div className="p-3 bg-primary/10 rounded-full mb-2">
                        <Boxes className="h-6 w-6 text-primary" />
                    </div>
                    <AlertDialogTitle>Global Asset Hub</AlertDialogTitle>
                    <AlertDialogDescription>
                        Please sign in to continue.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4 space-y-4">
                {!foundUser || isMultiStateUser ? (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="loginName">Login Name</Label>
                            <Input 
                            id="loginName" 
                            type="text"
                            placeholder="Enter your login name"
                            value={loginName} 
                            onChange={(e) => setLoginName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input 
                            id="password" 
                            type="password"
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                            />
                        </div>
                    </>
                ) : null}

                {isMultiStateUser && (
                    <>
                     <Separator />
                     <p className="text-sm text-center text-muted-foreground">Login successful. Please select your location for this session.</p>
                     <div className="space-y-2">
                        <Label htmlFor="state">Assigned Location</Label>
                        <Select onValueChange={setSelectedState} value={selectedState}>
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
                    </>
                )}

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Login Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                </div>
                <AlertDialogFooter>
                    {isMultiStateUser ? (
                        <Button className="w-full" onClick={() => handleConfirm(foundUser!, selectedState)} disabled={isSaving || !selectedState}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm and Continue
                        </Button>
                    ) : (
                        <Button className="w-full" onClick={handleLogin} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Sign In
                        </Button>
                    )}
                </AlertDialogFooter>
            </AlertDialogContent>
            </AlertDialog>
        </div>
    </div>
  );
}

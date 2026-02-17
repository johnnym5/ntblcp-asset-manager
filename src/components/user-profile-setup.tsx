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
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Loader2 } from 'lucide-react';
import type { AuthorizedUser } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle, Boxes } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useAppState } from '@/contexts/app-state-context';

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
  
  const { login } = useAuth();
  const { appSettings } = useAppState();

  const handleLogin = async () => {
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

    const allUsers = [...(appSettings.authorizedUsers || []), superAdmin];
    const user = allUsers.find(
      u => u.loginName.toLowerCase() === loginName.toLowerCase().trim()
    );

    if (!user) {
      setError("Invalid login name or password.");
      return;
    }

    // Handle guest login (no password needed)
    if (user.isGuest) {
      setIsSaving(true);
      await login(user);
      setIsSaving(false);
      return; 
    }
    
    // Handle normal user login (password is required)
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    if (user.password === password) {
      setIsSaving(true);
      await login(user);
      setIsSaving(false);
    } else {
      setError("Invalid login name or password.");
    }
  };
  
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
                    <AlertDialogTitle>NTBLCP Asset Manager</AlertDialogTitle>
                    <AlertDialogDescription>
                        Please sign in to continue.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4 space-y-4">
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

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Login Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                </div>
                <AlertDialogFooter>
                    <Button className="w-full" onClick={handleLogin} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Sign In
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
            </AlertDialog>
        </div>
    </div>
  );
}

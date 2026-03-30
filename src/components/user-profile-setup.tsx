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
import { Loader2, AlertCircle, Package } from 'lucide-react';
import type { AuthorizedUser } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { useAuth } from '@/contexts/auth-context';
import { useAppState } from '@/contexts/app-state-context';
import { Separator } from './ui/separator';

const superAdmin: AuthorizedUser = {
  loginName: 'admin',
  displayName: 'Super Admin',
  email: 'admin',
  password: 'setup',
  states: ['All'],
  isAdmin: true,
  isGuest: false,
  canAddAssets: true,
  canEditAssets: true,
};

export default function UserProfileSetup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [foundUser, setFoundUser] = useState<AuthorizedUser | null>(null);
  const [selectedState, setSelectedState] = useState<string>('');
  
  const { login } = useAuth();
  const { appSettings, settingsLoaded } = useAppState();

  const handleLogin = () => {
    setError(null);
    if (!email) {
      setError("Please enter your email or login ID.");
      return;
    }

    if (!settingsLoaded) {
      setError("System still initializing. Please wait a moment.");
      return;
    }

    const allUsers = [...(appSettings?.authorizedUsers || []), superAdmin];
    const searchTerm = email.toLowerCase().trim();

    const user = allUsers.find(
      u => (u.email && u.email.toLowerCase() === searchTerm) || 
           (u.loginName && u.loginName.toLowerCase() === searchTerm)
    );

    if (!user) {
      setError("Invalid credentials. Please contact an administrator.");
      return;
    }

    if (user.isGuest) {
      setFoundUser(user);
      if (user.states.length === 1 && user.states[0] !== 'All') {
        setSelectedState(user.states[0]);
        handleConfirm(user, user.states[0]);
      } else if (user.isAdmin || user.states.includes('All')) {
        setSelectedState('All');
        handleConfirm(user, 'All');
      }
      return; 
    }
    
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    if (user.password === password) {
      setFoundUser(user);
      if (user.states.length === 1 && user.states[0] !== 'All') {
        setSelectedState(user.states[0]);
        handleConfirm(user, user.states[0]);
      } else if (user.isAdmin || user.states.includes('All')) {
        setSelectedState('All');
        handleConfirm(user, 'All');
      }
    } else {
      setError("Invalid credentials.");
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
  
  const isMultiStateUser = foundUser && foundUser.states.length > 1 && !foundUser.isAdmin && !foundUser.states.includes('All');

  if (!settingsLoaded) {
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
            <AlertDialogContent className="rounded-3xl border-primary/10">
                <AlertDialogHeader className="text-center items-center">
                    <div className="p-3 bg-primary/10 rounded-full mb-2">
                        <Package className="h-6 w-6 text-primary" />
                    </div>
                    <AlertDialogTitle className="text-2xl font-black tracking-tight">Assetain Registry</AlertDialogTitle>
                    <AlertDialogDescription className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground opacity-70">
                        Secure Authentication Gateway
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4 space-y-4">
                {!foundUser || isMultiStateUser ? (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Identity (Email or ID)</Label>
                            <Input 
                            id="email" 
                            type="text"
                            placeholder="username or email"
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)}
                            className="h-11 rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" title="password" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Access Passphrase</Label>
                            <Input 
                            id="password" 
                            type="password"
                            placeholder="••••••••"
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                            className="h-11 rounded-xl"
                            />
                        </div>
                    </>
                ) : null}

                {isMultiStateUser && (
                    <>
                     <Separator className="opacity-50" />
                     <p className="text-[11px] text-center font-medium text-muted-foreground leading-relaxed">Identity verified. Please select your regional authorized scope for this session.</p>
                     <div className="space-y-2">
                        <Label htmlFor="state" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Regional Scope</Label>
                        <Select onValueChange={setSelectedState} value={selectedState}>
                            <SelectTrigger id="state" className="h-11 rounded-xl">
                            <SelectValue placeholder="Select a location..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                {foundUser.states.map((state) => (
                                <SelectItem key={state} value={state} className="rounded-lg">
                                    {state}
                                </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                     </div>
                    </>
                )}

                {error && (
                    <Alert variant="destructive" className="rounded-2xl border-2 bg-destructive/5">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle className="font-bold">Authentication Failed</AlertTitle>
                        <AlertDescription className="text-xs">{error}</AlertDescription>
                    </Alert>
                )}
                </div>
                <AlertDialogFooter className="mt-2">
                    {isMultiStateUser ? (
                        <Button className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20" onClick={() => handleConfirm(foundUser!, selectedState)} disabled={isSaving || !selectedState}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirm Scope & Entry'}
                        </Button>
                    ) : (
                        <Button className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20" onClick={handleLogin} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Sign In to System'}
                        </Button>
                    )}
                </AlertDialogFooter>
            </AlertDialogContent>
            </AlertDialog>
        </div>
    </div>
  );
}

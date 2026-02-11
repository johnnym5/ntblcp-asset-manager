'use client';

import React, { useState, useCallback } from 'react';
import { Loader2, PartyPopper, AlertTriangle, Boxes } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { getAssets as getAssetsRTDB, getSettings } from '@/lib/database';
import { saveAssets, saveLocalSettings } from '@/lib/idb';
import { addNotification } from '@/hooks/use-notifications';
import { useAuth } from '@/contexts/auth-context';
import type { AuthorizedUser } from '@/lib/types';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

export function FirstTimeSetup({ onSetupComplete }: { onSetupComplete: () => void }) {
  const [step, setStep] = useState<'login' | 'downloading' | 'finished' | 'error'>('login');
  
  // Login State
  const [loginName, setLoginName] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [foundUser, setFoundUser] = useState<AuthorizedUser | null>(null);
  const [selectedState, setSelectedState] = useState<string>('');

  // Download State
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const { login } = useAuth();

  const handleLogin = async () => {
    setLoginError(null);
    if (!loginName) {
      setLoginError("Please enter your login name.");
      return;
    }
    
    const remoteSettings = await getSettings();
    if (!remoteSettings) {
        setLoginError("Could not connect to the database to verify settings. Please check your internet connection.");
        return;
    }

    const allUsers = [...remoteSettings.authorizedUsers, superAdmin];
    const user = allUsers.find(
      u => u.loginName.toLowerCase() === loginName.toLowerCase().trim()
    );

    if (!user || (user.password && user.password !== password)) {
      setLoginError("Invalid login name or password.");
      return;
    }
    
    setFoundUser(user);
    if (user.states.length === 1 && user.states[0] !== 'All') {
        setSelectedState(user.states[0]);
        await performInitialSetup(user, user.states[0], remoteSettings);
    } else if (user.isAdmin) {
        setSelectedState('All');
        await performInitialSetup(user, 'All', remoteSettings);
    }
  };

  const handleConfirmAndDownload = async () => {
    if (!foundUser || !selectedState) return;
    const remoteSettings = await getSettings();
    if (!remoteSettings) {
       setLoginError("Could not connect to the database. Please check internet connection.");
       return;
    }
    await performInitialSetup(foundUser, selectedState, remoteSettings);
  }

  const performInitialSetup = useCallback(async (user: AuthorizedUser, state: string, settings: any) => {
    setStep('downloading');
    setDownloadError(null);
    
    try {
      await login(user, state);
      await saveLocalSettings(settings);
      const assets = await getAssetsRTDB();
      await saveAssets(assets.map(a => ({...a, syncStatus: 'synced'})));

      localStorage.setItem('app-setup-complete', 'true');
      
      setStep('finished');
      addNotification({ title: 'Setup Complete', description: 'Application data has been downloaded successfully.' });

    } catch (e: any) {
      console.error("First time setup failed:", e);
      let errorMessage = e.message || 'An unknown error occurred.';
      if (errorMessage.includes('auth/network-request-failed') || errorMessage.includes('net::ERR_INTERNET_DISCONNECTED')) {
          errorMessage = "Could not connect to the database. Please check your internet connection and try again.";
      }
      setDownloadError(errorMessage);
      setStep('error');
    }
  }, [login]);

  const handleRetry = async () => {
    if (!foundUser || !selectedState) {
        setStep('login');
        return;
    };
     const remoteSettings = await getSettings();
     if (!remoteSettings) {
        setDownloadError("Could not connect to the database. Please check internet connection.");
        setStep('error');
        return;
     }
    await performInitialSetup(foundUser, selectedState, remoteSettings);
  };

  const renderContent = () => {
    switch (step) {
      case 'login':
        const isMultiStateUser = foundUser && foundUser.states.length > 1 && !foundUser.isAdmin;
        return (
          <>
            <CardHeader className="text-center items-center">
                <div className="p-3 bg-primary/10 rounded-full mb-2">
                    <Boxes className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Welcome to Global Asset Hub</CardTitle>
                <CardDescription>
                   This is your first time using the app on this device. Please sign in to download your data.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {!isMultiStateUser ? (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="loginName">Login Name</Label>
                            <Input id="loginName" value={loginName} onChange={(e) => setLoginName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
                        </div>
                    </>
                ) : (
                    <>
                        <p className="text-sm text-center">Login successful, <b>{foundUser.displayName}</b>. Please select your location to continue.</p>
                    </>
                )}
                {loginError && <p className="text-sm text-destructive text-center">{loginError}</p>}
                {isMultiStateUser && (
                    <>
                        <Separator />
                        <div className="space-y-2">
                            <Label htmlFor="state">Select Your Location for this Session</Label>
                            <Select onValueChange={setSelectedState} value={selectedState}>
                                <SelectTrigger id="state"><SelectValue placeholder="Select a location..." /></SelectTrigger>
                                <SelectContent>{foundUser.states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </>
                )}
            </CardContent>
            <CardFooter>
                 {isMultiStateUser ? (
                    <Button className="w-full" onClick={handleConfirmAndDownload} disabled={!selectedState}>Continue to Download</Button>
                 ) : (
                    <Button className="w-full" onClick={handleLogin}>Sign In & Download</Button>
                 )}
            </CardFooter>
          </>
        );
      case 'downloading':
        return (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                Setting Up Your Application
              </CardTitle>
              <CardDescription>
                Please wait while we download the latest assets and configuration. This only happens once.
              </CardDescription>
            </CardHeader>
             <CardContent className="text-sm text-muted-foreground space-y-4">
                <p><b>Welcome to the Global Asset Hub!</b> Once complete, the app will load instantly, even without an internet connection.</p>
            </CardContent>
          </>
        );
      case 'finished':
        return (
          <>
            <CardHeader className="items-center text-center">
              <PartyPopper className="h-12 w-12 text-green-500" />
              <CardTitle>You're All Set!</CardTitle>
              <CardDescription>
                The application has been successfully configured.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={onSetupComplete}>Continue to App</Button>
            </CardContent>
          </>
        );
      case 'error':
        return (
          <>
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle />
                Setup Failed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-destructive-foreground bg-destructive/90 p-4 rounded-md">
                {downloadError}
              </p>
              <Button className="w-full" onClick={handleRetry}>Retry Download</Button>
            </CardContent>
          </>
        )
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        {renderContent()}
      </Card>
    </div>
  );
}


'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, PartyPopper } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { getAssets as getAssetsRTDB, getSettings } from '@/lib/database';
import { saveAssets, saveLocalSettings } from '@/lib/idb';
import { useAppState } from '@/contexts/app-state-context';
import { addNotification } from '@/hooks/use-notifications';

export function FirstTimeSetup({ onSetupComplete }: { onSetupComplete: () => void }) {
  const [status, setStatus] = useState<'loading' | 'downloading' | 'finished' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const { setAppSettings, setAssets } = useAppState();

  useEffect(() => {
    const performInitialSetup = async () => {
      setStatus('downloading');
      try {
        // 1. Fetch Settings from the primary database (RTDB)
        const settings = await getSettings();
        if (!settings) {
          throw new Error('No application settings found in the database. Please configure settings as an admin first.');
        }

        // 2. Fetch Assets from the primary database (RTDB)
        const assets = await getAssetsRTDB();

        // 3. Save both to local IndexedDB
        await saveLocalSettings(settings);
        await saveAssets(assets.map(a => ({...a, syncStatus: 'synced'})));

        // 4. Update the application's global state
        setAppSettings(settings);
        setAssets(assets.map(a => ({...a, syncStatus: 'synced'})));

        setStatus('finished');
        addNotification({ title: 'Setup Complete', description: 'Application data has been downloaded successfully.' });

      } catch (e: any) {
        console.error("First time setup failed:", e);
        setError(e.message || 'An unknown error occurred during setup. Please check your internet connection and Firebase configuration.');
        setStatus('error');
      }
    };

    performInitialSetup();
  }, [setAppSettings, setAssets]);

  const renderContent = () => {
    switch (status) {
      case 'loading':
      case 'downloading':
        return (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                Setting Up Your Application
              </CardTitle>
              <CardDescription>
                Please wait a moment while we download the latest assets and configuration. This only happens on the first run.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-4">
                <p>
                    <b>Welcome to the Global Asset Hub!</b> This application is designed for robust, offline-first asset management.
                </p>
                <p>
                    During this one-time setup, we are downloading all necessary data to your device. Once complete, the app will load instantly, even without an internet connection. You can then manually sync your changes with the cloud when you're back online.
                </p>
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
                The application has been successfully configured and all data is now available offline.
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
              <CardTitle className="text-destructive">Setup Failed</CardTitle>
              <CardDescription>
                We couldn't complete the initial setup.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-destructive-foreground bg-destructive/90 p-4 rounded-md">
              <p>{error}</p>
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

'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, ServerCrash } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useAppState } from '@/contexts/app-state-context';
import { getAssets as getAssetsFS, getSettings as getSettingsFS } from '@/lib/firestore';
import { getAssets as getAssetsRTDB, getSettings as getSettingsRTDB } from '@/lib/database';
import { saveAssets, saveLocalSettings } from '@/lib/idb';
import { addNotification } from '@/hooks/use-notifications';
import { Button } from './ui/button';

export default function InitialSetup() {
    const { completeInitialSetup } = useAuth();
    const { setAssets, setAppSettings, activeDatabase } = useAppState();
    const [error, setError] = useState<string | null>(null);

    const performSetup = async () => {
        setError(null);
        addNotification({ title: 'Setting up your device...', description: 'Downloading the asset database for offline use. This may take a moment.' });
        try {
            // Fetch Assets
            const getCloudAssets = activeDatabase === 'firestore' ? getAssetsFS : getAssetsRTDB;
            const cloudAssets = await getCloudAssets();

            const assetsToSave = cloudAssets.map(asset => ({
                ...asset,
                syncStatus: 'synced' as const
            }));
            
            await saveAssets(assetsToSave);
            setAssets(assetsToSave);

            // Also fetch the latest settings
            const getCloudSettings = activeDatabase === 'firestore' ? getSettingsFS : getSettingsRTDB;
            const cloudSettings = await getCloudSettings();
            if (cloudSettings) {
                await saveLocalSettings(cloudSettings);
                setAppSettings(cloudSettings); // Update app state
            }
            
            addNotification({ title: 'Setup Complete!', description: 'Your local database is ready.' });
            completeInitialSetup();
        } catch (e) {
            console.error("Initial setup failed:", e);
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
            setError(`Failed to download the database. Please check your internet connection and try again. Error: ${errorMessage}`);
            addNotification({ title: 'Setup Failed', description: errorMessage, variant: 'destructive' });
        }
    };

    useEffect(() => {
        performSetup();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background gap-6 text-center">
            {error ? (
                <>
                    <ServerCrash className="h-16 w-16 text-destructive" />
                    <div className="max-w-md">
                        <h1 className="text-2xl font-bold">Setup Failed</h1>
                        <p className="text-muted-foreground mt-2">{error}</p>
                    </div>
                    <Button onClick={performSetup}>
                        Retry Download
                    </Button>
                </>
            ) : (
                <>
                    <Loader2 className="h-16 w-16 animate-spin text-primary" />
                    <div className="max-w-md">
                        <h1 className="text-2xl font-bold">Setting up your device...</h1>
                        <p className="text-muted-foreground mt-2">
                            Please wait while we download the asset database for offline use. This is a one-time setup and may take a few moments depending on the database size.
                        </p>
                    </div>
                </>
            )}
        </div>
    );
}

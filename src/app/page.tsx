'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import AppLayout from '@/components/app-layout';
import AssetList from '@/components/asset-list';
import { Loader2 } from 'lucide-react';
import UserProfileSetup from '@/components/user-profile-setup';
import { useAppState } from '@/contexts/app-state-context';
import { getAssets as getAssetsRTDB } from '@/lib/database';
import { saveAssets, getLocalAssets } from '@/lib/idb';
import { Button } from '@/components/ui/button';

const DataSetup = () => {
    const [status, setStatus] = useState<'checking' | 'downloading' | 'ready' | 'error'>('checking');
    const [error, setError] = useState<string | null>(null);

    const performDownload = async () => {
        setStatus('downloading');
        setError(null);
        try {
            console.log("Starting initial database download...");
            const assets = await getAssetsRTDB();
            await saveAssets(assets.map(a => ({ ...a, syncStatus: 'synced' })));
            localStorage.setItem('database-downloaded', 'true');
            console.log("Database download complete.");
            setStatus('ready');
        } catch (e) {
            console.error("Database download failed:", e);
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
            setStatus('error');
        }
    };

    useEffect(() => {
        const checkData = async () => {
            const isDownloaded = localStorage.getItem('database-downloaded') === 'true';
            if (isDownloaded) {
                // To be extra sure, we can check if there are actual assets in IDB
                const localAssets = await getLocalAssets();
                if (localAssets.length > 0) {
                    setStatus('ready');
                    return;
                }
            }
            // If flag is missing or db is empty, download.
            await performDownload();
        };
        checkData();
    }, []);

    if (status === 'checking' || status === 'downloading') {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">Setting up your local database for offline access...</p>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background p-8 text-center">
                 <h2 className="text-xl font-semibold text-destructive">Download Failed</h2>
                 <p className="text-muted-foreground">{error}</p>
                 <Button onClick={performDownload}>Retry Download</Button>
            </div>
        );
    }
    
    // if status is 'ready'
    return (
        <AppLayout>
            <AssetList />
        </AppLayout>
    );
};

export default function Page() {
  const { userProfile, profileSetupComplete, authInitialized } = useAuth();
  const { setGlobalStateFilter } = useAppState();

  useEffect(() => {
    if (profileSetupComplete && userProfile) {
      setGlobalStateFilter(userProfile.state || '');
    }
  }, [profileSetupComplete, userProfile, setGlobalStateFilter]);

  // This is the main gatekeeper. We wait until auth state is fully resolved.
  if (!authInitialized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // After auth is initialized, we decide what to show.
  if (!profileSetupComplete) {
    return <UserProfileSetup />;
  }
  
  // If user is logged in, we render the DataSetup component which handles the one-time download.
  return <DataSetup />;
}

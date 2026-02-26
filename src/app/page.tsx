'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import AppLayout from '@/components/app-layout';
import AssetList from '@/components/asset-list';
import { Loader2, CheckCircle } from 'lucide-react';
import UserProfileSetup from '@/components/user-profile-setup';
import { useAppState } from '@/contexts/app-state-context';
import { Button } from '@/components/ui/button';

const loadingTips = [
    "Tip: You can work completely offline. Your changes will be saved and can be uploaded to the cloud later.",
    "Did you know? You can create custom travel reports in Word format from the data management settings.",
    "Getting Started: Import your existing Excel asset lists using the 'Scan and Import Workbook' feature in Settings.",
    "Tip: Use the 'Locked Offline' data source as a sandbox for reviewing new imports before merging them.",
    "Power User: Batch edit multiple assets at once by selecting them in the table view.",
    "Customization: You can reorder and hide columns for each sheet type in the Settings panel."
];

export default function Page() {
  const { userProfile, loading, profileSetupComplete } = useAuth();
  const { 
    setGlobalStateFilter,
    firstTimeSetupStatus,
    setFirstTimeSetupStatus
  } = useAppState();
  
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    if (loading || firstTimeSetupStatus === 'syncing') {
      const timer = setInterval(() => {
        setTipIndex((prevIndex) => (prevIndex + 1) % loadingTips.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [loading, firstTimeSetupStatus]);

  useEffect(() => {
    if (userProfile && profileSetupComplete) {
      if (userProfile.isAdmin) {
        setGlobalStateFilter('All');
      } else {
        setGlobalStateFilter(userProfile.states?.[0] || '');
      }
    }
  }, [userProfile, profileSetupComplete, setGlobalStateFilter]);

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background gap-6 text-center p-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <h1 className="text-xl font-bold">Initializing Global AssetsHub</h1>
        <div className="bg-muted/50 p-6 rounded-lg border border-dashed max-w-md w-full animate-in fade-in zoom-in duration-500">
          <p className="text-sm font-medium text-primary mb-2 uppercase tracking-wider">Helpful Tip</p>
          <p className="text-foreground italic">{loadingTips[tipIndex]}</p>
        </div>
      </div>
    );
  }

  if (!profileSetupComplete) {
    return <UserProfileSetup />;
  }
  
  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Background Application Shell - Always mounted to handle setup sync logic */}
      <AppLayout>
          <AssetList />
      </AppLayout>

      {/* Setup Overlay */}
      {firstTimeSetupStatus !== 'idle' && (
        <div className="fixed inset-0 z-[100] flex h-screen w-full flex-col items-center justify-center bg-background gap-6 text-center p-4 backdrop-blur-sm">
          {firstTimeSetupStatus === 'syncing' && (
            <>
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <h1 className="text-2xl font-bold">Performing First-Time Setup</h1>
              <p className="text-muted-foreground max-w-sm">
                Downloading the asset database for your location. Please wait...
              </p>
              <div className="bg-muted/50 p-6 rounded-lg border border-dashed max-w-md w-full animate-in fade-in zoom-in duration-500">
                <p className="text-sm font-medium text-primary mb-2 uppercase tracking-wider">Helpful Tip</p>
                <p className="text-foreground italic">{loadingTips[tipIndex]}</p>
              </div>
            </>
          )}
          {firstTimeSetupStatus === 'complete' && (
            <>
              <CheckCircle className="h-16 w-16 text-green-500 animate-in zoom-in duration-300" />
              <h1 className="text-2xl font-bold">Setup Successful!</h1>
              <p className="text-muted-foreground max-w-sm">
                Your local database is now up-to-date with the latest assets.
              </p>
              <Button size="lg" onClick={() => setFirstTimeSetupStatus('idle')} className="px-8 shadow-lg shadow-primary/20">
                Continue to Asset Manager
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

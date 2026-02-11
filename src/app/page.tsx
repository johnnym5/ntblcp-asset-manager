
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import AppLayout from '@/components/app-layout';
import AssetList from '@/components/asset-list';
import { Loader2 } from 'lucide-react';
import UserProfileSetup from '@/components/user-profile-setup';
import { useAppState } from '@/contexts/app-state-context';
import { getLocalSettings } from '@/lib/idb';
import { FirstTimeSetup } from '@/components/first-time-setup';

export default function Page() {
  const { userProfile, loading: authLoading, profileSetupComplete } = useAuth();
  const { setGlobalStateFilter, settingsLoaded } = useAppState();

  // New state to track if this is the first run
  const [isFirstRun, setIsFirstRun] = useState<boolean | null>(null);

  useEffect(() => {
    const checkFirstRun = async () => {
      // Check if settings exist in IndexedDB. If not, it's a first run.
      const localSettings = await getLocalSettings();
      setIsFirstRun(localSettings === null);
    };

    // Only check once settings from the context have tried to load.
    if (settingsLoaded) {
      checkFirstRun();
    }
  }, [settingsLoaded]);

  useEffect(() => {
    if (profileSetupComplete && userProfile) {
      setGlobalStateFilter(userProfile.state || '');
    }
  }, [profileSetupComplete, userProfile, setGlobalStateFilter]);

  // Handle the completion of the first-time setup
  const handleSetupComplete = () => {
    setIsFirstRun(false);
  };

  // Loading state while we determine if it's a first run
  if (isFirstRun === null || !settingsLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // If it's the first run, show the setup component
  if (isFirstRun) {
    return <FirstTimeSetup onSetupComplete={handleSetupComplete} />;
  }
  
  // If not the first run, proceed with the normal auth flow
  if (authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!profileSetupComplete) {
    return <UserProfileSetup />;
  }

  return (
    <AppLayout>
      <AssetList />
    </AppLayout>
  );
}

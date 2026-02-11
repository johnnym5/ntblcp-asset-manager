'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import AppLayout from '@/components/app-layout';
import AssetList from '@/components/asset-list';
import { Loader2 } from 'lucide-react';
import UserProfileSetup from '@/components/user-profile-setup';
import { useAppState } from '@/contexts/app-state-context';
import { FirstTimeSetup } from '@/components/first-time-setup';

export default function Page() {
  const { userProfile, loading: authLoading, profileSetupComplete } = useAuth();
  const { setGlobalStateFilter, settingsLoaded, appSettings } = useAppState();
  
  // This state is just to force a re-render after setup is done *in the same session*.
  const [setupSessionComplete, setSetupSessionComplete] = useState(false);

  useEffect(() => {
    if (profileSetupComplete && userProfile) {
      setGlobalStateFilter(userProfile.state || '');
    }
  }, [profileSetupComplete, userProfile, setGlobalStateFilter]);

  const handleSetupComplete = () => {
    // When setup is done, AppStateProvider will have new appSettings.
    // This state flip forces the page component to re-evaluate its logic.
    setSetupSessionComplete(true);
  };

  // While we wait for settings to be loaded from IDB
  if (!settingsLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // If settings have been checked and are null, it's a first run.
  if (!appSettings && !setupSessionComplete) {
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

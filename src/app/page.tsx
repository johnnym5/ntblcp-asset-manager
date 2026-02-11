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
  
  // This state is crucial for preventing the setup screen from flashing on reload.
  // We initialize to `null` to represent an undetermined state.
  const [isSetupFlagPresent, setIsSetupFlagPresent] = useState<boolean | null>(null);

  useEffect(() => {
    // This effect runs only on the client-side after hydration.
    // It checks for the persistent flag that is set only after a successful first-time setup.
    const setupComplete = localStorage.getItem('app-setup-complete') === 'true';
    setIsSetupFlagPresent(setupComplete);
  }, []);

  useEffect(() => {
    if (profileSetupComplete && userProfile) {
      setGlobalStateFilter(userProfile.state || '');
    }
  }, [profileSetupComplete, userProfile, setGlobalStateFilter]);

  // While we wait for the client-side check of localStorage, show a loader.
  // This prevents a flash of the wrong component.
  if (isSetupFlagPresent === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // If the flag is definitively not present, it's a true first-time run.
  if (!isSetupFlagPresent) {
    return <FirstTimeSetup onSetupComplete={() => window.location.reload()} />;
  }
  
  // If the setup flag IS present, we proceed to the normal application flow.
  // We still need to wait for settings from IDB and the user profile to be ready.
  if (authLoading || !settingsLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // Handle an edge case where the flag is present but settings are missing (e.g., cleared browser data)
  if (settingsLoaded && !appSettings) {
      // This is an inconsistent state. The best recovery is to force a re-setup.
      localStorage.removeItem('app-setup-complete');
      return <FirstTimeSetup onSetupComplete={() => window.location.reload()} />;
  }

  // If setup is done and data is loaded, check if the user needs to log in.
  if (!profileSetupComplete) {
    return <UserProfileSetup />;
  }

  // Finally, show the main application.
  return (
    <AppLayout>
      <AssetList />
    </AppLayout>
  );
}

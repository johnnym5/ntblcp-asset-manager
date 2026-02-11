'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import AppLayout from '@/components/app-layout';
import AssetList from '@/components/asset-list';
import { Loader2 } from 'lucide-react';
import UserProfileSetup from '@/components/user-profile-setup';
import { useAppState } from '@/contexts/app-state-context';

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
  
  // If user is logged in and profile is set up, render the app directly.
  // The AssetList component will handle loading data from IndexedDB.
  return (
    <AppLayout>
        <AssetList />
    </AppLayout>
  );
}

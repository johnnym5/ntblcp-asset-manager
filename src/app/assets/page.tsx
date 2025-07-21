
'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import AppLayout from '@/components/app-layout';
import AssetList from '@/components/asset-list';
import { Loader2 } from 'lucide-react';
import UserProfileSetup from '@/components/auth/user-profile-setup';
import { useAppState } from '@/contexts/app-state-context';

export default function AssetsPage() {
  const { user, userProfile, loading, authInitialized } = useAuth();
  const { setGlobalStateFilter } = useAppState();

  useEffect(() => {
    if (userProfile && userProfile.state) {
      setGlobalStateFilter(userProfile.state);
    } else {
      setGlobalStateFilter('All');
    }
  }, [userProfile, setGlobalStateFilter]);

  // The key change: wait for auth to be fully initialized AND for loading to be false.
  // This ensures we have the user and their profile before rendering anything that might fetch data.
  if (loading || !authInitialized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Authenticating...</p>
      </div>
    );
  }

  // If initialization is complete and there's no user, show the login page.
  if (!user) {
    return <UserProfileSetup />;
  }

  // If we have a user, render the app.
  return (
    <AppLayout>
      <AssetList />
    </AppLayout>
  );
}

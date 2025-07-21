
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
    if (userProfile) {
      setGlobalStateFilter(userProfile.state || 'All');
    }
  }, [userProfile, setGlobalStateFilter]);

  // This is the key change: wait for Firebase to be fully initialized.
  if (loading || !authInitialized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Initializing...</p>
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

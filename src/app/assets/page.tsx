
'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import AppLayout from '@/components/app-layout';
import AssetList from '@/components/asset-list';
import { Loader2 } from 'lucide-react';
import UserProfileSetup from '@/components/auth/user-profile-setup';
import { useAppState } from '@/contexts/app-state-context';

export default function AssetsPage() {
  const { userProfile, loading, profileSetupComplete, authInitialized } = useAuth();
  const { setGlobalStateFilter } = useAppState();

  useEffect(() => {
    if (profileSetupComplete && userProfile) {
      // Admins see all by default, users are locked to their state
      const filter = userProfile.role === 'admin' ? 'All' : userProfile.state;
      setGlobalStateFilter(filter);
    }
  }, [profileSetupComplete, userProfile, setGlobalStateFilter]);

  // This is the key change: Wait until Firebase has confirmed the user's auth state.
  if (!authInitialized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Connecting to the server...</p>
      </div>
    );
  }

  // Once auth is initialized, if no user is logged in, show the setup/login component.
  if (!userProfile) {
    return <UserProfileSetup />;
  }

  // If a profile is loaded but some setup is still pending (e.g. role fetch)
  if (loading) {
     return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
         <p className="ml-4 text-muted-foreground">Loading user profile...</p>
      </div>
    );
  }
  
  return (
    <AppLayout>
      <AssetList />
    </AppLayout>
  );
}

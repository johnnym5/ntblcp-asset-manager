
'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import AppLayout from '@/components/app-layout';
import AssetList from '@/components/asset-list';
import { Loader2 } from 'lucide-react';
import UserProfileSetup from '@/components/user-profile-setup';
import { useAppState } from '@/contexts/app-state-context';
import InitialSetup from '@/components/initial-setup';

export default function Page() {
  const { userProfile, loading, profileSetupComplete, initialSetupPending } = useAuth();
  const { setGlobalStateFilter } = useAppState();

  useEffect(() => {
    if (userProfile && (profileSetupComplete || initialSetupPending)) {
      if (userProfile.isAdmin) {
        setGlobalStateFilter('All');
      } else {
        setGlobalStateFilter(userProfile.states?.[0] || '');
      }
    }
  }, [userProfile, profileSetupComplete, initialSetupPending, setGlobalStateFilter]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (initialSetupPending) {
    return <InitialSetup />;
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

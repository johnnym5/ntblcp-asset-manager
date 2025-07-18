
'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import AppLayout from '@/components/app-layout';
import AssetList from '@/components/asset-list';
import { Loader2 } from 'lucide-react';
import UserProfileSetup from '@/components/state-selector';
import { useAppState } from '@/contexts/app-state-context';

export default function AssetsPage() {
  const { userProfile, loading, profileSetupComplete, updateProfile } = useAuth();
  const { setGlobalStateFilter } = useAppState();

  useEffect(() => {
    if (profileSetupComplete && userProfile) {
      setGlobalStateFilter(userProfile.state || '');
    }
  }, [profileSetupComplete, userProfile, setGlobalStateFilter]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!profileSetupComplete) {
    return (
      <UserProfileSetup
        isOpen={true}
        onSubmit={updateProfile}
        defaultDisplayName={userProfile?.displayName}
      />
    );
  }


  return (
    <AppLayout>
      <AssetList />
    </AppLayout>
  );
}


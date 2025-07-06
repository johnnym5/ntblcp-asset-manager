
'use client';

import { useAuth } from '@/contexts/auth-context';
import AppLayout from '@/components/app-layout';
import AssetList from '@/components/asset-list';
import { Loader2 } from 'lucide-react';
import UserProfileSetup from '@/components/state-selector';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AssetsPage() {
  const { user, loading, profileSetupComplete, updateProfile, userProfile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // Redirect is handled by useEffect
    return null;
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


'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import AppLayout from '@/components/app-layout';
import AssetList from '@/components/asset-list';
import { Loader2 } from 'lucide-react';
import StateSelector from '@/components/state-selector';
import { updateUserProfile } from '@/lib/firestore';

export default function AssetsPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const [isStateSelectorOpen, setIsStateSelectorOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (userProfile?.role === 'user' && !userProfile.state) {
        setIsStateSelectorOpen(true);
      }
    }
  }, [user, userProfile, loading, router]);

  const handleStateSelect = async (state: string) => {
    if (user) {
      await updateUserProfile(user.uid, { state });
      // This will trigger a re-fetch of userProfile in the auth context,
      // but for immediate UI update, we can close the modal.
      setIsStateSelectorOpen(false);
      // It's good practice to reload or force context update here.
      // For now, the app will become usable, but might need a refresh to fetch filtered data.
      window.location.reload(); 
    }
  };

  if (loading || !user || isStateSelectorOpen) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        {isStateSelectorOpen && user ? (
          <StateSelector
            isOpen={isStateSelectorOpen}
            onOpenChange={setIsStateSelectorOpen}
            onStateSelect={handleStateSelect}
          />
        ) : (
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        )}
      </div>
    );
  }

  return (
    <AppLayout>
      <AssetList />
    </AppLayout>
  );
}


'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import AppLayout from '@/components/app-layout';
import AssetList from '@/components/asset-list';
import { Loader2 } from 'lucide-react';
import StateSelector from '@/components/state-selector';
import { updateUserProfile } from '@/lib/firestore';
import { anonymousSignIn } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

export default function AssetsPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isStateSelectorOpen, setIsStateSelectorOpen] = useState(false);
  const guestSignInAttempted = useRef(false);

  useEffect(() => {
    if (loading) {
      return; // Wait until auth is resolved
    }

    if (!user) {
      // Prevent multiple sign-in attempts
      if (guestSignInAttempted.current) return;
      guestSignInAttempted.current = true;
      
      toast({ description: 'Signing in as guest...' });
      anonymousSignIn().catch((error: any) => {
        let description = 'Could not sign in as guest. Please try again.';
        if (error.code === 'auth/admin-restricted-operation') {
          description = 'Anonymous sign-in is not enabled. Please enable it in your Firebase project settings.';
        }
        toast({
          variant: 'destructive',
          title: 'Guest Sign In Failed',
          description: description,
        });
        router.push('/login'); // Fallback to login if guest sign in fails
      });
    } else if (userProfile?.role === 'user' && !userProfile.state) {
      setIsStateSelectorOpen(true);
    }
  }, [user, userProfile, loading, router, toast]);

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

  if (loading || !user || (userProfile?.role === 'user' && !userProfile.state)) {
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

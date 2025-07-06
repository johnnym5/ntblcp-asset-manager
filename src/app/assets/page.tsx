
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import AppLayout from '@/components/app-layout';
import AssetList from '@/components/asset-list';
import { Loader2 } from 'lucide-react';
import StateSelector from '@/components/state-selector';
import { updateUserProfile } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';

export default function AssetsPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isStateSelectorOpen, setIsStateSelectorOpen] = useState(false);

  useEffect(() => {
    if (loading) {
      return; // Wait until auth is resolved
    }
    if (!user) {
      router.push('/login');
    } else if (userProfile?.role === 'user' && !userProfile.state) {
      setIsStateSelectorOpen(true);
    }
  }, [user, userProfile, loading, router]);

  const handleStateSelect = async (state: string) => {
    if (user) {
       try {
        await updateUserProfile(user.uid, { state });
        setIsStateSelectorOpen(false);
        toast({ title: "State Selected", description: "Your asset view has been updated." });
        // The auth context will update automatically, triggering a re-render
        // but a reload ensures all components get the new profile state cleanly.
        window.location.reload(); 
      } catch (error) {
        toast({ variant: 'destructive', title: "Error", description: "Could not update your state." });
      }
    }
  };

  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (userProfile?.role === 'user' && !userProfile.state) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <StateSelector
          isOpen={isStateSelectorOpen}
          onOpenChange={setIsStateSelectorOpen} // Allow closing, though it will re-open
          onStateSelect={handleStateSelect}
        />
      </div>
    );
  }

  return (
    <AppLayout>
      <AssetList />
    </AppLayout>
  );
}

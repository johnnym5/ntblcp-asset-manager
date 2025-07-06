'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import AppLayout from '@/components/app-layout';
import AssetList from '@/components/asset-list';
import { Loader2 } from 'lucide-react';

export default function AssetsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If loading is finished and there's no user, redirect to login.
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // While loading or if there's no user, show a loading spinner.
  // This prevents a flash of the asset page before the redirect.
  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // If the user is authenticated, show the main application.
  return (
    <AppLayout>
      <AssetList />
    </AppLayout>
  );
}

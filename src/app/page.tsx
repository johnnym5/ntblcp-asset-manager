'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import AppLayout from '@/components/app-layout';
import AssetList from '@/components/asset-list';
import { Loader2 } from 'lucide-react';
import UserProfileSetup from '@/components/user-profile-setup';
import { useAppState } from '@/contexts/app-state-context';

const loadingTips = [
    "Tip: You can work completely offline. Your changes will be saved and can be uploaded to the cloud later.",
    "Did you know? You can create custom travel reports in Word format from the data management settings.",
    "Getting Started: Import your existing Excel asset lists using the 'Scan and Import Workbook' feature in Settings.",
    "Tip: Use the 'Locked Offline' data source as a sandbox for reviewing new imports before merging them.",
    "Power User: Batch edit multiple assets at once by selecting them in the table view.",
    "Customization: You can reorder and hide columns for each sheet type in the Settings panel."
];

export default function Page() {
  const { userProfile, loading, profileSetupComplete } = useAuth();
  const { setGlobalStateFilter, setManualDownloadTrigger } = useAppState();
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    if (loading) {
      const timer = setInterval(() => {
        setTipIndex((prevIndex) => (prevIndex + 1) % loadingTips.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [loading]);

  useEffect(() => {
    if (profileSetupComplete) {
      setManualDownloadTrigger(c => c + 1);
    }
  }, [profileSetupComplete, setManualDownloadTrigger]);

  useEffect(() => {
    if (userProfile && profileSetupComplete) {
      if (userProfile.isAdmin) {
        setGlobalStateFilter('All');
      } else {
        setGlobalStateFilter(userProfile.states?.[0] || '');
      }
    }
  }, [userProfile, profileSetupComplete, setGlobalStateFilter]);

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background gap-4 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground max-w-sm">{loadingTips[tipIndex]}</p>
      </div>
    );
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

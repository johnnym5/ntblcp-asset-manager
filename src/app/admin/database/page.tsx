
'use client';

/**
 * @fileOverview Super Admin Database Workstation.
 * Restricted strictly to SUPERADMIN roles.
 * Phase 105: Protected with mounted check for static export stability.
 */

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/app-layout';
import { Terminal, ShieldAlert, Loader2, RefreshCw, Bomb, Hammer } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useAppState } from '@/contexts/app-state-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FirestoreService } from '@/services/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function DatabaseExplorerPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { assets, refreshRegistry } = useAppState();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isWipeOpen, setIsWipeOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || authLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (userProfile?.role !== 'SUPERADMIN') {
    return (
      <AppLayout>
        <div className="h-full flex flex-col items-center justify-center opacity-20 space-y-4 py-40">
          <ShieldAlert className="h-20 w-20" />
          <h2 className="text-xl font-black uppercase tracking-widest text-white">Clearance Denied: Super Admin Only</h2>
        </div>
      </AppLayout>
    );
  }

  const handleGlobalWipe = async () => {
    setIsProcessing(true);
    try {
      const count = await FirestoreService.purgeAllAssets();
      toast({ title: "Global Reset Complete", description: `Purged ${count} records from Cloud Authority.` });
      await refreshRegistry();
      setIsWipeOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-10">
        <div className="space-y-2">
          <h2 className="text-4xl font-black tracking-tighter text-white uppercase flex items-center gap-4 leading-none">
            <div className="p-3 bg-primary/10 rounded-2xl"><Terminal className="h-8 w-8 text-primary" /></div>
            Database Administration
          </h2>
          <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">
            Unrestricted Registry Mutation & Infrastructure Reset
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="bg-[#050505] border-2 border-white/5 rounded-[2rem] p-10">
            <CardHeader className="p-0 mb-6">
              <CardTitle className="text-xl font-black uppercase flex items-center gap-3">
                Registry Pulse
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-6">
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="opacity-40 uppercase">Total Cloud Records</span>
                <span className="text-primary">{assets?.length || 0}</span>
              </div>
              <Button onClick={refreshRegistry} className="w-full h-14 rounded-xl font-black uppercase text-[10px] tracking-widest gap-3 border-2 border-white/10 hover:bg-white/5">
                <RefreshCw className="h-4 w-4" /> Force Parity Refresh
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-destructive/5 border-2 border-destructive/20 rounded-[2rem] p-10">
            <CardHeader className="p-0 mb-6">
              <CardTitle className="text-xl font-black uppercase flex items-center gap-3 text-destructive">
                Maintenance Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-6">
              <p className="text-xs font-medium text-destructive/60 italic">Permanently clear all data across the global registry.</p>
              <Button onClick={() => setIsWipeOpen(true)} className="w-full h-14 rounded-xl font-black uppercase text-[10px] tracking-widest gap-3 bg-destructive text-white shadow-2xl">
                <Hammer className="h-4 w-4" /> Execute Global Wipe
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={isWipeOpen} onOpenChange={setIsWipeOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-destructive/20 p-10 bg-black shadow-3xl text-white">
          <AlertDialogHeader className="space-y-4">
            <AlertDialogTitle className="text-2xl font-black uppercase text-destructive tracking-tight">Immutable System Reset?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium italic text-white/60">
              This action will destroy EVERY record in the Firestore and RTDB storage nodes. It cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-10 gap-3">
            <AlertDialogCancel className="h-14 px-10 rounded-2xl font-bold border-2 border-white/10 m-0 text-white hover:bg-white/5">Abort</AlertDialogCancel>
            <AlertDialogAction onClick={handleGlobalWipe} disabled={isProcessing} className="h-14 px-12 rounded-2xl font-black uppercase bg-destructive text-white m-0">
              {isProcessing ? <Loader2 className="h-5 w-5 animate-spin mr-3" /> : <ShieldAlert className="h-5 w-5 mr-3" />} Commit Wipe
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}


"use client";

import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from './ui/button';
import { useAppState } from '@/contexts/app-state-context';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getLocalAssets, saveAssets, getLockedOfflineAssets, saveLockedOfflineAssets } from '@/lib/idb';
import { applyNtblcpFarPatch } from '@/lib/excel-parser';

interface DataPatchDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}


export function DataPatchDialog({ isOpen, onOpenChange }: DataPatchDialogProps) {
  const { setAssets, setOfflineAssets, dataSource } = useAppState();
  const [isPatching, setIsPatching] = useState(false);
  const { toast } = useToast();

  const handlePatch = async () => {
    setIsPatching(true);
    toast({ title: 'Applying Patch...', description: `Running the full NTBLCP-TB-FAR update.` });
    
    try {
      const isOfflineMode = dataSource === 'local_locked';
      const assetsToPatch = isOfflineMode ? await getLockedOfflineAssets() : await getLocalAssets();

      const { updatedAssets, updatedCount } = applyNtblcpFarPatch(assetsToPatch);
      
      if (isOfflineMode) {
        await saveLockedOfflineAssets(updatedAssets);
        setOfflineAssets(updatedAssets);
      } else {
        await saveAssets(updatedAssets);
        setAssets(updatedAssets);
      }

      toast({
        title: 'Patch Complete',
        description: `${updatedCount} assets were updated in the ${isOfflineMode ? 'Locked Offline' : 'Main'} store.`,
      });
    } catch (e) {
      toast({ title: 'Patch Failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setIsPatching(false);
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apply a Data Patch?</AlertDialogTitle>
          <AlertDialogDescription>
            This action will apply a one-time data correction to your local asset database based on a predefined script. This is used to fix widespread data errors. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4 space-y-2">
           <Button
            className="w-full justify-center"
            onClick={handlePatch}
            disabled={isPatching}
          >
            {isPatching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Apply Full NTBLCP-TB-FAR Patch
          </Button>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPatching}>Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

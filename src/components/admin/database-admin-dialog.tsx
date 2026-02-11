
"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { useAppState } from '@/contexts/app-state-context';
import { batchDeleteAssets } from '@/lib/firestore';
import { useAuth } from '@/contexts/auth-context';
import { Loader2, Trash2, FileUp, Download, DatabaseZap, AlertTriangle } from 'lucide-react';
import type { AppSettings, Asset } from '@/lib/types';
import { saveLocalSettings, clearLocalAssets, saveAssets, saveLockedOfflineAssets, getLocalAssets } from '@/lib/idb';
import { exportFullBackupToJson } from '@/lib/json-export';
import { addNotification } from '@/hooks/use-notifications';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

interface DatabaseAdminDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function DatabaseAdminDialog({ isOpen, onOpenChange }: DatabaseAdminDialogProps) {
  const { userProfile } = useAuth();
  const { appSettings, setAppSettings, assets, setAssets, setOfflineAssets, setIsSyncing } = useAppState();
  
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);
  
  const importFileRef = useRef<HTMLInputElement>(null);
  const [backupToRestore, setBackupToRestore] = useState<{ settings: AppSettings, assets: Asset[] } | null>(null);
  const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);

  const handleClearAll = async () => {
      setIsClearingAll(true);
      setIsClearAllConfirmOpen(false);
      addNotification({ title: "Clearing All Databases...", description: "This may take a moment."});
      try {
        await clearLocalAssets();
        setAssets([]);

        const firestoreAssets = await getLocalAssets();
        if (firestoreAssets.length > 0) {
            await batchDeleteAssets(firestoreAssets.map(a => a.id));
        }
        
        addNotification({ title: "All Databases Cleared", description: "Local and cloud asset stores are now empty."});
      } catch (e) {
        addNotification({ title: 'Clear Failed', description: (e as Error).message, variant: 'destructive'});
      }
      setIsClearingAll(false);
  }

  const handleImportFromJson = () => {
    importFileRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const result = JSON.parse(e.target?.result as string);
            if (result && result.settings && Array.isArray(result.assets)) {
                setBackupToRestore(result);
                setIsRestoreConfirmOpen(true);
            } else {
                addNotification({ title: 'Invalid Backup File', description: 'The selected JSON file does not have the correct structure.', variant: 'destructive' });
            }
        } catch (error) {
            addNotification({ title: 'Invalid JSON', description: 'Could not parse the selected file.', variant: 'destructive' });
        } finally {
             if (importFileRef.current) importFileRef.current.value = "";
        }
    };
    reader.readAsText(file);
  };
  
  const handleConfirmRestore = async () => {
    if (!backupToRestore) return;
    setIsRestoreConfirmOpen(false);
    setIsSyncing(true);
    addNotification({ title: 'Restoring from backup...', description: 'This may take a moment.' });
    
    try {
        const { assets: restoredAssets, settings: restoredSettings } = backupToRestore;
        
        const assetsToSync = restoredAssets.map(a => ({ ...a, syncStatus: 'local' as const }));

        // 1. Overwrite local databases
        await saveAssets(assetsToSync);
        await saveLockedOfflineAssets([]); 
        await saveLocalSettings(restoredSettings);

        // 2. Update app state
        setAssets(assetsToSync);
        setOfflineAssets([]);
        setAppSettings(restoredSettings);

        // 3. Push restored data to the cloud
        addNotification({ title: 'Local data restored', description: 'Uploading restored data to the cloud...' });
        if (assetsToSync.length > 0) {
            await batchSetAssets(assetsToSync);
        }
        
        const syncedAssets = assetsToSync.map(a => ({ ...a, syncStatus: 'synced' as const }));
        await saveAssets(syncedAssets);
        setAssets(syncedAssets);

        addNotification({ title: 'Restore Complete', description: 'Your application has been restored from the backup file.' });

    } catch (e) {
        addNotification({ title: 'Restore Failed', description: (e as Error).message, variant: 'destructive'});
    } finally {
        setIsSyncing(false);
        setBackupToRestore(null);
    }
  };
  
  if (userProfile?.loginName !== 'admin') {
    return null;
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><DatabaseZap /> Database Administration</DialogTitle>
            <DialogDescription>
              Manage advanced database settings. Changes here are critical and can affect all users.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 space-y-4">
              <Card>
                  <CardHeader>
                      <CardTitle>Backup & Restore</CardTitle>
                      <CardDescription>Export or import all assets and settings from a JSON file.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                      <input type="file" ref={importFileRef} onChange={handleFileSelected} accept=".json" className="hidden" />
                      <Button variant="outline" className="w-full justify-start" onClick={handleImportFromJson}>
                          <FileUp className="mr-2 h-4 w-4" /> Import from Backup (JSON)
                      </Button>
                      <Button variant="outline" className="w-full justify-start" onClick={() => exportFullBackupToJson(assets, appSettings)}>
                          <Download className="mr-2 h-4 w-4" /> Export Full Backup (Assets & Settings)
                      </Button>
                  </CardContent>
              </Card>

              <Card className="border-destructive">
                  <CardHeader>
                      <CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle/> Danger Zone</CardTitle>
                      <CardDescription>This action is irreversible and will affect all data.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <Button variant="destructive" className="w-full justify-start" onClick={() => setIsClearAllConfirmOpen(true)} disabled={isClearingAll}>
                          {isClearingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                          Clear All Assets in ALL Databases
                      </Button>
                  </CardContent>
              </Card>
            </div>

          <DialogFooter className="mt-auto">
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isRestoreConfirmOpen} onOpenChange={setIsRestoreConfirmOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Restore from Backup?</AlertDialogTitle>
                  <AlertDialogDescription>
                     This will overwrite all local and cloud data with the contents of the backup file. This action cannot be undone. Are you sure you want to proceed?
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setBackupToRestore(null)}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmRestore} className="bg-destructive hover:bg-destructive/90">
                      Yes, Overwrite and Restore
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isClearAllConfirmOpen} onOpenChange={setIsClearAllConfirmOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Clear ALL Databases?</AlertDialogTitle>
                  <AlertDialogDescription>
                      This is irreversible. It will delete all assets from your local device and from Cloud Firestore.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearAll} className="bg-destructive hover:bg-destructive/90">Confirm & Delete Everything</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

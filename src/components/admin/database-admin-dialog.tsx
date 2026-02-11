
"use client";

import React, { useState, useRef } from 'react';
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
import { batchDeleteAssets, getAssets } from '@/lib/firestore';
import { useAuth } from '@/contexts/auth-context';
import { Loader2, Trash2, FileUp, Download, DatabaseZap, AlertTriangle, GitMerge, CloudOff, HardDrive } from 'lucide-react';
import type { AppSettings, Asset } from '@/lib/types';
import { saveLocalSettings, clearLocalAssets, saveAssets, saveLockedOfflineAssets, getLocalAssets, getLockedOfflineAssets } from '@/lib/idb';
import { exportFullBackupToJson, exportSettingsToJson, exportAssetsToJson } from '@/lib/json-export';
import { addNotification } from '@/hooks/use-notifications';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';

interface DatabaseAdminDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function DatabaseAdminDialog({ isOpen, onOpenChange }: DatabaseAdminDialogProps) {
  const { userProfile } = useAuth();
  const { appSettings, setAppSettings, assets, setAssets, offlineAssets, setOfflineAssets, setIsSyncing } = useAppState();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmDescription, setConfirmDescription] = useState('');

  const importFileRef = useRef<HTMLInputElement>(null);
  const [backupToRestore, setBackupToRestore] = useState<{ settings: AppSettings, assets: Asset[] } | null>(null);

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
                openConfirmation('restore', 'Restore from Backup?', 'This will overwrite all local and cloud data with the contents of the backup file. This action cannot be undone.');
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
    setIsProcessing(true);
    addNotification({ title: 'Restoring from backup...', description: 'This may take a moment.' });
    
    try {
        const { assets: restoredAssets, settings: restoredSettings } = backupToRestore;
        const assetsToSync = restoredAssets.map(a => ({ ...a, syncStatus: 'local' as const }));
        
        await saveAssets(assetsToSync);
        await saveLockedOfflineAssets([]); 
        await saveLocalSettings(restoredSettings);

        setAssets(assetsToSync);
        setOfflineAssets([]);
        setAppSettings(restoredSettings);

        addNotification({ title: 'Local data restored', description: 'Uploading restored data to the cloud...' });
        if (assetsToSync.length > 0) await batchSetAssets(assetsToSync);
        
        const syncedAssets = assetsToSync.map(a => ({ ...a, syncStatus: 'synced' as const }));
        await saveAssets(syncedAssets);
        setAssets(syncedAssets);

        addNotification({ title: 'Restore Complete', description: 'Your application has been restored from the backup file.' });

    } catch (e) {
        addNotification({ title: 'Restore Failed', description: (e as Error).message, variant: 'destructive'});
    } finally {
        setIsProcessing(false);
        setBackupToRestore(null);
    }
  };

  const handleMergeOffline = async () => {
    setIsProcessing(true);
    addNotification({ title: "Merging Offline Data...", description: "This may take a moment."});
    try {
        const mainAssets = await getLocalAssets();
        const offline = await getLockedOfflineAssets();
        if (offline.length === 0) {
            addNotification({ title: 'Nothing to Merge', description: 'Your locked offline store is empty.'});
            setIsProcessing(false);
            return;
        }

        const mainAssetsMap = new Map(mainAssets.map(a => [a.id, a]));
        offline.forEach(asset => {
            mainAssetsMap.set(asset.id, { ...asset, syncStatus: 'local' });
        });
        
        const mergedAssets = Array.from(mainAssetsMap.values());

        await saveAssets(mergedAssets);
        await saveLockedOfflineAssets([]);

        setAssets(mergedAssets);
        setOfflineAssets([]);

        addNotification({ title: "Merge Complete", description: `${offline.length} assets from the offline store have been merged into the main list.` });
    } catch (e) {
      addNotification({ title: 'Merge Failed', description: (e as Error).message, variant: 'destructive'});
    }
    setIsProcessing(false);
  };

  const handleClearFirestoreOnly = async () => {
    setIsProcessing(true);
    addNotification({ title: "Clearing Firestore...", description: "This will remove all assets from the cloud database."});
    try {
      const firestoreAssets = await getAssets();
      if (firestoreAssets.length > 0) {
          await batchDeleteAssets(firestoreAssets.map(a => a.id));
      }
      addNotification({ title: "Cloud Database Cleared", description: "All assets have been removed from Firestore."});
    } catch(e) {
      addNotification({ title: 'Firestore Clear Failed', description: (e as Error).message, variant: 'destructive'});
    }
    setIsProcessing(false);
  };

  const handleClearLocalOnly = async () => {
    setIsProcessing(true);
    addNotification({ title: "Clearing Local Device...", description: "This will remove all assets from this device."});
    try {
        await clearLocalAssets();
        await saveLockedOfflineAssets([]);
        setAssets([]);
        setOfflineAssets([]);
        addNotification({ title: "Local Device Cleared", description: "All asset data has been removed from your browser."});
    } catch (e) {
         addNotification({ title: 'Local Clear Failed', description: (e as Error).message, variant: 'destructive'});
    }
    setIsProcessing(false);
  };
  
  const handleNukeAll = async () => {
    setIsProcessing(true);
    addNotification({ title: "Clearing ALL Databases...", description: "This may take a moment."});
    try {
      await clearLocalAssets();
      await saveLockedOfflineAssets([]);
      setAssets([]);
      setOfflineAssets([]);
      addNotification({ title: 'Local Device Cleared', description: 'Proceeding to clear cloud...'});

      const firestoreAssets = await getAssets();
      if (firestoreAssets.length > 0) {
          await batchDeleteAssets(firestoreAssets.map(a => a.id));
      }
      addNotification({ title: "All Databases Cleared", description: "Local and cloud asset stores are now empty."});
    } catch (e) {
      addNotification({ title: 'Clear Failed', description: (e as Error).message, variant: 'destructive'});
    }
    setIsProcessing(false);
  };
  
  const openConfirmation = (action: string, title: string, description: string) => {
    setConfirmAction(action);
    setConfirmTitle(title);
    setConfirmDescription(description);
  }
  
  const handleConfirmAction = () => {
    if (!confirmAction) return;
    const action = confirmAction;
    setConfirmAction(null); // Close the dialog
    
    switch(action) {
        case 'restore': handleConfirmRestore(); break;
        case 'merge': handleMergeOffline(); break;
        case 'clear_local': handleClearLocalOnly(); break;
        case 'clear_firestore': handleClearFirestoreOnly(); break;
        case 'nuke_all': handleNukeAll(); break;
        default: break;
    }
  }

  if (userProfile?.loginName !== 'admin') {
    return null;
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><DatabaseZap /> Database Administration</DialogTitle>
            <DialogDescription>
              Perform advanced backup, restore, and data management operations. Use with caution.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 space-y-4">
              <Card>
                  <CardHeader>
                      <CardTitle>Backup & Restore</CardTitle>
                      <CardDescription>Export or import all assets and settings.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                      <input type="file" ref={importFileRef} onChange={handleFileSelected} accept=".json" className="hidden" />
                      <Button variant="outline" className="w-full justify-start" onClick={handleImportFromJson} disabled={isProcessing}>
                          <FileUp className="mr-2 h-4 w-4" /> Import from Full Backup (JSON)
                      </Button>
                      <Separator />
                      <Button variant="outline" className="w-full justify-start" onClick={() => exportFullBackupToJson(assets, appSettings)} disabled={isProcessing}>
                          <Download className="mr-2 h-4 w-4" /> Export Full Backup (Assets & Settings)
                      </Button>
                      <Button variant="outline" className="w-full justify-start" onClick={() => exportSettingsToJson(appSettings)} disabled={isProcessing}>
                          <Download className="mr-2 h-4 w-4" /> Export Settings Only
                      </Button>
                      <Button variant="outline" className="w-full justify-start" onClick={() => exportAssetsToJson(assets)} disabled={isProcessing}>
                          <Download className="mr-2 h-4 w-4" /> Export Assets Only
                      </Button>
                  </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Data Management</CardTitle>
                  <CardDescription>Perform actions on local and cloud data stores.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" onClick={() => openConfirmation('merge', 'Merge Offline Data?', 'This will merge all assets from your "Locked Offline" store into the main list. Offline edits will overwrite main list data. This cannot be undone.')} disabled={isProcessing}>
                      <GitMerge className="mr-2 h-4 w-4" /> Merge Offline Store to Main List
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-destructive">
                  <CardHeader>
                      <CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle/> Danger Zone</CardTitle>
                      <CardDescription>These irreversible actions can result in data loss.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                      <Button variant="outline" className="w-full justify-start border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => openConfirmation('clear_local', 'Clear Local Storage?', 'This will permanently delete all assets from THIS DEVICE ONLY (both main and offline stores). It will NOT affect the cloud database.')} disabled={isProcessing}>
                          <HardDrive className="mr-2 h-4 w-4" /> Clear Local Device Storage Only
                      </Button>
                       <Button variant="outline" className="w-full justify-start border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => openConfirmation('clear_firestore', 'Clear Cloud Storage?', 'This will permanently delete ALL assets from the cloud (Firestore). It will affect ALL users but will NOT touch your local data.')} disabled={isProcessing}>
                          <CloudOff className="mr-2 h-4 w-4" /> Clear Cloud Storage Only (Firestore)
                      </Button>
                      <Separator />
                      <Button variant="destructive" className="w-full justify-start" onClick={() => openConfirmation('nuke_all', 'Nuke ALL Data?', 'This is the most destructive option. It will permanently delete ALL assets from your local device AND from the cloud database.')} disabled={isProcessing}>
                          {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DatabaseZap className="mr-2 h-4 w-4" />}
                          Nuke ALL Data (Local & Cloud)
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
      
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
                  <AlertDialogDescription>
                     {confirmDescription}
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setBackupToRestore(null)}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmAction} className="bg-destructive hover:bg-destructive/90">
                      Yes, Continue
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

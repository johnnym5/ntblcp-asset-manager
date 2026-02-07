
"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '../ui/separator';
import { useAppState } from '@/contexts/app-state-context';
import { synchronizeDatabases, copyAssetsToRealtimeDB, updateSettings, getAssetsFirestore, batchDeleteAssetsFirestore, getAssetsRTDB, batchDeleteAssetsRTDB } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { Loader2, Database, Trash2, FileUp, Save, ScanSearch, PlaneTakeoff, Download, DatabaseZap, GitBranch, Copy, AlertTriangle } from 'lucide-react';
import type { AppSettings } from '@/lib/types';
import { saveLocalSettings, clearLocalAssets } from '@/lib/idb';
import { exportFullBackupToJson, exportAssetsToJson, exportSettingsToJson } from '@/lib/json-export';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { addNotification } from '@/hooks/use-notifications';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';

interface DatabaseAdminDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function DatabaseAdminDialog({ isOpen, onOpenChange }: DatabaseAdminDialogProps) {
  const { userProfile } = useAuth();
  const { appSettings, setAppSettings, assets, setAssets } = useAppState();
  const { toast } = useToast();
  
  const [draftSettings, setDraftSettings] = useState<AppSettings | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [isClearingAll, setIsClearingAll] = useState(false);
  const [isClearingFirestore, setIsClearingFirestore] = useState(false);
  const [isClearingRTDB, setIsClearingRTDB] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);
  const [isClearFirestoreConfirmOpen, setIsClearFirestoreConfirmOpen] = useState(false);
  const [isClearRTDBConfirmOpen, setIsClearRTDBConfirmOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDraftSettings(JSON.parse(JSON.stringify(appSettings)));
    } else {
      setDraftSettings(null);
    }
  }, [isOpen, appSettings]);

  const handleSettingChange = (key: keyof AppSettings, value: any) => {
    if (!draftSettings) return;
    setDraftSettings(prev => prev ? ({ ...prev, [key]: value }) : null);
  };
  
  const handleConfirmSave = async () => {
    if (!draftSettings) return;
    try {
      const settingsToSave: AppSettings = { ...draftSettings, lastModified: new Date().toISOString() };
      await updateSettings(settingsToSave);
      await saveLocalSettings(settingsToSave);
      setAppSettings(settingsToSave);
      toast({ title: "Database Preference Saved", description: `The app will now use ${settingsToSave.databaseSource} on next load.` });
    } catch (e) {
      toast({ title: "Save Failed", description: "Could not save settings to the database.", variant: "destructive" });
    } finally {
      setIsConfirmOpen(false);
    }
  };

  const handleSync = async () => {
      setIsSyncing(true);
      addNotification({ title: 'Cloud Sync Initialized', description: 'Comparing and updating both cloud databases...'});
      try {
        const { toFirestoreCount, toRTDBCount } = await synchronizeDatabases();
        addNotification({ title: 'Cloud Sync Complete', description: `${toFirestoreCount} assets updated in Firestore. ${toRTDBCount} assets updated in Realtime DB.`});
      } catch (e) {
        addNotification({ title: 'Cloud Sync Failed', description: (e as Error).message, variant: 'destructive'});
      }
      setIsSyncing(false);
  }

  const handleClearFirestore = async () => {
    setIsClearingFirestore(true);
    setIsClearFirestoreConfirmOpen(false);
    addNotification({ title: "Clearing Firestore...", description: "This may take a moment."});
    try {
        const firestoreAssets = await getAssetsFirestore();
        if (firestoreAssets.length > 0) {
            await batchDeleteAssetsFirestore(firestoreAssets.map(a => a.id));
        }
        addNotification({ title: "Firestore Cleared", description: "All assets in Cloud Firestore have been deleted."});
    } catch (e) {
        addNotification({ title: 'Firestore Clear Failed', description: (e as Error).message, variant: 'destructive'});
    }
    setIsClearingFirestore(false);
  }

  const handleClearRtdb = async () => {
      setIsClearingRTDB(true);
      setIsClearRTDBConfirmOpen(false);
      addNotification({ title: "Clearing Realtime DB...", description: "This may take a moment."});
      try {
          const rtdbAssets = await getAssetsRTDB();
          if (rtdbAssets.length > 0) {
              await batchDeleteAssetsRTDB(rtdbAssets.map(a => a.id));
          }
          addNotification({ title: "Realtime DB Cleared", description: "All assets in Realtime Database have been deleted."});
      } catch (e) {
          addNotification({ title: 'Realtime DB Clear Failed', description: (e as Error).message, variant: 'destructive'});
      }
      setIsClearingRTDB(false);
  }

  const handleClearAll = async () => {
      setIsClearingAll(true);
      setIsClearAllConfirmOpen(false);
      addNotification({ title: "Clearing All Databases...", description: "This may take a moment."});
      try {
        await clearLocalAssets();
        setAssets([]);

        const firestoreAssets = await getAssetsFirestore();
        if (firestoreAssets.length > 0) {
            await batchDeleteAssetsFirestore(firestoreAssets.map(a => a.id));
        }
        
        const rtdbAssets = await getAssetsRTDB();
        if (rtdbAssets.length > 0) {
            await batchDeleteAssetsRTDB(rtdbAssets.map(a => a.id));
        }
        
        addNotification({ title: "All Databases Cleared", description: "Local and cloud asset stores are now empty."});
      } catch (e) {
        addNotification({ title: 'Clear Failed', description: (e as Error).message, variant: 'destructive'});
      }
      setIsClearingAll(false);
  }

  const handleCopyToRTDB = async () => {
      setIsCopying(true);
      await copyAssetsToRealtimeDB();
      setIsCopying(false);
  }
  
  if (userProfile?.loginName !== 'admin') {
    return null;
  }
  
  if (!draftSettings) return null;

  const isAnyClearing = isClearingAll || isClearingFirestore || isClearingRTDB;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><DatabaseZap /> Database Administration</DialogTitle>
            <DialogDescription>
              Manage advanced database settings. Changes here are critical and can affect all users.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto">
            <div className="py-4 pr-6 space-y-6">

              <Card>
                  <CardHeader>
                      <CardTitle>Database Source</CardTitle>
                      <CardDescription>Select the primary cloud database for the application.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                      <Select value={draftSettings.databaseSource} onValueChange={(value) => handleSettingChange('databaseSource', value)}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="firestore">Cloud Firestore</SelectItem>
                          <SelectItem value="rtdb">Realtime Database</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button onClick={() => setIsConfirmOpen(true)} disabled={JSON.stringify(appSettings) === JSON.stringify(draftSettings)}>
                          <Save className="mr-2 h-4 w-4"/>
                          Save Preference
                      </Button>
                  </CardContent>
              </Card>

              <Card>
                  <CardHeader>
                      <CardTitle>Initial Data Deployment</CardTitle>
                      <CardDescription>This will overwrite all data in the Realtime Database with the data stored locally on your device. Use this to populate the cloud for the first time.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <Button variant="outline" className="w-full justify-start" onClick={handleCopyToRTDB} disabled={isCopying}>
                          {isCopying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlaneTakeoff className="mr-2 h-4 w-4" />}
                          Deploy Local Database to RTDB
                      </Button>
                  </CardContent>
              </Card>

              <Card>
                  <CardHeader>
                      <CardTitle>Cloud-to-Cloud Sync</CardTitle>
                      <CardDescription>Ensure data is consistent between Firestore and Realtime DB.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <Button variant="outline" className="w-full justify-start" onClick={handleSync} disabled={isSyncing}>
                          {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GitBranch className="mr-2 h-4 w-4" />}
                          Sync Firestore and RTDB
                      </Button>
                  </CardContent>
              </Card>


              <Card>
                  <CardHeader>
                      <CardTitle>Backup & Restore</CardTitle>
                      <CardDescription>Export data to a JSON file. Imports are handled via Excel files in Settings.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                      <Button variant="outline" className="w-full justify-start" onClick={() => exportFullBackupToJson(assets, appSettings)}>
                          <Download className="mr-2 h-4 w-4" /> Export Full Backup (Assets & Settings)
                      </Button>
                      <Button variant="outline" className="w-full justify-start" onClick={() => exportAssetsToJson(assets)}>
                          <Download className="mr-2 h-4 w-4" /> Export Assets Only
                      </Button>
                      <Button variant="outline" className="w-full justify-start" onClick={() => exportSettingsToJson(appSettings)}>
                          <Download className="mr-2 h-4 w-4" /> Export Settings Only
                      </Button>
                  </CardContent>
              </Card>

              <Card className="border-destructive">
                  <CardHeader>
                      <CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle/> Danger Zone</CardTitle>
                      <CardDescription>These actions are irreversible and will affect all data.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                      <Button variant="destructive" className="w-full justify-start" onClick={() => setIsClearFirestoreConfirmOpen(true)} disabled={isAnyClearing}>
                          {isClearingFirestore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                          Clear Firestore Assets Only
                      </Button>
                      <Button variant="destructive" className="w-full justify-start" onClick={() => setIsClearRTDBConfirmOpen(true)} disabled={isAnyClearing}>
                          {isClearingRTDB ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                          Clear Realtime DB Assets Only
                      </Button>
                      <Button variant="destructive" className="w-full justify-start" onClick={() => setIsClearAllConfirmOpen(true)} disabled={isAnyClearing}>
                          {isClearingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                          Clear All Assets in ALL Databases
                      </Button>
                  </CardContent>
              </Card>
            </div>
          </div>

          <DialogFooter className="mt-auto">
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save Database Preference?</AlertDialogTitle>
            <AlertDialogDescription>
              This will set the primary database to **{draftSettings?.databaseSource}**. The application will use this database upon the next reload for all users.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSave}>Confirm & Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isClearFirestoreConfirmOpen} onOpenChange={setIsClearFirestoreConfirmOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Clear Firestore Assets?</AlertDialogTitle>
                  <AlertDialogDescription>
                      This will permanently delete all assets from Cloud Firestore. This is useful if the data is corrupt. You can re-sync from the Realtime Database afterwards.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearFirestore} className="bg-destructive hover:bg-destructive/90">Confirm & Clear Firestore</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isClearRTDBConfirmOpen} onOpenChange={setIsClearRTDBConfirmOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Clear Realtime DB Assets?</AlertDialogTitle>
                  <AlertDialogDescription>
                      This will permanently delete all assets from the Realtime Database. This is useful if the data is corrupt. You can re-sync from Firestore afterwards.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearRtdb} className="bg-destructive hover:bg-destructive/90">Confirm & Clear Realtime DB</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isClearAllConfirmOpen} onOpenChange={setIsClearAllConfirmOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Clear ALL Databases?</AlertDialogTitle>
                  <AlertDialogDescription>
                      This is irreversible. It will delete all assets from your local device, from Cloud Firestore, AND from the Realtime Database.
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

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
import { synchronizeDatabases, copyAssetsToRealtimeDB, updateSettings } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { Loader2, Database, Trash2, FileUp, Save, ScanSearch, PlaneTakeoff, Download, DatabaseZap, GitBranch, Copy, AlertTriangle } from 'lucide-react';
import type { AppSettings } from '@/lib/types';
import { saveLocalSettings } from '@/lib/idb';
import { exportFullBackupToJson } from '@/lib/json-export';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { addNotification } from '@/hooks/use-notifications';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

interface DatabaseAdminDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function DatabaseAdminDialog({ isOpen, onOpenChange }: DatabaseAdminDialogProps) {
  const { userProfile } = useAuth();
  const { appSettings, setAppSettings, assets } = useAppState();
  const { toast } = useToast();
  
  const [draftSettings, setDraftSettings] = useState<AppSettings | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

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
      await updateSettings(draftSettings);
      await saveLocalSettings(draftSettings);
      setAppSettings(draftSettings);
      toast({ title: "Database Preference Saved", description: `The app will now use ${draftSettings.databaseSource} on next load.` });
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

  const handleClearAll = async () => {
      setIsClearing(true);
      // This is a placeholder for the more complex logic that would live in asset-list or a dedicated hook
      addNotification({ title: "Clearing All Data...", description: "This action is handled by the main asset list component.", variant: "destructive"});
      // In a real scenario, you'd call a function from context like: `dataActions.onClearAll()`
      setIsClearing(false);
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

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><DatabaseZap /> Database Administration</DialogTitle>
            <DialogDescription>
              Manage advanced database settings. Changes here are critical and can affect all users.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-6">

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
                    <CardDescription>Export a full backup of all data to a JSON file.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Button variant="outline" className="w-full justify-start" onClick={() => exportFullBackupToJson(assets, appSettings)}>
                        <Download className="mr-2 h-4 w-4" /> Export All Data to JSON
                    </Button>
                </CardContent>
            </Card>

            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle/> Danger Zone</CardTitle>
                    <CardDescription>These actions are irreversible and will affect all data.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="destructive" className="w-full justify-start" onClick={handleClearAll} disabled={isClearing}>
                        {isClearing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Clear All Assets in ALL Databases
                    </Button>
                </CardContent>
            </Card>
          </div>

          <DialogFooter>
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
              This will set the primary database to **{draftSettings.databaseSource}**. The application will use this database upon the next reload for all users.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSave}>Confirm & Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

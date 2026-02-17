"use client";

import React, { useState, useRef, useCallback, useMemo } from 'react';
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
import { getAssets as getAssetsFS, batchSetAssets as batchSetAssetsFS, batchDeleteAssets as batchDeleteAssetsFS, clearAssets as clearFirestoreAssets, getSettings as getSettingsFS, updateSettings as updateSettingsFS } from '@/lib/firestore';
import { getAssets as getAssetsRTDB, batchSetAssets as batchSetAssetsRTDB, clearAssets as clearRtdbAssets, getSettings as getSettingsRTDB, updateSettings as updateSettingsRTDB } from '@/lib/database';
import { useAuth } from '@/contexts/auth-context';
import { Loader2, Trash2, FileUp, Download, DatabaseZap, AlertTriangle, GitMerge, CloudOff, HardDrive, RefreshCw, CheckCircle, XCircle, ChevronsUpDown } from 'lucide-react';
import type { AppSettings, Asset } from '@/lib/types';
import { saveLocalSettings, clearLocalAssets, saveAssets, saveLockedOfflineAssets, getLocalAssets, getLockedOfflineAssets } from '@/lib/idb';
import { exportFullBackupToJson, exportSettingsToJson, exportAssetsToJson } from '@/lib/json-export';
import { addNotification } from '@/hooks/use-notifications';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { get, ref, set, remove } from 'firebase/database';
import { rtdb, db, isConfigValid } from '@/lib/firebase';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';

interface DatabaseAdminDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function DatabaseAdminDialog({ isOpen, onOpenChange }: DatabaseAdminDialogProps) {
  const { userProfile } = useAuth();
  const { appSettings, setAppSettings, assets, setAssets, offlineAssets, setOfflineAssets, setIsSyncing, isOnline, dataActions } = useAppState();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmDescription, setConfirmDescription] = useState('');
  const [isHealthCheckOpen, setIsHealthCheckOpen] = useState(false);

  const importFileRef = useRef<HTMLInputElement>(null);
  const [backupToRestore, setBackupToRestore] = useState<{ settings: AppSettings, assets: Asset[] } | null>(null);

  // State for Database Browser
  const [browserPath, setBrowserPath] = useState<string | null>(null);
  const [browserData, setBrowserData] = useState('');
  const [isBrowserLoading, setIsBrowserLoading] = useState(false);
  const [browserError, setBrowserError] = useState<string | null>(null);
  const [confirmDeletePath, setConfirmDeletePath] = useState<string | null>(null);
  const [dbSearchTerm, setDbSearchTerm] = useState('');
  const [dbReplaceTerm, setDbReplaceTerm] = useState('');

  const HealthCheckItem = ({ label, status, description }: { label: string, status: 'ok' | 'warning' | 'error', description: string }) => {
    const Icon = status === 'ok' ? CheckCircle : status === 'warning' ? AlertTriangle : XCircle;
    const color = status === 'ok' ? 'text-green-500' : status === 'warning' ? 'text-yellow-500' : 'text-destructive';
    return (
        <div className="flex items-start gap-3">
            <Icon className={`mt-1 h-5 w-5 flex-shrink-0 ${color}`} />
            <div>
                <p className="font-medium">{label}</p>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
        </div>
    )
  };

  const healthChecks = useMemo(() => {
      if (!appSettings || !userProfile) return null;

      const checks = {
          settings: [
              {
                  label: 'Settings Loaded',
                  status: appSettings ? 'ok' : 'error',
                  description: appSettings ? 'Application settings are loaded.' : 'Critical error: App settings not found.',
              },
              {
                  label: 'User Profile Active',
                  status: userProfile ? 'ok' : 'error',
                  description: userProfile ? `Logged in as ${userProfile.displayName}.` : 'No user profile is active.',
              },
              {
                  label: 'Sheet Definitions',
                  status: appSettings?.grants?.some(g => g.sheetDefinitions && Object.keys(g.sheetDefinitions).length > 0) ? 'ok' : 'warning',
                  description: appSettings?.grants?.some(g => g.sheetDefinitions && Object.keys(g.sheetDefinitions).length > 0) ? 'Sheet definitions are configured.' : 'No sheet definitions found. Import may fail.',
              },
          ],
          database: [
              {
                  label: 'Firebase Config',
                  status: isConfigValid ? 'ok' : 'error',
                  description: isConfigValid ? 'Firebase environment variables are valid.' : 'Firebase config is missing or invalid. App cannot connect to the cloud.',
              },
              {
                  label: 'Primary DB (RTDB)',
                  status: rtdb ? 'ok' : 'error',
                  description: rtdb ? 'Realtime Database client is initialized.' : 'RTDB client failed to initialize.',
              },
              {
                  label: 'Backup DB (Firestore)',
                  status: db ? 'ok' : 'error',
                  description: db ? 'Firestore client is initialized.' : 'Firestore client failed to initialize.',
              },
              {
                  label: 'Online Status',
                  status: isOnline ? 'ok' : 'warning',
                  description: isOnline ? 'Browser is online and connected.' : 'App is in offline mode.',
              },
          ],
          assets: [
              {
                  label: 'Local Assets (Main)',
                  status: assets.length > 0 ? 'ok' : 'warning',
                  description: `${assets.length} assets loaded in the main local store.`,
              },
              {
                  label: 'Offline Assets (Locked)',
                  status: 'ok',
                  description: `${offlineAssets.length} assets loaded in the offline store.`,
              },
              {
                  label: 'Data Integrity',
                  status: assets.some(a => !a.category || !a.description) ? 'warning' : 'ok',
                  description: assets.some(a => !a.category || !a.description) ? `Found ${assets.filter(a => !a.category || !a.description).length} assets with missing critical fields (category/description).` : 'All assets have critical fields.',
              },
          ],
          functionality: [
              {
                  label: 'Data Actions',
                  status: dataActions && Object.keys(dataActions).length > 0 ? 'ok' : 'error',
                  description: dataActions && Object.keys(dataActions).length > 0 ? 'Core data functions are available.' : 'Core data functions failed to initialize.',
              },
          ],
          export: [
              {
                  label: 'Export Prerequisites',
                  status: assets.length > 0 && appSettings ? 'ok' : 'warning',
                  description: assets.length > 0 && appSettings ? 'Data is available for export.' : 'No assets or settings available to export.',
              },
          ],
      };
      return checks;
  }, [appSettings, userProfile, isOnline, assets, offlineAssets, dataActions]);


  const handleReplaceAll = useCallback(() => {
    if (!dbSearchTerm) {
        toast({ title: 'Search term is empty', description: 'Please enter a term to search for.', variant: 'destructive' });
        return;
    }
    setBrowserData(currentData => currentData.replaceAll(dbSearchTerm, dbReplaceTerm));
    toast({ title: 'Replaced All', description: `Replaced all occurrences of "${dbSearchTerm}".` });
  }, [dbSearchTerm, dbReplaceTerm, toast]);


  const handlePathSelect = useCallback(async (path: string) => {
    if (!rtdb) {
      toast({ title: 'Database Not Connected', description: 'Firebase Realtime Database is not available.', variant: 'destructive' });
      return;
    }
    setBrowserPath(path);
    setIsBrowserLoading(true);
    setBrowserError(null);
    setBrowserData('');
    try {
        const dataRef = ref(rtdb, path);
        const snapshot = await get(dataRef);
        if (snapshot.exists()) {
            setBrowserData(JSON.stringify(snapshot.val(), null, 2));
        } else {
            setBrowserData('// No data exists at this path. You can add some and save.');
        }
    } catch (e) {
        setBrowserError((e as Error).message);
        toast({ title: 'Error Fetching Data', description: (e as Error).message, variant: 'destructive' });
    } finally {
        setIsBrowserLoading(false);
    }
  }, [toast]);

  const handleBrowserSave = useCallback(async () => {
    if (!browserPath || !rtdb) return;
    setBrowserError(null);
    try {
        const dataToSave = JSON.parse(browserData);
        await set(ref(rtdb, browserPath), dataToSave);
        toast({ title: 'Data Saved', description: `Data at ${browserPath} has been updated.` });
    } catch (e) {
        const errorMessage = 'Invalid JSON: ' + (e as Error).message;
        setBrowserError(errorMessage);
        toast({ title: 'Save Failed', description: errorMessage, variant: 'destructive' });
    }
  }, [browserPath, browserData, toast]);

  const handlePathDelete = useCallback(async () => {
    if (!confirmDeletePath || !rtdb) return;
    try {
        await remove(ref(rtdb, confirmDeletePath));
        toast({ title: 'Path Deleted', description: `Successfully deleted ${confirmDeletePath}` });
        setBrowserPath(null);
        setBrowserData('');
    } catch (e) {
        toast({ title: 'Delete Failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
        setConfirmDeletePath(null);
    }
  }, [confirmDeletePath, toast]);

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
                openConfirmation('restore', 'Restore from Backup?', 'This will overwrite all local data with the contents of the backup file. You can then sync this to the cloud. This action cannot be undone.');
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

        addNotification({ title: 'Local data restored', description: 'You can now manually upload the restored data to the cloud.' });

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
  
  const handleSyncRtdbToFirestore = async () => {
    setIsProcessing(true);
    addNotification({ title: 'Syncing: RTDB -> Firestore', description: 'Copying data from Realtime Database to Firestore.' });
    try {
        const rtdbAssets = await getAssetsRTDB();
        const rtdbSettings = await getSettingsRTDB();

        if (rtdbAssets && rtdbAssets.length > 0) {
            await batchSetAssetsFS(rtdbAssets);
        }
        if (rtdbSettings) {
            await updateSettingsFS(rtdbSettings);
        }

        addNotification({ title: 'Sync Complete', description: 'Firestore has been updated with data from Realtime Database.' });
    } catch (e) {
        addNotification({ title: 'Sync Failed', description: (e as Error).message, variant: 'destructive'});
    }
    setIsProcessing(false);
  };
  
  const handleSyncFirestoreToRtdb = async () => {
    setIsProcessing(true);
    addNotification({ title: 'Syncing: Firestore -> RTDB', description: 'Copying data from Firestore to Realtime Database.' });
    try {
        const firestoreAssets = await getAssetsFS();
        const firestoreSettings = await getSettingsFS();

        if (firestoreAssets && firestoreAssets.length > 0) {
            await batchSetAssetsRTDB(firestoreAssets);
        }
        if (firestoreSettings) {
            await updateSettingsRTDB(firestoreSettings);
        }

        addNotification({ title: 'Sync Complete', description: 'Realtime Database has been updated with data from Firestore.' });
    } catch (e) {
        addNotification({ title: 'Sync Failed', description: (e as Error).message, variant: 'destructive'});
    }
    setIsProcessing(false);
  };

  const handleClearFirestoreOnly = async () => {
    setIsProcessing(true);
    addNotification({ title: "Clearing Firestore...", description: "This will remove all assets from the backup cloud database."});
    try {
      await clearFirestoreAssets();
      if (appSettings?.defaultDatabase === 'firestore') {
        await clearLocalAssets();
        setAssets([]);
      }
      addNotification({ title: "Backup Cloud Cleared", description: "All assets have been removed from Firestore."});
    } catch(e) {
      addNotification({ title: 'Firestore Clear Failed', description: (e as Error).message, variant: 'destructive'});
    }
    setIsProcessing(false);
  };

  const handleClearRtdbOnly = async () => {
    setIsProcessing(true);
    addNotification({ title: "Clearing Realtime DB...", description: "This will remove all assets from the primary cloud database."});
    try {
      await clearRtdbAssets();
      if (appSettings?.defaultDatabase === 'rtdb') {
        await clearLocalAssets();
        setAssets([]);
      }
      addNotification({ title: "Primary Cloud Cleared", description: "All assets have been removed from Realtime DB."});
    } catch(e) {
      addNotification({ title: 'RTDB Clear Failed', description: (e as Error).message, variant: 'destructive'});
    }
    setIsProcessing(false);
  }

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

      await clearFirestoreAssets();
      await clearRtdbAssets();

      addNotification({ title: "All Databases Cleared", description: "Local and all cloud asset stores are now empty."});
    } catch (e) {
      addNotification({ title: 'Clear Failed', description: (e as Error).message, variant: 'destructive'});
    }
    setIsProcessing(false);
  };

  const handleSettingChange = async (key: keyof AppSettings, value: any) => {
    if (!userProfile || !appSettings) return;
    
    const newSettings: AppSettings = {
        ...appSettings,
        [key]: value,
        lastModified: new Date().toISOString(),
        lastModifiedBy: {
            displayName: userProfile.displayName,
            loginName: userProfile.loginName,
        }
    };
    
    setAppSettings(newSettings); // Optimistic update
    
    try {
        await updateSettingsFS(newSettings);
        await updateSettingsRTDB(newSettings);
        await saveLocalSettings(newSettings);
        toast({ title: 'Setting Saved', description: 'Your change has been saved to the cloud.' });
    } catch (e) {
        toast({ title: "Save Failed", description: (e as Error).message || "Could not save settings.", variant: "destructive" });
        if (appSettings) {
            setAppSettings(appSettings); // Revert on failure
        }
    }
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
        case 'clear_rtdb': handleClearRtdbOnly(); break;
        case 'nuke_all': handleNukeAll(); break;
        default: break;
    }
  }

  if (userProfile?.loginName !== 'admin') {
    return null;
  }
  
  if (!appSettings) {
      return (
         <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Loading...</DialogTitle>
                </DialogHeader>
                <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            </DialogContent>
         </Dialog>
      )
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><DatabaseZap /> Database Administration</DialogTitle>
            <DialogDescription>
              Perform advanced backup, restore, and data management operations. Use with caution.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 space-y-4 overflow-y-auto pr-2">
              <Collapsible open={isHealthCheckOpen} onOpenChange={setIsHealthCheckOpen}>
                  <div className='flex items-center justify-between rounded-lg border bg-background p-4 shadow-sm'>
                      <div>
                          <h3 className="text-lg font-medium">App Health Check</h3>
                          <p className="text-sm text-muted-foreground">Diagnostic checks for core application systems.</p>
                      </div>
                      <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="w-9 p-0">
                              <ChevronsUpDown className="h-4 w-4" />
                              <span className="sr-only">Toggle</span>
                          </Button>
                      </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent className="pt-4">
                      <Card>
                        <CardContent className="space-y-6 pt-6">
                            {healthChecks && (
                                <>
                                    <div>
                                        <h4 className="font-semibold mb-2">Settings</h4>
                                        <div className="space-y-4 pl-4 border-l">
                                            {healthChecks.settings.map(item => <HealthCheckItem key={item.label} {...item} />)}
                                        </div>
                                    </div>
                                     <div>
                                        <h4 className="font-semibold mb-2">Database</h4>
                                        <div className="space-y-4 pl-4 border-l">
                                            {healthChecks.database.map(item => <HealthCheckItem key={item.label} {...item} />)}
                                        </div>
                                    </div>
                                     <div>
                                        <h4 className="font-semibold mb-2">Assets</h4>
                                        <div className="space-y-4 pl-4 border-l">
                                            {healthChecks.assets.map(item => <HealthCheckItem key={item.label} {...item} />)}
                                        </div>
                                    </div>
                                     <div>
                                        <h4 className="font-semibold mb-2">Functionality</h4>
                                        <div className="space-y-4 pl-4 border-l">
                                            {healthChecks.functionality.map(item => <HealthCheckItem key={item.label} {...item} />)}
                                        </div>
                                    </div>
                                     <div>
                                        <h4 className="font-semibold mb-2">Export</h4>
                                        <div className="space-y-4 pl-4 border-l">
                                            {healthChecks.export.map(item => <HealthCheckItem key={item.label} {...item} />)}
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                      </Card>
                  </CollapsibleContent>
              </Collapsible>

              {appSettings && (
                <Card>
                    <CardHeader>
                        <CardTitle>Global Settings</CardTitle>
                        <CardDescription>Changes here are saved instantly and affect all users.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="default-db" className="text-sm font-medium">Default Cloud DB</Label>
                            <Select value={appSettings.defaultDatabase} onValueChange={(value) => handleSettingChange('defaultDatabase', value)}>
                                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                <SelectItem value="rtdb">Realtime DB (Primary)</SelectItem>
                                <SelectItem value="firestore">Firestore (Backup)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                    <CardTitle>Database Browser</CardTitle>
                    <CardDescription>Directly view and edit data in the Realtime Database. Be careful, changes are live.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Button variant={browserPath === '/config' ? 'default' : 'outline'} onClick={() => handlePathSelect('/config')}>Config</Button>
                        <Button variant={browserPath === '/assets' ? 'default' : 'outline'} onClick={() => handlePathSelect('/assets')}>Assets</Button>
                    </div>
                    {browserPath && (
                        <div className="space-y-2">
                            <Label>Editing path: <span className="font-mono p-1 bg-muted rounded-md text-xs">{browserPath}</span></Label>
                             <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                                <Input placeholder="Find..." value={dbSearchTerm} onChange={e => setDbSearchTerm(e.target.value)} />
                                <Input placeholder="Replace with..." value={dbReplaceTerm} onChange={e => setDbReplaceTerm(e.target.value)} />
                                <Button onClick={handleReplaceAll} variant="outline">Replace All</Button>
                            </div>
                            <div className="relative">
                                <Textarea
                                    value={browserData}
                                    onChange={(e) => setBrowserData(e.target.value)}
                                    rows={15}
                                    placeholder={isBrowserLoading ? "Loading data..." : "Select a path to view data."}
                                    disabled={isBrowserLoading}
                                    className="font-mono text-xs"
                                />
                                {isBrowserLoading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-md">
                                        <Loader2 className="h-8 w-8 animate-spin" />
                                    </div>
                                )}
                            </div>
                             {browserError && <p className="text-sm text-destructive">{browserError}</p>}
                             <div className="flex justify-between items-center">
                                <Button onClick={handleBrowserSave} disabled={isBrowserLoading}>Save Changes</Button>
                                <Button variant="destructive" onClick={() => setConfirmDeletePath(browserPath)} disabled={isBrowserLoading}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Path
                                </Button>
                             </div>
                        </div>
                    )}
                </CardContent>
              </Card>

              <Card>
                  <CardHeader>
                      <CardTitle>Backup &amp; Restore</CardTitle>
                      <CardDescription>Export or import all assets and settings.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                      <input type="file" ref={importFileRef} onChange={handleFileSelected} accept=".json" className="hidden" />
                      <Button variant="outline" className="w-full justify-start" onClick={handleImportFromJson} disabled={isProcessing}>
                          <FileUp className="mr-2 h-4 w-4" /> Import from Full Backup (JSON)
                      </Button>
                      <Separator />
                      <Button variant="outline" className="w-full justify-start" onClick={() => {
                        try {
                          exportFullBackupToJson(assets, appSettings);
                        } catch (e) {
                          addNotification({ title: 'Export Failed', description: (e as Error).message, variant: 'destructive' });
                        }
                      }} disabled={isProcessing}>
                          <Download className="mr-2 h-4 w-4" /> Export Full Backup (Assets &amp; Settings)
                      </Button>
                      <Button variant="outline" className="w-full justify-start" onClick={() => {
                        try {
                          exportSettingsToJson(appSettings);
                        } catch (e) {
                          addNotification({ title: 'Export Failed', description: (e as Error).message, variant: 'destructive' });
                        }
                      }} disabled={isProcessing}>
                          <Download className="mr-2 h-4 w-4" /> Export Settings Only
                      </Button>
                      <Button variant="outline" className="w-full justify-start" onClick={() => {
                        try {
                          exportAssetsToJson(assets);
                        } catch (e) {
                          addNotification({ title: 'Export Failed', description: (e as Error).message, variant: 'destructive' });
                        }
                      }} disabled={isProcessing}>
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
                      <GitMerge className="mr-2 h-4 w-4" /> Import from Offline Store
                  </Button>
                   <Button variant="outline" className="w-full justify-start" onClick={handleSyncRtdbToFirestore} disabled={isProcessing}>
                      <RefreshCw className="mr-2 h-4 w-4" /> Sync RTDB to Firestore
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={handleSyncFirestoreToRtdb} disabled={isProcessing}>
                      <RefreshCw className="mr-2 h-4 w-4" /> Sync Firestore to RTDB
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
                       <Button variant="outline" className="w-full justify-start border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => openConfirmation('clear_rtdb', 'Clear Realtime DB?', 'This will permanently delete ALL assets from the primary cloud database (RTDB). It will NOT touch your local data or the backup DB.')} disabled={isProcessing}>
                          <CloudOff className="mr-2 h-4 w-4" /> Clear Realtime DB (Primary)
                      </Button>
                       <Button variant="outline" className="w-full justify-start border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => openConfirmation('clear_firestore', 'Clear Firestore?', 'This will permanently delete ALL assets from the backup cloud database (Firestore). It will NOT touch your local data or the primary DB.')} disabled={isProcessing}>
                          <CloudOff className="mr-2 h-4 w-4" /> Clear Firestore (Backup)
                      </Button>
                      <Separator />
                      <Button variant="destructive" className="w-full justify-start" onClick={() => openConfirmation('nuke_all', 'Nuke ALL Data?', 'This is the most destructive option. It will permanently delete ALL assets from your local device AND from BOTH cloud databases.')} disabled={isProcessing}>
                          {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DatabaseZap className="mr-2 h-4 w-4" />}
                          Nuke ALL Data (Local &amp; Cloud)
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
      
       <AlertDialog open={!!confirmDeletePath} onOpenChange={() => setConfirmDeletePath(null)}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                     This will permanently delete the entire path <span className="font-mono p-1 bg-muted rounded-md text-xs">{confirmDeletePath}</span> and all data within it from the Realtime Database. This action cannot be undone.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handlePathDelete} className="bg-destructive hover:bg-destructive/90">
                      Yes, Delete Path
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

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
import { getAssets as getAssetsFS, batchSetAssets as batchSetAssetsFS, clearAssets as clearFirestoreAssets, getSettings as getSettingsFS, updateSettings as updateSettingsFS } from '@/lib/firestore';
import { getAssets as getAssetsRTDB, batchSetAssets as batchSetAssetsRTDB, clearAssets as clearRtdbAssets, getSettings as getSettingsRTDB, updateSettings as updateSettingsRTDB } from '@/lib/database';
import { useAuth } from '@/contexts/auth-context';
import { Loader2, Trash2, FileUp, Download, DatabaseZap, AlertTriangle, GitMerge, CloudOff, HardDrive, RefreshCw, CheckCircle, XCircle, ChevronsUpDown, Info } from 'lucide-react';
import type { AppSettings, Asset } from '@/lib/types';
import { saveLocalSettings, clearLocalAssets, saveAssets, saveLockedOfflineAssets, getLocalAssets, getLockedOfflineAssets } from '@/lib/idb';
import { exportFullBackupToJson, exportSettingsToJson, exportAssetsToJson } from '@/lib/json-export';
import { addNotification } from '@/hooks/use-notifications';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { get, ref, set, remove } from 'firebase/database';
import { rtdb, db, isConfigValid } from '@/lib/firebase';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface DatabaseAdminDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

interface HealthCheckStatus {
    label: string;
    status: 'ok' | 'warning' | 'error';
    description: string;
    reason?: string;
    resolution?: string;
}

export function DatabaseAdminDialog({ isOpen, onOpenChange }: DatabaseAdminDialogProps) {
  const { userProfile } = useAuth();
  const { appSettings, setAppSettings, assets, setAssets, offlineAssets, setOfflineAssets, isOnline, dataActions, activeDatabase, setActiveDatabase } = useAppState();
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

  const HealthCheckItem = ({ label, status, description, reason, resolution }: HealthCheckStatus) => {
    const Icon = status === 'ok' ? CheckCircle : status === 'warning' ? AlertTriangle : XCircle;
    const color = status === 'ok' ? 'text-green-500' : status === 'warning' ? 'text-yellow-500' : 'text-destructive';
    
    return (
        <div className="flex items-start gap-3 p-2 rounded-md transition-colors hover:bg-muted/30">
            <Icon className={`mt-1 h-5 w-5 flex-shrink-0 ${color}`} />
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{label}</p>
                    {status !== 'ok' && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs p-3">
                                    <div className="space-y-2">
                                        {reason && (
                                            <div>
                                                <p className="font-bold text-xs text-destructive uppercase">Possible Reason</p>
                                                <p className="text-xs">{reason}</p>
                                            </div>
                                        )}
                                        {resolution && (
                                            <div>
                                                <p className="font-bold text-xs text-green-600 uppercase">Resolution</p>
                                                <p className="text-xs">{resolution}</p>
                                            </div>
                                        )}
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
        </div>
    )
  };

  const healthChecks = useMemo(() => {
      if (!appSettings || !userProfile) return null;

      const checks: Record<string, HealthCheckStatus[]> = {
          settings: [
              {
                  label: 'Settings Data Layer',
                  status: appSettings ? 'ok' : 'error',
                  description: appSettings ? 'Application settings are loaded from Firestore.' : 'App settings not found.',
                  reason: 'Could not fetch config from Firestore/RTDB or local storage is corrupted.',
                  resolution: 'Verify internet connection and ensure Firestore has a "config/settings" document.'
              },
              {
                  label: 'Project Configuration',
                  status: appSettings?.grants?.some(g => g.sheetDefinitions && Object.keys(g.sheetDefinitions).length > 0) ? 'ok' : 'warning',
                  description: appSettings?.grants?.some(g => g.sheetDefinitions && Object.keys(g.sheetDefinitions).length > 0) ? 'Project sheets are configured.' : 'No sheet definitions found.',
                  reason: 'The active project has no templates defined.',
                  resolution: 'Import an Excel template in the "Projects & Sheets" settings tab.'
              },
          ],
          database: [
              {
                  label: 'Firebase Environment',
                  status: isConfigValid ? 'ok' : 'error',
                  description: isConfigValid ? 'Firebase API keys are verified.' : 'Firebase config is missing.',
                  reason: 'Environment variables (NEXT_PUBLIC_FIREBASE_...) are not set in the build or .env file.',
                  resolution: 'Check your project root for a valid .env file with all Firebase credentials.'
              },
              {
                  label: 'Realtime DB (Asset Layer)',
                  status: rtdb ? 'ok' : 'error',
                  description: rtdb ? 'RTDB instance is active.' : 'RTDB failed to initialize.',
                  reason: 'The Database URL might be incorrect or the service is disabled in the console.',
                  resolution: 'Ensure Realtime Database is enabled in the Firebase Console and your URL is correct.'
              },
              {
                  label: 'Firestore (Settings Layer)',
                  status: db ? 'ok' : 'error',
                  description: db ? 'Firestore instance is active.' : 'Firestore failed to initialize.',
                  reason: 'Service disabled or bad API key permissions.',
                  resolution: 'Enable Firestore in the Firebase console and check Security Rules.'
              },
          ],
          assets: [
              {
                  label: 'Main Local Store',
                  status: assets.length > 0 ? 'ok' : 'warning',
                  description: `${assets.length} assets in indexedDB.`,
                  reason: 'Local database might be empty or a sync hasn\'t been performed.',
                  resolution: 'Click "Download from Cloud" in the top header to fetch remote assets.'
              },
              {
                  label: 'Asset Data Integrity',
                  status: assets.some(a => !a.category || !a.description) ? 'warning' : 'ok',
                  description: assets.some(a => !a.category || !a.description) ? 'Detected corrupted asset entries.' : 'All assets have critical fields.',
                  reason: 'Manual edits in DB browser or incomplete Excel imports.',
                  resolution: 'Review assets with missing fields via the dashboard and fix them manually.'
              },
          ],
      };
      return checks;
  }, [appSettings, userProfile, assets]);


  const handleReplaceAll = useCallback(() => {
    if (!dbSearchTerm) {
        toast({ title: 'Search term is empty', variant: 'destructive' });
        return;
    }
    setBrowserData(currentData => currentData.replaceAll(dbSearchTerm, dbReplaceTerm));
    toast({ title: 'Replaced All', description: `Replaced all occurrences of "${dbSearchTerm}".` });
  }, [dbSearchTerm, dbReplaceTerm, toast]);


  const handlePathSelect = useCallback(async (path: string) => {
    if (!rtdb) {
      toast({ title: 'Database Not Connected', variant: 'destructive' });
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
            setBrowserData('// No data exists at this path.');
        }
    } catch (e) {
        setBrowserError((e as Error).message);
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
        toast({ title: 'Data Saved', description: `Path ${browserPath} updated.` });
    } catch (e) {
        setBrowserError('Invalid JSON: ' + (e as Error).message);
    }
  }, [browserPath, browserData, toast]);

  const handlePathDelete = useCallback(async () => {
    if (!confirmDeletePath || !rtdb) return;
    try {
        await remove(ref(rtdb, confirmDeletePath));
        toast({ title: 'Path Deleted' });
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
                openConfirmation('restore', 'Restore from Backup?', 'Overwrites local data. Cannot be undone.');
            } else {
                addNotification({ title: 'Invalid Backup', variant: 'destructive' });
            }
        } catch (error) {
            addNotification({ title: 'Invalid JSON', variant: 'destructive' });
        } finally {
             if (importFileRef.current) importFileRef.current.value = "";
        }
    };
    reader.readAsText(file);
  };
  
  const handleConfirmRestore = async () => {
    if (!backupToRestore) return;
    setIsProcessing(true);
    try {
        const { assets: restoredAssets, settings: restoredSettings } = backupToRestore;
        const assetsToSync = restoredAssets.map(a => ({ ...a, syncStatus: 'local' as const }));
        
        await saveAssets(assetsToSync);
        await saveLockedOfflineAssets([]); 
        await saveLocalSettings(restoredSettings);

        setAssets(assetsToSync);
        setOfflineAssets([]);
        setAppSettings(restoredSettings);

        addNotification({ title: 'Local data restored' });
    } catch (e) {
        addNotification({ title: 'Restore Failed', variant: 'destructive'});
    } finally {
        setIsProcessing(false);
        setBackupToRestore(null);
    }
  };

  const handleMergeOffline = async () => {
    setIsProcessing(true);
    try {
        const mainAssets = await getLocalAssets();
        const offline = await getLockedOfflineAssets();
        if (offline.length === 0) {
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

        addNotification({ title: "Merge Complete" });
    } catch (e) {
      addNotification({ title: 'Merge Failed', variant: 'destructive'});
    }
    setIsProcessing(false);
  };
  
  const handleSyncRtdbToFirestore = async () => {
    setIsProcessing(true);
    try {
        const rtdbAssets = await getAssetsRTDB();
        const rtdbSettings = await getSettingsRTDB();
        if (rtdbAssets && rtdbAssets.length > 0) await batchSetAssetsFS(rtdbAssets);
        if (rtdbSettings) await updateSettingsFS(rtdbSettings);
        addNotification({ title: 'Sync Complete: RTDB -> Firestore' });
    } catch (e) {
        addNotification({ title: 'Sync Failed', variant: 'destructive'});
    }
    setIsProcessing(false);
  };
  
  const handleSyncFirestoreToRtdb = async () => {
    setIsProcessing(true);
    try {
        const firestoreAssets = await getAssetsFS();
        const firestoreSettings = await getSettingsFS();
        if (firestoreAssets && firestoreAssets.length > 0) await batchSetAssetsRTDB(firestoreAssets);
        if (firestoreSettings) await updateSettingsRTDB(firestoreSettings);
        addNotification({ title: 'Sync Complete: Firestore -> RTDB' });
    } catch (e) {
        addNotification({ title: 'Sync Failed', variant: 'destructive'});
    }
    setIsProcessing(false);
  };

  const handleClearFirestoreOnly = async () => {
    setIsProcessing(true);
    try {
      await clearFirestoreAssets();
      addNotification({ title: "Firestore (Backup) Cleared" });
    } catch(e) {
      addNotification({ title: 'Clear Failed', variant: 'destructive'});
    }
    setIsProcessing(false);
  };

  const handleClearRtdbOnly = async () => {
    setIsProcessing(true);
    try {
      await clearRtdbAssets();
      addNotification({ title: "Realtime DB (Primary) Cleared" });
    } catch(e) {
      addNotification({ title: 'Clear Failed', variant: 'destructive'});
    }
    setIsProcessing(false);
  }

  const handleClearLocalOnly = async () => {
    setIsProcessing(true);
    try {
        await clearLocalAssets();
        await saveLockedOfflineAssets([]);
        setAssets([]);
        setOfflineAssets([]);
        addNotification({ title: "Local Device Cleared" });
    } catch (e) {
         addNotification({ title: 'Clear Failed', variant: 'destructive'});
    }
    setIsProcessing(false);
  };
  
  const handleNukeAll = async () => {
    setIsProcessing(true);
    try {
      await clearLocalAssets();
      await saveLockedOfflineAssets([]);
      setAssets([]);
      setOfflineAssets([]);
      await clearFirestoreAssets();
      await clearRtdbAssets();
      addNotification({ title: "All Databases Cleared" });
    } catch (e) {
      addNotification({ title: 'Clear Failed', variant: 'destructive'});
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
    setConfirmAction(null);
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

  if (userProfile?.loginName !== 'admin') return null;
  if (!appSettings) {
      return (
         <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></DialogContent>
         </Dialog>
      )
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><DatabaseZap /> Database Administration</DialogTitle>
            <DialogDescription>Hybrid Strategy: Firestore (Settings) &amp; RTDB (Assets).</DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 space-y-4 overflow-y-auto pr-2 pb-4">
              <Collapsible open={isHealthCheckOpen} onOpenChange={setIsHealthCheckOpen}>
                  <div className='flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm'>
                      <div>
                          <h3 className="text-lg font-medium">App Health Check</h3>
                          <p className="text-sm text-muted-foreground">Detailed diagnostics for the Hybrid DB layers.</p>
                      </div>
                      <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm"><ChevronsUpDown className="h-4 w-4" /></Button>
                      </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent className="pt-2">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {healthChecks && Object.entries(healthChecks).map(([group, items]) => (
                            <Card key={group}>
                                <CardHeader className="py-3 px-4 bg-muted/30">
                                    <CardTitle className="text-xs uppercase tracking-widest">{group}</CardTitle>
                                </CardHeader>
                                <CardContent className="p-2 space-y-1">
                                    {items.map(item => <HealthCheckItem key={item.label} {...item} />)}
                                </CardContent>
                            </Card>
                        ))}
                      </div>
                  </CollapsibleContent>
              </Collapsible>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Sync Assets (RTDB Primary)</CardTitle>
                        <CardDescription>Assets are optimized for RTDB usage.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Button variant="outline" className="w-full justify-start" onClick={handleSyncRtdbToFirestore} disabled={isProcessing}>
                            <RefreshCw className="mr-2 h-4 w-4" /> Push RTDB Assets to Firestore
                        </Button>
                        <Button variant="outline" className="w-full justify-start" onClick={handleSyncFirestoreToRtdb} disabled={isProcessing}>
                            <RefreshCw className="mr-2 h-4 w-4" /> Pull Firestore Assets to RTDB
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Backup &amp; Restore</CardTitle>
                        <CardDescription>Export full snapshot of settings and assets.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <input type="file" ref={importFileRef} onChange={handleFileSelected} accept=".json" className="hidden" />
                        <Button variant="outline" className="w-full justify-start" onClick={handleImportFromJson} disabled={isProcessing}>
                            <FileUp className="mr-2 h-4 w-4" /> Import Full Snapshot (JSON)
                        </Button>
                        <Button variant="outline" className="w-full justify-start" onClick={() => exportFullBackupToJson(assets, appSettings)} disabled={isProcessing}>
                            <Download className="mr-2 h-4 w-4" /> Export Full Snapshot
                        </Button>
                    </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                    <CardTitle>RTDB Browser</CardTitle>
                    <CardDescription>Directly modify assets or config in the Realtime Database layer.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Button variant={browserPath === '/config' ? 'default' : 'outline'} onClick={() => handlePathSelect('/config')}>/config</Button>
                        <Button variant={browserPath === '/assets' ? 'default' : 'outline'} onClick={() => handlePathSelect('/assets')}>/assets</Button>
                    </div>
                    {browserPath && (
                        <div className="space-y-2">
                             <div className="flex items-center gap-2">
                                <Input placeholder="Find..." value={dbSearchTerm} onChange={e => setDbSearchTerm(e.target.value)} />
                                <Input placeholder="Replace..." value={dbReplaceTerm} onChange={e => setDbReplaceTerm(e.target.value)} />
                                <Button onClick={handleReplaceAll} variant="outline" size="sm">Replace All</Button>
                            </div>
                            <div className="relative">
                                <Textarea
                                    value={browserData}
                                    onChange={(e) => setBrowserData(e.target.value)}
                                    rows={12}
                                    className="font-mono text-xs"
                                    disabled={isBrowserLoading}
                                />
                                {isBrowserLoading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-background/50"><Loader2 className="h-8 w-8 animate-spin" /></div>
                                )}
                            </div>
                             <div className="flex justify-between">
                                <Button onClick={handleBrowserSave} disabled={isBrowserLoading}>Save to RTDB</Button>
                                <Button variant="destructive" onClick={() => setConfirmDeletePath(browserPath)} disabled={isBrowserLoading}><Trash2 className="mr-2 h-4 w-4" /> Wipe Path</Button>
                             </div>
                        </div>
                    )}
                </CardContent>
              </Card>

              <Card className="border-destructive">
                  <CardHeader><CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle/> Danger Zone</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Button variant="outline" className="justify-start border-destructive text-destructive hover:bg-destructive/10" onClick={() => openConfirmation('clear_local', 'Wipe Local?', 'Deletes all local cache.')}>
                          <HardDrive className="mr-2 h-4 w-4" /> Wipe Local Cache
                      </Button>
                       <Button variant="outline" className="justify-start border-destructive text-destructive hover:bg-destructive/10" onClick={() => openConfirmation('clear_rtdb', 'Wipe RTDB?', 'Clears primary asset cloud layer.')}>
                          <CloudOff className="mr-2 h-4 w-4" /> Wipe RTDB (Primary)
                      </Button>
                       <Button variant="outline" className="justify-start border-destructive text-destructive hover:bg-destructive/10" onClick={() => openConfirmation('clear_firestore', 'Wipe Firestore?', 'Clears backup asset cloud layer.')}>
                          <CloudOff className="mr-2 h-4 w-4" /> Wipe Firestore Assets
                      </Button>
                      <Button variant="destructive" className="justify-start" onClick={() => openConfirmation('nuke_all', 'NUKE ALL?', 'Global wipe of all devices and clouds.')}>
                          <DatabaseZap className="mr-2 h-4 w-4" /> NUKE GLOBAL DATA
                      </Button>
                  </CardContent>
              </Card>
            </div>

          <DialogFooter className="mt-auto">
            <DialogClose asChild><Button variant="outline">Close Admin</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
          <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>{confirmTitle}</AlertDialogTitle><AlertDialogDescription>{confirmDescription}</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setBackupToRestore(null)}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmAction} className="bg-destructive hover:bg-destructive/90">Yes, Execute</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
      
       <AlertDialog open={!!confirmDeletePath} onOpenChange={() => setConfirmDeletePath(null)}>
          <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Confirm Wipe</AlertDialogTitle><AlertDialogDescription>Delete everything at {confirmDeletePath}?</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handlePathDelete} className="bg-destructive">Wipe Path</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

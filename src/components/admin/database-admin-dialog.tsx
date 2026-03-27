"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
import { 
    clearAssets as clearFirestoreAssets, 
    getAssets as getAssetsFS,
    batchSetAssets as batchSetAssetsFS
} from '@/lib/firestore';
import { 
    getAssets as getAssetsRTDB, 
    batchSetAssets as batchSetAssetsRTDB, 
    clearAssets as clearRtdbAssets, 
} from '@/lib/database';
import { doc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { 
    Loader2, 
    Trash2, 
    DatabaseZap, 
    RefreshCw, 
    ShieldCheck, 
    Database, 
    ChevronRight,
    FileText,
    DatabaseIcon,
    History,
    Save,
    AlertOctagon,
    Layers,
    Clock,
    Zap,
    LayoutGrid,
} from 'lucide-react';
import { clearLocalAssets, saveLockedOfflineAssets } from '@/lib/idb';
import { addNotification } from '@/hooks/use-notifications';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

interface DatabaseAdminDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function DatabaseAdminDialog({ isOpen, onOpenChange }: DatabaseAdminDialogProps) {
  const { userProfile } = useAuth();
  const { activeDatabase, setActiveDatabase, activeGrantId } = useAppState();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const handleSwitchAndMirror = async (targetDb: 'firestore' | 'rtdb') => {
      if (targetDb === activeDatabase) return;
      setIsSwitching(true);
      addNotification({ title: 'Switching Active Database...', description: `Mirroring data to ${targetDb.toUpperCase()}...` });
      
      try {
          // 1. Get data from CURRENT primary
          const getSource = activeDatabase === 'firestore' ? getAssetsFS : getAssetsRTDB;
          const currentData = await getSource(activeGrantId);
          
          // 2. Set Active Database (persists to localStorage)
          await setActiveDatabase(targetDb);
          
          // 3. Mirror data to the NEW primary if source has items
          if (currentData.length > 0) {
              const setTarget = targetDb === 'firestore' ? batchSetAssetsFS : batchSetAssetsRTDB;
              await setTarget(currentData);
              addNotification({ title: 'Mirror Complete', description: `${currentData.length} records pushed to ${targetDb.toUpperCase()}.` });
          }
          
          toast({ title: "Primary Database Switched", description: `Active layer: ${targetDb.toUpperCase()}` });
      } catch (e) {
          addNotification({ title: 'Mirror Failed', variant: 'destructive' });
      } finally {
          setIsSwitching(false);
      }
  };

  const handleFullBackup = async () => {
      setIsProcessing(true);
      try {
          const fsData = await getAssetsFS(activeGrantId);
          await batchSetAssetsRTDB(fsData);
          addNotification({ title: 'Backup Successful', description: `Cloned ${fsData.length} Firestore records to RTDB.` });
      } catch (e) {
          toast({ title: 'Backup Failed', variant: 'destructive' });
      } finally {
          setIsProcessing(false);
      }
  };

  if (userProfile?.loginName !== 'admin') return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl flex flex-col h-[80vh] p-0 overflow-hidden rounded-3xl border-primary/10 shadow-2xl">
            <div className="px-8 pt-8 bg-muted/30 border-b">
                <DialogHeader className="mb-6">
                    <DialogTitle className="flex items-center gap-3 text-3xl font-black tracking-tight">
                        <ShieldCheck className="text-primary h-10 w-10"/> Infrastructure Console
                    </DialogTitle>
                    <DialogDescription className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground opacity-70">
                        Primary Data Layer & Mirror Orchestration
                    </DialogDescription>
                </DialogHeader>
            </div>

            <ScrollArea className="flex-1 bg-background">
                <div className="p-8 space-y-8">
                    {/* Database Selector Card */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card 
                            className={cn(
                                "cursor-pointer transition-all border-2",
                                activeDatabase === 'firestore' ? "border-primary bg-primary/5 ring-4 ring-primary/10" : "border-border hover:border-primary/30"
                            )}
                            onClick={() => handleSwitchAndMirror('firestore')}
                        >
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <DatabaseIcon className={cn("h-8 w-8", activeDatabase === 'firestore' ? "text-primary" : "text-muted-foreground")} />
                                    {activeDatabase === 'firestore' && <Badge className="bg-primary font-black uppercase text-[9px] tracking-widest">Primary</Badge>}
                                </div>
                                <CardTitle className="text-lg mt-2">Cloud Firestore</CardTitle>
                                <CardDescription className="text-xs">Document-based NoSQL. Optimized for complex queries and state filtering.</CardDescription>
                            </CardHeader>
                        </Card>

                        <Card 
                            className={cn(
                                "cursor-pointer transition-all border-2",
                                activeDatabase === 'rtdb' ? "border-primary bg-primary/5 ring-4 ring-primary/10" : "border-border hover:border-primary/30"
                            )}
                            onClick={() => handleSwitchAndMirror('rtdb')}
                        >
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <Zap className={cn("h-8 w-8", activeDatabase === 'rtdb' ? "text-primary" : "text-muted-foreground")} />
                                    {activeDatabase === 'rtdb' && <Badge className="bg-primary font-black uppercase text-[9px] tracking-widest">Primary</Badge>}
                                </div>
                                <CardTitle className="text-lg mt-2">Realtime Database</CardTitle>
                                <CardDescription className="text-xs">JSON-based sync. Ultra-fast updates and lower quota impact for heavy sync.</CardDescription>
                            </CardHeader>
                        </Card>
                    </div>

                    <div className="p-6 rounded-2xl bg-muted/20 border-2 border-dashed space-y-4">
                        <div className="flex items-center gap-3">
                            <RotateCcw className="h-5 w-5 text-primary" />
                            <h4 className="font-bold text-sm">Orchestration Tools</h4>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Use these tools to move data between layers. Switching the primary database will automatically attempt to mirror your current view to the new layer.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <Button variant="outline" className="h-12 font-bold justify-start" onClick={handleFullBackup} disabled={isProcessing}>
                                {isProcessing ? <Loader2 className="mr-3 h-4 w-4 animate-spin"/> : <History className="mr-3 h-4 w-4 text-primary"/>}
                                Manual Snapshot: FS → RTDB
                            </Button>
                            <Button variant="outline" className="h-12 font-bold justify-start" onClick={async () => {
                                setIsProcessing(true);
                                try {
                                    const rtdbData = await getAssetsRTDB(activeGrantId);
                                    await batchSetAssetsFS(rtdbData);
                                    addNotification({ title: 'Migration Complete', description: `Pushed ${rtdbData.length} records to Firestore.` });
                                } finally { setIsProcessing(false); }
                            }} disabled={isProcessing}>
                                <FileText className="mr-3 h-4 w-4 text-blue-500"/>
                                Migration: RTDB → FS
                            </Button>
                        </div>
                    </div>
                </div>
            </ScrollArea>

            <DialogFooter className="px-8 py-6 bg-muted/30 border-t">
                <DialogClose asChild>
                    <Button variant="ghost" className="font-black uppercase text-[10px] tracking-widest">Exit Infrastructure</Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}

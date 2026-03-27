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
    batchSetAssets as batchSetAssetsFS,
    getAssets as getAssetsFS
} from '@/lib/firestore';
import { 
    getAssets as getAssetsRTDB, 
    batchSetAssets as batchSetAssetsRTDB, 
    clearAssets as clearRtdbAssets, 
} from '@/lib/database';
import { doc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { 
    Loader2, 
    Trash2, 
    FileUp, 
    Download, 
    DatabaseZap, 
    RefreshCw, 
    Search, 
    ShieldCheck, 
    ChevronRight,
    FileText,
    Plus,
    Save,
    AlertOctagon,
    MinusCircle,
    Server,
    DatabaseIcon,
    ArrowRightLeft
} from 'lucide-react';
import { clearLocalAssets, saveLockedOfflineAssets } from '@/lib/idb';
import { exportAssetsToJson } from '@/lib/json-export';
import { addNotification } from '@/hooks/use-notifications';
import { useToast } from '@/hooks/use-toast';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { cn } from '@/lib/utils';
import { Switch } from '../ui/switch';
import { Checkbox } from '../ui/checkbox';

export function DatabaseAdminDialog({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (o: boolean) => void }) {
  const { userProfile } = useAuth();
  const { assets, setAssets, setOfflineAssets, activeDatabase, setActiveDatabase, activeGrantId } = useAppState();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<string>('assets');
  const [documents, setDocuments] = useState<{ id: string, data: any, title: string }[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<any>(null);
  const [isFsLoading, setIsFsLoading] = useState(false);

  const fetchFsData = useCallback(async () => {
    if (!db) return;
    setIsFsLoading(true);
    try {
        const colRef = collection(db, selectedCollection);
        const snapshot = await getDocs(colRef);
        const docs = snapshot.docs.map(doc => ({ id: doc.id, data: doc.data(), title: doc.data().description || doc.id }));
        setDocuments(docs);
    } catch (e) {
        toast({ title: 'Fetch Error', variant: 'destructive' });
    } finally {
        setIsFsLoading(false);
    }
  }, [selectedCollection, toast]);

  useEffect(() => {
    if (isOpen) fetchFsData();
  }, [isOpen, fetchFsData]);

  const handleSwitchSource = async (target: 'firestore' | 'rtdb') => {
      await setActiveDatabase(target);
  };

  const handleManualBackup = async () => {
      if (!activeGrantId) return;
      setIsProcessing(true);
      try {
          const data = activeDatabase === 'firestore' ? await getAssetsFS(activeGrantId) : await getAssetsRTDB(activeGrantId);
          if (activeDatabase === 'firestore') await batchSetAssetsRTDB(data);
          else await batchSetAssetsFS(data);
          addNotification({ title: 'Manual Backup Complete', description: `${data.length} records mirrored.` });
      } catch (e) {
          toast({ title: 'Backup Failed', variant: 'destructive' });
      } finally {
          setIsProcessing(false);
      }
  };

  if (userProfile?.loginName !== 'admin') return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1200px] w-[95vw] h-[90vh] flex flex-col p-0">
        <div className="p-6 border-b bg-muted/30">
            <div className="flex items-center justify-between">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl font-black">
                        <ShieldCheck className="text-primary" /> Infrastructure Workstation
                    </DialogTitle>
                    <DialogDescription>Primary context: {activeGrantId || 'No Project'}</DialogDescription>
                </DialogHeader>
                
                <div className="flex bg-background border rounded-xl p-1 gap-1">
                    <Button 
                        variant={activeDatabase === 'firestore' ? 'secondary' : 'ghost'} 
                        size="sm" 
                        className={cn("font-bold text-[10px]", activeDatabase === 'firestore' && "bg-primary/10 text-primary")}
                        onClick={() => handleSwitchSource('firestore')}
                    >
                        <Server className="mr-2 h-3.5 w-3.5"/> Firestore
                    </Button>
                    <Button 
                        variant={activeDatabase === 'rtdb' ? 'secondary' : 'ghost'} 
                        size="sm" 
                        className={cn("font-bold text-[10px]", activeDatabase === 'rtdb' && "bg-blue-500/10 text-blue-600")}
                        onClick={() => handleSwitchSource('rtdb')}
                    >
                        <DatabaseIcon className="mr-2 h-3.5 w-3.5"/> RTDB
                    </Button>
                </div>
            </div>
            
            <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" className="font-bold text-[10px]" onClick={handleManualBackup} disabled={isProcessing}>
                    <ArrowRightLeft className="mr-2 h-3.5 w-3.5" /> Manual Backup Mirror
                </Button>
                <Button variant="outline" size="sm" className="font-bold text-[10px]" onClick={fetchFsData} disabled={isFsLoading}>
                    <RefreshCw className={cn("mr-2 h-3.5 w-3.5", isFsLoading && "animate-spin")} /> Refresh Explorer
                </Button>
            </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
            {/* Simple Explorer Column */}
            <div className="w-[300px] border-r flex flex-col">
                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                        {documents.map(doc => (
                            <button 
                                key={doc.id}
                                className={cn("w-full text-left p-3 rounded-lg text-xs font-medium transition-all", selectedDocId === doc.id ? "bg-primary text-white" : "hover:bg-muted")}
                                onClick={() => { setSelectedDocId(doc.id); setEditingData({ ...doc.data }); }}
                            >
                                {doc.title}
                            </button>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* Field Editor Column */}
            <div className="flex-1 bg-muted/5 flex flex-col">
                {selectedDocId ? (
                    <ScrollArea className="flex-1">
                        <div className="p-8 space-y-6">
                            {editingData && Object.entries(editingData).map(([k, v]) => (
                                <div key={k} className="space-y-1">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground">{k}</Label>
                                    <Input value={String(v || '')} readOnly className="bg-background" />
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center opacity-20">
                        <DatabaseZap className="h-20 w-20 mb-4" />
                        <p className="text-xl font-black uppercase tracking-widest">Select Record</p>
                    </div>
                )}
            </div>
        </div>

        <DialogFooter className="p-4 border-t bg-muted/20">
            <DialogClose asChild><Button variant="ghost">Close Workstation</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

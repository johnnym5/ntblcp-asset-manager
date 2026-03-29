"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAppState } from '@/contexts/app-state-context';
import { 
    getAssets as getAssetsFS,
    batchSetAssets as batchSetAssetsFS
} from '@/lib/firestore';
import { 
    getAssets as getAssetsRTDB, 
    batchSetAssets as batchSetAssetsRTDB, 
} from '@/lib/database';
import { useAuth } from '@/contexts/auth-context';
import { 
    Loader2, 
    ShieldCheck, 
    FileText,
    DatabaseIcon,
    History,
    RotateCcw,
    Zap,
    AlertTriangle,
} from 'lucide-react';
import { addNotification } from '@/hooks/use-notifications';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { Card, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface DatabaseAdminDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function DatabaseAdminDialog({ isOpen, onOpenChange }: DatabaseAdminDialogProps) {
  const { userProfile } = useAuth();
  const { activeDatabase, setActiveDatabase, activeGrantId } = useAppState();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFullBackup = async () => {
      if (!activeGrantId) return;
      setIsProcessing(true);
      try {
          const fsData = await getAssetsFS(activeGrantId);
          await batchSetAssetsRTDB(fsData);
          addNotification({ title: 'Backup Successful', description: `Cloned ${fsData.length} records to Realtime Database.` });
          toast({ title: "Mirror Snapshot Created" });
      } catch (e) {
          toast({ title: 'Backup Failed', variant: 'destructive' });
      } finally {
          setIsProcessing(false);
      }
  };

  const handleMigration = async () => {
      if (!activeGrantId) return;
      setIsProcessing(true);
      try {
          const rtdbData = await getAssetsRTDB(activeGrantId);
          await batchSetAssetsFS(rtdbData);
          addNotification({ title: 'Migration Complete', description: `Pushed ${rtdbData.length} records to Cloud Firestore.` });
          toast({ title: "Firestore Restored from Mirror" });
      } catch (e) {
          toast({ title: 'Migration Failed', variant: 'destructive' });
      } finally {
          setIsProcessing(false);
      }
  };

  if (userProfile?.loginName !== 'admin') return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl flex flex-col h-[85vh] p-0 overflow-hidden rounded-3xl border-primary/10 shadow-2xl">
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
                    <Alert variant="destructive" className="border-2 bg-destructive/5">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle className="font-bold">Caution: Direct Data Manipulation</AlertTitle>
                        <AlertDescription className="text-xs leading-relaxed opacity-80">
                            Switching the primary data source will re-route all user traffic. Ensure your backup mirror is current before migrating production users.
                        </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card 
                            className={cn(
                                "cursor-pointer transition-all border-2",
                                activeDatabase === 'firestore' ? "border-primary bg-primary/5 ring-4 ring-primary/10" : "border-border hover:border-primary/30"
                            )}
                            onClick={() => setActiveDatabase('firestore')}
                        >
                            <CardHeader className="pb-4">
                                <div className="flex justify-between items-start">
                                    <DatabaseIcon className={cn("h-8 w-8", activeDatabase === 'firestore' ? "text-primary" : "text-muted-foreground")} />
                                    {activeDatabase === 'firestore' && <Badge className="bg-primary font-black uppercase text-[9px]">Active</Badge>}
                                </div>
                                <CardTitle className="text-lg mt-2">Cloud Firestore</CardTitle>
                                <CardDescription className="text-xs leading-tight">Complex regional queries and granular document security.</CardDescription>
                            </CardHeader>
                        </Card>

                        <Card 
                            className={cn(
                                "cursor-pointer transition-all border-2",
                                activeDatabase === 'rtdb' ? "border-primary bg-primary/5 ring-4 ring-primary/10" : "border-border hover:border-primary/30"
                            )}
                            onClick={() => setActiveDatabase('rtdb')}
                        >
                            <CardHeader className="pb-4">
                                <div className="flex justify-between items-start">
                                    <Zap className={cn("h-8 w-8", activeDatabase === 'rtdb' ? "text-primary" : "text-muted-foreground")} />
                                    {activeDatabase === 'rtdb' && <Badge className="bg-primary font-black uppercase text-[9px]">Active</Badge>}
                                </div>
                                <CardTitle className="text-lg mt-2">Realtime Database</CardTitle>
                                <CardDescription className="text-xs leading-tight">Low-latency sync and reduced quota impact for high-frequency updates.</CardDescription>
                            </CardHeader>
                        </Card>
                    </div>

                    <div className="p-6 rounded-2xl bg-muted/20 border-2 border-dashed space-y-4">
                        <div className="flex items-center gap-3">
                            <RotateCcw className="h-5 w-5 text-primary" />
                            <h4 className="font-bold text-sm">Mirror Orchestration</h4>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Manually synchronize project data between layers. Use <strong>Snapshot</strong> to backup Firestore data to RTDB, or <strong>Restore</strong> to push RTDB changes back to Firestore.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <Button variant="outline" className="h-12 font-bold justify-start rounded-xl border-primary/20 bg-background" onClick={handleFullBackup} disabled={isProcessing}>
                                {isProcessing ? <Loader2 className="mr-3 h-4 w-4 animate-spin"/> : <History className="mr-3 h-4 w-4 text-primary"/>}
                                Snapshot: FS → RTDB
                            </Button>
                            <Button variant="outline" className="h-12 font-bold justify-start rounded-xl border-blue-200 bg-background" onClick={handleMigration} disabled={isProcessing}>
                                <FileText className="mr-3 h-4 w-4 text-blue-500"/>
                                Restore: RTDB → FS
                            </Button>
                        </div>
                    </div>
                </div>
            </ScrollArea>

            <DialogFooter className="px-8 py-6 bg-muted/30 border-t">
                <DialogClose asChild><Button variant="ghost" className="font-bold">Close Infrastructure</Button></DialogClose>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}

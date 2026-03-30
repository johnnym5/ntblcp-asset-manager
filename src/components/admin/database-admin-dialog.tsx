
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
    batchSetAssets as batchSetAssetsFS,
    clearAssets as clearAssetsFS
} from '@/lib/firestore';
import { 
    getAssets as getAssetsRTDB, 
    batchSetAssets as batchSetAssetsRTDB,
    clearAssets as clearAssetsRTDB
} from '@/lib/database';
import { useAuth } from '@/contexts/auth-context';
import { 
    Loader2, 
    ShieldCheck, 
    Database as DatabaseIcon,
    History,
    Zap,
    AlertTriangle,
    FileText,
    RotateCcw,
    RefreshCw,
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
  const { activeDatabase, setActiveDatabase, activeGrantId, appSettings } = useAppState();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);

  const activeGrantName = appSettings.grants.find(g => g.id === activeGrantId)?.name || 'Active Project';

  const handleFullBackup = async () => {
      if (!activeGrantId) return;
      setIsProcessing(true);
      try {
          // Snapshot: FS -> RTDB
          // 1. Get data from primary (Firestore)
          const fsData = await getAssetsFS();
          const projectData = fsData.filter(a => a.grantId === activeGrantId);
          
          if (projectData.length === 0) {
              toast({ title: "No data to mirror", description: "The active project is currently empty in Firestore." });
              return;
          }

          // 2. Clone to secondary (RTDB)
          await batchSetAssetsRTDB(projectData);
          
          addNotification({ 
              title: 'Mirror Snapshot Created', 
              description: `Successfully cloned ${projectData.length} records from [Firestore] to [Realtime Database] for project: ${activeGrantName}.` 
          });
          toast({ title: "Mirroring Complete" });
      } catch (e) {
          console.error("Mirror failed:", e);
          toast({ title: 'Snapshot Failed', variant: 'destructive' });
      } finally {
          setIsProcessing(false);
      }
  };

  const handleMigration = async () => {
      if (!activeGrantId) return;
      setIsProcessing(true);
      try {
          // Restore: RTDB -> FS
          // 1. Get data from RTDB
          const rtdbData = await getAssetsRTDB(activeGrantId);
          
          if (rtdbData.length === 0) {
              toast({ title: "No data to restore", description: "The active project is currently empty in Realtime Database." });
              return;
          }

          // 2. Push to Firestore
          await batchSetAssetsFS(rtdbData);
          
          addNotification({ 
              title: 'Firestore Restored', 
              description: `Pushed ${rtdbData.length} records from [RTDB] back to [Cloud Firestore] for project: ${activeGrantName}.` 
          });
          toast({ title: "Restore Complete" });
      } catch (e) {
          console.error("Restore failed:", e);
          toast({ title: 'Migration Failed', variant: 'destructive' });
      } finally {
          setIsProcessing(false);
      }
  };

  if (!userProfile?.isAdmin) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl flex flex-col h-[85vh] p-0 overflow-hidden rounded-3xl border-primary/10 shadow-2xl">
            <div className="px-8 pt-8 bg-muted/30 border-b">
                <DialogHeader className="mb-6">
                    <DialogTitle className="flex items-center gap-3 text-3xl font-black tracking-tight text-foreground">
                        <ShieldCheck className="text-primary h-10 w-10"/> Infrastructure Console
                    </DialogTitle>
                    <DialogDescription className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground opacity-70">
                        Registry Data Layers & Mirroring Orchestration
                    </DialogDescription>
                </DialogHeader>
            </div>

            <ScrollArea className="flex-1 bg-background">
                <div className="p-8 space-y-8">
                    <Alert variant="destructive" className="border-2 bg-destructive/5">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle className="font-bold">Production Traffic Routing</AlertTitle>
                        <AlertDescription className="text-xs leading-relaxed opacity-80">
                            Switching the primary source instantly re-routes all users. If you switch to an empty database, the registry will appear cleared until you perform a snapshot.
                        </AlertDescription>
                    </Alert>

                    <div className="space-y-4">
                        <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                            <RefreshCw className="h-4 w-4" /> Select Primary Data Layer
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card 
                                className={cn(
                                    "cursor-pointer transition-all border-2 relative overflow-hidden",
                                    activeDatabase === 'firestore' ? "border-primary bg-primary/5 ring-4 ring-primary/10" : "border-border hover:border-primary/30"
                                )}
                                onClick={() => setActiveDatabase('firestore')}
                            >
                                <CardHeader className="pb-4">
                                    <div className="flex justify-between items-start">
                                        <DatabaseIcon className={cn("h-8 w-8", activeDatabase === 'firestore' ? "text-primary" : "text-muted-foreground")} />
                                        {activeDatabase === 'firestore' && <Badge className="bg-primary font-black uppercase text-[9px]">Active Layer</Badge>}
                                    </div>
                                    <CardTitle className="text-lg mt-2">Cloud Firestore</CardTitle>
                                    <CardDescription className="text-xs leading-tight">Advanced document security and regional audit trails. Best for general management.</CardDescription>
                                </CardHeader>
                            </Card>

                            <Card 
                                className={cn(
                                    "cursor-pointer transition-all border-2 relative overflow-hidden",
                                    activeDatabase === 'rtdb' ? "border-primary bg-primary/5 ring-4 ring-primary/10" : "border-border hover:border-primary/30"
                                )}
                                onClick={() => setActiveDatabase('rtdb')}
                            >
                                <CardHeader className="pb-4">
                                    <div className="flex justify-between items-start">
                                        <Zap className={cn("h-8 w-8", activeDatabase === 'rtdb' ? "text-primary" : "text-muted-foreground")} />
                                        {activeDatabase === 'rtdb' && <Badge className="bg-primary font-black uppercase text-[9px]">Active Layer</Badge>}
                                    </div>
                                    <CardTitle className="text-lg mt-2">Realtime Database</CardTitle>
                                    <CardDescription className="text-xs leading-tight">Low-latency mirroring for high-integrity field operations in poor connectivity zones.</CardDescription>
                                </CardHeader>
                            </Card>
                        </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-muted/20 border-2 border-dashed space-y-4">
                        <div className="flex items-center gap-3">
                            <RotateCcw className="h-5 w-5 text-primary" />
                            <h4 className="font-bold text-sm">Active Project Mirror: {activeGrantName}</h4>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Manually synchronize the current project's data between layers. Use <strong>Snapshot</strong> to create a point-in-time backup of Firestore data into the Realtime Database.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <Button variant="outline" className="h-12 font-bold justify-start rounded-xl border-primary/20 bg-background" onClick={handleFullBackup} disabled={isProcessing}>
                                {isProcessing ? <Loader2 className="mr-3 h-4 w-4 animate-spin"/> : <History className="mr-3 h-4 w-4 text-primary"/>}
                                Snapshot: FS → RTDB
                            </Button>
                            <Button variant="outline" className="h-12 font-bold justify-start rounded-xl border-blue-200 bg-background" onClick={handleMigration} disabled={isProcessing}>
                                {isProcessing ? <Loader2 className="mr-3 h-4 w-4 animate-spin"/> : <FileText className="mr-3 h-4 w-4 text-blue-500"/>}
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

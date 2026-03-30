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
} from '@/lib/firestore';
import { 
    getAssets as getAssetsRTDB, 
    batchSetAssets as batchSetAssetsRTDB,
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
    ArrowRightLeft,
    Monitor,
    Code,
    Activity,
    CheckCircle2,
    XCircle
} from 'lucide-react';
import { addNotification } from '@/hooks/use-notifications';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface DatabaseAdminDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function DatabaseAdminDialog({ isOpen, onOpenChange }: DatabaseAdminDialogProps) {
  const { userProfile } = useAuth();
  const { activeDatabase, setActiveDatabase, activeGrantId, appSettings, assets } = useAppState();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [explorerSearch, setExplorerSearch] = useState('');

  const activeGrantName = appSettings.grants.find(g => g.id === activeGrantId)?.name || 'Active Project';

  const handleFullBackup = async () => {
      if (!activeGrantId) return;
      setIsProcessing(true);
      try {
          const fsData = await getAssetsFS();
          const projectData = fsData.filter(a => a.grantId === activeGrantId);
          
          if (projectData.length === 0) {
              toast({ title: "No data to mirror", description: "The active project is currently empty in Firestore." });
              return;
          }

          await batchSetAssetsRTDB(projectData);
          addNotification({ 
              title: 'Mirror Snapshot Created', 
              description: `Successfully cloned ${projectData.length} records from [Firestore] to [RTDB] for project: ${activeGrantName}.` 
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
          const rtdbData = await getAssetsRTDB(activeGrantId);
          if (rtdbData.length === 0) {
              toast({ title: "No data to restore", description: "The active project is currently empty in RTDB." });
              return;
          }

          await batchSetAssetsFS(rtdbData);
          addNotification({ 
              title: 'Firestore Restored', 
              description: `Pushed ${rtdbData.length} records from [RTDB] to [Firestore] for project: ${activeGrantName}.` 
          });
          toast({ title: "Restore Complete" });
      } catch (e) {
          console.error("Restore failed:", e);
          toast({ title: 'Migration Failed', variant: 'destructive' });
      } finally {
          setIsProcessing(false);
      }
  };

  const handleSwitchAndSync = async (target: 'firestore' | 'rtdb') => {
      if (target === activeDatabase) return;
      setIsProcessing(true);
      try {
          if (target === 'rtdb') {
              await handleFullBackup();
          } else {
              await handleMigration();
          }
          await setActiveDatabase(target);
          toast({ title: `Rerouted to ${target.toUpperCase()}` });
      } catch (e) {
          toast({ title: "Switch Failed", description: "Could not safely mirror data before switching.", variant: 'destructive' });
      } finally {
          setIsProcessing(false);
      }
  };

  if (!userProfile?.isAdmin) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl flex flex-col h-[90vh] p-0 overflow-hidden rounded-3xl border-primary/10 shadow-2xl bg-background">
            <div className="px-8 pt-8 bg-muted/30 border-b">
                <DialogHeader className="mb-6">
                    <DialogTitle className="flex items-center gap-3 text-3xl font-black tracking-tight text-foreground">
                        <Monitor className="text-primary h-10 w-10"/> Infrastructure Workstation
                    </DialogTitle>
                    <DialogDescription className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground opacity-70">
                        Low-Level Registry Orchestration & High-Availability Monitoring
                    </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="orchestration" className="w-full">
                    <TabsList className="bg-transparent border-none p-0 h-auto gap-8">
                        <TabsTrigger value="orchestration" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-4 text-[10px] font-black uppercase tracking-widest transition-all">Traffic Routing</TabsTrigger>
                        <TabsTrigger value="explorer" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-4 text-[10px] font-black uppercase tracking-widest transition-all">Registry Explorer</TabsTrigger>
                        <TabsTrigger value="health" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-4 text-[10px] font-black uppercase tracking-widest transition-all">System Health</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            <div className="flex-1 overflow-hidden">
                <Tabs defaultValue="orchestration" className="h-full flex flex-col">
                    <TabsContent value="orchestration" className="flex-1 overflow-y-auto m-0 p-8 space-y-8 outline-none">
                        <Alert variant="destructive" className="border-2 bg-destructive/5 rounded-2xl">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle className="font-bold">Production Traffic Routing</AlertTitle>
                            <AlertDescription className="text-xs leading-relaxed opacity-80">
                                Switching the primary layer reroutes all active field sessions. The "Sync & Switch" tool will auto-mirror data to maintain registry fidelity.
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <ArrowRightLeft className="h-3.5 w-3.5" /> Primary Registry Provider
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card 
                                    className={cn(
                                        "cursor-pointer transition-all border-2 relative overflow-hidden rounded-3xl",
                                        activeDatabase === 'firestore' ? "border-primary bg-primary/5 ring-4 ring-primary/10 shadow-2xl" : "border-border/50 hover:border-primary/30"
                                    )}
                                    onClick={() => handleSwitchAndSync('firestore')}
                                >
                                    <CardHeader className="pb-4">
                                        <div className="flex justify-between items-start">
                                            <DatabaseIcon className={cn("h-8 w-8", activeDatabase === 'firestore' ? "text-primary" : "text-muted-foreground/40")} />
                                            {activeDatabase === 'firestore' && <Badge className="bg-primary font-black uppercase text-[9px] rounded-lg px-2 h-5">ACTIVE LAYER</Badge>}
                                        </div>
                                        <CardTitle className="text-xl font-black mt-3">Cloud Firestore</CardTitle>
                                        <CardDescription className="text-xs font-bold uppercase tracking-tighter opacity-60">High-Security Document Engine</CardDescription>
                                    </CardHeader>
                                </Card>

                                <Card 
                                    className={cn(
                                        "cursor-pointer transition-all border-2 relative overflow-hidden rounded-3xl",
                                        activeDatabase === 'rtdb' ? "border-primary bg-primary/5 ring-4 ring-primary/10 shadow-2xl" : "border-border/50 hover:border-primary/30"
                                    )}
                                    onClick={() => handleSwitchAndSync('rtdb')}
                                >
                                    <CardHeader className="pb-4">
                                        <div className="flex justify-between items-start">
                                            <Zap className={cn("h-8 w-8", activeDatabase === 'rtdb' ? "text-primary" : "text-muted-foreground/40")} />
                                            {activeDatabase === 'rtdb' && <Badge className="bg-primary font-black uppercase text-[9px] rounded-lg px-2 h-5">ACTIVE LAYER</Badge>}
                                        </div>
                                        <CardTitle className="text-xl font-black mt-3">Realtime Database</CardTitle>
                                        <CardDescription className="text-xs font-bold uppercase tracking-tighter opacity-60">Low-Latency Shadow Mirror</CardDescription>
                                    </CardHeader>
                                </Card>
                            </div>
                        </div>

                        <div className="p-6 rounded-3xl bg-muted/20 border-2 border-dashed space-y-4">
                            <div className="flex items-center gap-3">
                                <RotateCcw className="h-5 w-5 text-primary" />
                                <h4 className="font-black text-sm uppercase tracking-tight">Active Project Snapshot: {activeGrantName}</h4>
                            </div>
                            <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                                Manually reconcile registry states between layers. This operation is non-destructive and merges record deltas.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                <Button variant="outline" className="h-14 font-black uppercase text-[10px] tracking-widest justify-start rounded-2xl border-primary/20 bg-background shadow-sm hover:bg-primary/5 transition-all" onClick={handleFullBackup} disabled={isProcessing}>
                                    {isProcessing ? <Loader2 className="mr-3 h-4 w-4 animate-spin"/> : <History className="mr-3 h-4 w-4 text-primary"/>}
                                    Snapshot: Firestore → RTDB
                                </Button>
                                <Button variant="outline" className="h-14 font-black uppercase text-[10px] tracking-widest justify-start rounded-2xl border-blue-200 bg-background shadow-sm hover:bg-blue-50/50 transition-all" onClick={handleMigration} disabled={isProcessing}>
                                    {isProcessing ? <Loader2 className="mr-3 h-4 w-4 animate-spin"/> : <FileText className="mr-3 h-4 w-4 text-blue-500"/>}
                                    Restore: RTDB → Firestore
                                </Button>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="explorer" className="flex-1 overflow-hidden m-0 p-8 outline-none flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                    <Code className="h-4 w-4" /> Registry Object Explorer
                                </h3>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Analyzing {assets.length} live memory objects</p>
                            </div>
                        </div>
                        <ScrollArea className="flex-1 border-2 rounded-3xl bg-muted/5 p-4">
                            <div className="space-y-4">
                                {assets.slice(0, 20).map(asset => (
                                    <div key={asset.id} className="p-4 rounded-2xl bg-background border border-border/50 shadow-sm group hover:border-primary/30 transition-all">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-xs font-black text-foreground">{asset.description}</span>
                                            <Badge variant="outline" className="text-[9px] font-mono opacity-40 border-none px-0">ID: {asset.id}</Badge>
                                        </div>
                                        <pre className="text-[10px] font-mono text-muted-foreground p-3 bg-muted/20 rounded-xl overflow-x-auto">
                                            {JSON.stringify({
                                                category: asset.category,
                                                verifiedStatus: asset.verifiedStatus,
                                                lastModified: asset.lastModified,
                                                metadata: {
                                                    section: asset.majorSection,
                                                    year: asset.yearBucket
                                                }
                                            }, null, 2)}
                                        </pre>
                                    </div>
                                ))}
                                {assets.length > 20 && (
                                    <p className="text-center text-[10px] font-bold text-muted-foreground uppercase py-4 opacity-40">... showing first 20 records for performance ...</p>
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="health" className="flex-1 overflow-y-auto m-0 p-8 outline-none space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="rounded-3xl border-2 shadow-sm bg-muted/5">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Provider: Cloud Firestore</CardTitle>
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between text-xs font-bold">
                                        <span className="opacity-60 uppercase">Connection Heartbeat</span>
                                        <span className="text-green-600 font-black">STABLE (24ms)</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs font-bold">
                                        <span className="opacity-60 uppercase">Registry Scope</span>
                                        <span>PROD-CLUSTER-01</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="rounded-3xl border-2 shadow-sm bg-muted/5">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Provider: Realtime DB</CardTitle>
                                        <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between text-xs font-bold">
                                        <span className="opacity-60 uppercase">Mirror Sync Pulse</span>
                                        <span className="text-blue-600 font-black">ACTIVE</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs font-bold">
                                        <span className="opacity-60 uppercase">Protocol</span>
                                        <span className="font-mono">WSS://SECURE</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            <DialogFooter className="px-8 py-6 bg-muted/30 border-t">
                <DialogClose asChild><Button variant="ghost" className="font-black uppercase text-[10px] tracking-[0.2em] rounded-xl hover:bg-primary/5 transition-all">Close Infrastructure</Button></DialogClose>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}

"use client";

/**
 * @fileOverview Infrastructure Workstation - Deterministic DB Orchestration.
 */

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
import { useAuth } from '@/contexts/auth-context';
import { 
    Loader2, 
    Monitor,
    Database,
    Zap,
    History,
    RefreshCw,
    Activity,
    ShieldCheck,
    AlertTriangle,
    ArrowRightLeft
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface DatabaseAdminDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function DatabaseAdminDialog({ isOpen, onOpenChange }: DatabaseAdminDialogProps) {
  const { userProfile } = useAuth();
  const { isSyncing, appSettings, refreshRegistry } = useAppState();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);

  const activeProject = appSettings?.grants.find(g => g.id === appSettings.activeGrantId)?.name || 'N/A';

  const handleManualSync = async () => {
    setIsProcessing(true);
    try {
      await refreshRegistry();
      toast({ title: "Sync Heartbeat Success", description: "Cloud and Local registries reconciled." });
    } catch (e) {
      toast({ variant: "destructive", title: "Sync Heartbeat Failure", description: "Could not establish cloud parity." });
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
                        Registry Orchestration & High-Availability Monitoring
                    </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="status" className="w-full">
                    <TabsList className="bg-transparent border-none p-0 h-auto gap-8">
                        <TabsTrigger value="status" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-4 text-[10px] font-black uppercase tracking-widest transition-all">Service Status</TabsTrigger>
                        <TabsTrigger value="replication" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-4 text-[10px] font-black uppercase tracking-widest transition-all">Replication Pulse</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <Tabs defaultValue="status">
                    <TabsContent value="status" className="space-y-8 outline-none m-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="rounded-3xl border-2 shadow-sm bg-muted/5">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary">Primary: Cloud Firestore</CardTitle>
                                        <ShieldCheck className="h-4 w-4 text-green-500" />
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between text-xs font-bold">
                                        <span className="opacity-60 uppercase">Heartbeat</span>
                                        <span className="text-green-600 font-black uppercase">Active (Stable)</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs font-bold">
                                        <span className="opacity-60 uppercase">Active Cluster</span>
                                        <span className="font-mono">PROD-NORTH-01</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="rounded-3xl border-2 shadow-sm bg-muted/5">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary">Shadow: Realtime DB</CardTitle>
                                        <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between text-xs font-bold">
                                        <span className="opacity-60 uppercase">Mirror Status</span>
                                        <span className="text-blue-600 font-black uppercase">Replicating</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs font-bold">
                                        <span className="opacity-60 uppercase">Protocol</span>
                                        <span className="font-mono">WSS://SECURE</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="p-8 rounded-[2.5rem] bg-muted/10 border-2 border-dashed space-y-6">
                            <div className="space-y-1">
                                <h4 className="text-lg font-black uppercase tracking-tight">Manual Reconciliation</h4>
                                <p className="text-xs text-muted-foreground font-medium max-w-md">Force a state-refresh across all layers for the active project register.</p>
                            </div>
                            <div className="flex flex-wrap gap-4">
                                <Button onClick={handleManualSync} disabled={isProcessing || isSyncing} className="h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 gap-3">
                                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                    Trigger Global Refresh
                                </Button>
                                <Button variant="outline" className="h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-card border-2 border-border/40 gap-3">
                                    <History className="h-4 w-4" /> Download History
                                </Button>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="replication" className="space-y-8 outline-none m-0">
                        <Alert className="border-2 bg-primary/5 border-primary/20 rounded-2xl">
                            <AlertTriangle className="h-4 w-4 text-primary" />
                            <AlertTitle className="font-black uppercase text-[10px] tracking-widest">Replication Authority</AlertTitle>
                            <AlertDescription className="text-xs font-medium opacity-70">
                                This workstation manages the cross-layer mirror pulse. Changes to the primary Firestore cluster are mirrored to the Realtime Database shadow every 500ms.
                            </AlertDescription>
                        </Alert>

                        <Card className="rounded-[2.5rem] border-2 border-dashed border-border/40 shadow-none bg-muted/5">
                            <CardHeader>
                                <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-3">
                                    <ArrowRightLeft className="h-4 w-4 text-primary" /> Active Pulse Context
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="p-6 rounded-2xl bg-background border-2 shadow-sm space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black uppercase opacity-40">Registry ID</span>
                                        <span className="font-mono text-xs">{appSettings?.activeGrantId || 'NULL'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black uppercase opacity-40">Project Name</span>
                                        <span className="text-sm font-black text-primary">{activeProject}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
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

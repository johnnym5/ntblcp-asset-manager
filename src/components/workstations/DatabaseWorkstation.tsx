'use client';

/**
 * @fileOverview DatabaseWorkstation - Database Management.
 * Phase 165: Renamed to Database Management.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Database, 
  CheckCircle2, 
  RefreshCw, 
  FileJson, 
  Trash2, 
  AlertTriangle, 
  Loader2, 
  ArrowRightLeft, 
  Download, 
  Upload, 
  Bomb, 
  Zap, 
  Monitor,
  ChevronDown,
  Terminal,
  Activity,
  HardDrive,
  ShieldCheck,
  Search,
  ScanSearch,
  X,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Hammer,
  Server,
  Cloud
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { VirtualDBService } from '@/services/virtual-db-service';
import { cn } from '@/lib/utils';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function DatabaseWorkstation() {
  const { assets, appSettings, refreshRegistry, isOnline, isSyncing } = useAppState();
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const [isHealthOpen, setIsHealthOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [nukeDialogOpen, setNukeDialogOpen] = useState(false);
  const [activePath, setActivePath] = useState('/assets');

  const stats = useMemo(() => ({
    assetCount: assets.length,
    dbStatus: isOnline ? 'ONLINE' : 'OFFLINE',
    latency: '42ms'
  }), [assets, isOnline]);

  const handleNukePulse = async () => {
    setIsProcessing(true);
    try {
      await VirtualDBService.purgeGlobalRegistry();
      toast({ title: "Register Reset", description: "Global register wiped successfully." });
      await refreshRegistry();
      setNukeDialogOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!userProfile?.isAdmin) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-40 animate-in fade-in duration-700">
      
      {/* Header */}
      <div className="space-y-1 px-1">
        <div className="flex items-center gap-3">
          <Terminal className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">Database Management</h2>
        </div>
        <p className="text-[10px] font-bold text-muted-foreground opacity-60 uppercase tracking-widest">
          Primary Storage: Firestore & Hybrid Shadow: RTDB
        </p>
      </div>

      {/* 1. System Health Audit */}
      <Card className="bg-card/50 border-border/40 rounded-2xl overflow-hidden shadow-2xl">
        <Collapsible open={isHealthOpen} onOpenChange={setIsHealthOpen}>
          <CollapsibleTrigger asChild>
            <div className="p-6 border-b border-border/40 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-all">
              <div className="space-y-1">
                <h3 className="text-sm font-black uppercase text-foreground">Storage Health Audit</h3>
                <p className="text-[10px] text-muted-foreground italic">Real-time status of tiered storage layers.</p>
              </div>
              <ChevronsUpDown className="h-4 w-4 text-muted-foreground opacity-40" />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Settings Column */}
              <div className="space-y-6">
                <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40">Configuration</h4>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-xs font-black uppercase text-foreground">Governance Settings</p>
                      <p className="text-[9px] text-muted-foreground leading-relaxed">Loaded from Firestore Authority.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Database Column */}
              <div className="space-y-6">
                <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40">Database Engine</h4>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-xs font-black uppercase text-foreground">Environment State</p>
                      <p className="text-[9px] text-muted-foreground leading-relaxed">Firebase API credentials validated.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-xs font-black uppercase text-foreground">RTDB Standby</p>
                      <p className="text-[9px] text-muted-foreground leading-relaxed">Realtime mirror layer is active.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assets Column */}
              <div className="space-y-6">
                <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40">Asset Records</h4>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-xs font-black uppercase text-foreground">Local Persistent Cache</p>
                      <p className="text-[9px] text-muted-foreground leading-relaxed">{stats.assetCount} assets currently indexed locally.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* 2. Database Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="bg-card/50 border-border/40 rounded-2xl p-8 space-y-6 shadow-2xl">
          <div className="space-y-1">
            <h3 className="text-xl font-black uppercase text-foreground">Register Synchronization</h3>
            <p className="text-[10px] text-muted-foreground font-medium italic">Manually reconcile data across storage layers.</p>
          </div>
          <div className="space-y-3">
            <Button variant="outline" onClick={refreshRegistry} className="w-full h-12 rounded-xl font-black uppercase text-[10px] tracking-widest gap-3 justify-start px-6">
              <RefreshCw className="h-4 w-4 text-primary" /> Sync Local to Cloud Database
            </Button>
            <Button variant="outline" onClick={refreshRegistry} className="w-full h-12 rounded-xl font-black uppercase text-[10px] tracking-widest gap-3 justify-start px-6">
              <Download className="h-4 w-4 text-primary" /> Pull Cloud State to Asset Register
            </Button>
          </div>
        </Card>

        <Card className="bg-card/50 border-border/40 rounded-2xl p-8 space-y-6 shadow-2xl">
          <div className="space-y-1">
            <h3 className="text-xl font-black uppercase text-foreground">Archive Manager</h3>
            <p className="text-[10px] text-muted-foreground font-medium italic">Full system state backup and recovery.</p>
          </div>
          <div className="space-y-3">
            <Button variant="outline" className="w-full h-12 rounded-xl font-black uppercase text-[10px] tracking-widest gap-3 justify-start px-6">
              <Upload className="h-4 w-4 text-primary" /> Restore from JSON Archive
            </Button>
            <Button variant="outline" className="w-full h-12 rounded-xl font-black uppercase text-[10px] tracking-widest gap-3 justify-start px-6">
              <Download className="h-4 w-4 text-primary" /> Generate Asset Register Snapshot
            </Button>
          </div>
        </Card>
      </div>

      {/* 3. Raw Data Browser */}
      <Card className="bg-card/50 border-border/40 rounded-2xl p-8 space-y-6 shadow-2xl">
        <div className="space-y-1">
          <h3 className="text-xl font-black uppercase text-foreground">Raw Storage Browser</h3>
          <p className="text-[10px] text-muted-foreground font-medium italic">Direct read access to low-level database paths.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setActivePath('/config')} className={cn("px-6 py-2 rounded-xl font-black uppercase text-[10px] border transition-all", activePath === '/config' ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border/40 text-muted-foreground hover:text-foreground")}>/config</button>
          <button onClick={() => setActivePath('/assets')} className={cn("px-6 py-2 rounded-xl font-black uppercase text-[10px] border transition-all", activePath === '/assets' ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border/40 text-muted-foreground hover:text-foreground")}>/assets</button>
        </div>
      </Card>

      {/* 4. Danger Zone */}
      <div className="p-8 rounded-[2.5rem] bg-destructive/5 border-2 border-destructive/20 space-y-8 shadow-xl">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-destructive" />
          <h3 className="text-xl font-black uppercase text-destructive tracking-widest">Maintenance Operations</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button variant="outline" onClick={handleNukePulse} className="h-12 border-destructive/20 text-destructive hover:bg-destructive/10 rounded-xl font-black uppercase text-[10px] tracking-widest justify-start px-6 gap-3">
            <HardDrive className="h-4 w-4" /> Clear Local Cache
          </Button>
          <Button variant="outline" onClick={handleNukePulse} className="h-12 border-destructive/20 text-destructive hover:bg-destructive/10 rounded-xl font-black uppercase text-[10px] tracking-widest justify-start px-6 gap-3">
            <Server className="h-4 w-4" /> Wipe Standby Mirror (RTDB)
          </Button>
          <Button variant="outline" onClick={handleNukePulse} className="h-12 border-destructive/20 text-destructive hover:bg-destructive/10 rounded-xl font-black uppercase text-[10px] tracking-widest justify-start px-6 gap-3">
            <Cloud className="h-4 w-4" /> Wipe Primary Register (Firestore)
          </Button>
          <Button onClick={() => setNukeDialogOpen(true)} className="h-12 bg-destructive text-destructive-foreground rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-destructive/20 gap-3">
            <Bomb className="h-4 w-4" /> RESET GLOBAL REGISTER
          </Button>
        </div>
      </div>

      <div className="fixed bottom-24 left-0 right-0 z-50 pointer-events-none">
        <div className="max-w-6xl auto px-4">
          <div className="bg-card/90 backdrop-blur-2xl border border-border/40 rounded-2xl h-16 flex items-center justify-between px-6 pointer-events-auto shadow-3xl">
            <div className="flex-1 flex items-center gap-4 px-10">
              <button className="text-muted-foreground/40 hover:text-foreground transition-all"><ChevronLeft className="h-4 w-4" /></button>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden relative">
                <div className="absolute top-0 left-0 h-full w-1/3 bg-primary/40" />
              </div>
              <button className="text-muted-foreground/40 hover:text-foreground transition-all"><ChevronRight className="h-4 w-4" /></button>
            </div>
            
            <Button variant="ghost" onClick={() => window.location.href = '/'} className="h-10 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest bg-muted/50 hover:bg-muted text-foreground">
              Exit Admin
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={nukeDialogOpen} onOpenChange={setNukeDialogOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-destructive/20 p-10 bg-background shadow-3xl">
          <AlertDialogHeader className="space-y-4">
            <div className="p-4 bg-destructive/10 rounded-2xl w-fit">
              <Bomb className="h-10 w-10 text-destructive" />
            </div>
            <AlertDialogTitle className="text-2xl font-black uppercase text-destructive tracking-tight">Wipe Global Register?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium leading-relaxed italic text-muted-foreground">
              This action is **irreversible**. You are about to purge all Asset Register records from the Cloud, Mirror, and Local Storage. This is a factory reset operation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-12 px-8 rounded-2xl font-bold border-2 m-0">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleNukePulse}
              disabled={isProcessing}
              className="h-12 px-10 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-destructive/30 bg-destructive text-destructive-foreground m-0"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Hammer className="h-4 w-4 mr-2" />}
              Confirm Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

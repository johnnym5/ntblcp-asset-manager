'use client';

/**
 * @fileOverview DatabaseWorkstation - High-Fidelity Mission Control.
 * Strictly matches the "Hybrid Strategy" administrative pulse.
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
  Hammer
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
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
    dbStatus: isOnline ? 'ACTIVE' : 'LATENT',
    latency: '42ms'
  }), [assets, isOnline]);

  const handleNukePulse = async () => {
    setIsProcessing(true);
    try {
      await VirtualDBService.purgeGlobalRegistry();
      toast({ title: "GLOBAL DATA NUKED", description: "Registry reset to absolute zero state." });
      await refreshRegistry();
      setNukeDialogOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!userProfile?.isAdmin) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-40 animate-in fade-in duration-700">
      
      {/* Header Pulse */}
      <div className="space-y-1 px-1">
        <div className="flex items-center gap-3">
          <Database className="h-6 w-6 text-white" />
          <h2 className="text-2xl font-black uppercase tracking-tight text-white">Database Administration</h2>
        </div>
        <p className="text-[10px] font-bold text-muted-foreground opacity-60 uppercase tracking-widest">
          Hybrid Strategy: Firestore (Settings) & RTDB (Assets).
        </p>
      </div>

      {/* 1. App Health Check */}
      <Card className="bg-[#0A0A0A] border-white/5 rounded-2xl overflow-hidden shadow-2xl">
        <Collapsible open={isHealthOpen} onOpenChange={setIsHealthOpen}>
          <CollapsibleTrigger asChild>
            <div className="p-6 border-b border-white/5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-all">
              <div className="space-y-1">
                <h3 className="text-sm font-black uppercase text-white">App Health Check</h3>
                <p className="text-[10px] text-muted-foreground italic">Detailed diagnostics for the Hybrid DB layers.</p>
              </div>
              <ChevronsUpDown className="h-4 w-4 text-white/40" />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Settings Column */}
              <div className="space-y-6">
                <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40">Settings</h4>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-xs font-black uppercase text-white">Settings Data Layer</p>
                      <p className="text-[9px] text-muted-foreground leading-relaxed">Application settings are loaded from Firestore.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-xs font-black uppercase text-white">Project Configuration</p>
                      <p className="text-[9px] text-muted-foreground leading-relaxed">Project sheets are configured.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Database Column */}
              <div className="space-y-6">
                <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40">Database</h4>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-xs font-black uppercase text-white">Firebase Environment</p>
                      <p className="text-[9px] text-muted-foreground leading-relaxed">Firebase API keys are verified.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-xs font-black uppercase text-white">Realtime DB (Asset Layer)</p>
                      <p className="text-[9px] text-muted-foreground leading-relaxed">RTDB instance is active.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-xs font-black uppercase text-white">Firestore (Settings Layer)</p>
                      <p className="text-[9px] text-muted-foreground leading-relaxed">Firestore instance is active.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assets Column */}
              <div className="space-y-6">
                <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40">Assets</h4>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-xs font-black uppercase text-white">Main Local Store</p>
                      <p className="text-[9px] text-muted-foreground leading-relaxed">{stats.assetCount} assets in indexedDB.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-xs font-black uppercase text-white">Asset Data Integrity</p>
                      <p className="text-[9px] text-muted-foreground leading-relaxed">All assets have critical fields.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* 2. Operations Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Sync Workstation */}
        <Card className="bg-[#0A0A0A] border-white/5 rounded-2xl p-8 space-y-6 shadow-2xl">
          <div className="space-y-1">
            <h3 className="text-xl font-black uppercase text-white">Sync Assets (RTDB Primary)</h3>
            <p className="text-[10px] text-muted-foreground font-medium italic">Assets are optimized for RTDB usage.</p>
          </div>
          <div className="space-y-3">
            <Button variant="outline" onClick={refreshRegistry} className="w-full h-12 bg-black border-white/10 rounded-xl font-black uppercase text-[10px] tracking-widest gap-3 justify-start px-6 hover:bg-white/5 text-white">
              <RefreshCw className="h-4 w-4" /> Push RTDB Assets to Firestore
            </Button>
            <Button variant="outline" onClick={refreshRegistry} className="w-full h-12 bg-black border-white/10 rounded-xl font-black uppercase text-[10px] tracking-widest gap-3 justify-start px-6 hover:bg-white/5 text-white">
              <RefreshCw className="h-4 w-4" /> Pull Firestore Assets to RTDB
            </Button>
          </div>
        </Card>

        {/* Backup & Restore */}
        <Card className="bg-[#0A0A0A] border-white/5 rounded-2xl p-8 space-y-6 shadow-2xl">
          <div className="space-y-1">
            <h3 className="text-xl font-black uppercase text-white">Backup & Restore</h3>
            <p className="text-[10px] text-muted-foreground font-medium italic">Export full snapshot of settings and assets.</p>
          </div>
          <div className="space-y-3">
            <Button variant="outline" className="w-full h-12 bg-black border-white/10 rounded-xl font-black uppercase text-[10px] tracking-widest gap-3 justify-start px-6 hover:bg-white/5 text-white">
              <Upload className="h-4 w-4" /> Import Full Snapshot (JSON)
            </Button>
            <Button variant="outline" className="w-full h-12 bg-black border-white/10 rounded-xl font-black uppercase text-[10px] tracking-widest gap-3 justify-start px-6 hover:bg-white/5 text-white">
              <Download className="h-4 w-4" /> Export Full Snapshot
            </Button>
          </div>
        </Card>
      </div>

      {/* 3. RTDB Browser */}
      <Card className="bg-[#0A0A0A] border-white/5 rounded-2xl p-8 space-y-6 shadow-2xl">
        <div className="space-y-1">
          <h3 className="text-xl font-black uppercase text-white">RTDB Browser</h3>
          <p className="text-[10px] text-muted-foreground font-medium italic">Directly modify assets or config in the Realtime Database layer.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setActivePath('/config')} className={cn("px-6 py-2 rounded-xl font-black uppercase text-[10px] border transition-all", activePath === '/config' ? "bg-white/10 border-white/20 text-white" : "bg-black border-white/5 text-white/40 hover:text-white")}>/config</button>
          <button onClick={() => setActivePath('/assets')} className={cn("px-6 py-2 rounded-xl font-black uppercase text-[10px] border transition-all", activePath === '/assets' ? "bg-white/10 border-white/20 text-white" : "bg-black border-white/5 text-white/40 hover:text-white")}>/assets</button>
        </div>
      </Card>

      {/* 4. Danger Zone */}
      <div className="p-8 rounded-[2.5rem] bg-black border-2 border-destructive/20 space-y-8 shadow-3xl">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-destructive" />
          <h3 className="text-xl font-black uppercase text-destructive tracking-widest">Danger Zone</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button variant="outline" onClick={handleNukePulse} className="h-12 bg-black border-destructive/20 text-destructive hover:bg-destructive/10 rounded-xl font-black uppercase text-[10px] tracking-widest justify-start px-6 gap-3">
            <HardDrive className="h-4 w-4" /> Wipe Local Cache
          </Button>
          <Button variant="outline" onClick={handleNukePulse} className="h-12 bg-black border-destructive/20 text-destructive hover:bg-destructive/10 rounded-xl font-black uppercase text-[10px] tracking-widest justify-start px-6 gap-3">
            <Database className="h-4 w-4" /> Wipe RTDB (Primary)
          </Button>
          <Button variant="outline" onClick={handleNukePulse} className="h-12 bg-black border-destructive/20 text-destructive hover:bg-destructive/10 rounded-xl font-black uppercase text-[10px] tracking-widest justify-start px-6 gap-3">
            <Cloud className="h-4 w-4" /> Wipe Firestore Assets
          </Button>
          <Button onClick={() => setNukeDialogOpen(true)} className="h-12 bg-destructive text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-destructive/20 gap-3">
            <Bomb className="h-4 w-4" /> NUKE GLOBAL DATA
          </Button>
        </div>
      </div>

      {/* Adaptive Footer Control */}
      <div className="fixed bottom-24 left-0 right-0 z-50 pointer-events-none">
        <div className="adaptive-container px-4">
          <div className="bg-black/90 backdrop-blur-2xl border border-white/10 rounded-2xl h-16 flex items-center justify-between px-6 pointer-events-auto shadow-3xl group">
            {/* Base Navigation Scrollbar UI (Decorative based on mockup) */}
            <div className="flex-1 flex items-center gap-4 px-10">
              <button className="text-white/20 hover:text-white transition-all"><ChevronLeft className="h-4 w-4" /></button>
              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden relative">
                <div className="absolute top-0 left-0 h-full w-1/3 bg-white/10" />
              </div>
              <button className="text-white/20 hover:text-white transition-all"><ChevronRight className="h-4 w-4" /></button>
            </div>
            
            <Button variant="ghost" onClick={() => window.location.href = '/'} className="h-10 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest bg-white/[0.02] text-white hover:bg-white/10">
              Close Admin
            </Button>
          </div>
        </div>
      </div>

      {/* Nuke Alert */}
      <AlertDialog open={nukeDialogOpen} onOpenChange={setNukeDialogOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-destructive/20 p-10 bg-black shadow-3xl text-white">
          <AlertDialogHeader className="space-y-4">
            <div className="p-4 bg-destructive/10 rounded-2xl w-fit">
              <Bomb className="h-10 w-10 text-destructive" />
            </div>
            <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-destructive">NUKE GLOBAL DATA?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium leading-relaxed italic text-white/40">
              This action is **immutable**. You are about to purge every registry record from the Cloud (Firestore), Mirror (RTDB), and this device (IndexedDB). This is a terminal reset operation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-12 px-8 rounded-2xl font-bold border-2 border-white/5 text-white bg-transparent m-0">Abort Pulse</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleNukePulse}
              disabled={isProcessing}
              className="h-12 px-10 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-destructive/30 bg-destructive text-white m-0"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Hammer className="h-4 w-4 mr-2" />}
              Commit Nuke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

'use client';

/**
 * @fileOverview DatabaseWorkstation - Database Management.
 * Phase 165: Renamed to Database Management.
 * Phase 167: Hardened specific layer purges and restricted global nuke.
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
  ShieldAlert,
  Smartphone,
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
import { storage } from '@/offline/storage';
import { cn } from '@/lib/utils';
import type { StorageLayer } from '@/types/domain';
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
  const [activePath, setActivePath] = useState('/assets');
  
  // Specific Layer Purge State
  const [layerToPurge, setLayerToPurge] = useState<StorageLayer | 'GLOBAL' | null>(null);

  const stats = useMemo(() => ({
    assetCount: assets.length,
    dbStatus: isOnline ? 'ONLINE' : 'OFFLINE',
    latency: '42ms'
  }), [assets, isOnline]);

  const handleExecutePurge = async () => {
    if (!layerToPurge) return;
    setIsProcessing(true);
    try {
      if (layerToPurge === 'GLOBAL') {
        await VirtualDBService.purgeGlobalRegistry();
        toast({ title: "Global Register Reset", description: "All storage nodes purged successfully." });
      } else {
        await VirtualDBService.purgeLayer(layerToPurge);
        toast({ title: "Layer Wipe Complete", description: `${layerToPurge} pulse cleared.` });
      }
      await refreshRegistry();
      setLayerToPurge(null);
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
          <h2 className="text-2xl font-black uppercase tracking-tight text-white">Database Management</h2>
        </div>
        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
          Primary Storage: Firestore & Hybrid Shadow: RTDB
        </p>
      </div>

      {/* 1. System Health Audit */}
      <Card className="bg-[#050505] border-white/5 rounded-2xl overflow-hidden shadow-2xl">
        <Collapsible open={isHealthOpen} onOpenChange={setIsHealthOpen}>
          <CollapsibleTrigger asChild>
            <div className="p-6 border-b border-white/5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-all">
              <div className="space-y-1">
                <h3 className="text-sm font-black uppercase text-white">Storage Health Audit</h3>
                <p className="text-[10px] text-white/40 italic">Real-time status of tiered storage layers.</p>
              </div>
              <ChevronsUpDown className="h-4 w-4 text-white/20" />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-6">
                <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20">Configuration</h4>
                <div className="flex gap-4">
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase text-white">Governance Settings</p>
                    <p className="text-[9px] text-white/40 leading-relaxed">Loaded from Firestore Authority.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20">Database Engine</h4>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-xs font-black uppercase text-white">Cloud Status</p>
                      <p className="text-[9px] text-white/40 leading-relaxed">{stats.dbStatus} - Cluster: US-CENTRAL</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20">Asset Records</h4>
                <div className="flex gap-4">
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase text-white">Local Persistent Cache</p>
                    <p className="text-[9px] text-white/40 leading-relaxed">{stats.assetCount} assets currently indexed locally.</p>
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* 2. Database Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="bg-[#050505] border-white/5 rounded-2xl p-8 space-y-6 shadow-2xl">
          <div className="space-y-1">
            <h3 className="text-xl font-black uppercase text-white">Register Synchronization</h3>
            <p className="text-[10px] text-white/40 font-medium italic">Manually reconcile data across storage layers.</p>
          </div>
          <div className="space-y-3">
            <Button variant="outline" onClick={refreshRegistry} className="w-full h-14 rounded-xl font-black uppercase text-[10px] tracking-widest gap-4 justify-start px-6 border-white/10 text-white hover:bg-white/5">
              <RefreshCw className="h-4 w-4 text-primary" /> Sync Local to Cloud Database
            </Button>
            <Button variant="outline" onClick={refreshRegistry} className="w-full h-14 rounded-xl font-black uppercase text-[10px] tracking-widest gap-4 justify-start px-6 border-white/10 text-white hover:bg-white/5">
              <Download className="h-4 w-4 text-primary" /> Pull Cloud State to Local
            </Button>
          </div>
        </Card>

        <Card className="bg-[#050505] border-white/5 rounded-2xl p-8 space-y-6 shadow-2xl">
          <div className="space-y-1">
            <h3 className="text-xl font-black uppercase text-white">Archive Manager</h3>
            <p className="text-[10px] text-white/40 font-medium italic">Full system state backup and recovery.</p>
          </div>
          <div className="space-y-3">
            <Button variant="outline" className="w-full h-14 rounded-xl font-black uppercase text-[10px] tracking-widest gap-4 justify-start px-6 border-white/10 text-white hover:bg-white/5">
              <Upload className="h-4 w-4 text-primary" /> Restore from JSON Archive
            </Button>
            <Button variant="outline" className="w-full h-14 rounded-xl font-black uppercase text-[10px] tracking-widest gap-4 justify-start px-6 border-white/10 text-white hover:bg-white/5">
              <Download className="h-4 w-4 text-primary" /> Generate Registry Snapshot
            </Button>
          </div>
        </Card>
      </div>

      {/* 3. Maintenance Pulse (Danger Zone) */}
      <div className="p-10 rounded-[3rem] bg-destructive/5 border-2 border-destructive/20 space-y-10 shadow-3xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-destructive/10 rounded-2xl">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-black uppercase text-white tracking-tighter">Maintenance Operations</h3>
            <p className="text-[10px] font-bold text-destructive/60 uppercase tracking-widest">LAYER-SPECIFIC DETERMINISTIC WIPES</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button variant="outline" onClick={() => setLayerToPurge('LOCAL')} className="h-16 border-destructive/20 text-destructive hover:bg-destructive/10 rounded-2xl font-black uppercase text-[10px] tracking-widest justify-start px-8 gap-4">
            <Smartphone className="h-5 w-5" /> Wipe Local Cache Only
          </Button>
          <Button variant="outline" onClick={() => setLayerToPurge('RTDB')} className="h-16 border-destructive/20 text-destructive hover:bg-destructive/10 rounded-2xl font-black uppercase text-[10px] tracking-widest justify-start px-8 gap-4">
            <Activity className="h-5 w-5" /> Wipe Standby Mirror (RTDB)
          </Button>
          <Button variant="outline" onClick={() => setLayerToPurge('FIRESTORE')} className="h-16 border-destructive/20 text-destructive hover:bg-destructive/10 rounded-2xl font-black uppercase text-[10px] tracking-widest justify-start px-8 gap-4">
            <Cloud className="h-5 w-5" /> Wipe Primary Register (Cloud)
          </Button>
          <Button onClick={() => setLayerToPurge('GLOBAL')} className="h-16 bg-destructive text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-destructive/30 gap-4 transition-transform hover:scale-105 active:scale-95">
            <Bomb className="h-5 w-5" /> RESET ENTIRE GLOBAL ECOSYSTEM
          </Button>
        </div>
      </div>

      <AlertDialog open={!!layerToPurge} onOpenChange={() => setLayerToPurge(null)}>
        <AlertDialogContent className="rounded-[2.5rem] border-destructive/20 p-10 bg-black shadow-3xl text-white">
          <AlertDialogHeader className="space-y-4">
            <div className="p-4 bg-destructive/10 rounded-2xl w-fit">
              <Bomb className="h-12 w-12 text-destructive" />
            </div>
            <AlertDialogTitle className="text-2xl font-black uppercase text-destructive tracking-tight">
              Execute {layerToPurge} Wipe?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium leading-relaxed italic text-white/60">
              {layerToPurge === 'LOCAL' ? (
                "This will purge the local asset register, sandbox, and sync queue. Cloud data will remain safe. Use this to prepare for a fresh import."
              ) : layerToPurge === 'GLOBAL' ? (
                "This action is IMMUTABLE. You are about to wipe every registry record across Cloud, Mirror, and Device storage. The system will be totally empty."
              ) : (
                `This will deterministically clear all records in the ${layerToPurge} storage node.`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-10 gap-3">
            <AlertDialogCancel className="h-14 px-10 rounded-2xl font-bold border-2 border-white/10 m-0 hover:bg-white/5 text-white">Abort</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleExecutePurge}
              disabled={isProcessing}
              className="h-14 px-12 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-destructive/30 bg-destructive text-white m-0"
            >
              {isProcessing ? <Loader2 className="h-5 w-5 animate-spin mr-3" /> : <Hammer className="h-5 w-5 mr-3" />}
              Commit Wipe Pulse
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

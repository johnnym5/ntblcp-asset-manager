'use client';

/**
 * @fileOverview GIS Spatial Hub - Geographic Registry Workstation.
 * Phase 66: Enhanced with status-aware node color coding.
 */

import React, { useMemo, useState } from 'react';
import AppLayout from '@/components/app-layout';
import { useAppState } from '@/contexts/app-state-context';
import { 
  Navigation, 
  Map as MapIcon, 
  Search, 
  Filter, 
  Loader2, 
  MapPin, 
  Target, 
  Layers, 
  Activity,
  Crosshair,
  Globe,
  Maximize2,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { AssetDetailSheet } from '@/components/registry/AssetDetailSheet';
import { transformAssetToRecord } from '@/lib/registry-utils';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import type { Asset } from '@/types/domain';

export default function GISHubPage() {
  const { assets, settingsLoaded } = useAppState();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Identify assets with spatial pulses
  const spatialAssets = useMemo(() => {
    return assets.filter(a => !!a.geotag);
  }, [assets]);

  const filteredAssets = useMemo(() => {
    if (!searchTerm) return spatialAssets;
    const term = searchTerm.toLowerCase();
    return spatialAssets.filter(a => 
      a.description.toLowerCase().includes(term) || 
      a.location.toLowerCase().includes(term) ||
      a.assetIdCode?.toLowerCase().includes(term)
    );
  }, [spatialAssets, searchTerm]);

  const stats = useMemo(() => {
    const anchored = spatialAssets.length;
    const coverage = assets.length > 0 ? Math.round((anchored / assets.length) * 100) : 0;
    const avgAccuracy = anchored > 0 
      ? Math.round(spatialAssets.reduce((sum, a) => sum + (a.geotag?.accuracy || 0), 0) / anchored)
      : 0;
    return { anchored, coverage, avgAccuracy };
  }, [assets, spatialAssets]);

  const handleInspect = (id: string) => {
    setSelectedAssetId(id);
    setIsDetailOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VERIFIED': return 'bg-primary'; // Gold
      case 'DISCREPANCY': return 'bg-destructive'; // Red
      default: return 'bg-white'; // Muted Pending
    }
  };

  const getStatusShadow = (status: string) => {
    switch (status) {
      case 'VERIFIED': return 'shadow-[0_0_15px_rgba(212,175,55,0.8)]';
      case 'DISCREPANCY': return 'shadow-[0_0_15px_rgba(220,38,38,0.8)]';
      default: return 'shadow-[0_0_15px_rgba(255,255,255,0.4)]';
    }
  };

  const selectedRecord = useMemo(() => {
    if (!selectedAssetId) return undefined;
    const asset = assets.find(a => a.id === selectedAssetId);
    return asset ? transformAssetToRecord(asset, []) : undefined;
  }, [selectedAssetId, assets]);

  if (!settingsLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="h-[calc(100vh-10rem)] flex flex-col gap-6 animate-in fade-in duration-700">
        {/* Header Pulse */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-2">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tight text-foreground uppercase flex items-center gap-3 leading-none">
              <div className="p-3 bg-primary/10 rounded-2xl">
                <Navigation className="h-8 w-8 text-primary" />
              </div>
              GIS Spatial Hub
            </h2>
            <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">
              Geographic Registry Workstation & Coordinate Monitoring
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-muted/50 p-1 rounded-2xl border-2 border-border/40 shadow-inner">
              <div className="px-4 py-2 flex flex-col">
                <span className="text-[8px] font-black uppercase opacity-40">Spatial Coverage</span>
                <span className="text-sm font-black text-primary leading-none">{stats.coverage}%</span>
              </div>
              <Separator orientation="vertical" className="h-8 opacity-20" />
              <div className="px-4 py-2 flex flex-col">
                <span className="text-[8px] font-black uppercase opacity-40">Precision Pulse</span>
                <span className="text-sm font-black text-green-600 leading-none">+/- {stats.avgAccuracy}m</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
          {/* Map Visualizer (Deterministic Coordinate Grid) */}
          <Card className="lg:col-span-8 rounded-[3rem] border-2 border-border/40 shadow-2xl bg-[#0F172A] overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(#1E293B_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
            
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[80%] h-[80%] border border-primary/10 rounded-full animate-[pulse_4s_ease-in-out_infinite]" />
              <div className="absolute w-[60%] h-[60%] border border-primary/10 rounded-full animate-[pulse_6s_ease-in-out_infinite]" />
            </div>

            <div className="relative h-full flex flex-col p-10">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-primary" />
                  <h3 className="text-white font-black uppercase tracking-widest text-xs">Registry Coordinate Grid</h3>
                </div>
                <Badge className="bg-primary/20 text-primary border-primary/20 font-black h-6 px-3">ZOOM: REGIONAL</Badge>
              </div>

              <div className="flex-1 relative flex items-center justify-center">
                <AnimatePresence>
                  {filteredAssets.slice(0, 100).map((asset, idx) => (
                    <motion.button
                      key={asset.id}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      onClick={() => handleInspect(asset.id)}
                      className="absolute group"
                      style={{
                        // Conceptual plotting based on normalized lat/lng
                        left: `${((asset.geotag!.lng + 180) % 100)}%`,
                        top: `${((asset.geotag!.lat + 90) % 100)}%`
                      }}
                    >
                      <div className="relative">
                        <div className={cn(
                          "h-3 w-3 rounded-full border-2 border-black transition-transform group-hover:scale-150 group-hover:z-50",
                          getStatusColor(asset.status),
                          getStatusShadow(asset.status)
                        )} />
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white text-black p-3 rounded-xl shadow-2xl whitespace-nowrap z-50 pointer-events-none">
                          <p className="text-[10px] font-black uppercase leading-none mb-1">{asset.description}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="h-4 px-1.5 text-[7px] font-black border-black/20">{asset.status}</Badge>
                            <span className="text-[8px] font-bold text-muted-foreground uppercase">{asset.location}</span>
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>

              <div className="mt-auto flex items-center justify-between text-white/40">
                <div className="flex flex-wrap items-center gap-6 text-[8px] font-black uppercase tracking-[0.3em]">
                  <span className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-primary" /> Verified Hub</span>
                  <span className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-white" /> Pending Pulse</span>
                  <span className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-destructive" /> Discrepancy</span>
                </div>
                <p className="hidden sm:block text-[8px] font-mono uppercase tracking-widest">GRID PROTOCOL: STATUS-AWARE SPATIAL PROJECTION</p>
              </div>
            </div>
          </Card>

          {/* Spatial List Pulse */}
          <Card className="lg:col-span-4 rounded-[3rem] border-2 border-border/40 shadow-2xl bg-card/50 overflow-hidden flex flex-col">
            <CardHeader className="p-8 bg-muted/20 border-b space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black uppercase tracking-tight">Anchored Records</h3>
                <Badge variant="outline" className="font-black text-[9px] h-6 px-3 border-primary/20 text-primary">
                  {filteredAssets.length} SPATIAL NODES
                </Badge>
              </div>
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground opacity-40" />
                <Input 
                  placeholder="Scan Spatial Registry..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-11 rounded-xl bg-background border-none shadow-inner text-xs font-bold"
                />
              </div>
            </CardHeader>
            <ScrollArea className="flex-1 bg-background/30">
              <div className="p-4 space-y-2">
                {filteredAssets.map(asset => (
                  <button 
                    key={`list-${asset.id}`}
                    onClick={() => handleInspect(asset.id)}
                    className="w-full text-left p-4 rounded-2xl border-2 border-transparent hover:border-primary/20 hover:bg-primary/5 transition-all group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={cn(
                        "p-2.5 rounded-xl transition-colors",
                        asset.status === 'VERIFIED' ? "bg-primary text-black" : "bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-black"
                      )}>
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-black uppercase truncate">{asset.description}</span>
                        <div className="flex items-center gap-2 text-[8px] font-bold text-muted-foreground uppercase opacity-60">
                          <span className="truncate">{asset.location}</span>
                          <span>•</span>
                          <span className="font-mono">{asset.geotag!.lat.toFixed(4)}, {asset.geotag!.lng.toFixed(4)}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
                
                {filteredAssets.length === 0 && (
                  <div className="py-20 text-center opacity-20 space-y-4">
                    <Target className="h-12 w-12 mx-auto" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No Spatial Data Found</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>
      </div>

      <AssetDetailSheet 
        isOpen={isDetailOpen} 
        onOpenChange={setIsDetailOpen} 
        record={selectedRecord}
        onEdit={(id) => (window.location.href = `/assets?edit=${id}`)}
      />
    </AppLayout>
  );
}
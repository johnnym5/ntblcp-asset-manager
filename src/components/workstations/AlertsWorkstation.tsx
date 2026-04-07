'use client';

/**
 * @fileOverview Critical Alerts Workstation - High-Priority Asset Issues.
 */

import React, { useMemo, useState } from 'react';
import { useAppState } from '@/contexts/app-state-context';
import { 
  AlertTriangle, 
  Search, 
  Filter, 
  ShieldAlert, 
  Loader2, 
  CheckCircle2,
  XCircle,
  Megaphone,
  Bomb,
  Info
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { RegistryCard } from '@/components/registry/RegistryCard';
import { AssetDetailSheet } from '@/components/registry/AssetDetailSheet';
import { transformAssetToRecord } from '@/lib/registry-utils';
import { cn } from '@/lib/utils';
import type { Asset } from '@/types/domain';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function AlertsWorkstation() {
  const { assets, settingsLoaded, setActiveView, appSettings } = useAppState();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const isAdvanced = appSettings?.uxMode === 'advanced';

  const criticalAssets = useMemo(() => {
    return assets.filter(a => 
      ['Stolen', 'Burnt', 'Unsalvageable', 'Writeoff'].includes(a.condition || '') ||
      a.status === 'DISCREPANCY'
    );
  }, [assets]);

  const filteredAlerts = useMemo(() => {
    if (!searchTerm) return criticalAssets;
    const term = searchTerm.toLowerCase();
    return criticalAssets.filter(a => 
      (a.description || '').toLowerCase().includes(term) || 
      (a.assetIdCode || '').toLowerCase().includes(term)
    );
  }, [criticalAssets, searchTerm]);

  const stats = useMemo(() => ({
    stolen: criticalAssets.filter(a => a.condition === 'Stolen').length,
    damaged: criticalAssets.filter(a => ['Burnt', 'Unsalvageable'].includes(a.condition || '')).length,
    discrepancies: criticalAssets.filter(a => a.status === 'DISCREPANCY').length
  }), [criticalAssets]);

  const handleInspect = (id: string) => {
    setSelectedAssetId(id);
    setIsDetailOpen(true);
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
    <div className="space-y-10 pb-32 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div className="space-y-2">
          <h2 className="text-4xl font-black tracking-tighter text-foreground uppercase flex items-center gap-4 leading-none">
            <div className="p-3 bg-destructive/10 rounded-2xl">
              <ShieldAlert className="h-8 w-8 text-destructive animate-pulse" />
            </div>
            Critical Alerts
          </h2>
          <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">
            High-Priority issues requiring management attention.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" className="h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-3 border-2 border-destructive/20 text-destructive hover:bg-destructive/5 transition-all">
                  <Megaphone className="h-4 w-4" /> Notify Manager
                </Button>
              </TooltipTrigger>
              <TooltipContent>Alert management about these items.</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Stats Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-2">
        <Card className="rounded-[2.5rem] border-2 border-destructive/20 bg-destructive/[0.02]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-destructive flex items-center gap-2">
              <XCircle className="h-3.5 w-3.5" /> Stolen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-black tracking-tighter text-destructive">{stats.stolen}</div>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-2 border-orange-500/20 bg-orange-500/[0.02]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-orange-600 flex items-center gap-2">
              <Bomb className="h-3.5 w-3.5" /> Damaged
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-black tracking-tighter text-orange-600">{stats.damaged}</div>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-2 border-primary/20 bg-primary/[0.02]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5" /> Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-black tracking-tighter text-primary">{stats.discrepancies}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative group px-2">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40 group-focus-within:text-destructive transition-colors" />
        <Input 
          placeholder="Search for asset issues..." 
          className="h-16 pl-14 rounded-[1.5rem] bg-card border-none shadow-xl font-bold text-sm focus-visible:ring-destructive/20 transition-all placeholder:opacity-30"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Alert Surface */}
      <div className="px-2">
        {filteredAlerts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredAlerts.map((asset) => (
                <motion.div
                  key={asset.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative group"
                >
                  <RegistryCard 
                    record={transformAssetToRecord(asset, [])} 
                    onInspect={() => handleInspect(asset.id)}
                    densityMode="compact"
                  />
                  <div className="absolute top-2 right-2 flex flex-col gap-2">
                    <Badge className={cn(
                      "h-6 px-3 font-black uppercase text-[8px] tracking-widest shadow-lg",
                      asset.condition === 'Stolen' ? "bg-red-600 animate-pulse" : "bg-orange-600"
                    )}>
                      {asset.condition?.toUpperCase() || 'ERROR'}
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="py-40 text-center opacity-20 flex flex-col items-center gap-8 border-4 border-dashed rounded-[4rem]">
            <CheckCircle2 className="h-32 w-32 text-green-600" />
            <div className="space-y-2">
              <h3 className="text-3xl font-black uppercase tracking-widest">No Alerts</h3>
              <p className="text-sm font-medium italic max-w-sm mx-auto">All assets are in good condition.</p>
            </div>
          </div>
        )}
      </div>

      <AssetDetailSheet 
        isOpen={isDetailOpen} 
        onOpenChange={setIsDetailOpen} 
        record={selectedRecord}
        onEdit={(id) => setActiveView('REGISTRY')}
      />
    </div>
  );
}

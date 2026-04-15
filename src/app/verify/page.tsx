'use client';

/**
 * @fileOverview Verification Queue - High-Speed Assessment Workspace.
 * Refined for Phase 25 with header-aware cards and one-tap status pulses.
 */

import React, { useState, useMemo, useEffect } from 'react';
import AppLayout from '@/components/app-layout';
import { 
  ClipboardCheck, 
  Search, 
  Filter, 
  Loader2, 
  Zap, 
  CheckCircle2,
  XCircle,
  Database
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAppState } from '@/contexts/app-state-context';
import { Badge } from '@/components/ui/badge';
import { RegistryCard } from '@/components/registry/RegistryCard';
import AssetForm from '@/components/asset-form';
import { VerificationPulse } from '@/components/registry/VerificationPulse';
import { enqueueMutation } from '@/offline/queue';
import { storage } from '@/offline/storage';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { DEFAULT_REGISTRY_HEADERS, transformAssetToRecord } from '@/lib/registry-utils';
import type { Asset } from '@/types/domain';
import type { RegistryHeader } from '@/types/registry';

export default function VerificationQueuePage() {
  const { assets, refreshRegistry, settingsLoaded, activeGrantId } = useAppState();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [headers, setHeaders] = useState<RegistryHeader[]>([]);

  // Initialize Headers
  useEffect(() => {
    const saved = localStorage.getItem('registry-header-prefs');
    if (saved) {
      setHeaders(JSON.parse(saved));
    } else {
      const initial = DEFAULT_REGISTRY_HEADERS.map((h, i) => ({ ...h, id: `h-${i}`, orderIndex: i }));
      setHeaders(initial as RegistryHeader[]);
    }
  }, []);

  const unverified = useMemo(() => {
    let list = assets.filter(a => a.status === 'UNVERIFIED');
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(a => 
        (a.description || '').toLowerCase().includes(term) ||
        (a.assetIdCode || '').toLowerCase().includes(term) ||
        (a.serialNumber || '').toLowerCase().includes(term)
      );
    }
    return list;
  }, [assets, searchTerm]);

  const stats = useMemo(() => {
    const exceptions = assets.filter(a => ['Stolen', 'Burnt', 'Unsalvageable'].includes(a.condition || '')).length;
    const dataGaps = assets.filter(a => !a.serialNumber || a.serialNumber === 'N/A' || !a.assetIdCode).length;
    return {
      total: assets.length,
      verified: assets.filter(a => a.status === 'VERIFIED').length,
      exceptions,
      dataGaps
    };
  }, [assets]);

  const handleQuickVerify = async (asset: Asset, newStatus: 'VERIFIED' | 'DISCREPANCY') => {
    const updated: Asset = {
      ...asset,
      status: newStatus,
      lastModified: new Date().toISOString(),
      lastModifiedBy: 'Field Auditor (Quick Pulse)'
    };

    try {
      await enqueueMutation('UPDATE', 'assets', updated);
      const current = await storage.getAssets();
      await storage.saveAssets(current.map(a => a.id === asset.id ? updated : a));
      await refreshRegistry();
      toast({ title: "Status Pulse Applied", description: `Record marked as ${newStatus}.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Assessment Failure" });
    }
  };

  if (!settingsLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-32 max-w-7xl mx-auto">
        {/* Header Pulse */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
          <div className="space-y-2">
            <h2 className="text-3xl font-black tracking-tight text-foreground uppercase flex items-center gap-3">
              <ClipboardCheck className="h-8 w-8 text-primary" /> Verification Queue
            </h2>
            <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">
              Mandatory Field Assessments & Operability Pulses
            </p>
          </div>
          <Badge variant="outline" className="h-10 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest border-primary/20 bg-primary/5 text-primary shadow-sm">
            <Zap className="h-3.5 w-3.5 mr-2 fill-current" /> {unverified.length} Pulses Awaiting Assessment
          </Badge>
        </div>

        {/* Global Progress Pulse */}
        <VerificationPulse 
          total={stats.total}
          verified={stats.verified}
          exceptions={stats.exceptions}
          dataGaps={stats.dataGaps}
          className="px-2"
        />

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col md:flex-row items-center gap-4 px-2">
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40 group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Scan Tag ID or Search Queue Pulse..." 
              className="pl-12 h-14 rounded-2xl bg-card border-none shadow-xl font-medium text-sm focus-visible:ring-primary/20 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 bg-card border-none shadow-sm transition-all hover:bg-primary/5">
            <Filter className="h-4 w-4" /> Filter Scope
          </Button>
        </div>

        {/* Queue Surface */}
        <div className="px-2">
          <AnimatePresence mode="popLayout">
            {unverified.length > 0 ? (
              <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {unverified.map(asset => (
                  <motion.div
                    key={asset.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    layout
                    className="relative group"
                  >
                    <RegistryCard 
                      record={transformAssetToRecord(asset, headers)}
                      onInspect={() => { setSelectedAsset(asset); setIsFormOpen(true); }}
                      densityMode="compact"
                    />
                    
                    {/* High-Speed Action Pulse Overlay */}
                    <div className="absolute top-14 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0 z-20">
                      <Button 
                        size="icon" 
                        className="h-10 w-10 rounded-xl bg-green-500 text-white shadow-xl hover:bg-green-600 tactile-pulse"
                        title="Mark Verified"
                        onClick={(e) => { e.stopPropagation(); handleQuickVerify(asset, 'VERIFIED'); }}
                      >
                        <CheckCircle2 className="h-5 w-5" />
                      </Button>
                      <Button 
                        size="icon" 
                        className="h-10 w-10 rounded-xl bg-destructive text-white shadow-xl hover:bg-destructive/90 tactile-pulse"
                        title="Flag Discrepancy"
                        onClick={(e) => { e.stopPropagation(); handleQuickVerify(asset, 'DISCREPANCY'); }}
                      >
                        <XCircle className="h-5 w-5" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 bg-card/50 rounded-[3rem] border-4 border-dashed border-border/40 flex flex-col items-center justify-center text-center p-20 py-40"
              >
                <div className="flex flex-col items-center gap-10 opacity-20">
                  <div className="p-16 bg-muted rounded-[3rem] shadow-inner">
                    <Database className="h-32 w-28 text-muted-foreground" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-3xl font-black uppercase tracking-[0.2em]">Queue Pulse Reconciled</h3>
                    <p className="text-sm font-medium max-w-sm mx-auto italic">
                      All assets in your regional scope have passed physical verification. Field audit pulses are complete.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AssetForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        asset={selectedAsset}
        onSave={async (a) => {
          await enqueueMutation('UPDATE', 'assets', a);
          const current = await storage.getAssets();
          await storage.saveAssets(current.map(x => x.id === a.id ? a : x));
          await refreshRegistry();
          toast({ title: "Assessment Committed" });
          setIsFormOpen(false);
        }}
        onQuickSave={async () => {}}
        isReadOnly={false}
      />
    </AppLayout>
  );
}

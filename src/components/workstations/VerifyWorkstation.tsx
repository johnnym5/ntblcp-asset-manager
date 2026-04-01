'use client';

/**
 * @fileOverview VerifyWorkstation - SPA Field Assessment Module.
 */

import React, { useState, useMemo, useEffect } from 'react';
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

export function VerifyWorkstation() {
  const { assets, refreshRegistry, settingsLoaded } = useAppState();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [headers, setHeaders] = useState<RegistryHeader[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('registry-header-prefs');
    if (saved) setHeaders(JSON.parse(saved));
    else {
      const initial = DEFAULT_REGISTRY_HEADERS.map((h, i) => ({ ...h, id: `h-${i}`, orderIndex: i }));
      setHeaders(initial as RegistryHeader[]);
    }
  }, []);

  const unverified = useMemo(() => {
    let list = assets.filter(a => a.status === 'UNVERIFIED');
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(a => a.description.toLowerCase().includes(term) || a.assetIdCode?.toLowerCase().includes(term));
    }
    return list;
  }, [assets, searchTerm]);

  const handleQuickVerify = async (asset: Asset, newStatus: 'VERIFIED' | 'DISCREPANCY') => {
    const updated: Asset = { ...asset, status: newStatus, lastModified: new Date().toISOString() };
    await enqueueMutation('UPDATE', 'assets', updated);
    const current = await storage.getAssets();
    await storage.saveAssets(current.map(a => a.id === asset.id ? updated : a));
    await refreshRegistry();
    toast({ title: "Status Pulse Applied" });
  };

  return (
    <div className="space-y-8 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div className="space-y-2">
          <h2 className="text-3xl font-black tracking-tight text-foreground uppercase flex items-center gap-3">
            <ClipboardCheck className="h-8 w-8 text-primary" /> Verification Queue
          </h2>
          <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">
            Mandatory Field Assessments & Operability Pulses
          </p>
        </div>
        <Badge variant="outline" className="h-10 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest border-primary/20 bg-primary/5 text-primary">
          <Zap className="h-3.5 w-3.5 mr-2 fill-current" /> {unverified.length} Pulses Pending
        </Badge>
      </div>

      <div className="relative group px-2">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
        <Input placeholder="Scan Tag ID or Search Queue Pulse..." className="pl-12 h-14 rounded-2xl bg-card border-none shadow-xl" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div className="px-2">
        <AnimatePresence mode="popLayout">
          {unverified.length > 0 ? (
            <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {unverified.map(asset => (
                <motion.div key={asset.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} layout className="relative group">
                  <RegistryCard record={transformAssetToRecord(asset, headers)} onInspect={() => { setSelectedAsset(asset); setIsFormOpen(true); }} densityMode="compact" />
                  <div className="absolute top-14 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all z-20">
                    <Button size="icon" className="h-10 w-10 rounded-xl bg-green-500 text-white shadow-xl" onClick={(e) => { e.stopPropagation(); handleQuickVerify(asset, 'VERIFIED'); }}><CheckCircle2 className="h-5 w-5" /></Button>
                    <Button size="icon" className="h-10 w-10 rounded-xl bg-destructive text-white shadow-xl" onClick={(e) => { e.stopPropagation(); handleQuickVerify(asset, 'DISCREPANCY'); }}><XCircle className="h-5 w-5" /></Button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="py-40 text-center opacity-20 border-4 border-dashed rounded-[3rem]">
              <Database className="h-32 w-28 mx-auto mb-4" />
              <h3 className="text-3xl font-black uppercase tracking-[0.2em]">Queue Pulse Clear</h3>
            </div>
          )}
        </AnimatePresence>
      </div>

      <AssetForm isOpen={isFormOpen} onOpenChange={setIsFormOpen} asset={selectedAsset} headers={headers} isReadOnly={false} onSave={async (a) => { await enqueueMutation('UPDATE', 'assets', a); await refreshRegistry(); setIsFormOpen(false); }} onQuickSave={async () => {}} />
    </div>
  );
}

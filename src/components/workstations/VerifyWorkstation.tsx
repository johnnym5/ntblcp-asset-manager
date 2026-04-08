'use client';

/**
 * @fileOverview Verify Assets - Field Verification Hub.
 * Phase 40: Integrated Fuzzy Location Scope check for RBAC-aware filtering.
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  ClipboardCheck, 
  Search, 
  Filter, 
  Loader2, 
  Zap, 
  CheckCircle2,
  XCircle,
  Database,
  Clock,
  Info,
  X
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { Badge } from '@/components/ui/badge';
import { RegistryCard } from '@/components/registry/RegistryCard';
import AssetForm from '@/components/asset-form';
import { VerificationPulse } from '@/components/registry/VerificationPulse';
import { enqueueMutation } from '@/offline/queue';
import { storage } from '@/offline/storage';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { DEFAULT_REGISTRY_HEADERS, transformAssetToRecord } from '@/lib/registry-utils';
import { getFuzzySignature, sanitizeSearch } from '@/lib/utils';
import type { Asset } from '@/types/domain';
import type { RegistryHeader } from '@/types/registry';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function VerifyWorkstation() {
  const { assets, refreshRegistry, settingsLoaded, appSettings } = useAppState();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [headers, setHeaders] = useState<RegistryHeader[]>([]);

  const isAdvanced = appSettings?.uxMode === 'advanced';

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
    
    // Deterministic RBAC Scope Pulse (Fuzzy)
    if (!userProfile?.isAdmin && userProfile?.state) {
      const userStateFuzzy = getFuzzySignature(userProfile.state);
      list = list.filter(a => getFuzzySignature(a.location) === userStateFuzzy);
    }

    if (searchTerm) {
      const termFuzzy = getFuzzySignature(searchTerm);
      list = list.filter(a => 
        getFuzzySignature(a.description).includes(termFuzzy) || 
        getFuzzySignature(a.assetIdCode).includes(termFuzzy) ||
        getFuzzySignature(a.serialNumber).includes(termFuzzy)
      );
    }
    return list;
  }, [assets, searchTerm, userProfile]);

  const handleQuickVerify = async (asset: Asset, newStatus: 'VERIFIED' | 'DISCREPANCY') => {
    const updated: Asset = { ...asset, status: newStatus, lastModified: new Date().toISOString() };
    await enqueueMutation('UPDATE', 'assets', updated);
    const current = await storage.getAssets();
    await storage.saveAssets(current.map(a => a.id === asset.id ? updated : a));
    await refreshRegistry();
    toast({ title: "Asset Updated", description: `Marked as ${newStatus}.` });
  };

  const handleSearchChange = (val: string) => {
    setSearchTerm(sanitizeSearch(val));
  };

  const handleExpandSearch = () => {
    setIsSearchExpanded(true);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  return (
    <div className="space-y-8 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div className="space-y-2">
          <h2 className="text-3xl font-black tracking-tight text-foreground uppercase flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <ClipboardCheck className="h-8 w-8 text-primary" />
            </div>
            {isAdvanced ? 'Verify Assets' : 'Verification Tasks'}
          </h2>
          <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">
            Confirm physical assets match the records.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <AnimatePresence mode="wait">
            {!isSearchExpanded ? (
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleExpandSearch}
                className="h-12 w-12 rounded-xl border-white/10 bg-white/5 hover:bg-primary/10 text-primary"
              >
                <Search className="h-5 w-5" />
              </Button>
            ) : (
              <motion.div 
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "300px", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="relative"
              >
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                <Input 
                  ref={searchInputRef}
                  placeholder="Find asset..." 
                  className="h-12 pl-11 pr-10 rounded-xl bg-white/[0.05] border-2 border-primary/20 text-white" 
                  value={searchTerm} 
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onBlur={() => !searchTerm && setIsSearchExpanded(false)}
                />
                <button onClick={() => { setSearchTerm(''); setIsSearchExpanded(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white"><X className="h-4 w-4" /></button>
              </motion.div>
            )}
          </AnimatePresence>

          <Badge variant="outline" className="h-10 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest border-primary/20 bg-primary/5 text-primary">
            <Zap className="h-3.5 w-3.5 mr-2 fill-current" /> {unverified.length} Items Awaiting Verification
          </Badge>
        </div>
      </div>

      <div className="px-2">
        <AnimatePresence mode="popLayout">
          {unverified.length > 0 ? (
            <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {unverified.map(asset => (
                <motion.div key={asset.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} layout className="relative group">
                  <RegistryCard record={transformAssetToRecord(asset, headers)} onInspect={() => { setSelectedAsset(asset); setIsFormOpen(true); }} />
                  <div className="absolute top-14 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all z-20">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" className="h-10 w-10 rounded-xl bg-green-500 text-white shadow-xl hover:bg-green-600" onClick={(e) => { e.stopPropagation(); handleQuickVerify(asset, 'VERIFIED'); }}>
                            <CheckCircle2 className="h-5 w-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Mark Verified</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" className="h-10 w-10 rounded-xl bg-destructive text-white shadow-xl hover:bg-destructive/90" onClick={(e) => { e.stopPropagation(); handleQuickVerify(asset, 'DISCREPANCY'); }}>
                            <XCircle className="h-5 w-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Report Issue</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="py-40 text-center opacity-20 border-4 border-dashed rounded-[3rem]">
              <CheckCircle2 className="h-32 w-32 mx-auto mb-4 text-green-600" />
              <h3 className="text-3xl font-black uppercase tracking-[0.2em]">Verification Complete</h3>
            </div>
          )}
        </AnimatePresence>
      </div>

      <AssetForm isOpen={isFormOpen} onOpenChange={setIsFormOpen} asset={selectedAsset} isReadOnly={false} onSave={async (a) => { await enqueueMutation('UPDATE', 'assets', a); await refreshRegistry(); setIsFormOpen(false); }} />
    </div>
  );
}

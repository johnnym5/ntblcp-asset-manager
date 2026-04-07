'use client';

/**
 * @fileOverview RegistryWorkstation - Technical Inventory Browser.
 * Returns the registry to a high-performance flat view optimized for technical auditing.
 * Grouping logic is now managed in AssetGroupsWorkstation.
 */

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database,
  Grid,
  List,
  Edit3,
  Trash2,
  Loader2,
  X,
  ShieldCheck,
  Settings2,
  Search,
  Filter,
  ArrowUpDown
} from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RegistryCard } from '@/components/registry/RegistryCard';
import { RegistryTable } from '@/components/registry/RegistryTable';
import { AssetDetailSheet } from '@/components/registry/AssetDetailSheet';
import AssetForm from '@/components/asset-form';
import { AssetBatchEditForm } from '@/components/asset-batch-edit-form';
import { HeaderManagerDrawer } from '@/components/registry/HeaderManagerDrawer';
import { transformAssetToRecord } from '@/lib/registry-utils';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { enqueueMutation } from '@/offline/queue';
import { storage } from '@/offline/storage';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function RegistryWorkstation({ viewAll = false }: { viewAll?: boolean }) {
  const { 
    assets, 
    searchTerm,
    setSearchTerm,
    headers,
    setHeaders,
    refreshRegistry,
    appSettings,
    sortKey,
    setSortKey,
    sortDir,
    setSortDir
  } = useAppState();
  
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // UI State
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const [isHeaderManagerOpen, setIsHeaderManagerOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter & Sort Pulse
  const processedAssets = useMemo(() => {
    let results = [...assets];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(a => 
        (a.description || '').toLowerCase().includes(term) || 
        (a.assetIdCode || '').toLowerCase().includes(term) ||
        (a.serialNumber || '').toLowerCase().includes(term)
      );
    }

    if (sortKey) {
      results.sort((a, b) => {
        const valA = String((a as any)[sortKey] || '');
        const valB = String((b as any)[sortKey] || '');
        const cmp = valA.localeCompare(valB, undefined, { numeric: true });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return results;
  }, [assets, searchTerm, sortKey, sortDir]);

  const selectedRecord = useMemo(() => {
    if (!selectedAssetId) return undefined;
    const asset = assets.find(a => a.id === selectedAssetId);
    return asset ? transformAssetToRecord(asset, headers, appSettings?.sourceBranding) : undefined;
  }, [selectedAssetId, assets, headers, appSettings?.sourceBranding]);

  // Handlers
  const handleInspect = (id: string) => {
    setSelectedAssetId(id);
    setIsDetailOpen(true);
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedAssetIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedAssetIds(next);
  };

  const handleDeleteSelected = async () => {
    if (selectedAssetIds.size === 0) return;
    setIsProcessing(true);
    try {
      const ids = Array.from(selectedAssetIds);
      for (const id of ids) {
        await enqueueMutation('DELETE', 'assets', { id });
      }
      const currentLocal = await storage.getAssets();
      await storage.saveAssets(currentLocal.filter(a => !selectedAssetIds.has(a.id)));
      await refreshRegistry();
      setSelectedAssetIds(new Set());
      toast({ title: "Records Removed" });
    } finally {
      setIsProcessing(false);
    }
  };

  const isAdmin = userProfile?.isAdmin || false;

  return (
    <div className="space-y-8 h-full flex flex-col animate-in fade-in duration-700">
      
      {/* 1. Technical Header Control */}
      <div className="px-1 flex flex-col sm:flex-row items-center justify-between gap-6 shrink-0">
        <div className="flex items-center gap-4 self-start">
          <div className="p-3 bg-primary/10 rounded-2xl shadow-inner">
            <Database className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-0.5">
            <h2 className="text-2xl md:text-3xl font-black uppercase text-white tracking-tight leading-none">Inventory Registry</h2>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">High-Density technical pulse</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative group flex-1 sm:min-w-[300px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 group-focus-within:text-primary transition-all" />
            <Input 
              placeholder="Search registry..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-12 pl-11 rounded-xl bg-white/[0.03] border-white/10 text-white placeholder:text-white/20"
            />
          </div>
          
          <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/5 shadow-inner">
            <button onClick={() => setViewMode('grid')} className={cn("p-2.5 rounded-lg transition-all", viewMode === 'grid' ? "bg-white/10 text-white" : "text-white/20 hover:text-white")}><Grid className="h-4 w-4" /></button>
            <button onClick={() => setViewMode('table')} className={cn("p-2.5 rounded-lg transition-all", viewMode === 'table' ? "bg-white/10 text-white" : "text-white/20 hover:text-white")}><List className="h-4 w-4" /></button>
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => setIsHeaderManagerOpen(true)} className="h-12 w-12 rounded-xl border-white/10 bg-white/5 hover:bg-primary/10 text-primary">
                  <Settings2 className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Configure table headers and field visibility.</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* 2. Registry Metric Bar */}
      <div className="px-1 flex items-center gap-4 overflow-x-auto no-scrollbar pb-2">
        <Badge variant="outline" className="h-8 px-4 rounded-full border-primary/20 bg-primary/5 text-primary font-black uppercase text-[9px] tracking-widest whitespace-nowrap">
          {processedAssets.length} TOTAL RECORDS
        </Badge>
        <Badge variant="outline" className="h-8 px-4 rounded-full border-white/10 bg-white/5 text-white/40 font-black uppercase text-[9px] tracking-widest whitespace-nowrap">
          SCOPE: {userProfile?.state || 'GLOBAL'}
        </Badge>
      </div>

      {/* 3. Main Display Surface */}
      <div className="flex-1 min-h-0 px-1">
        <ScrollArea className="h-full pr-4 custom-scrollbar">
          <div className="pb-40">
            {viewMode === 'grid' || isMobile ? (
              <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {processedAssets.map(asset => (
                  <RegistryCard 
                    key={asset.id} 
                    record={transformAssetToRecord(asset, headers, appSettings?.sourceBranding)} 
                    onInspect={handleInspect} 
                    selected={selectedAssetIds.has(asset.id)} 
                    onToggleSelect={handleToggleSelect} 
                  />
                ))}
              </div>
            ) : (
              <RegistryTable 
                records={processedAssets.map(a => transformAssetToRecord(a, headers, appSettings?.sourceBranding))} 
                onInspect={handleInspect} 
                selectedIds={selectedAssetIds} 
                onToggleSelect={handleToggleSelect} 
                onSelectAll={(c) => setSelectedAssetIds(c ? new Set(processedAssets.map(a => a.id)) : new Set())} 
              />
            )}

            {processedAssets.length === 0 && (
              <div className="py-48 text-center opacity-20 border-4 border-dashed border-white/5 rounded-[4rem] flex flex-col items-center gap-8">
                <Database className="h-20 w-20 text-white" />
                <h3 className="text-3xl font-black uppercase tracking-[0.3em] text-white">Registry Silent</h3>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* 4. Action Terminal */}
      <AnimatePresence>
        {selectedAssetIds.size > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-[#0A0A0A] border-2 border-primary/20 rounded-[2.5rem] p-4 flex items-center gap-8 shadow-3xl backdrop-blur-3xl min-w-[500px]"
          >
            <div className="flex items-center gap-4 pl-4">
              <div className="h-10 w-10 bg-primary rounded-full flex items-center justify-center text-black font-black text-xs shadow-xl shadow-primary/20">
                {selectedAssetIds.size}
              </div>
              <span className="text-xs font-black uppercase tracking-[0.2em] text-white">Selected</span>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => setIsBatchEditOpen(true)} className="h-12 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 text-white/60 hover:text-white"><Edit3 className="h-4 w-4" /> Bulk Edit</Button>
              <Button variant="ghost" onClick={handleDeleteSelected} className="h-12 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 text-destructive/60 hover:text-destructive"><Trash2 className="h-4 w-4" /> Delete</Button>
            </div>
            <button onClick={() => setSelectedAssetIds(new Set())} className="ml-auto mr-4 text-white/20 hover:text-white transition-all"><X className="h-5 w-5" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Modals */}
      <AssetDetailSheet 
        isOpen={isDetailOpen} 
        onOpenChange={setIsDetailOpen} 
        record={selectedRecord} 
        onEdit={(id) => { setSelectedAssetId(id); setIsFormOpen(true); setIsDetailOpen(false); }} 
      />
      <AssetForm 
        isOpen={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        asset={assets.find(a => a.id === selectedAssetId)} 
        isReadOnly={false} 
        onSave={async (a) => { await enqueueMutation('UPDATE', 'assets', a); await refreshRegistry(); setIsFormOpen(false); }} 
      />
      <AssetBatchEditForm 
        isOpen={isBatchEditOpen} 
        onOpenChange={setIsBatchEditOpen} 
        selectedAssetCount={selectedAssetIds.size} 
        onSave={async (data) => { 
          for (const id of Array.from(selectedAssetIds)) {
            const asset = assets.find(a => a.id === id);
            if (asset) await enqueueMutation('UPDATE', 'assets', { ...asset, ...data });
          }
          await refreshRegistry();
          setSelectedAssetIds(new Set());
          toast({ title: "Bulk Update Applied" });
        }} 
      />
      <HeaderManagerDrawer 
        isOpen={isHeaderManagerOpen} 
        onOpenChange={setIsHeaderManagerOpen} 
        headers={headers} 
        onUpdateHeaders={setHeaders} 
        onReset={() => {}} 
      />
    </div>
  );
}
